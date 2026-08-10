'use client'
import { Fragment, useState, type ReactNode } from 'react'
import { History } from 'lucide-react'
import TopNavBar from '../TopNavBar'
import Footer from '../Footer'
import '../../styles/onboarding.css'
import '../../styles/companypages.css'

/** One list entry in a {@link PolicyBlock} of type `list`, optionally with a nested sub-list. */
export interface PolicyListItem {
  text: string
  /** Secondary emphasised line rendered beneath the item (e.g. a penalty note). */
  note?: string
  children?: { ordered?: boolean; items: PolicyListItem[] }
}

/** A content unit within a policy section: paragraph, list, callout, or table. */
export type PolicyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered?: boolean; items: PolicyListItem[] }
  | { type: 'callout'; variant?: 'info' | 'legal'; blocks: PolicyBlock[] }
  | { type: 'table'; columns: string[]; rows: string[][] }

/** A titled section of a legal policy document, made up of one or more content blocks. */
export interface PolicySection {
  heading: string
  subheading?: string
  blocks: PolicyBlock[]
}

/** A dated, versioned edition of a legal policy document. */
export interface PolicyVersion {
  version: string
  label: string
  effectiveDate: string
  sections: PolicySection[]
}

// ── Inline formatting ────────────────────────────────────────────────────────
// Supports **bold**, _italic_ and [label](href) markers within any text string.
const INLINE_RE = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g

function renderInline(text: string): ReactNode[] {
  return text
    .split(INLINE_RE)
    .filter((part) => part !== '')
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return <em key={index}>{part.slice(1, -1)}</em>
      }
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
      if (link) {
        const isExternal = /^https?:/i.test(link[2])
        return (
          <a
            key={index}
            href={link[2]}
            className="company-doc__link-inline"
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {link[1]}
          </a>
        )
      }
      return <Fragment key={index}>{part}</Fragment>
    })
}

// ── Block renderers ──────────────────────────────────────────────────────────
function renderList(
  list: { ordered?: boolean; items: PolicyListItem[] },
  keyPrefix: string
): ReactNode {
  const ListTag = list.ordered ? 'ol' : 'ul'
  return (
    <ListTag className={`company-doc__list${list.ordered ? ' company-doc__list--ordered' : ''}`}>
      {list.items.map((item, index) => (
        <li key={`${keyPrefix}-${index}`} className="company-doc__list-item">
          {renderInline(item.text)}
          {item.note ? <span className="company-doc__note">{renderInline(item.note)}</span> : null}
          {item.children ? renderList(item.children, `${keyPrefix}-${index}`) : null}
        </li>
      ))}
    </ListTag>
  )
}

function renderBlock(block: PolicyBlock, key: string): ReactNode {
  switch (block.type) {
    case 'paragraph':
      return (
        <p key={key} className="company-doc__text">
          {renderInline(block.text)}
        </p>
      )
    case 'list':
      return <Fragment key={key}>{renderList(block, key)}</Fragment>
    case 'callout':
      return (
        <div
          key={key}
          className={`company-doc__callout company-doc__callout--${block.variant ?? 'info'}`}
        >
          {block.blocks.map((child, index) => renderBlock(child, `${key}-${index}`))}
        </div>
      )
    case 'table':
      return (
        <div key={key} className="company-doc__table-wrap">
          <table className="company-doc__table">
            <thead>
              <tr>
                {block.columns.map((column, index) => (
                  <th key={index} scope="col">
                    {renderInline(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}

function PolicyDocumentBody({ sections }: { sections: PolicySection[] }) {
  return (
    <>
      {sections.map((section) => (
        <div key={section.heading} className="company-doc__section">
          <h2 className="company-doc__heading">{section.heading}</h2>
          {section.subheading ? (
            <p className="company-doc__subheading">{renderInline(section.subheading)}</p>
          ) : null}
          {section.blocks.map((block, index) => renderBlock(block, `${section.heading}-${index}`))}
        </div>
      ))}
    </>
  )
}

// ── Page shell ───────────────────────────────────────────────────────────────
interface LegalPageProps {
  title: string
  subtitle: string
  versions: PolicyVersion[]
}

/** Renders a legal policy page with a version switcher over the given {@link PolicyVersion} list. */
export default function LegalPage({ title, subtitle, versions }: LegalPageProps) {
  const [selected, setSelected] = useState(versions[0].version)
  const active = versions.find((v) => v.version === selected) ?? versions[0]

  return (
    <div>
      <TopNavBar />
      <main className="company-page">
        <div className="company-container">
          <header className="company-header">
            <span className="company-eyebrow">Legal</span>
            <h1 className="company-title">{title}</h1>
            <p className="company-subtitle">{subtitle}</p>
          </header>

          <div className="company-version">
            <span className="company-version__label">
              <History
                aria-hidden="true"
                style={{
                  width: '0.9rem',
                  height: '0.9rem',
                  display: 'inline',
                  verticalAlign: 'middle',
                  marginRight: '0.375rem',
                }}
              />
              Version
            </span>
            <div className="company-version__options">
              {versions.map((v, index) => (
                <button
                  key={v.version}
                  type="button"
                  className={[
                    'company-version__btn',
                    v.version === selected ? 'company-version__btn--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelected(v.version)}
                  aria-pressed={v.version === selected}
                >
                  {v.label}
                  {index === 0 && <span className="company-version__badge">Latest</span>}
                </button>
              ))}
            </div>
          </div>

          <article className="company-doc">
            <p className="company-doc__meta">
              {active.label} · Effective {active.effectiveDate}
            </p>
            <PolicyDocumentBody sections={active.sections} />
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}
