#!/usr/bin/env node
// @ts-check
/**
 * generate.mjs — Regenerate the EasyOps frontend build log (index.html) from git history.
 *
 * Usage (run from anywhere; paths resolve relative to this script):
 *   node generate.mjs
 *   node generate.mjs --since 2026-06-09 --until 2026-07-15
 *   node generate.mjs --since 2026-06-09 --until 2026-07-15 --out index.html
 *
 * Notes:
 *   - `--until` is EXCLUSIVE (matches `git log --until`). The displayed end date is
 *     the day before. Defaults reproduce the original 9 Jun – 14 Jul 2026 window.
 *   - Only commits touching frontend paths (src/, index.html) are included.
 *   - Feature tags are assigned heuristically from the commit subject. Adjust the
 *     TAG_RULES below if the categorisation needs tuning.
 */

import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
// docs/build-log -> docs -> repo root (easy-ops).
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..')

// ── CLI args ────────────────────────────────────────────────────────────────
function getArg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const SINCE = getArg('since', '2026-06-09') // inclusive
const UNTIL = getArg('until', '2026-07-15') // exclusive
const OUT = resolve(SCRIPT_DIR, getArg('out', 'index.html'))
const FRONTEND_PATHS = ['src', 'index.html']

// ── Feature-area tags (label + first-match keyword rules) ────────────────────
const TAG_LABELS = {
  auth: 'Auth & RBAC',
  onboarding: 'Onboarding',
  navigation: 'Navigation',
  settings: 'Settings',
  marketing: 'Marketing',
  employees: 'Employees',
  compliance: 'Compliance',
  attendance: 'Attendance',
  dashboard: 'Dashboard',
  platform: 'Platform',
}
const TAG_ORDER = Object.keys(TAG_LABELS)

// Ordered rules — the first matching pattern wins. `platform` is the fallback.
const TAG_RULES = [
  ['compliance', /complian|bcea|legal|violation/i],
  ['onboarding', /onboard/i],
  ['attendance', /attendance|check[\s-]?in|clock[\s-]?in/i],
  ['dashboard', /dashboard/i],
  [
    'marketing',
    /pricing|hero|feature|how[\s-]?it[\s-]?works|benefit|\bcta\b|footer|navbar|landing|partner|career|contact|privacy|terms|support|demo|company page/i,
  ],
  ['settings', /setting|profile|avatar|workspace|billing/i],
  ['navigation', /sidebar|navigation|appheader|nav\b/i],
  ['employees', /employee|staff|invitation|invite|membership|member assignment/i],
  [
    'auth',
    /auth|login|register|redirect|\brole|permission|rbac|token|session|oidc|getstarted|credential/i,
  ],
]

function classify(subject) {
  for (const [tag, re] of TAG_RULES) {
    if (re.test(subject)) return tag
  }
  return 'platform'
}

// ── Date helpers (UTC, no timezone drift) ────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** @param {string} iso YYYY-MM-DD */
function toUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
function fmtShort(date) {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`
}
function fmtLong(date) {
  return `${date.getUTCDate()} ${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}
function addDays(date, n) {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}
/** Monday (UTC) of the week containing `date`. */
function mondayOf(date) {
  const offset = (date.getUTCDay() + 6) % 7 // Sun=0 -> 6, Mon=1 -> 0 ...
  return addDays(date, -offset)
}
function daysInclusive(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1
}

// ── HTML escaping ────────────────────────────────────────────────────────────
function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Read git history ─────────────────────────────────────────────────────────
function readCommits() {
  const raw = execFileSync(
    'git',
    [
      'log',
      `--since=${SINCE}`,
      `--until=${UNTIL}`,
      '--date=short',
      '--pretty=format:%ad\u0001%h\u0001%s',
      '--',
      ...FRONTEND_PATHS,
    ],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  )

  return (
    raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [date, hash, ...rest] = line.split('\u0001')
        return { date, hash, subject: rest.join('\u0001'), tag: classify(rest.join('\u0001')) }
      })
      // `git --until` is inclusive of the boundary day; enforce a strict
      // half-open [SINCE, UNTIL) window via lexical date comparison.
      .filter((c) => c.date >= SINCE && c.date < UNTIL)
  )
}

