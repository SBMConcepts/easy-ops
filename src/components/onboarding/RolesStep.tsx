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

import '../../styles/form.css'
import '../../styles/rolesstep.css'

export interface RoleData {
  name: string
  base_role: 'admin' | 'manager' | 'supervisor' | 'employee'
}

interface Props {
  data: RoleData[]
  onChange: (data: RoleData[]) => void
}

const BASE_ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full system access' },
  { value: 'manager', label: 'Manager', desc: 'Operational oversight' },
  { value: 'supervisor', label: 'Supervisor', desc: 'Team-level access' },
  { value: 'employee', label: 'Employee', desc: 'Self-service only' },
] as const

const RolesStep = ({ data, onChange }: Props) => {
  const update = (i: number, field: keyof RoleData, value: string) => {
    const updated = [...data]
    updated[i] = { ...updated[i], [field]: value }
    onChange(updated)
  }

  return (
    <div className="roles-step">
      <div>
        <h2 className="text-xl font-bold mb-1">Custom Roles</h2>
        <p className="roles-step__desc">Define specialized access tiers for your organization.</p>
      </div>

      <div className="roles-step__list">
        {data.map((role, i) => (
          <Card key={i} className="role-card relative">
            <CardContent className="role-card__content grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                className="role-card__remove"
                onClick={() => onChange(data.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="role-card__remove-icon " />
              </button>

              <div className="role-card__row">
                <Label className="role-card__label">Role Name (e.g. Shift Lead)</Label>
                <Input
                  className="role-card__input"
                  value={role.name}
                  onChange={(e) => update(i, 'name', e.target.value)}
                />
              </div>

              <div className="role-card__row pr-6">
                <Label className="role-card__label">Base Permission Tier</Label>
                <Select
                  value={role.base_role}
                  onValueChange={(v) => update(i, 'base_role', v as RoleData['base_role'])}
                >
                  <SelectTrigger className="role-card__select-trigger ">
                    <SelectValue placeholder="Select Tier" />
                  </SelectTrigger>
                  <SelectContent className="role-card__select-content">
                    {BASE_ROLES.map((br) => (
                      <SelectItem
                        key={br.value}
                        value={br.value}
                        className="role-card__select-content-item"
                      >
                        {br.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <button
        onClick={() => onChange([...data, { name: '', base_role: 'employee' }])}
        className="roles-step__add-btn"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Custom Role
      </button>
    </div>
  )
}

export default RolesStep
