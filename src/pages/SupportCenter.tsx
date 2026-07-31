import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  LifeBuoy,
  Plus,
  Send,
  AlertTriangle,
  Clock,
  MessageSquare,
  Loader2,
  Mail,
  Phone,
  CalendarClock,
  ShieldCheck,
  Lock,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { useAuth, useAuthRole } from '../contexts/AuthContext'
import { useSupportAccess } from '../lib/feature-flags'
import {
  useSupportTickets,
  useSupportTicket,
  useCreateTicket,
  usePostReply,
  useUpdateTicket,
  useCsmContact,
  useUpsertCsm,
  type SupportTicketListItem,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '../hooks/useSupport'

import '../styles/onboarding.css'
import '../styles/support.css'

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'general', label: 'General enquiry' },
  { value: 'billing', label: 'Billing & payments' },
  { value: 'technical', label: 'Technical issue' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'bug', label: 'Bug report' },
]

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const STATUS_FILTERS: { value: TicketStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

function statusLabel(status: TicketStatus): string {
  return status === 'in_progress' ? 'In progress' : status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function timeFromNow(value: string | null): string {
  if (!value) return ''
  const target = new Date(value).getTime()
  if (Number.isNaN(target)) return ''
  const diffMs = target - Date.now()
  const abs = Math.abs(diffMs)
  const hours = Math.round(abs / 3600_000)
  const label = hours >= 24 ? `${Math.round(hours / 24)}d` : `${hours}h`
  return diffMs >= 0 ? `in ${label}` : `${label} ago`
}

const OPEN_STATES = new Set<TicketStatus>(['open', 'in_progress'])

/** Response SLA is breached when no first response landed before the deadline. */
function isResponseBreached(t: {
  first_response_at: string | null
  sla_response_due: string | null
}): boolean {
  if (t.first_response_at || !t.sla_response_due) return false
  return Date.now() > new Date(t.sla_response_due).getTime()
}

/** Resolution SLA is breached when an unresolved ticket passed its deadline. */
function isResolutionBreached(t: {
  status: TicketStatus
  sla_resolution_due: string | null
}): boolean {
  if (!OPEN_STATES.has(t.status) || !t.sla_resolution_due) return false
  return Date.now() > new Date(t.sla_resolution_due).getTime()
}

export default function SupportCenter() {
  const { user } = useAuth()
  const { hasPermission, hasMinRole, isAdmin } = useAuthRole()
  const { hasCsm, sla, plan } = useSupportAccess()

  const canCreate = hasPermission('write:support_tickets')
  const canReply = hasPermission('write:support_messages')
  const isStaff = hasMinRole('manager')

  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  // New-ticket form state.
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('general')
  const [priority, setPriority] = useState<TicketPriority>('medium')

  // Reply state.
  const [reply, setReply] = useState('')
  const [replyInternal, setReplyInternal] = useState(false)

  const ticketsQuery = useSupportTickets(statusFilter)
  const csmQuery = useCsmContact(hasCsm)

  const createTicket = useCreateTicket()
  const postReply = usePostReply()
  const updateTicket = useUpdateTicket()

  const tickets = useMemo<SupportTicketListItem[]>(
    () => ticketsQuery.data ?? [],
    [ticketsQuery.data]
  )

  // Derive the effective selection: the explicit pick when it still exists,
  // otherwise fall back to the newest ticket. Avoids syncing state in an effect.
  const effectiveSelectedId = useMemo(() => {
    if (selectedId && tickets.some((t) => t.id === selectedId)) return selectedId
    return tickets[0]?.id ?? null
  }, [selectedId, tickets])

  const detailQuery = useSupportTicket(effectiveSelectedId)

  const handleCreate = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject for your ticket.')
      return
    }
    try {
      const res = await createTicket.mutateAsync({
        subject: subject.trim(),
        description: description.trim() || undefined,
        category,
        priority,
      })
      toast.success('Support ticket opened.')
      setSubject('')
      setDescription('')
      setCategory('general')
      setPriority('medium')
      setShowNewForm(false)
      setSelectedId(res.ticket.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open ticket.')
    }
  }

  const handleReply = async () => {
    if (!effectiveSelectedId || !reply.trim()) return
    try {
      await postReply.mutateAsync({
        ticketId: effectiveSelectedId,
        body: reply.trim(),
        isInternal: isStaff && replyInternal,
      })
      setReply('')
      setReplyInternal(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post reply.')
    }
  }

  const handleStatus = async (status: TicketStatus) => {
    if (!effectiveSelectedId) return
    try {
      await updateTicket.mutateAsync({ ticketId: effectiveSelectedId, status })
      toast.success(`Ticket ${statusLabel(status).toLowerCase()}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update ticket.')
    }
  }

  const detail = detailQuery.data
  const activeTicket = detail?.ticket

  return (
    <div className="support-page">
      {/* Header */}
      <header className="support-header">
        <div>
          <h1 className="support-title">
            <LifeBuoy aria-hidden /> Support Centre
          </h1>
          <p className="support-subtitle">
            Open a ticket, track replies, and monitor your plan&apos;s service-level targets.
          </p>
        </div>
        <div className="support-sla-badge" title="Service-level targets for your plan">
          <ShieldCheck aria-hidden />
          <div>
            <span className="support-sla-plan">{plan || 'free'} plan SLA</span>
            <span className="support-sla-values">
              First response ≤ {sla.responseHours}h · Resolution ≤ {sla.resolutionHours}h
            </span>
          </div>
        </div>
      </header>

      {/* CSM contact card (Enterprise only) */}
      {hasCsm && (
        <CsmCard loading={csmQuery.isLoading} csm={csmQuery.data ?? null} canEdit={isAdmin} />
      )}

      {/* New ticket */}
      {canCreate && (
        <section className="support-new">
          <div className="support-new__head">
            <h2 className="support-section-title">
              <MessageSquare aria-hidden /> Your tickets
            </h2>
            <Button variant="outline" onClick={() => setShowNewForm((v) => !v)}>
              <Plus aria-hidden /> New ticket
            </Button>
          </div>

          {showNewForm && (
            <div className="support-form">
              <div className="support-field">
                <Label htmlFor="ticket-subject">Subject</Label>
                <Input
                  id="ticket-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Briefly describe the issue"
                  maxLength={160}
                />
              </div>
              <div className="support-form__row">
                <div className="support-field">
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory((v as TicketCategory) ?? 'general')}
                  >
                    <SelectTrigger className="support-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="support-field">
                  <Label>Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority((v as TicketPriority) ?? 'medium')}
                  >
                    <SelectTrigger className="support-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="support-field">
                <Label htmlFor="ticket-desc">Description</Label>
                <Textarea
                  id="ticket-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any detail that will help us resolve this faster"
                  rows={4}
                />
              </div>
              <div className="support-form__actions">
                <Button onClick={handleCreate} disabled={createTicket.isPending}>
                  {createTicket.isPending ? (
                    <Loader2 className="support-spin" aria-hidden />
                  ) : (
                    <Send aria-hidden />
                  )}
                  Submit ticket
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Filters */}
      <div className="support-filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`support-chip${statusFilter === f.value ? ' support-chip--active' : ''}`}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List + detail */}
      <div className="support-layout">
        {/* Ticket list */}
        <aside className="support-list">
          {ticketsQuery.isLoading ? (
            <div className="support-empty">
              <Loader2 className="support-spin" aria-hidden /> Loading tickets…
            </div>
          ) : tickets.length === 0 ? (
            <div className="support-empty">No tickets yet.</div>
          ) : (
            tickets.map((t) => {
              const respBreach = isResponseBreached(t)
              const resBreach = isResolutionBreached(t)
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`support-ticket-card${
                    effectiveSelectedId === t.id ? ' support-ticket-card--active' : ''
                  }`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <div className="support-ticket-card__top">
                    <span className={`support-badge support-badge--${t.status}`}>
                      {statusLabel(t.status)}
                    </span>
                    <span className={`support-badge support-badge--prio-${t.priority}`}>
                      {t.priority}
                    </span>
                    {(respBreach || resBreach) && (
                      <span className="support-badge support-badge--breach">
                        <AlertTriangle aria-hidden /> SLA
                      </span>
                    )}
                  </div>
                  <span className="support-ticket-card__subject">{t.subject}</span>
                  <span className="support-ticket-card__meta">
                    {t.reporter_name || 'Unknown'} · {formatDateTime(t.created_at)}
                  </span>
                </button>
              )
            })
          )}
        </aside>

        {/* Ticket detail */}
        <section className="support-detail">
          {!effectiveSelectedId ? (
            <div className="support-empty">Select a ticket to view the conversation.</div>
          ) : detailQuery.isLoading || !activeTicket ? (
            <div className="support-empty">
              <Loader2 className="support-spin" aria-hidden /> Loading conversation…
            </div>
          ) : (
            <>
              <div className="support-detail__head">
                <div>
                  <h3 className="support-detail__subject">{activeTicket.subject}</h3>
                  <div className="support-detail__badges">
                    <span className={`support-badge support-badge--${activeTicket.status}`}>
                      {statusLabel(activeTicket.status)}
                    </span>
                    <span className={`support-badge support-badge--prio-${activeTicket.priority}`}>
                      {activeTicket.priority}
                    </span>
                    <span className="support-badge support-badge--muted">
                      {activeTicket.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="support-detail__actions">
                    {OPEN_STATES.has(activeTicket.status) ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleStatus('resolved')}
                          disabled={updateTicket.isPending}
                        >
                          Resolve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleStatus('closed')}
                          disabled={updateTicket.isPending}
                        >
                          Close
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleStatus('open')}
                        disabled={updateTicket.isPending}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* SLA line */}
              <div className="support-sla-line">
                <span className={isResponseBreached(activeTicket) ? 'support-breach' : ''}>
                  <Clock aria-hidden /> First response{' '}
                  {activeTicket.first_response_at
                    ? `· responded ${formatDateTime(activeTicket.first_response_at)}`
                    : `due ${timeFromNow(activeTicket.sla_response_due)}`}
                </span>
                <span className={isResolutionBreached(activeTicket) ? 'support-breach' : ''}>
                  <ShieldCheck aria-hidden /> Resolution{' '}
                  {activeTicket.resolved_at
                    ? `· resolved ${formatDateTime(activeTicket.resolved_at)}`
                    : `due ${timeFromNow(activeTicket.sla_resolution_due)}`}
                </span>
              </div>

              {/* Thread */}
              <div className="support-thread">
                {activeTicket.description && (
                  <div className="support-msg support-msg--customer">
                    <div className="support-msg__head">
                      <span className="support-msg__author">
                        {detail?.ticket.created_by === user.auth0_user_id ? 'You' : 'Reporter'}
                      </span>
                      <span className="support-msg__time">
                        {formatDateTime(activeTicket.created_at)}
                      </span>
                    </div>
                    <p className="support-msg__body">{activeTicket.description}</p>
                  </div>
                )}
                {(detail?.messages ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={`support-msg support-msg--${
                      m.author_role === 'agent' ? 'agent' : 'customer'
                    }${m.is_internal ? ' support-msg--internal' : ''}`}
                  >
                    <div className="support-msg__head">
                      <span className="support-msg__author">
                        {m.author_role === 'agent' ? 'Support' : 'Customer'}
                        {m.is_internal && <span className="support-internal-tag">internal</span>}
                      </span>
                      <span className="support-msg__time">{formatDateTime(m.created_at)}</span>
                    </div>
                    <p className="support-msg__body">{m.body}</p>
                  </div>
                ))}
                {(detail?.messages ?? []).length === 0 && !activeTicket.description && (
                  <div className="support-empty">No messages yet.</div>
                )}
              </div>

              {/* Reply box */}
              {canReply && OPEN_STATES.has(activeTicket.status) ? (
                <div className="support-reply">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a reply…"
                    rows={3}
                  />
                  <div className="support-reply__actions">
                    {isStaff && (
                      <label className="support-internal-toggle">
                        <input
                          type="checkbox"
                          checked={replyInternal}
                          onChange={(e) => setReplyInternal(e.target.checked)}
                        />
                        Internal note
                      </label>
                    )}
                    <Button onClick={handleReply} disabled={postReply.isPending || !reply.trim()}>
                      {postReply.isPending ? (
                        <Loader2 className="support-spin" aria-hidden />
                      ) : (
                        <Send aria-hidden />
                      )}
                      Reply
                    </Button>
                  </div>
                </div>
              ) : (
                !OPEN_STATES.has(activeTicket.status) && (
                  <div className="support-closed-note">
                    <Lock aria-hidden /> This ticket is{' '}
                    {statusLabel(activeTicket.status).toLowerCase()}.
                    {isAdmin ? ' Reopen it to continue the conversation.' : ''}
                  </div>
                )
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

// ── CSM contact card ──────────────────────────────────────────────────────────
interface CsmCardProps {
  loading: boolean
  csm: {
    csm_name: string
    csm_email: string
    csm_phone: string | null
    csm_title: string | null
    calendar_url: string | null
    notes: string | null
  } | null
  canEdit: boolean
}

function CsmCard({ loading, csm, canEdit }: CsmCardProps) {
  const upsert = useUpsertCsm()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [calendar, setCalendar] = useState('')

  const startEdit = () => {
    setName(csm?.csm_name ?? '')
    setEmail(csm?.csm_email ?? '')
    setPhone(csm?.csm_phone ?? '')
    setTitle(csm?.csm_title ?? '')
    setCalendar(csm?.calendar_url ?? '')
    setEditing(true)
  }

  const save = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('CSM name and email are required.')
      return
    }
    try {
      await upsert.mutateAsync({
        csm_name: name.trim(),
        csm_email: email.trim(),
        csm_phone: phone.trim() || null,
        csm_title: title.trim() || null,
        calendar_url: calendar.trim() || null,
      })
      toast.success('CSM contact saved.')
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save CSM contact.')
    }
  }

  if (loading) {
    return (
      <div className="support-csm">
        <Loader2 className="support-spin" aria-hidden /> Loading your Customer Success Manager…
      </div>
    )
  }

  if (editing) {
    return (
      <div className="support-csm support-csm--form">
        <h2 className="support-section-title">Customer Success Manager</h2>
        <div className="support-form__row">
          <div className="support-field">
            <Label htmlFor="csm-name">Name</Label>
            <Input id="csm-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="support-field">
            <Label htmlFor="csm-title">Title</Label>
            <Input id="csm-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
        <div className="support-form__row">
          <div className="support-field">
            <Label htmlFor="csm-email">Email</Label>
            <Input
              id="csm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="support-field">
            <Label htmlFor="csm-phone">Phone</Label>
            <Input id="csm-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="support-field">
          <Label htmlFor="csm-cal">Booking link</Label>
          <Input id="csm-cal" value={calendar} onChange={(e) => setCalendar(e.target.value)} />
        </div>
        <div className="support-form__actions">
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="support-spin" aria-hidden />} Save
          </Button>
        </div>
      </div>
    )
  }

  if (!csm) {
    return (
      <div className="support-csm">
        <div className="support-csm__body">
          <ShieldCheck className="support-csm__icon" aria-hidden />
          <div>
            <p className="support-csm__name">Dedicated Customer Success Manager</p>
            <p className="support-csm__muted">
              Your Enterprise plan includes a dedicated CSM.
              {canEdit
                ? ' Add their contact details for your team.'
                : ' Contact details coming soon.'}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button variant="outline" onClick={startEdit}>
            <Plus aria-hidden /> Add CSM
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="support-csm">
      <div className="support-csm__body">
        <ShieldCheck className="support-csm__icon" aria-hidden />
        <div>
          <p className="support-csm__name">
            {csm.csm_name}
            {csm.csm_title ? <span className="support-csm__title"> · {csm.csm_title}</span> : null}
          </p>
          <div className="support-csm__links">
            <a href={`mailto:${csm.csm_email}`}>
              <Mail aria-hidden /> {csm.csm_email}
            </a>
            {csm.csm_phone && (
              <a href={`tel:${csm.csm_phone}`}>
                <Phone aria-hidden /> {csm.csm_phone}
              </a>
            )}
            {csm.calendar_url && (
              <a href={csm.calendar_url} target="_blank" rel="noreferrer">
                <CalendarClock aria-hidden /> Book a call
              </a>
            )}
          </div>
        </div>
      </div>
      {canEdit && (
        <Button variant="outline" onClick={startEdit}>
          Edit
        </Button>
      )}
    </div>
  )
}
