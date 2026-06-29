import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent } from '../../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import type { SiteData } from './SitesStep'
import '../../styles/form.css'
import '../../styles/departmentstep.css'

export interface DepartmentData {
  name: string
  site_index: number
}

interface Props {
  data: DepartmentData[]
  sites: SiteData[]
  onChange: (data: DepartmentData[]) => void
}

const DepartmentsStep = ({ data, sites, onChange }: Props) => {
  const update = (i: number, field: keyof DepartmentData, value: string | number) => {
    const updated = [...data]
    updated[i] = { ...updated[i], [field]: value }
    onChange(updated)
  }

  return (
    <div className="departments-step">
      <h2 className="text-xl font-bold mb-4">Departments</h2>
      <div className="departments-step__list space-y-4">
        {data.map((dept, i) => (
          <Card key={i} className="dept-card relative">
            <CardContent className="dept-card__content dept-card__row p-4 grid grid-cols-2 gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="dept-card__remove absolute top-2 right-2 text-destructive"
                onClick={() => onChange(data.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="dept-card__remove-icon h-4 w-4" />
              </Button>
              <div className="form-field">
                <Label>Department Name</Label>
                <Input
                  className="form-input"
                  value={dept.name}
                  onChange={(e) => update(i, 'name', e.target.value)}
                />
              </div>
              <div className="form-field">
                <Label>Associated Site</Label>
                <Select
                  value={String(dept.site_index)}
                  onValueChange={(v) => update(i, 'site_index', Number(v))}
                >
                  <SelectTrigger className="form-select-trigger">
                    <SelectValue />
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
            </CardContent>
          </Card>
        ))}
      </div>
      <Button
        variant="outline"
        onClick={() => onChange([...data, { name: '', site_index: 0 }])}
        className="mt-4 w-full"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Department
      </Button>
    </div>
  )
}

export default DepartmentsStep
