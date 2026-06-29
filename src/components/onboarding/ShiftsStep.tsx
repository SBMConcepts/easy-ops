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
      <div className="shifts-step__rules">
        <div className="form-section__title">
          <Scale className="shifts-step__section-icon" />
          <span>Compliance & Work Rules</span>
          <span className="shifts-step__bcea-tag">BCEA Compliant</span>
        </div>

        <div className="shift-card__grid mb-6">
          <div className="shift-card__field">
            <Label>Weekly Hours Limit</Label>
            <Input
              type="number"
              value={workRules.weeklyHoursLimit}
              onChange={(e) => updateRule('weeklyHoursLimit', Number(e.target.value))}
            />
          </div>
          <div className="shift-card__field">
            <Label>Overtime Rate Multiplier</Label>
            <Input
              type="number"
              step="0.1"
              value={workRules.overtimeRate}
              onChange={(e) => updateRule('overtimeRate', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Shifts Section */}
      <div>
        <div className="form-section__title flex items-center gap-1.5 font-semibold text-sm mb-3">
          <Clock className="shifts-step__section-icon" />
          <span>Standard Shifts</span>
        </div>

        <div className="flex flex-col gap-3">
          {shifts.map((shift, i) => (
            <Card key={i} className="shift-card">
              <CardContent className="shift-card__content relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shift-card__remove absolute top-2 right-2 text-destructive"
                  onClick={() => onShiftsChange(shifts.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="shift-card__remove-icon" />
                </Button>

                <div className="shift-card__grid">
                  <div className="shift-card__field shift-card__field--full">
                    <Label>Shift Name</Label>
                    <Input
                      placeholder="Day Shift"
                      value={shift.name}
                      onChange={(e) => updateShift(i, 'name', e.target.value)}
                    />
                  </div>

                  <div className="shift-card__field">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={shift.start_time}
                      onChange={(e) => updateShift(i, 'start_time', e.target.value)}
                    />
                  </div>

                  <div className="shift-card__field">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={shift.end_time}
                      onChange={(e) => updateShift(i, 'end_time', e.target.value)}
                    />
                  </div>

                  <div className="shift-card__field">
                    <Label>Grace Period (minutes)</Label>
                    <Input
                      type="number"
                      value={shift.grace_period_minutes}
                      onChange={(e) => updateShift(i, 'grace_period_minutes', e.target.value)}
                    />
                  </div>

                  <div className="shift-card__field">
                    <Label>Associated Site</Label>
                    <Select
                      value={String(shift.site_index)}
                      onValueChange={(v) => updateShift(i, 'site_index', Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map((s, si) => (
                          <SelectItem key={si} value={String(si)}>
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

      <Button
        variant="outline"
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
        className="w-full mt-2"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Standard Shift
      </Button>
    </div>
  )
}

export default ShiftsStep
