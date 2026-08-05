#!/usr/bin/env node
/**
 * scan_doc_coverage.js
 *
 * Zero-dependency codebase scanner (Node.js built-ins only) that checks a
 * codebase against the team's Code Commenting Standards
 * (../references/commenting-standards.md). It flags, but never edits:
 *
 *   1. Exported functions/classes/interfaces/consts (JS/TS) and public
 *      classes/methods (Java) missing a preceding doc comment.
 *   2. TODO / FIXME / HACK tags missing an owner + ticket reference,
 *      e.g. "TODO(name): ... — JIRA-123".
 *   3. Likely commented-out code blocks (2+ consecutive comment lines that
 *      look like code, not prose).
 *
 * This is a heuristic, regex-based scanner, not a full parser — treat its
 * output as a prioritized worklist, not ground truth. Always read the
 * flagged line in context before acting on it.
 *
 * Usage:
 *   node scan_doc_coverage.js [targetDir] [--ext=.ts,.tsx,.js,.jsx,.java]
 *                             [--exclude=node_modules,dist,build,.git]
 *                             [--out=comment-audit-report.md]
 *
 * Output: a Markdown report to stdout (and to --out if given).
 */

"use strict";
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------- args ----
const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const targetDir = path.resolve(positional[0] || ".");

function getOpt(name, fallback) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
}

const DOC_CHECK_EXTS = [".ts", ".tsx", ".js", ".jsx", ".java"];
const EXT = getOpt("ext", DOC_CHECK_EXTS.join(",")).split(",").map((s) => s.trim());
const EXCLUDE = new Set(
  getOpt("exclude", "node_modules,dist,build,.git,coverage,.next,out,target,vendor,.turbo")
    .split(",")
    .map((s) => s.trim())
);
const OUT_FILE = getOpt("out", null);

