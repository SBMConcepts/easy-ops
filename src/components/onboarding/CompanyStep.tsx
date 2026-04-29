import { Input } from "../ui/input"
import { Label } from "../ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select"
import "../../styles/form.css"
import "../../styles/companystep.css"
import { Card, CardContent } from "../ui/card"

const INDUSTRIES = [
	"Agriculture",
	"Cleaning Services",
	"Construction",
	"Education",
	"Financial Services",
	"Healthcare",
	"Hospitality",
	"Logistics",
	"Manufacturing",
	"Mining",
	"Retail",
	"Security",
	"Technology",
	"Other",
] as const

const COUNTRIES = [
	"Botswana",
	"Ghana",
	"Kenya",
	"Mozambique",
	"Namibia",
	"Nigeria",
	"South Africa",
	"Zambia",
	"Zimbabwe",
	"Other",
] as const

type Industry = (typeof INDUSTRIES)[number]
type Country = (typeof COUNTRIES)[number]

export interface CompanyData {
	name: string
	industry: Industry | ""
	country: Country | ""
}

interface Props {
	data: CompanyData
	onChange: (data: CompanyData) => void
}

const CompanyStep = ({ data, onChange }: Props) => {
	const update = <K extends keyof CompanyData>(key: K, value: CompanyData[K]) =>
		onChange({ ...data, [key]: value })
	return (
		<Card className="company-card">
			<CardContent className="company-card__content">
				<div className="company-card__row">
					<div className="form-field">
						<Label
							htmlFor="company-name"
							className="company-card__label form-label--required">
							Company Name *
						</Label>
						<Input
							id="company-name"
							placeholder="e.g. Acme Holdings (Pty) Ltd"
							value={data.name}
							onChange={(e) => onChange({ ...data, name: e.target.value })}
							className="form-input"
						/>
					</div>
				</div>

				<div className="company-card__row">
					<div className="form-field">
						<Label className="company-card__label form-label--required">
							Industry
						</Label>
						<Select
							value={data.industry}
							onValueChange={(v) => update("industry", v as Industry)}>
							<SelectTrigger className="form-select-trigger">
								<SelectValue placeholder="Select your industry" />
							</SelectTrigger>
							<SelectContent className="form-select-content">
								{INDUSTRIES.map((i) => (
									<SelectItem key={i} value={i} className="form-select-item">
										{i}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="company-card__row">
					<div className="form-field">
						<Label className="company-card__label form-label--required">
							Country
						</Label>
						<Select
							value={data.country}
							onValueChange={(v) => update("country", v as Country)}>
							<SelectTrigger className="form-select-trigger">
								<SelectValue placeholder="Select country" />
							</SelectTrigger>
							<SelectContent className="form-select-content">
								{COUNTRIES.map((c) => (
									<SelectItem key={c} value={c} className="form-select-item">
										{c}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export default CompanyStep
