import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
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
  onShiftsChange: (s: ShiftData[]) => void
  onWorkRulesChange: (w: WorkRules) => void
}

const ShiftsStep = ({ shifts, workRules, sites, onShiftsChange, onWorkRulesChange }: Props) => {
  const updateShift = (i: number, field: keyof ShiftData, value: string | number) => {
    const updated = [...shifts]
    updated[i] = { ...updated[i], [field]: value }
    onShiftsChange(updated)
  }

  const updateRule = (field: keyof WorkRules, value: number) => {
    onWorkRulesChange({ ...workRules, [field]: value })
  }

  return (
    <div className="shifts-step">
      {/* Work Rules Section */}
      <div className="shifts-step__rules mb-2">
        <div className="shifts-step__section-header">
          <Scale className="shifts-step__section-icon" />
          <span className="shifts-step__section-title">Compliance & Work Rules</span>
          <span className="shifts-step__bcea-tag">BCEA Compliant</span>
        </div>

        <div className="shifts-step__rules-grid">
          <div className="shift-card__row">
            <Label className="shift-card__label">Weekly Hours Limit</Label>
            <Input
              type="number"
              className="shift-card__input"
              value={workRules.weeklyHoursLimit}
              onChange={(e) => updateRule('weeklyHoursLimit', Number(e.target.value))}
            />
          </div>
          <div className="shift-card__row">
            <Label className="shift-card__label">Overtime Multiplier</Label>
            <Input
              type="number"
              step="0.1"
              className="shift-card__input"
              value={workRules.overtimeRate}
              onChange={(e) => updateRule('overtimeRate', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Shifts Section */}
      <div>
        <div className="shifts-step__section-header mb-3">
          <Clock className="shifts-step__section-icon" />
          <span className="shifts-step__section-title">Standard Shifts</span>
        </div>

        <div className="shifts-step__cards-container">
          {shifts.map((shift, i) => (
            <Card key={i} className="shift-card relative">
              <CardContent className="shift-card__content">
                <button
                  type="button"
                  className="shift-card__remove absolute top-2 right-2"
                  onClick={() => onShiftsChange(shifts.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="shift-card__remove-icon" />
                </button>

                <div className="shift-card__grid">
                  <div className="shift-card__row pr-8">
                    <Label className="shift-card__label">Shift Name</Label>
                    <Input
                      className="shift-card__input"
                      placeholder="Day Shift"
                      value={shift.name}
                      onChange={(e) => updateShift(i, 'name', e.target.value)}
                    />
                  </div>

                  <div className="shift-card__row">
                    <Label className="shift-card__label">Start Time</Label>
                    <Input
                      type="time"
                      className="shift-card__input"
                      value={shift.start_time}
                      onChange={(e) => updateShift(i, 'start_time', e.target.value)}
                    />
                  </div>

                  <div className="shift-card__row">
                    <Label className="shift-card__label">End Time</Label>
                    <Input
                      type="time"
                      className="shift-card__input"
                      value={shift.end_time}
                      onChange={(e) => updateShift(i, 'end_time', e.target.value)}
                    />
                  </div>

                  <div className="shift-card__row">
                    <Label className="shift-card__label">Grace Period (min)</Label>
                    <Input
                      type="number"
                      className="shift-card__input"
                      value={shift.grace_period_minutes}
                      onChange={(e) => updateShift(i, 'grace_period_minutes', e.target.value)}
                    />
                  </div>

                  <div className="shift-card__row">
                    <Label className="shift-card__label">Associated Site</Label>
                    <Select
                      value={String(shift.site_index)}
                      onValueChange={(v) => updateShift(i, 'site_index', Number(v))}
                    >
                      <SelectTrigger className="shift-card__select-trigger">
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                      <SelectContent className="shift-card__select-content">
                        {sites.map((s, si) => (
                          <SelectItem
                            key={si}
                            value={String(si)}
                            className="shift-card__select-content-item"
                          >
                            {s.name || `Site ${si + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <button
        onClick={() =>
          onShiftsChange([
            ...shifts,
            {
              name: '',
              start_time: '08:00',
              end_time: '17:00',
              grace_period_minutes: '15',
              site_index: 0,
            },
          ])
        }
        className="shifts-step__add-btn"
      >
        <Plus className="shifts-step__add-btn-icon" /> Add Standard Shift
      </button>
    </div>
  )
}

export default ShiftsStep
