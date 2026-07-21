import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  HardHat,
  Lock,
  Plus,
  Trash2,
  ClipboardCheck,
  ClipboardList,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  PenLine,
  CheckCircle2,
  XCircle,
  Send,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Switch } from '../components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useAuth, useAuthRole } from '../contexts/AuthContext'
import { useSafetyAccess } from '../lib/feature-flags'
import { useSites, useDepartments, useShifts } from '../hooks/useOrgData'
import {
  useSafetyTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useSafetyResponses,
  useSubmitResponse,
  useIncidents,
  useFileIncident,
  useReviewIncident,
  type ChecklistItem,
  type ChecklistAnswer,
  type SafetyTemplate,
  type IncidentListItem,
  type IncidentType,
  type IncidentSeverity,
  type IncidentStatus,
} from '../hooks/useSafety'

import '../styles/onboarding.css'
import '../styles/safety.css'

const INCIDENT_TYPE_OPTIONS: { value: IncidentType; label: string }[] = [
  { value: 'injury', label: 'Injury' },
  { value: 'near_miss', label: 'Near miss' },
  { value: 'property_damage', label: 'Property damage' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'security', label: 'Security' },
  { value: 'equipment_failure', label: 'Equipment failure' },
  { value: 'other', label: 'Other' },
]

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const INCIDENT_STATUS_FILTERS: { value: IncidentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

function labelFor<T extends string>(options: { value: T; label: string }[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? value
}

function statusLabel(status: IncidentStatus): string {
  return status === 'under_review'
    ? 'Under review'
    : status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

/** Read a template's `items` jsonb into typed checklist items. */
function readItems(template: SafetyTemplate): ChecklistItem[] {
  if (!Array.isArray(template.items)) return []
  return (template.items as unknown[])
    .map((raw, i) => {
      const obj = (raw ?? {}) as Record<string, unknown>
      const label = typeof obj.label === 'string' ? obj.label : ''
      if (!label) return null
      return {
        key: typeof obj.key === 'string' && obj.key ? obj.key : `item_${i}`,
        label,
        required: obj.required !== false,
      }
    })
    .filter((x): x is ChecklistItem => x !== null)
}

export default function SafetyOps() {
  const { canUseSafetyOps, plan } = useSafetyAccess()
  const { hasMinRole } = useAuthRole()
  const isStaff = hasMinRole('manager')

  // ── Plan lock ───────────────────────────────────────────────────────────────
  if (!canUseSafetyOps) {
    return (
      <div className="safety-page">
        <div className="safety-locked">
          <Lock className="safety-locked__icon" aria-hidden />
          <h2>Safety Ops</h2>
          <p>
            Safety Ops is available on the Business (Pro) and Enterprise plans. Your current plan
            {plan ? ` (${plan})` : ''} does not include this feature.
          </p>
          <p className="safety-muted">
            Upgrade your subscription to run shift-start safety checklists and capture signed
            incident reports with manager review.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="safety-page">
      <header className="safety-header">
        <div>
          <h1 className="safety-title">
            <HardHat aria-hidden /> Safety Ops
          </h1>
          <p className="safety-subtitle">
            Run shift-start safety checklists and capture signed incident reports with manager
            sign-off.
          </p>
        </div>
      </header>

      <Tabs defaultValue="checklists">
        <TabsList className="safety-tabs">
          <TabsTrigger value="checklists">
            <ClipboardCheck aria-hidden /> Checklists
          </TabsTrigger>
          <TabsTrigger value="incidents">
            <AlertTriangle aria-hidden /> Incidents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklists">
          <ChecklistsTab isStaff={isStaff} />
        </TabsContent>
        <TabsContent value="incidents">
          <IncidentsTab isStaff={isStaff} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Checklists tab ─────────────────────────────────────────────────────────────
function ChecklistsTab({ isStaff }: { isStaff: boolean }) {
  const { hasPermission } = useAuthRole()
  const canManage = hasPermission('write:safety_templates')
  const canSubmit = hasPermission('write:safety_checklists')

  const templatesQuery = useSafetyTemplates()
  const responsesQuery = useSafetyResponses()
  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])
  const activeTemplates = useMemo(() => templates.filter((t) => t.active), [templates])

  return (
    <div className="safety-columns">
      <div className="safety-col">
        {canManage && <TemplateManager templates={templates} />}
        {canSubmit && <ChecklistRunner templates={activeTemplates} />}
      </div>

      <div className="safety-col">
        <section className="safety-card">
          <h2 className="safety-section-title">
            <ClipboardList aria-hidden /> {isStaff ? 'Recent submissions' : 'Your submissions'}
          </h2>
          {responsesQuery.isLoading ? (
            <div className="safety-empty">
              <Loader2 className="safety-spin" aria-hidden /> Loading…
            </div>
          ) : (responsesQuery.data ?? []).length === 0 ? (
            <div className="safety-empty">No checklist submissions yet.</div>
          ) : (
            <ul className="safety-list">
              {(responsesQuery.data ?? []).map((r) => {
                const tmpl = templates.find((t) => t.id === r.template_id)
                return (
                  <li key={r.id} className="safety-list-row">
                    <div className="safety-list-row__main">
                      <span className="safety-list-row__title">{tmpl?.name ?? 'Checklist'}</span>
                      <span className="safety-list-row__meta">
                        {r.user_name || 'You'} · {formatDateTime(r.signed_at)}
                      </span>
                    </div>
                    <span className={`safety-badge safety-badge--${r.passed ? 'pass' : 'flag'}`}>
                      {r.passed ? (
                        <>
                          <CheckCircle2 aria-hidden /> Passed
                        </>
                      ) : (
                        <>
                          <AlertTriangle aria-hidden /> Flagged
                        </>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Template manager (admins/managers) ─────────────────────────────────────────
function TemplateManager({ templates }: { templates: SafetyTemplate[] }) {
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [requiredAtStart, setRequiredAtStart] = useState(true)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [newItem, setNewItem] = useState('')

  const addItem = () => {
    const label = newItem.trim()
    if (!label) return
    setItems((prev) => [...prev, { key: `item_${Date.now()}`, label, required: true }])
    setNewItem('')
  }

  const removeItem = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key))

  const toggleRequired = (key: string) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, required: !i.required } : i)))

  const reset = () => {
    setName('')
    setDescription('')
    setRequiredAtStart(true)
    setItems([])
    setNewItem('')
    setOpen(false)
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please give the checklist a name.')
      return
    }
    if (items.length === 0) {
      toast.error('Add at least one checklist item.')
      return
    }
    try {
      await createTemplate.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        items,
        required_at_shift_start: requiredAtStart,
        active: true,
      })
      toast.success('Checklist template created.')
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create template.')
    }
  }

  const handleToggleActive = async (t: SafetyTemplate) => {
    try {
      await updateTemplate.mutateAsync({ id: t.id, active: !t.active })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update template.')
    }
  }

  const handleDelete = async (t: SafetyTemplate) => {
    try {
      await deleteTemplate.mutateAsync(t.id)
      toast.success('Template deleted.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template.')
    }
  }

  return (
    <section className="safety-card">
      <div className="safety-card__head">
        <h2 className="safety-section-title">
          <ClipboardCheck aria-hidden /> Checklist templates
        </h2>
        <Button variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus aria-hidden /> New template
        </Button>
      </div>

      {open && (
        <div className="safety-form">
          <div className="safety-field">
            <Label htmlFor="tmpl-name">Name</Label>
            <Input
              id="tmpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Forklift pre-shift inspection"
              maxLength={120}
            />
          </div>
          <div className="safety-field">
            <Label htmlFor="tmpl-desc">Description</Label>
            <Textarea
              id="tmpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional context for the team"
            />
          </div>

          <div className="safety-switch-row">
            <Switch
              id="tmpl-required"
              checked={requiredAtStart}
              onCheckedChange={setRequiredAtStart}
            />
            <Label htmlFor="tmpl-required">Required at shift start</Label>
          </div>

          <div className="safety-field">
            <Label>Checklist items</Label>
            {items.length > 0 && (
              <ul className="safety-item-list">
                {items.map((item) => (
                  <li key={item.key} className="safety-item">
                    <span className="safety-item__label">{item.label}</span>
                    <label className="safety-item__req">
                      <input
                        type="checkbox"
                        checked={item.required}
                        onChange={() => toggleRequired(item.key)}
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      className="safety-icon-btn"
                      onClick={() => removeItem(item.key)}
                      aria-label="Remove item"
                    >
                      <Trash2 aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="safety-inline">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
                placeholder="Add a checklist item and press Enter"
              />
              <Button variant="outline" onClick={addItem}>
                Add
              </Button>
            </div>
          </div>

          <div className="safety-form__actions">
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending}>
              {createTemplate.isPending && <Loader2 className="safety-spin" aria-hidden />} Save
              template
            </Button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="safety-empty">No templates yet. Create one to get started.</div>
      ) : (
        <ul className="safety-list">
          {templates.map((t) => (
            <li key={t.id} className="safety-list-row">
              <div className="safety-list-row__main">
                <span className="safety-list-row__title">
                  {t.name}
                  {!t.active && <span className="safety-badge safety-badge--muted">Inactive</span>}
                </span>
                <span className="safety-list-row__meta">
                  {readItems(t).length} item{readItems(t).length === 1 ? '' : 's'}
                  {t.required_at_shift_start ? ' · shift start' : ''}
                </span>
              </div>
              <div className="safety-list-row__actions">
                <label className="safety-item__req">
                  <input
                    type="checkbox"
                    checked={t.active}
                    onChange={() => handleToggleActive(t)}
                  />
                  Active
                </label>
                <button
                  type="button"
                  className="safety-icon-btn"
                  onClick={() => handleDelete(t)}
                  aria-label="Delete template"
                >
                  <Trash2 aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ── Checklist runner (staff sign & submit) ─────────────────────────────────────
function ChecklistRunner({ templates }: { templates: SafetyTemplate[] }) {
  const { user } = useAuth()
  const submit = useSubmitResponse()
  const sitesQuery = useSites()
  const shiftsQuery = useShifts()

  const [templateId, setTemplateId] = useState<string>('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [siteId, setSiteId] = useState<string>('none')
  const [shiftId, setShiftId] = useState<string>('none')
  const [signature, setSignature] = useState('')

  const template = templates.find((t) => t.id === templateId) ?? null
  const items = template ? readItems(template) : []
  const requiredMet = items.filter((i) => i.required).every((i) => checked[i.key])
  const passed = items.every((i) => checked[i.key])

  const resetRun = () => {
    setChecked({})
    setNotes('')
    setSiteId('none')
    setShiftId('none')
    setSignature('')
  }

  const handleSubmit = async () => {
    if (!template) {
      toast.error('Select a checklist to complete.')
      return
    }
    if (!requiredMet) {
      toast.error('Please complete all required items before signing.')
      return
    }
    if (!signature.trim()) {
      toast.error('Type your full name to sign the checklist.')
      return
    }
    const answers: ChecklistAnswer[] = items.map((i) => ({
      key: i.key,
      label: i.label,
      checked: !!checked[i.key],
    }))
    try {
      await submit.mutateAsync({
        template_id: template.id,
        responses: answers,
        passed,
        notes: notes.trim() || null,
        signature_data: `signed:${signature.trim()}:${new Date().toISOString()}`,
        site_id: siteId === 'none' ? null : siteId,
        shift_id: shiftId === 'none' ? null : shiftId,
      })
      toast.success('Checklist submitted.')
      setTemplateId('')
      resetRun()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit checklist.')
    }
  }

  return (
    <section className="safety-card">
      <h2 className="safety-section-title">
        <PenLine aria-hidden /> Complete a checklist
      </h2>

      {templates.length === 0 ? (
        <div className="safety-empty">No active checklists are available right now.</div>
      ) : (
        <>
          <div className="safety-field">
            <Label>Checklist</Label>
            <Select
              value={templateId || undefined}
              onValueChange={(v) => {
                setTemplateId(v ?? '')
                resetRun()
              }}
            >
              <SelectTrigger className="safety-select">
                <SelectValue placeholder="Select a checklist" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {template && (
            <>
              {template.description && <p className="safety-muted">{template.description}</p>}

              <ul className="safety-check-list">
                {items.map((item) => (
                  <li key={item.key} className="safety-check">
                    <label className="safety-check__label">
                      <input
                        type="checkbox"
                        checked={!!checked[item.key]}
                        onChange={(e) =>
                          setChecked((prev) => ({ ...prev, [item.key]: e.target.checked }))
                        }
                      />
                      {item.label}
                      {item.required && <span className="safety-req-star">*</span>}
                    </label>
                  </li>
                ))}
              </ul>

              <div className="safety-form__row">
                <div className="safety-field">
                  <Label>Site (optional)</Label>
                  <Select value={siteId} onValueChange={(v) => setSiteId(v ?? 'none')}>
                    <SelectTrigger className="safety-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No site</SelectItem>
                      {(sitesQuery.data ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.site_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="safety-field">
                  <Label>Shift (optional)</Label>
                  <Select value={shiftId} onValueChange={(v) => setShiftId(v ?? 'none')}>
                    <SelectTrigger className="safety-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No shift</SelectItem>
                      {(shiftsQuery.data ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="safety-field">
                <Label htmlFor="run-notes">Notes (optional)</Label>
                <Textarea
                  id="run-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Anything the reviewer should know"
                />
              </div>

              {!passed && requiredMet && (
                <p className="safety-flag-note">
                  <AlertTriangle aria-hidden /> Some optional items are unchecked — this submission
                  will be flagged for review.
                </p>
              )}

              <div className="safety-sign">
                <Label htmlFor="run-sign">Signature</Label>
                <Input
                  id="run-sign"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder={`Type your full name (${user.full_name || 'e.g. Jane Doe'}) to sign`}
                />
                <span className="safety-sign__hint">
                  By signing you confirm the checklist was completed accurately.
                </span>
              </div>

              <div className="safety-form__actions">
                <Button onClick={handleSubmit} disabled={submit.isPending}>
                  {submit.isPending ? (
                    <Loader2 className="safety-spin" aria-hidden />
                  ) : (
                    <Send aria-hidden />
                  )}
                  Sign & submit
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

// ── Incidents tab ──────────────────────────────────────────────────────────────
function IncidentsTab({ isStaff }: { isStaff: boolean }) {
  const { hasPermission } = useAuthRole()
  const canReport = hasPermission('write:incident_reports')

  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const incidentsQuery = useIncidents(statusFilter)
  const incidents = useMemo(() => incidentsQuery.data ?? [], [incidentsQuery.data])

  const effectiveSelectedId = useMemo(() => {
    if (selectedId && incidents.some((i) => i.id === selectedId)) return selectedId
    return incidents[0]?.id ?? null
  }, [selectedId, incidents])

  const selected = incidents.find((i) => i.id === effectiveSelectedId) ?? null

  return (
    <div className="safety-columns">
      <div className="safety-col">
        {canReport && <IncidentForm />}

        <section className="safety-card">
          <div className="safety-card__head">
            <h2 className="safety-section-title">
              <AlertTriangle aria-hidden /> {isStaff ? 'All incidents' : 'Your incidents'}
            </h2>
          </div>
          <div className="safety-filters">
            {INCIDENT_STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`safety-chip${statusFilter === f.value ? ' safety-chip--active' : ''}`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {incidentsQuery.isLoading ? (
            <div className="safety-empty">
              <Loader2 className="safety-spin" aria-hidden /> Loading incidents…
            </div>
          ) : incidents.length === 0 ? (
            <div className="safety-empty">No incidents reported.</div>
          ) : (
            <ul className="safety-list">
              {incidents.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    className={`safety-incident-card${
                      effectiveSelectedId === i.id ? ' safety-incident-card--active' : ''
                    }`}
                    onClick={() => setSelectedId(i.id)}
                  >
                    <div className="safety-incident-card__top">
                      <span className={`safety-badge safety-badge--${i.status}`}>
                        {statusLabel(i.status)}
                      </span>
                      <span className={`safety-badge safety-badge--sev-${i.severity}`}>
                        {i.severity}
                      </span>
                      <span className="safety-badge safety-badge--muted">
                        {labelFor(INCIDENT_TYPE_OPTIONS, i.incident_type)}
                      </span>
                    </div>
                    <span className="safety-incident-card__desc">{i.description}</span>
                    <span className="safety-incident-card__meta">
                      {i.reporter_name || 'Reporter'} · {formatDateTime(i.occurred_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="safety-col">
        <IncidentDetail incident={selected} isStaff={isStaff} />
      </div>
    </div>
  )
}

// ── Incident report form ────────────────────────────────────────────────────────
function IncidentForm() {
  const fileIncident = useFileIncident()
  const sitesQuery = useSites()
  const departmentsQuery = useDepartments()

  const [open, setOpen] = useState(false)
  const [incidentType, setIncidentType] = useState<IncidentType>('near_miss')
  const [severity, setSeverity] = useState<IncidentSeverity>('medium')
  const [occurredAt, setOccurredAt] = useState('')
  const [description, setDescription] = useState('')
  const [actionsTaken, setActionsTaken] = useState('')
  const [witnesses, setWitnesses] = useState('')
  const [siteId, setSiteId] = useState('none')
  const [departmentId, setDepartmentId] = useState('none')
  const [signature, setSignature] = useState('')

  const reset = () => {
    setIncidentType('near_miss')
    setSeverity('medium')
    setOccurredAt('')
    setDescription('')
    setActionsTaken('')
    setWitnesses('')
    setSiteId('none')
    setDepartmentId('none')
    setSignature('')
    setOpen(false)
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please describe what happened.')
      return
    }
    if (!signature.trim()) {
      toast.error('Type your full name to sign the report.')
      return
    }
    try {
      await fileIncident.mutateAsync({
        incident_type: incidentType,
        severity,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        description: description.trim(),
        actions_taken: actionsTaken.trim() || null,
        witnesses: witnesses.trim() || null,
        reporter_signature: `signed:${signature.trim()}:${new Date().toISOString()}`,
        site_id: siteId === 'none' ? null : siteId,
        department_id: departmentId === 'none' ? null : departmentId,
      })
      toast.success('Incident reported.')
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to file incident.')
    }
  }

  return (
    <section className="safety-card">
      <div className="safety-card__head">
        <h2 className="safety-section-title">
          <Plus aria-hidden /> Report an incident
        </h2>
        <Button variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? 'Close' : 'New report'}
        </Button>
      </div>

      {open && (
        <div className="safety-form">
          <div className="safety-form__row">
            <div className="safety-field">
              <Label>Type</Label>
              <Select
                value={incidentType}
                onValueChange={(v) => setIncidentType((v as IncidentType) ?? 'other')}
              >
                <SelectTrigger className="safety-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="safety-field">
              <Label>Severity</Label>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity((v as IncidentSeverity) ?? 'medium')}
              >
                <SelectTrigger className="safety-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="safety-field">
            <Label htmlFor="inc-when">When did it happen?</Label>
            <Input
              id="inc-when"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>

          <div className="safety-form__row">
            <div className="safety-field">
              <Label>Site (optional)</Label>
              <Select value={siteId} onValueChange={(v) => setSiteId(v ?? 'none')}>
                <SelectTrigger className="safety-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No site</SelectItem>
                  {(sitesQuery.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.site_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="safety-field">
              <Label>Department (optional)</Label>
              <Select value={departmentId} onValueChange={(v) => setDepartmentId(v ?? 'none')}>
                <SelectTrigger className="safety-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {(departmentsQuery.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="safety-field">
            <Label htmlFor="inc-desc">Description</Label>
            <Textarea
              id="inc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What happened, where, and who was involved"
            />
          </div>
          <div className="safety-field">
            <Label htmlFor="inc-actions">Immediate actions taken</Label>
            <Textarea
              id="inc-actions"
              value={actionsTaken}
              onChange={(e) => setActionsTaken(e.target.value)}
              rows={2}
            />
          </div>
          <div className="safety-field">
            <Label htmlFor="inc-witness">Witnesses</Label>
            <Input
              id="inc-witness"
              value={witnesses}
              onChange={(e) => setWitnesses(e.target.value)}
              placeholder="Names of anyone who saw the incident"
            />
          </div>

          <div className="safety-sign">
            <Label htmlFor="inc-sign">Reporter signature</Label>
            <Input
              id="inc-sign"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name to sign"
            />
            <span className="safety-sign__hint">
              By signing you confirm this report is accurate to the best of your knowledge.
            </span>
          </div>

          <div className="safety-form__actions">
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={fileIncident.isPending}>
              {fileIncident.isPending ? (
                <Loader2 className="safety-spin" aria-hidden />
              ) : (
                <Send aria-hidden />
              )}
              Submit report
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Incident detail + manager review ────────────────────────────────────────────
function IncidentDetail({
  incident,
  isStaff,
}: {
  incident: IncidentListItem | null
  isStaff: boolean
}) {
  const review = useReviewIncident()
  const [status, setStatus] = useState<IncidentStatus | ''>('')
  const [managerNotes, setManagerNotes] = useState('')
  const [signature, setSignature] = useState('')

  if (!incident) {
    return (
      <section className="safety-card">
        <div className="safety-empty">Select an incident to view the details.</div>
      </section>
    )
  }

  const handleReview = async (withSignature: boolean) => {
    const nextStatus = (status || incident.status) as IncidentStatus
    try {
      await review.mutateAsync({
        id: incident.id,
        status: nextStatus,
        manager_notes: managerNotes.trim() || undefined,
        manager_signature:
          withSignature && signature.trim()
            ? `signed:${signature.trim()}:${new Date().toISOString()}`
            : undefined,
      })
      toast.success(withSignature ? 'Incident counter-signed.' : 'Incident updated.')
      setSignature('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update incident.')
    }
  }

  return (
    <section className="safety-card">
      <div className="safety-detail__head">
        <h2 className="safety-section-title">
          <ShieldCheck aria-hidden /> Incident detail
        </h2>
        <span className={`safety-badge safety-badge--${incident.status}`}>
          {statusLabel(incident.status)}
        </span>
      </div>

      <div className="safety-detail__badges">
        <span className={`safety-badge safety-badge--sev-${incident.severity}`}>
          {incident.severity}
        </span>
        <span className="safety-badge safety-badge--muted">
          {labelFor(INCIDENT_TYPE_OPTIONS, incident.incident_type)}
        </span>
      </div>

      <dl className="safety-detail__grid">
        <div>
          <dt>Occurred</dt>
          <dd>{formatDateTime(incident.occurred_at)}</dd>
        </div>
        <div>
          <dt>Reported by</dt>
          <dd>{incident.reporter_name || 'Unknown'}</dd>
        </div>
      </dl>

      <div className="safety-detail__block">
        <h4>Description</h4>
        <p>{incident.description}</p>
      </div>
      {incident.actions_taken && (
        <div className="safety-detail__block">
          <h4>Actions taken</h4>
          <p>{incident.actions_taken}</p>
        </div>
      )}
      {incident.witnesses && (
        <div className="safety-detail__block">
          <h4>Witnesses</h4>
          <p>{incident.witnesses}</p>
        </div>
      )}

      <div className="safety-signoff">
        <div className="safety-signoff__row">
          <PenLine aria-hidden />
          <span>
            Reporter signed{' '}
            {incident.reporter_signed_at ? formatDateTime(incident.reporter_signed_at) : ''}
          </span>
        </div>
        <div className="safety-signoff__row">
          {incident.manager_signed_at ? (
            <>
              <CheckCircle2 aria-hidden />
              <span>
                Counter-signed by {incident.manager_name || 'manager'} ·{' '}
                {formatDateTime(incident.manager_signed_at)}
              </span>
            </>
          ) : (
            <>
              <XCircle aria-hidden />
              <span className="safety-muted">Awaiting manager counter-signature</span>
            </>
          )}
        </div>
        {incident.manager_notes && (
          <div className="safety-detail__block">
            <h4>Manager notes</h4>
            <p>{incident.manager_notes}</p>
          </div>
        )}
      </div>

      {isStaff && (
        <div className="safety-review">
          <h4 className="safety-section-title">Manager review</h4>
          <div className="safety-field">
            <Label>Status</Label>
            <Select
              value={status || incident.status}
              onValueChange={(v) => setStatus((v as IncidentStatus) ?? incident.status)}
            >
              <SelectTrigger className="safety-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_STATUS_FILTERS.filter((f) => f.value !== 'all').map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="safety-field">
            <Label htmlFor="mgr-notes">Manager notes</Label>
            <Textarea
              id="mgr-notes"
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              rows={2}
              placeholder="Review findings, follow-up actions…"
            />
          </div>
          <div className="safety-field">
            <Label htmlFor="mgr-sign">Counter-signature (optional)</Label>
            <Input
              id="mgr-sign"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name to counter-sign"
            />
          </div>
          <div className="safety-form__actions">
            <Button
              variant="outline"
              onClick={() => handleReview(false)}
              disabled={review.isPending}
            >
              Update status
            </Button>
            <Button
              onClick={() => handleReview(true)}
              disabled={review.isPending || !signature.trim()}
            >
              {review.isPending && <Loader2 className="safety-spin" aria-hidden />} Counter-sign
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