// ── Bucket commits into Monday-aligned weeks, clamped to the range ───────────
function buildWeeks(commits) {
  const sinceDate = toUTC(SINCE)
  const untilInclusive = addDays(toUTC(UNTIL), -1) // exclusive -> inclusive end
  const buckets = new Map()

  for (const c of commits) {
    const key = mondayOf(toUTC(c.date)).toISOString().slice(0, 10)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(c)
  }

  const weeks = [...buckets.keys()].sort() // ascending by Monday
  return weeks.map((mondayKey, i) => {
    const monday = toUTC(mondayKey)
    const sunday = addDays(monday, 6)
    const start = monday < sinceDate ? sinceDate : monday
    const end = sunday > untilInclusive ? untilInclusive : sunday
    // Commits are newest-first from git; show oldest-first within a week.
    const entries = buckets.get(mondayKey).slice().reverse()
    // Focus line: the two most common tags in the week.
    const counts = {}
    for (const e of entries) counts[e.tag] = (counts[e.tag] || 0) + 1
    const focus = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([t]) => TAG_LABELS[t])
      .join(', ')
    return {
      n: i + 1,
      range: `${fmtShort(start)} – ${fmtShort(end)}`,
      focus,
      entries: entries.map((e) => ({
        d: fmtShort(toUTC(e.date)),
        h: e.hash,
        t: e.tag,
        m: e.subject,
      })),
    }
  })
}

