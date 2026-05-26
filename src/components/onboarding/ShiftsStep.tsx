import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { Plus, Trash2, Clock, Scale } from 'lucide-react'
import type { SiteData } from './SitesStep'

import '../../styles/form.css'
import '../../styles/shiftsstep.css'

export interface ShiftData {
  name: string
  start_time: string
  end_time: string
  grace_period_minutes: string
  site_index: number
}

export interface WorkRules {
  weeklyHoursLimit: number
  overtimeRate: number
}

interface Props {
  shifts: ShiftData[]
  workRules: WorkRules
  sites: SiteData[]
  onShiftsChange: (data: ShiftData[]) => void
  onWorkRulesChange: (data: WorkRules) => void
}

const EMPTY_SHIFT: ShiftData = {
  name: '',
  start_time: '08:00',
  end_time: '17:00',
  grace_period_minutes: '15',
  site_index: 0,
}

/** Returns "Xh Ym" or null if times are invalid / overnight */
const shiftDuration = (start: string, end: string): string | null => {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const totalMins = eh * 60 + em - (sh * 60 + sm)
  if (totalMins <= 0) return null
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const ShiftsStep = ({ shifts, workRules, sites, onShiftsChange, onWorkRulesChange }: Props) => {
  const add = () => onShiftsChange([...shifts, { ...EMPTY_SHIFT }])

  const remove = (i: number) => onShiftsChange(shifts.filter((_, idx) => idx !== i))

  const update = (i: number, field: keyof ShiftData, value: string | number) => {
    const updated = [...shifts]
    updated[i] = { ...updated[i], [field]: value }
    onShiftsChange(updated)
  }

  const updateRules = (field: keyof WorkRules, value: string) =>
    onWorkRulesChange({ ...workRules, [field]: value })

  return (
    <div className="shifts-step">
      {/* ── Work Rules ─────────────────────────────────────── */}
      <section className="form-section shifts-step__rules">
        <h3 className="form-section__title">
          <Scale className="shifts-step__section-icon" />
          Work Rules
          <span className="shifts-step__bcea-tag">BCEA Defaults</span>
        </h3>
        <p className="form-section__desc">
          Applied org-wide for overtime and compliance calculations.
        </p>

        <div className="shifts-step__rules-grid">
          <div className="form-field">
            <Label className="form-label">Max Weekly Hours</Label>
            <Input
              className="form-input form-input--mono"
              type="number"
              min="1"
              max="168"
              value={workRules.weeklyHoursLimit}
              onChange={(e) => updateRules('weeklyHoursLimit', e.target.value)}
            />
            <span className="form-hint">BCEA default: 45 hours</span>
          </div>

          <div className="form-field">
            <Label className="form-label">Overtime Multiplier</Label>
            <Input
              className="form-input form-input--mono"
              type="number"
              step="0.1"
              min="1"
              value={workRules.overtimeRate}
              onChange={(e) => updateRules('overtimeRate', e.target.value)}
            />
            <span className="form-hint">BCEA default: 1.5×</span>
          </div>
        </div>
      </section>

      {/* ── Shifts ─────────────────────────────────────────── */}
      <section className="shifts-step__shifts">
        <h3 className="shifts-step__shifts-title">
          <Clock className="shifts-step__section-icon" />
          Shifts
        </h3>

        <div className="shifts-step__list">
          {shifts.map((shift, i) => {
            const duration = shiftDuration(shift.start_time, shift.end_time)
            return (
              <Card key={i} className="shift-card">
                <CardContent className="shift-card__content">
                  <div className="shift-card__header">
                    <span className="shift-card__label">
                      <Clock className="shift-card__icon" />
                      Shift {i + 1}
                      {shift.name && (
                        <span className="shift-card__name-preview">— {shift.name}</span>
                      )}
                    </span>
                    <div className="shift-card__header-right">
                      {duration && <span className="shift-card__duration">{duration}</span>}
                      {shifts.length > 1 && (
                        <button
                          className="shift-card__remove"
                          onClick={() => remove(i)}
                          aria-label={`Remove shift ${i + 1}`}
                        >
                          <Trash2 className="shift-card__remove-icon" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="shift-card__grid">
                    <div className="form-field shift-card__field--full">
                      <Label className="form-label form-label--required">Shift Name</Label>
                      <Input
                        className="form-input"
                        placeholder="e.g. Morning Shift"
                        value={shift.name}
                        onChange={(e) => update(i, 'name', e.target.value)}
                      />
                    </div>

                    <div className="form-field shift-card__field--full">
                      <Label className="form-label">Site</Label>
                      <Select
                        value={String(shift.site_index)}
                        onValueChange={(v) => update(i, 'site_index', Number(v))}
                      >
                        <SelectTrigger className="form-select-trigger">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="form-select-content">
                          {sites.map((s, si) => (
                            <SelectItem key={si} value={String(si)} className="form-select-item">
                              {s.name || `Site ${si + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-field">
                      <Label className="form-label form-label--required">Start Time</Label>
                      <Input
                        className="form-input form-input--mono"
                        type="time"
                        value={shift.start_time}
                        onChange={(e) => update(i, 'start_time', e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <Label className="form-label form-label--required">End Time</Label>
                      <Input
                        className="form-input form-input--mono"
                        type="time"
                        value={shift.end_time}
                        onChange={(e) => update(i, 'end_time', e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <Label className="form-label">Grace Period (min)</Label>
                      <Input
                        className="form-input form-input--mono"
                        type="number"
                        min="0"
                        max="60"
                        value={shift.grace_period_minutes}
                        onChange={(e) => update(i, 'grace_period_minutes', e.target.value)}
                      />
                      <span className="form-hint">Allowed late check-in window</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Button variant="outline" onClick={add} className="shifts-step__add-btn">
          <Plus className="h-4 w-4 mr-2" /> Add Shift
        </Button>
      </section>
    </div>
  )
}

export default ShiftsStep
