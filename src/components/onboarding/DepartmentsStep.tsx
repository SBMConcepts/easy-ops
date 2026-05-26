import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { Plus, Trash2, Building2 } from 'lucide-react'
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

const EMPTY_DEPARTMENT: DepartmentData = {
  name: '',
  site_index: 0,
}

const DepartmentsStep = ({ data, sites, onChange }: Props) => {
  const add = () => onChange([...data, { ...EMPTY_DEPARTMENT }])

  const remove = (i: number) => onChange(data.filter((_, idx) => idx !== i))

  const update = (i: number, field: keyof DepartmentData, value: string | number) => {
    const updated = [...data]
    updated[i] = { ...updated[i], [field]: value }
    onChange(updated)
  }

  return (
    <div className="departments-step">
      <p className="departments-step__desc">
        Define the departments in your organisation and link them to a site.
      </p>

      <div className="departments-step__list">
        {data.map((dept, i) => (
          <Card key={i} className="dept-card">
            <CardContent className="dept-card__content">
              <div className="dept-card__header">
                <span className="dept-card__label">
                  <Building2 className="dept-card__icon" />
                  Department {i + 1}
                  {dept.name && <span className="dept-card__name-preview">— {dept.name}</span>}
                </span>
                {data.length > 1 && (
                  <button
                    className="dept-card__remove"
                    onClick={() => remove(i)}
                    aria-label={`Remove department ${i + 1}`}
                  >
                    <Trash2 className="dept-card__remove-icon" />
                  </button>
                )}
              </div>

              <div className="dept-card__row">
                <div className="form-field">
                  <Label className="form-label form-label--required">Department Name</Label>
                  <Input
                    className="form-input"
                    placeholder="e.g. Operations"
                    value={dept.name}
                    onChange={(e) => update(i, 'name', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <Label className="form-label">Site</Label>
                  <Select
                    value={String(dept.site_index)}
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={add} className="departments-step__add-btn">
        <Plus className="h-4 w-4 mr-2" /> Add Department
      </Button>
    </div>
  )
}

export default DepartmentsStep
