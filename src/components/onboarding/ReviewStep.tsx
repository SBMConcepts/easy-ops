import { Card, CardContent } from "../ui/card"
import {
	Building2,
	MapPin,
	Users,
	ShieldCheck,
	Clock,
	QrCode,
	Fingerprint,
	MessageCircle,
	PenLine,
	Scale,
	CheckCircle2,
	XCircle,
} from "lucide-react"
import type { CompanyData } from "./CompanyStep"
import type { SiteData } from "./SitesStep"
import type { DepartmentData } from "./DepartmentsStep"
import type { RoleData } from "./RolesStep"
import type { ShiftData, WorkRules } from "./ShiftsStep"
import type { CheckInSettings } from "./CheckInMethodsStep"

import "../../styles/form.css"
import "../../styles/reviewstep.css"

interface Props {
	company: CompanyData
	sites: SiteData[]
	departments: DepartmentData[]
	roles: RoleData[]
	shifts: ShiftData[]
	checkInMethods: CheckInSettings
	workRules: WorkRules
}

const METHOD_ICONS: Record<string, React.ElementType> = {
	qr: QrCode,
	biometric: Fingerprint,
	whatsapp: MessageCircle,
	manual: PenLine,
}

const METHOD_LABELS: Record<string, string> = {
	qr: "QR Code",
	biometric: "Biometric",
	whatsapp: "WhatsApp",
	manual: "Manual Entry",
}