// ── Render ───────────────────────────────────────────────────────────────────
const CSS = `
      /* ─── Design tokens (from onboarding.css) ─────────────────────────── */
      :root {
        --bl-background: #f8f9fb;
        --bl-surface: #ffffff;
        --bl-surface-raised: 0 4px 24px -4px rgba(15, 45, 92, 0.08);

        --bl-border: #e1e6ed;
        --bl-border-focus: #279e8a;

        --bl-accent: #10b981;
        --bl-accent-dim: rgba(16, 185, 129, 0.1);

        --bl-primary: #0f2d5c;
        --bl-secondary: #2563eb;
        --bl-muted: #64748b;

        --bl-radius-sm: 8px;
        --bl-radius-md: 12px;
        --bl-radius-lg: 16px;
        --bl-radius-xl: 24px;

        --bl-transition: 0.2s ease;
        --bl-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
        --bl-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
        --bl-shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.15);

        --bl-font:
          'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
      }

      body {
        background: var(--bl-background);
        font-family: var(--bl-font);
        color: var(--bl-primary);
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
      }

      /* ── Page shell ── */
      .bl-page {
        width: 100%;
        display: flex;
        justify-content: center;
        padding: 2.5rem 1rem 4rem;
      }

      .bl-container {
        width: 100%;
        max-width: 56rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      /* ── Header ── */
      .bl-header {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }

      .bl-brand {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.15rem;
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: 0.01em;
      }
      .bl-brand__easy {
        color: var(--bl-primary);
      }
      .bl-brand__ops {
        color: var(--bl-accent);
      }

      .bl-title {
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: var(--bl-primary);
        margin: 0.5rem 0 0;
      }

      .bl-subtitle {
        font-size: 0.9375rem;
        color: var(--bl-muted);
        margin: 0;
      }

      .bl-daterange {
        display: inline-flex;
        align-self: center;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
        padding: 0.35rem 0.85rem;
        border: 1px solid var(--bl-border);
        border-radius: 999px;
        background: var(--bl-surface);
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--bl-secondary);
      }
      .bl-daterange::before {
        content: '';
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: var(--bl-accent);
      }

      /* ── Stat row ── */
      .bl-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
      }

      .bl-stat {
        background: var(--bl-surface);
        border: 1px solid var(--bl-border);
        border-radius: var(--bl-radius-lg);
        box-shadow: var(--bl-surface-raised);
        padding: 1.25rem 1rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .bl-stat__value {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--bl-primary);
        line-height: 1.1;
      }

      .bl-stat__label {
        font-size: 0.6875rem;
        font-weight: 600;
        color: var(--bl-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* ── Legend ── */
      .bl-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: center;
      }

      .bl-tag {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .bl-tag::before {
        content: '';
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.9;
      }

      /* Tag palette */
      .bl-tag--auth {
        color: #2563eb;
        background: rgba(37, 99, 235, 0.08);
        border-color: rgba(37, 99, 235, 0.2);
      }
      .bl-tag--onboarding {
        color: #0f9d70;
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.25);
      }
      .bl-tag--navigation {
        color: #0f2d5c;
        background: rgba(15, 45, 92, 0.08);
        border-color: rgba(15, 45, 92, 0.18);
      }
      .bl-tag--settings {
        color: #7c3aed;
        background: rgba(124, 58, 237, 0.08);
        border-color: rgba(124, 58, 237, 0.2);
      }
      .bl-tag--marketing {
        color: #0f9d70;
        background: rgba(16, 185, 129, 0.08);
        border-color: rgba(16, 185, 129, 0.2);
      }
      .bl-tag--employees {
        color: #b45309;
        background: rgba(180, 83, 9, 0.08);
        border-color: rgba(180, 83, 9, 0.2);
      }
      .bl-tag--compliance {
        color: #be123c;
        background: rgba(190, 18, 60, 0.07);
        border-color: rgba(190, 18, 60, 0.2);
      }
      .bl-tag--attendance {
        color: #0369a1;
        background: rgba(3, 105, 161, 0.08);
        border-color: rgba(3, 105, 161, 0.2);
      }
      .bl-tag--dashboard {
        color: #0f2d5c;
        background: rgba(15, 45, 92, 0.06);
        border-color: rgba(15, 45, 92, 0.16);
      }
      .bl-tag--platform {
        color: #64748b;
        background: rgba(100, 116, 139, 0.1);
        border-color: rgba(100, 116, 139, 0.22);
      }

      /* ── Week section ── */
      .bl-timeline {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .bl-week {
        background: var(--bl-surface);
        border: 1px solid var(--bl-border);
        border-radius: var(--bl-radius-lg);
        box-shadow: var(--bl-surface-raised);
        overflow: hidden;
      }

      .bl-week__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.1rem 1.35rem;
        border-bottom: 1px solid var(--bl-border);
        background: linear-gradient(to right, rgba(16, 185, 129, 0.06), rgba(255, 255, 255, 0));
      }

      .bl-week__title {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--bl-primary);
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .bl-week__title span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.6rem;
        height: 1.6rem;
        padding: 0 0.45rem;
        border-radius: var(--bl-radius-sm);
        background: var(--bl-accent);
        color: #fff;
        font-size: 0.8125rem;
        font-weight: 700;
      }

      .bl-week__focus {
        font-size: 0.8125rem;
        color: var(--bl-muted);
        font-weight: 500;
        margin-top: 0.2rem;
      }

      .bl-week__count {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--bl-secondary);
        white-space: nowrap;
      }

      /* ── Entries ── */
      .bl-entries {
        list-style: none;
        margin: 0;
        padding: 0.5rem 0;
      }

      .bl-entry {
        display: grid;
        grid-template-columns: 6.5rem 1fr;
        gap: 0.75rem 1rem;
        padding: 0.7rem 1.35rem;
        border-left: 3px solid transparent;
        transition:
          background var(--bl-transition),
          border-color var(--bl-transition);
      }
      .bl-entry:hover {
        background: rgba(15, 45, 92, 0.02);
        border-left-color: var(--bl-accent);
      }

      .bl-entry__date {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--bl-muted);
        font-variant-numeric: tabular-nums;
        padding-top: 0.1rem;
      }

      .bl-entry__body {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .bl-entry__desc {
        font-size: 0.875rem;
        color: var(--bl-primary);
        font-weight: 500;
      }

      .bl-entry__meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .bl-entry__hash {
        font-family: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, monospace;
        font-size: 0.6875rem;
        color: var(--bl-muted);
        background: rgba(100, 116, 139, 0.08);
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
      }

      /* ── Footer ── */
      .bl-footer {
        text-align: center;
        color: var(--bl-muted);
        font-size: 0.8125rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding-top: 0.5rem;
      }
      .bl-footer strong {
        color: var(--bl-primary);
      }

      /* ── Responsive ── */
      @media (max-width: 720px) {
        .bl-stats {
          grid-template-columns: repeat(2, 1fr);
        }
        .bl-title {
          font-size: 1.5rem;
        }
      }
      @media (max-width: 520px) {
        .bl-entry {
          grid-template-columns: 1fr;
          gap: 0.3rem;
        }
        .bl-week__header {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.35rem;
        }
      }`

