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
      <h2 className="text-xl font-bold mb-4">Custom Roles</h2>
      <div className="roles-step__list space-y-4">
        {data.map((role, i) => (
          <Card key={i} className="role-card relative">
            <CardContent className="role-card__content p-4 grid grid-cols-2 gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-destructive"
                onClick={() => onChange(data.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="form-field">
                <Label>Role Name (e.g. Shift Lead)</Label>
                <Input
                  className="form-input"
                  value={role.name}
                  onChange={(e) => update(i, 'name', e.target.value)}
                />
              </div>
              <div className="form-field">
                <Label>Base Permission Tier</Label>
                <Select
                  value={role.base_role}
                  onValueChange={(v) => update(i, 'base_role', v as RoleData['base_role'])}
                >
                  <SelectTrigger className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BASE_ROLES.map((br) => (
                      <SelectItem key={br.value} value={br.value}>
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
      <Button
        variant="outline"
        onClick={() => onChange([...data, { name: '', base_role: 'employee' }])}
        className="mt-4 w-full"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Custom Role
      </Button>
    </div>
  )
}

export default RolesStep
