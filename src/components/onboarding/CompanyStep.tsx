import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { Card, CardContent } from '../../components/ui/card'
import '../../styles/form.css'
import '../../styles/companystep.css'

export interface CompanyData {
  name: string
  industry: string
  country: string
}

interface Props {
  data: CompanyData
  onChange: (data: CompanyData) => void
}

const INDUSTRIES = [
  'Agriculture',
  'Construction',
  'Healthcare',
  'Logistics',
  'Manufacturing',
  'Retail',
  'Security',
  'Technology',
  'Other',
] as const
const COUNTRIES = [
  'Botswana',
  'Ghana',
  'Kenya',
  'Namibia',
  'Nigeria',
  'South Africa',
  'Other',
] as const

const CompanyStep = ({ data, onChange }: Props) => {
  const update = (field: keyof CompanyData, value: string) => onChange({ ...data, [field]: value })

  return (
    <Card className="company-card">
      <CardContent className="company-card__content">
        <h2 className="text-xl font-bold mb-4">Company Profile</h2>
        <div className="form-field mb-4">
          <Label className="form-label--required">Legal Name</Label>
          <Input
            className="form-input"
            value={data.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </div>
        <div className="form-field mb-4">
          <Label className="form-label--required">Industry</Label>
          <Select value={data.industry} onValueChange={(v) => update('industry', v || '')}>
            <SelectTrigger className="form-select-trigger">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="form-field">
          <Label className="form-label--required">Country</Label>
          <Select value={data.country} onValueChange={(v) => update('country', v || '')}>
            <SelectTrigger className="form-select-trigger">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
export default CompanyStep
