---
name: code-comment-audit
description: "Audit a codebase against the team's Code Commenting Standards checklist and insert, adapt, or fix comments and doc comments (JSDoc/TSDoc/Javadoc) directly in files where needed. Use this skill whenever the user asks to review, audit, check, improve, clean up, or add code comments or documentation across a project, repo, folder, or set of files — including requests like 'document this codebase', 'add JSDoc to these functions', 'check our comment coverage', 'bring this repo in line with our commenting standard', 'audit comments before this PR', or 'clean up stale/leftover comments'. Trigger even if the user doesn't say the word 'comments' but asks to improve code readability, maintainability, or documentation quality across files."
compatibility: 'Node.js required to run scripts/scan_doc_coverage.js (zero external dependencies). File-editing and shell/git tool access required for the execute phase. Works on any codebase; scanner has first-class support for JS/TS/Java, and the reference doc covers Python, C#, SQL, and IaC for manual review.'
---

# Code Comment Audit & Remediation

Two-phase workflow: **assess** a codebase against the team's Code Commenting
Standards, then **execute** — insert or adapt comments directly in files,
file by file, in reviewable batches.

The standards this skill enforces live in `references/commenting-standards.md`.
**Read that file before assessing or writing a single comment.** It is the
source of truth for what a good comment looks like (why, not what), the
doc-comment conventions per language (TSDoc/JSDoc, Javadoc, PEP 257, XML doc
comments), and the anti-patterns to remove.

## Step 1 — Scope the work

Confirm before starting, unless already obvious from the request:

- Target path(s): whole repo, a package/folder, or a specific set of files.
- Report-only vs. apply changes: some users just want the audit; others want
  fixes applied directly. If unclear, default to producing the report first
  and asking before editing files.
- Any languages beyond JS/TS/Java in scope (Python, C#, SQL/RLS, Terraform,
  Dockerfiles, CI YAML) — the scanner doesn't cover these; plan to review
  them manually against §3 of the reference doc.

## Step 2 — Assess

Run the scanner against the target path:

```node scripts/scan_doc_coverage.js <path> \
  --ext=.ts,.tsx,.js,.jsx,.java \
  --exclude=node_modules,dist,build,.git,coverage,.next,out,target,vendor \
  --out=comment-audit-report.md
```

It reports, per file: exported/public symbols missing a doc comment,
TODO/FIXME/HACK tags missing an owner + ticket reference, and likely
commented-out code blocks. It never edits anything — it's read-only, and
its output is a **heuristic worklist**, not ground truth. Treat every
finding as "go read this line," not "this is definitely wrong."

For file types the scanner doesn't cover, grep/read those files directly and
apply the same categories of checks by hand (missing doc comments, orphaned
TODOs, commented-out blocks, stale comments contradicted by the code beside
them).

Present the report to the user (counts + a few representative examples)
before making changes, unless they've explicitly asked you to just fix
everything.

## Step 3 — Execute (insert / adapt comments)

Work through findings in priority order: public/exported API surfaces first,
then internal logic, then TODO cleanup, then commented-out code.

For each item:

1. **Understand the "why" before writing anything.** Read the function body,
   its call sites, related tests, and — if available — `git log -p <file>`
   or `git blame` around that line, to understand _why_ the code exists,
   not just what it does.
2. **Write the doc comment** using the convention for that language (see
   `references/commenting-standards.md` §3 for TSDoc/JSDoc/Javadoc examples
   and the "why, not what" rule). In TypeScript, don't restate types the
   compiler already documents — explain behavior, edge cases, and rationale.
3. **Never fabricate rationale.** If the _why_ genuinely isn't recoverable
   from the code, tests, or history, do not invent a plausible-sounding
   reason. Either leave a clearly-marked placeholder —
   `// TODO(needs-context): <what you'd need to know to document this>` —
   or ask the user directly. A confident-sounding false comment is worse
   than the missing comment it replaced.
4. **Orphaned TODOs:** don't guess an owner or ticket. Ask the user, or
   format as `TODO(unassigned): <description> — ticket pending` and flag it
   in your summary.
5. **Possible commented-out code:** never delete silently. Flag it in your
   summary and let the user confirm removal (git history preserves it
   regardless of what you decide).
6. **Comments only.** Never change logic, reformat unrelated code, or rename
   variables as a side effect of "just adding comments."
7. **Work in reviewable batches** — one file or one module at a time —
   rather than editing dozens of files unseen. Surface a running summary as
   you go (files touched, comments added, items skipped and why).
8. **Respect existing project conventions.** Check for `.eslintrc*` /
   `eslint.config.*` (especially `eslint-plugin-jsdoc` rules), `.editorconfig`,
   or an existing docs style before imposing a different one.
9. **Skip generated/vendor code**: node_modules, dist, build, .next, target,
   migrations, anything matching `*.generated.*`, or files with a
   "do not edit" header.

## Step 4 — Verify

Re-run the scanner on the same path and report before/after numbers, e.g.:

> Doc comment coverage: 41% → 92%. 3 items left as `needs-context`
> placeholders for you to fill in. 2 commented-out blocks flagged for your
> review, not removed.

## Hard rules (do not violate these even if asked)

- Never fabricate business rationale for a "why" comment.
- Never alter code logic, formatting, or names while "just adding comments."
- Never silently delete comments or commented-out code — flag, don't remove.
- Never claim 100% coverage without re-running the scanner to confirm it.

## Files in this skill

- `references/commenting-standards.md` — the full standards doc: philosophy,
  comment taxonomy, language-specific conventions and examples, anti-patterns,
  code-review conventions, tooling, and the underlying checklist.
- `scripts/scan_doc_coverage.js` — zero-dependency Node.js scanner (JS/TS/Java
  aware) that produces the assessment report used in Step 2.
