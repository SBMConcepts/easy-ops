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
      <div>
        <h2 className="text-xl font-bold mb-1">Departments</h2>
        <p className="departments-step__desc">
          Organize your workforce into operational divisions.
        </p>
      </div>

      <div className="departments-step__list">
        {data.map((dept, i) => (
          <Card key={i} className="dept-card relative">
            <CardContent className="dept-card__content">
              <button
                type="button"
                className="dept-card__remove absolute top-2 right-2"
                onClick={() => onChange(data.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="dept-card__remove-icon" />
              </button>

              <div className="dept-card__row pr-8">
                <div className="dept-card__row">
                  <Label className="dept-card__label">Department Name</Label>
                  <Input
                    className="dept-card__input"
                    value={dept.name}
                    onChange={(e) => update(i, 'name', e.target.value)}
                  />
                </div>
                <div className="dept-card__row">
                  <Label className="dept-card__label">Associated Site</Label>
                  <Select
                    value={String(dept.site_index)}
                    onValueChange={(v) => update(i, 'site_index', Number(v))}
                  >
                    <SelectTrigger className="dept-card__select-trigger">
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent className="dept-card__select-content">
                      {sites.map((s, si) => (
                        <SelectItem
                          key={si}
                          value={String(si)}
                          className="dept-card__select-content-item"
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

      <button
        type="button"
        onClick={() => onChange([...data, { name: '', site_index: 0 }])}
        className="departments-step__add-btn"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Department
      </button>
    </div>
  )
}

export default DepartmentsStep
