"use client"
import {
	ScanFace,
	ScaleIcon,
	HandshakeIcon,
	Scale3DIcon,
	BookmarkCheck,
	ChartNetwork,
	Eye,
	MapPinCheck,
	IdCardLanyardIcon,
	Building2Icon,
	type LucideIcon,
} from "lucide-react"
import "../styles/features.css"

type FeatureItem = {
	title: string
	description: string
	icon: LucideIcon
}

const featureItems: FeatureItem[] = [
	{
		title: "Accurate Time & Attendance",
		description:
			"Eliminates manual registers, paper timesheets, and buddy-clocking with QR codes, biometrics, and WhatsApp check-ins.",
		icon: ScanFace,
	},
	{
		title: "Reduced Payroll Errors",
		description:
			"Automatic recording of hours, overtime, and late arrivals in real time. Integrates with payroll systems seamlessly.",
		icon: BookmarkCheck,
	},
	{
		title: "Increased Productivity",
		description:
			"Digital attendance tracking encourages punctuality and discipline. See who is on-site, late, or absent instantly.",
		icon: ChartNetwork,
	},
	{
		title: "Real-Time Visibility",
		description:
			"Live dashboards for multiple branches or remote teams with instant alerts for absenteeism or unusual patterns.",
		icon: Eye,
	},
	{
		title: "Flexible Check-In Methods",
		description:
			"QR code scanning, biometric verification, and WhatsApp chatbot check-ins for offices, factories, and field workers.",
		icon: MapPinCheck,
	},
	{
		title: "Labour Law Compliance",
		description:
			"Digital records of working hours, overtime, and rest periods ensure BCEA & IRA compliance for audits and disputes.",
		icon: ScaleIcon,
	},
	{
		title: "HR & Operational Reporting",
		description:
			"Automatic reports on absenteeism, late arrivals, overtime trends, and patterns exportable for HR use.",
		icon: HandshakeIcon,
	},
	{
		title: "Cost-Effective & Scalable",
		description:
			"Cloud-based system that scales with your company. High ROI with low setup costs, suitable for SMEs to enterprises.",
		icon: Scale3DIcon,
	},
	{
		title: "Improved Employee Experience",
		description:
			"Simple, fast check-in process with transparent records. WhatsApp option removes the need for extra apps.",
		icon: IdCardLanyardIcon,
	},
	{
		title: "Centralised Operations",
		description:
			"All attendance data in one secure system, accessible anywhere. Reduces admin workload for HR and operations teams.",
		icon: Building2Icon,
	},
]

export default function Features() {
	return (
		<section className="features-section" id="features">
			<div className="features-container">
				<div className="features-content">
					<div className="features-heading-and-text-wrapper">
						<div className="features-heading-and-text">
							<div className="features-subheading">FEATURES</div>
							<h2 className="features-heading">
								Everything You Need to Manage Your Workforce
							</h2>
						</div>

						<p className="features-supporting-text">
							From attendance tracking to payroll compliance, EazyOps gives
							South African businesses the tools to operate efficiently.
						</p>
					</div>
				</div>

				<div className="features-grid">
					{featureItems.map((item) => {
						const Icon = item.icon

						return (
							<article className="feature-card" key={item.title}>
								<div className="featured-icon">
									<Icon className="feature-icon-svg" aria-hidden="true" />
								</div>

								<div className="features-text-and-supporting">
									<h3 className="features-text">{item.title}</h3>
									<p className="features-text-wrapper">{item.description}</p>
								</div>
							</article>
						)
					})}
				</div>
			</div>
		</section>
	)
}