const shiftDuration = (start: string, end: string): string | null => {
	const [sh, sm] = start.split(":").map(Number)
	const [eh, em] = end.split(":").map(Number)
	const totalMins = eh * 60 + em - (sh * 60 + sm)
	if (totalMins <= 0) return null
	const h = Math.floor(totalMins / 60)
	const m = totalMins % 60
	return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const ReviewStep = ({
	company,
	sites,
	departments,
	roles,
	shifts,
	checkInMethods,
	workRules,
}: Props) => {
	const enabledMethods = Object.entries(checkInMethods.methods).filter(
		([, v]) => v,
	)

	return (
		<div className="review-step">
			<p className="review-step__desc">
				Review your organisation setup before confirming.
			</p>

			{/* ── Company ──────────────────────────────────────── */}
			<Card className="review-card">
				<CardContent className="review-card__content">
					<div className="review-card__heading">
						<Building2 className="review-card__heading-icon" />
						<span className="review-card__title">Company</span>
					</div>
					<div className="review-card__body">
						<p className="review-company__name">{company.name}</p>
						<div className="review-pills">
							{company.industry && (
								<span className="review-pill">{company.industry}</span>
							)}
							{company.country && (
								<span className="review-pill">{company.country}</span>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ── Sites ────────────────────────────────────────── */}
			<Card className="review-card">
				<CardContent className="review-card__content">
					<div className="review-card__heading">
						<MapPin className="review-card__heading-icon" />
						<span className="review-card__title">Sites</span>
						<span className="review-card__count">{sites.length}</span>
					</div>
					<div className="review-card__body">
						{sites.map((s, i) => (
							<div key={i} className="review-row">
								<span className="review-row__name">
									{s.name || `Site ${i + 1}`}
								</span>
								{s.address && (
									<span className="review-row__meta">{s.address}</span>
								)}
								{s.latitude && s.longitude && (
									<span className="review-row__tag review-row__tag--mono">
										{s.latitude}, {s.longitude}
									</span>
								)}
								<span className="review-row__tag">
									{s.geofence_radius_m || 200}m radius
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* ── Departments ──────────────────────────────────── */}
			<Card className="review-card">
				<CardContent className="review-card__content">
					<div className="review-card__heading">
						<Users className="review-card__heading-icon" />
						<span className="review-card__title">Departments</span>
						<span className="review-card__count">{departments.length}</span>
					</div>
					<div className="review-card__body">
						{departments.map((d, i) => (
							<div key={i} className="review-row">
								<span className="review-row__name">{d.name}</span>
								<span className="review-row__arrow">→</span>
								<span className="review-row__meta">
									{sites[d.site_index]?.name || "Unknown site"}
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* ── Roles ────────────────────────────────────────── */}
			<Card className="review-card">
				<CardContent className="review-card__content">
					<div className="review-card__heading">
						<ShieldCheck className="review-card__heading-icon" />
						<span className="review-card__title">Roles</span>
						<span className="review-card__count">{roles.length}</span>
					</div>
					<div className="review-card__body">
						<div className="review-roles">
							{roles.map((r, i) => (
								<div
									key={i}
									className={`review-role-badge review-role-badge--${r.base_role}`}>
									<span className="review-role-badge__name">{r.name}</span>
									<span className="review-role-badge__base">{r.base_role}</span>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ── Shifts ───────────────────────────────────────── */}
			<Card className="review-card">
				<CardContent className="review-card__content">
					<div className="review-card__heading">
						<Clock className="review-card__heading-icon" />
						<span className="review-card__title">Shifts</span>
						<span className="review-card__count">{shifts.length}</span>
					</div>
					<div className="review-card__body">
						{shifts.map((s, i) => {
							const duration = shiftDuration(s.start_time, s.end_time)
							return (
								<div key={i} className="review-row">
									<span className="review-row__name">{s.name}</span>
									<span className="review-row__tag review-row__tag--mono">
										{s.start_time} – {s.end_time}
									</span>
									{duration && (
										<span className="review-row__tag review-row__tag--primary">
											{duration}
										</span>
									)}
									<span className="review-row__meta">
										{s.grace_period_minutes}min grace
									</span>
									<span className="review-row__meta">
										{sites[s.site_index]?.name || `Site ${s.site_index + 1}`}
									</span>
								</div>
							)
						})}

						<div className="review-divider" />

						<div className="review-card__heading review-card__heading--sub">
							<Scale className="review-card__heading-icon" />
							<span className="review-card__title">Work Rules</span>
						</div>
						<div className="review-row">
							<span className="review-row__meta">Max weekly hours</span>
							<span className="review-row__tag review-row__tag--mono">
								{workRules.max_weekly_hours}h
							</span>
							<span className="review-row__meta review-row__sep">·</span>
							<span className="review-row__meta">Overtime</span>
							<span className="review-row__tag review-row__tag--mono">
								{workRules.overtime_multiplier}×
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ── Check-In Methods ─────────────────────────────── */}
			<Card className="review-card">
				<CardContent className="review-card__content">
					<div className="review-card__heading">
						<QrCode className="review-card__heading-icon" />
						<span className="review-card__title">Check-In Methods</span>
						<span className="review-card__count">
							{enabledMethods.length} enabled
						</span>
					</div>
					<div className="review-card__body">
						<div className="review-methods">
							{Object.entries(checkInMethods.methods).map(([key, enabled]) => {
								const Icon = METHOD_ICONS[key]
								return (
									<div
										key={key}
										className={`review-method ${enabled ? "review-method--on" : "review-method--off"}`}>
										{Icon && <Icon className="review-method__icon" />}
										<span className="review-method__label">
											{METHOD_LABELS[key] ?? key}
										</span>
										{enabled ?
											<CheckCircle2 className="review-method__status review-method__status--on" />
										:	<XCircle className="review-method__status review-method__status--off" />
										}
									</div>
								)
							})}
						</div>

						<div className="review-divider" />

						<div className="review-row">
							<MapPin className="review-row__inline-icon" />
							<span className="review-row__meta">Geofencing</span>
							{checkInMethods.geofencing_enabled ?
								<>
									<span className="review-row__tag review-row__tag--green">
										Enabled
									</span>
									<span className="review-row__tag review-row__tag--mono">
										{checkInMethods.default_geofence_radius}m default
									</span>
								</>
							:	<span className="review-row__tag review-row__tag--muted">
									Disabled
								</span>
							}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default ReviewStep