function renderLegend() {
  return TAG_ORDER.map(
    (t) => `          <span class="bl-tag bl-tag--${t}">${esc(TAG_LABELS[t])}</span>`
  ).join('\n')
}

function renderTimeline(weeks) {
  return weeks
    .map((week) => {
      const entries = week.entries
        .map(
          (e) => `            <li class="bl-entry">
              <div class="bl-entry__date">${esc(e.d)}</div>
              <div class="bl-entry__body">
                <div class="bl-entry__desc">${esc(e.m)}</div>
                <div class="bl-entry__meta">
                  <span class="bl-tag bl-tag--${e.t}">${esc(TAG_LABELS[e.t])}</span>
                  <span class="bl-entry__hash">${esc(e.h)}</span>
                </div>
              </div>
            </li>`
        )
        .join('\n')
      return `        <section class="bl-week">
          <div class="bl-week__header">
            <div>
              <h2 class="bl-week__title"><span>W${week.n}</span>${esc(week.range)}</h2>
              <div class="bl-week__focus">${esc(week.focus)}</div>
            </div>
            <span class="bl-week__count">${week.entries.length} commits</span>
          </div>
          <ul class="bl-entries">
${entries}
          </ul>
        </section>`
    })
    .join('\n')
}

function renderStats({ commits, weeks, areas, days }) {
  const rows = [
    [commits, 'Commits'],
    [weeks, 'Weeks'],
    [areas, 'Feature Areas'],
    [days, 'Days'],
  ]
  return rows
    .map(
      ([v, l]) => `          <div class="bl-stat">
            <div class="bl-stat__value">${v}</div>
            <div class="bl-stat__label">${l}</div>
          </div>`
    )
    .join('\n')
}

function renderHTML(weeks, commits) {
  const sinceDate = toUTC(SINCE)
  const endDate = addDays(toUTC(UNTIL), -1)
  const rangeLong = `${fmtLong(sinceDate)} &nbsp;—&nbsp; ${fmtLong(endDate)}`
  const rangeShort = `${fmtShort(sinceDate)} – ${fmtShort(endDate)} ${endDate.getUTCFullYear()}`
  const areas = new Set(commits.map((c) => c.tag)).size
  const stats = {
    commits: commits.length,
    weeks: weeks.length,
    areas,
    days: daysInclusive(sinceDate, endDate),
  }
  const generatedOn = fmtLong(new Date(new Date().toISOString().slice(0, 10)))

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>EasyOps · Frontend Build Log</title>
    <meta
      name="description"
      content="Frontend development build log for the EasyOps platform, ${esc(rangeShort)}."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>${CSS}
    </style>
  </head>
  <body>
    <div class="bl-page">
      <div class="bl-container">
        <!-- Header -->
        <header class="bl-header">
          <div class="bl-brand">
            <span class="bl-brand__easy">Easy</span><span class="bl-brand__ops">Ops</span>
          </div>
          <h1 class="bl-title">Frontend Build Log</h1>
          <p class="bl-subtitle">
            A week-by-week record of frontend development on the EasyOps platform.
          </p>
          <span class="bl-daterange">${rangeLong}</span>
        </header>

        <!-- Summary stats -->
        <section class="bl-stats" aria-label="Summary">
${renderStats(stats)}
        </section>

        <!-- Legend -->
        <section class="bl-legend" aria-label="Feature area legend">
${renderLegend()}
        </section>

        <!-- Timeline -->
        <main class="bl-timeline">
${renderTimeline(weeks)}
        </main>

        <!-- Footer -->
        <footer class="bl-footer">
          <span>Generated from git commit history (frontend paths only) on ${esc(generatedOn)}.</span>
          <span><strong>EasyOps</strong> · Frontend Build Log · ${esc(rangeShort)}</span>
        </footer>
      </div>
    </div>
  </body>
</html>
`
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const commits = readCommits()
  if (commits.length === 0) {
    console.error(`No frontend commits found between ${SINCE} and ${UNTIL}.`)
    process.exit(1)
  }
  const weeks = buildWeeks(commits)
  const html = renderHTML(weeks, commits)
  writeFileSync(OUT, html, 'utf8')
  console.log(
    `Wrote ${OUT}\n  ${commits.length} commits · ${weeks.length} weeks · ` +
      `${new Set(commits.map((c) => c.tag)).size} feature areas (${SINCE} … ${UNTIL} excl.)`
  )
}

main()
