import { Label } from "../ui/label"
import { Switch } from "../ui/switch"
import { Input } from "../ui/input"
import { Card, CardContent } from "../ui/card"
import {
	QrCode,
	Fingerprint,
	MessageCircle,
	PenLine,
	MapPin,
} from "lucide-react"

import "../../styles/form.css"
import "../../styles/checkinmethods.css"

export interface CheckInSettings {
	methods: {
		qr: boolean
		biometric: boolean
		whatsapp: boolean
		manual: boolean
	}
	geofencing_enabled: boolean
	default_geofence_radius: string
}

interface Props {
	data: CheckInSettings
	onChange: (data: CheckInSettings) => void
}

const METHOD_INFO = [
	{
		key: "qr" as const,
		label: "QR Code",
		desc: "Employees scan a QR code at the site",
		icon: QrCode,
	},
	{
		key: "biometric" as const,
		label: "Biometric",
		desc: "Fingerprint or face recognition",
		icon: Fingerprint,
	},
	{
		key: "whatsapp" as const,
		label: "WhatsApp",
		desc: "Check in via WhatsApp message — requires Twilio",
		icon: MessageCircle,
	},
	{
		key: "manual" as const,
		label: "Manual Entry",
		desc: "Supervisor or admin captures attendance manually",
		icon: PenLine,
	},
] as const

type MethodKey = (typeof METHOD_INFO)[number]["key"]

const CheckInMethodsStep = ({ data, onChange }: Props) => {
	const toggleMethod = (key: MethodKey) =>
		onChange({
			...data,
			methods: { ...data.methods, [key]: !data.methods[key] },
		})

	const enabledCount = Object.values(data.methods).filter(Boolean).length

	return (
		<div className="checkin-step">
			{/* ── Methods ───────────────────────────────────────── */}
			<section className="checkin-step__section">
				<div className="checkin-step__section-header">
					<h3 className="checkin-step__section-title">Check-In Methods</h3>
					<span className="checkin-step__enabled-count">
						{enabledCount} enabled
					</span>
				</div>
				<p className="checkin-step__desc">
					Enable the attendance capture methods your organisation will use.
				</p>

				<div className="checkin-step__methods">
					{METHOD_INFO.map((m) => {
						const active = data.methods[m.key]
						return (
							<Card
								key={m.key}
								className={`method-card ${active ? "method-card--active" : ""}`}
								onClick={() => toggleMethod(m.key)}
								role="checkbox"
								aria-checked={active}
								tabIndex={0}
								onKeyDown={(e) =>
									(e.key === " " || e.key === "Enter") && toggleMethod(m.key)
								}>
								<CardContent className="method-card__content">
									<div
										className={`method-card__icon-wrap method-card__icon-wrap--${m.key}`}>
										<m.icon className="method-card__icon" />
									</div>
									<div className="method-card__body">
										<p className="method-card__label">{m.label}</p>
										<p className="method-card__desc">{m.desc}</p>
									</div>
									<Switch
										checked={active}
										onCheckedChange={() => toggleMethod(m.key)}
										onClick={(e) => e.stopPropagation()}
										className="method-card__switch"
										aria-label={`Toggle ${m.label}`}
									/>
								</CardContent>
							</Card>
						)
					})}
				</div>
			</section>

			{/* ── Geofencing ────────────────────────────────────── */}
			<section className="checkin-step__section">
				<h3 className="checkin-step__section-title">Geofencing</h3>
				<p className="checkin-step__desc">
					Validate employee location during check-in against each site's radius.
				</p>

				<Card
					className={`method-card ${data.geofencing_enabled ? "method-card--active" : ""}`}
					onClick={() =>
						onChange({ ...data, geofencing_enabled: !data.geofencing_enabled })
					}
					role="checkbox"
					aria-checked={data.geofencing_enabled}
					tabIndex={0}
					onKeyDown={(e) =>
						(e.key === " " || e.key === "Enter") &&
						onChange({ ...data, geofencing_enabled: !data.geofencing_enabled })
					}>
					<CardContent className="method-card__content">
						<div className="method-card__icon-wrap method-card__icon-wrap--geo">
							<MapPin className="method-card__icon" />
						</div>
						<div className="method-card__body">
							<p className="method-card__label">Location Enforcement</p>
							<p className="method-card__desc">
								Require employees to be within site geofence to check in
							</p>
						</div>
						<Switch
							checked={data.geofencing_enabled}
							onCheckedChange={(v) =>
								onChange({ ...data, geofencing_enabled: v })
							}
							onClick={(e) => e.stopPropagation()}
							className="method-card__switch"
							aria-label="Toggle geofencing"
						/>
					</CardContent>
				</Card>

				{data.geofencing_enabled && (
					<div className="checkin-step__geo-radius">
						<div className="form-field">
							<Label className="form-label">Default Geofence Radius (m)</Label>
							<Input
								className="form-input form-input--mono checkin-step__radius-input"
								type="number"
								min="50"
								max="10000"
								value={data.default_geofence_radius}
								onChange={(e) =>
									onChange({ ...data, default_geofence_radius: e.target.value })
								}
							/>
							<span className="form-hint">
								Per-site radius set in Sites overrides this default
							</span>
						</div>
					</div>
				)}
			</section>
		</div>
	)
}

export default CheckInMethodsStep
