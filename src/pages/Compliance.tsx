import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import {
	Shield,
	FileCheck,
	AlertTriangle,
	CheckCircle2,
	Clock,
} from "lucide-react"
import { dashboardStats } from "../data/mockData"

const auditItems = [
	{
		label: "Working hours within BCEA limits",
		status: "pass",
		detail: "All employees under 45h/week",
	},
	{
		label: "Overtime records maintained",
		status: "pass",
		detail: "3.1h overtime logged this week",
	},
	{
		label: "Rest periods documented",
		status: "pass",
		detail: "Minimum 12h between shifts",
	},
	{
		label: "Leave records up to date",
		status: "warning",
		detail: "1 employee leave not captured",
	},
	{
		label: "Attendance records secured",
		status: "pass",
		detail: "All data encrypted and backed up",
	},
	{
		label: "Buddy-clocking prevention active",
		status: "pass",
		detail: "Biometric verification enabled",
	},
]

const Compliance = () => {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-display text-2xl font-bold text-foreground">
					Compliance & Audit
				</h1>
				<p className="text-muted-foreground text-sm mt-1">
					BCEA & IRA compliance monitoring and audit trails
				</p>
			</div>

			<div className="grid md:grid-cols-3 gap-4">
				<Card className="shadow-card border-secondary/20 border-2">
					<CardContent className="p-6 text-center">
						<Shield className="h-10 w-10 text-secondary mx-auto mb-2" />
						<p className="text-3xl font-bold font-display text-foreground">
							{dashboardStats.complianceScore}%
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							Compliance Score
						</p>
					</CardContent>
				</Card>
				<Card className="shadow-card">
					<CardContent className="p-6 text-center">
						<FileCheck className="h-10 w-10 text-primary mx-auto mb-2" />
						<p className="text-3xl font-bold font-display text-foreground">
							5/6
						</p>
						<p className="text-sm text-muted-foreground mt-1">Checks Passed</p>
					</CardContent>
				</Card>
				<Card className="shadow-card">
					<CardContent className="p-6 text-center">
						<Clock className="h-10 w-10 text-accent mx-auto mb-2" />
						<p className="text-3xl font-bold font-display text-foreground">
							30 days
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							Records Retained
						</p>
					</CardContent>
				</Card>
			</div>

			<Card className="shadow-card">
				<CardHeader>
					<CardTitle className="font-display text-lg">
						Compliance Checklist
					</CardTitle>
					<CardDescription>
						Automated checks against BCEA and IRA requirements
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{auditItems.map((item, i) => (
							<div
								key={i}
								className="flex items-center gap-3 py-3 border-b border-border last:border-0">
								{item.status === "pass" ?
									<CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
								:	<AlertTriangle className="h-5 w-5 text-accent shrink-0" />}
								<div className="flex-1">
									<p className="text-sm font-medium text-foreground">
										{item.label}
									</p>
									<p className="text-xs text-muted-foreground">{item.detail}</p>
								</div>
								<Badge
									variant="outline"
									className={
										item.status === "pass" ?
											"bg-secondary/10 text-secondary border-secondary/20"
										:	"bg-accent/10 text-accent-foreground border-accent/20"
									}>
									{item.status === "pass" ? "Pass" : "Review"}
								</Badge>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default Compliance
