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
  'Agriculture & Farming',
  'Automotive',
  'Banking & Financial Services',
  'Construction & Infrastructure',
  'Consulting & Professional Services',
  'Education & Training',
  'Energy & Utilities',
  'Engineering',
  'Entertainment & Media',
  'Environmental Services',
  'Food & Beverage',
  'Government & Public Sector',
  'Healthcare & Medical',
  'Hospitality & Tourism',
  'Information Technology',
  'Insurance',
  'Legal Services',
  'Logistics & Supply Chain',
  'Manufacturing',
  'Mining & Resources',
  'Non-Profit & NGO',
  'Pharmaceuticals',
  'Property & Real Estate',
  'Retail & Wholesale',
  'Security Services',
  'Telecommunications',
  'Transportation',
  'Other',
] as const

const COUNTRIES = [
  'Algeria',
  'Angola',
  'Benin',
  'Botswana',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cameroon',
  'Central African Republic',
  'Chad',
  'Comoros',
  'Congo (Brazzaville)',
  'Congo (DRC)',
  'Djibouti',
  'Egypt',
  'Equatorial Guinea',
  'Eritrea',
  'Eswatini',
  'Ethiopia',
  'Gabon',
  'Gambia',
  'Ghana',
  'Guinea',
  'Guinea-Bissau',
  'Ivory Coast',
  'Kenya',
  'Lesotho',
  'Liberia',
  'Libya',
  'Madagascar',
  'Malawi',
  'Mali',
  'Mauritania',
  'Mauritius',
  'Morocco',
  'Mozambique',
  'Namibia',
  'Niger',
  'Nigeria',
  'Rwanda',
  'São Tomé & Príncipe',
  'Senegal',
  'Seychelles',
  'Sierra Leone',
  'Somalia',
  'South Africa',
  'South Sudan',
  'Sudan',
  'Tanzania',
  'Togo',
  'Tunisia',
  'Uganda',
  'Zambia',
  'Zimbabwe',
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
            <Label className="company-card__label ">Company Name</Label>
            <Input
              className="company-card__input"
              value={data.name}
              required
              onChange={(e) => update('name', e.target.value)}
            />
          </div>

          <div className="company-card__row">
            <Label className="company-card__label ">Industry</Label>
            <Select
              value={data.industry}
              onValueChange={(v) => update('industry', v || '')}
              required
            >
              <SelectTrigger className="company-card__select-trigger">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent className="company-card__select-content">
                {INDUSTRIES.map((i) => (
                  <SelectItem className="company-card__select-content-item" key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="company-card__row">
            <Label className="company-card__label ">Country</Label>
            <Select value={data.country} onValueChange={(v) => update('country', v || '')} required>
              <SelectTrigger className="company-card__select-trigger">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="company-card__select-content">
                {COUNTRIES.map((c) => (
                  <SelectItem className="company-card__select-content-item" key={c} value={c}>
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
