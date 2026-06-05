import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import type { SiteData } from './SitesStep'

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

const ShiftsStep = ({ shifts, onShiftsChange }: Props) => {
  const update = (i: number, field: keyof ShiftData, value: string) => {
    const updated = [...shifts]
    updated[i] = { ...updated[i], [field]: value }
    onShiftsChange(updated)
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Standard Shifts</h2>
      <div className="space-y-4">
        {shifts.map((shift, i) => (
          <Card key={i} className="relative">
            <CardContent className="p-4 grid grid-cols-3 gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-destructive"
                onClick={() => onShiftsChange(shifts.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="form-field">
                <Label>Shift Name</Label>
                <Input value={shift.name} onChange={(e) => update(i, 'name', e.target.value)} />
              </div>
              <div className="form-field">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={shift.start_time}
                  onChange={(e) => update(i, 'start_time', e.target.value)}
                />
              </div>
              <div className="form-field">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={shift.end_time}
                  onChange={(e) => update(i, 'end_time', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
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
        className="mt-4 w-full"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Shift
      </Button>
    </div>
  )
}
export default ShiftsStep
