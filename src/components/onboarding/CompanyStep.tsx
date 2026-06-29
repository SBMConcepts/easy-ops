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
    <div className="company-step">
      <Card className="company-card">
        <CardContent className="company-card__content">
          <div className="company-step__desc">
            <h2 className="text-xl font-bold">Company Profile</h2>
          </div>

          <div className="company-card__row">
            <Label className="company-card__label form-label--required">Legal Name</Label>
            <Input
              className="form-input"
              value={data.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>

          <div className="company-card__row">
            <Label className="company-card__label form-label--required">Industry</Label>
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

          <div className="company-card__row">
            <Label className="company-card__label form-label--required">Country</Label>
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
    </div>
  )
}

export default CompanyStep