// ---------------------------------------------------------------- walk ----
function walk(dir, files) {
  files = files || [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (EXCLUDE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (EXT.includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

// ------------------------------------------------------ doc-comment scan ----
// Looks upward from lineIdx - 1, skipping blank lines and decorator lines
// (@Something on their own line), to see if a /** ... */ block sits directly
// above the declaration.
function hasPrecedingDocComment(lines, lineIdx) {
  let i = lineIdx - 1;
  while (i >= 0) {
    const t = lines[i].trim();
    if (t === "" || t.startsWith("@")) {
      i--;
      continue;
    }
    if (t.endsWith("*/")) {
      let j = i;
      while (j >= 0 && !lines[j].trim().startsWith("/**")) j--;
      return j >= 0;
    }
    return false;
  }
  return false;
}

const JS_TS_PATTERNS = [
  /^\s*export\s+default\s+(async\s+)?function\s+[A-Za-z0-9_$]+/,
  /^\s*export\s+(async\s+)?function\s+[A-Za-z0-9_$]+/,
  /^\s*export\s+(abstract\s+)?class\s+[A-Za-z0-9_$]+/,
  /^\s*export\s+interface\s+[A-Za-z0-9_$]+/,
  /^\s*export\s+type\s+[A-Za-z0-9_$]+/,
  /^\s*export\s+(const|let)\s+[A-Za-z0-9_$]+\s*(:[^=]+)?=\s*(async\s*)?\(/,
  /^\s*export\s+(const|let)\s+[A-Za-z0-9_$]+\s*(:[^=]+)?=\s*(async\s*)?function/,
];

const JAVA_PATTERNS = [
  /^\s*(public|protected)\s+(final\s+|abstract\s+|static\s+)*class\s+[A-Za-z0-9_$]+/,
  /^\s*(public|protected)\s+interface\s+[A-Za-z0-9_$]+/,
  /^\s*(public|protected)\s+(static\s+|final\s+|synchronized\s+)*[\w<>[\],.\s]+?\s+[A-Za-z0-9_$]+\s*\([^;{]*\)\s*(\{|throws)/,
];

function scanDocComments(file, lines) {
  const ext = path.extname(file);
  const patterns = ext === ".java" ? JAVA_PATTERNS : JS_TS_PATTERNS;
  const findings = [];
  let total = 0;
  let documented = 0;

  lines.forEach((line, idx) => {
    for (const re of patterns) {
      if (re.test(line)) {
        total++;
        if (hasPrecedingDocComment(lines, idx)) {
          documented++;
        } else {
          findings.push({ line: idx + 1, text: line.trim().slice(0, 100) });
        }
        break;
      }
    }
  });

  return { total, documented, findings };
}

// ------------------------------------------------------------- TODO tags ----
const TAG_RE = /(\/\/|--|#).*\b(TODO|FIXME|HACK)\b/;
const OWNER_RE = /\b(TODO|FIXME|HACK)\(([\w.-]+)\)/;
const TICKET_RE = /[A-Z]{2,}-\d+|#\d+/;

function scanTags(lines) {
  const findings = [];
  lines.forEach((line, idx) => {
    if (TAG_RE.test(line)) {
      const ok = OWNER_RE.test(line) && TICKET_RE.test(line);
      if (!ok) findings.push({ line: idx + 1, text: line.trim().slice(0, 100) });
    }
  });
  return findings;
}

// ---------------------------------------------------- commented-out code ----
const CODE_LIKE = /[;{}]|=>|\bfunction\b|\bconst\b|\blet\b|\bvar\b|\breturn\b|\w+\([^)]*\)\s*;?\s*$/;
const NOT_CODE = /\b(TODO|FIXME|HACK|NOTE|WHY)\b/;

function commentPrefixFor(ext) {
  if (ext === ".py") return "#";
  if (ext === ".sql" || ext === ".tf") return "--";
  return "//";
}

function scanCommentedOutCode(lines, ext) {
  const prefix = commentPrefixFor(ext);
  const findings = [];
  let runStart = null;

  for (let i = 0; i <= lines.length; i++) {
    const t = (lines[i] || "").trim();
    const isDocOrLineComment = t.startsWith("///") || t.startsWith("/**") || t.startsWith("*");
    const isPlainComment = t.startsWith(prefix) && !isDocOrLineComment;
    const body = isPlainComment ? t.slice(prefix.length).trim() : "";
    const looksLikeCode = isPlainComment && CODE_LIKE.test(body) && !NOT_CODE.test(body);

    if (looksLikeCode) {
      if (runStart === null) runStart = i + 1;
    } else if (runStart !== null) {
      const runEnd = i;
      if (runEnd - runStart + 1 >= 2) findings.push({ start: runStart, end: runEnd });
      runStart = null;
    }
  }
  return findings;
}

// ------------------------------------------------------------------ main ----
const files = walk(targetDir);
let totalsSymbols = 0;
let totalsDocumented = 0;
let totalTagFindings = 0;
let totalCodeBlocks = 0;
const perFile = [];

for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = content.split("\n");
  const ext = path.extname(file);
  const rel = path.relative(targetDir, file);

  const docResult = DOC_CHECK_EXTS.includes(ext)
    ? scanDocComments(file, lines)
    : { total: 0, documented: 0, findings: [] };
  const tagFindings = scanTags(lines);
  const codeFindings = scanCommentedOutCode(lines, ext);

  totalsSymbols += docResult.total;
  totalsDocumented += docResult.documented;
  totalTagFindings += tagFindings.length;
  totalCodeBlocks += codeFindings.length;

  if (docResult.findings.length || tagFindings.length || codeFindings.length) {
    perFile.push({ rel, docResult, tagFindings, codeFindings });
  }
}

const coveragePct = totalsSymbols === 0 ? 100 : Math.round((totalsDocumented / totalsSymbols) * 1000) / 10;

let md = "";
md += `# Comment Audit Report\n\n`;
md += `Scanned **${files.length}** files under \`${path.relative(process.cwd(), targetDir) || "."}\`.\n\n`;
md += `| Metric | Count |\n|---|---|\n`;
md += `| Exported/public symbols found | ${totalsSymbols} |\n`;
md += `| Documented | ${totalsDocumented} |\n`;
md += `| Missing doc comment | ${totalsSymbols - totalsDocumented} |\n`;
md += `| Doc comment coverage | ${coveragePct}% |\n`;
md += `| TODO/FIXME/HACK missing owner or ticket ref | ${totalTagFindings} |\n`;
md += `| Possible commented-out code blocks | ${totalCodeBlocks} |\n\n`;

if (perFile.length === 0) {
  md += `No issues found for the scanned extensions.\n`;
} else {
  md += `## Findings by file\n\n`;
  for (const f of perFile) {
    md += `### ${f.rel}\n\n`;
    if (f.docResult.findings.length) {
      md += `**Missing doc comments:**\n`;
      for (const x of f.docResult.findings) md += `- L${x.line}: \`${x.text}\`\n`;
      md += `\n`;
    }
    if (f.tagFindings.length) {
      md += `**TODO/FIXME/HACK missing owner or ticket:**\n`;
      for (const x of f.tagFindings) md += `- L${x.line}: \`${x.text}\`\n`;
      md += `\n`;
    }
    if (f.codeFindings.length) {
      md += `**Possible commented-out code (verify before removing):**\n`;
      for (const x of f.codeFindings) md += `- L${x.start}-L${x.end}\n`;
      md += `\n`;
    }
  }
}

process.stdout.write(md);
if (OUT_FILE) {
  fs.writeFileSync(OUT_FILE, md);
  process.stderr.write(`\nWritten to ${OUT_FILE}\n`);
}
