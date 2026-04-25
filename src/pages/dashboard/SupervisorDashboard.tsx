import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { employees } from "../../data/mockData"
import { UserCheck, Clock, AlertTriangle, QrCode } from "lucide-react"
import { Button } from "../../components/ui/button"
import { useNavigate } from "react-router-dom"

const statusColors: Record<string, string> = {
	present: "bg-secondary/10 text-secondary border-secondary/20",
	late: "bg-accent/10 text-accent-foreground border-accent/20",
	absent: "bg-destructive/10 text-destructive border-destructive/20",
	"on-leave": "bg-muted text-muted-foreground border-muted",
	"off-site": "bg-primary/10 text-primary border-primary/20",
}

const SupervisorDashboard = () => {
	const navigate = useNavigate()
	// Supervisor sees their team (Warehouse dept for mock)
	const teamMembers = employees.filter((e) => e.department === "Warehouse")
	const present = teamMembers.filter((e) => e.status === "present").length
	const late = teamMembers.filter((e) => e.status === "late").length
	const absent = teamMembers.filter((e) => e.status === "absent").length

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-display text-2xl font-bold text-foreground">
						Supervisor Dashboard
					</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Warehouse team overview
					</p>
				</div>
				<Button
					onClick={() => navigate("/app/check-in")}
					className="bg-secondary hover:bg-secondary/90">
					<QrCode className="h-4 w-4 mr-2" />
					Quick Check-In
				</Button>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<Card className="shadow-card">
					<CardContent className="p-4 flex items-center gap-3">
						<UserCheck className="h-8 w-8 text-secondary" />
						<div>
							<p className="text-2xl font-bold font-display">{present}</p>
							<p className="text-xs text-muted-foreground">Present</p>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-card">
					<CardContent className="p-4 flex items-center gap-3">
						<Clock className="h-8 w-8 text-accent" />
						<div>
							<p className="text-2xl font-bold font-display">{late}</p>
							<p className="text-xs text-muted-foreground">Late</p>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-card">
					<CardContent className="p-4 flex items-center gap-3">
						<AlertTriangle className="h-8 w-8 text-destructive" />
						<div>
							<p className="text-2xl font-bold font-display">{absent}</p>
							<p className="text-xs text-muted-foreground">Absent</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="shadow-card">
				<CardHeader>
					<CardTitle className="font-display text-lg">Team Members</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{teamMembers.map((emp) => (
							<div
								key={emp.id}
								className="flex items-center justify-between py-2 border-b border-border last:border-0">
								<div>
									<p className="text-sm font-medium text-foreground">
										{emp.name}
									</p>
									<p className="text-xs text-muted-foreground">{emp.site}</p>
								</div>
								<div className="flex items-center gap-2">
									{emp.clockIn && (
										<span className="text-xs font-mono text-foreground">
											{emp.clockIn}
										</span>
									)}
									<Badge variant="outline" className={statusColors[emp.status]}>
										{emp.status}
									</Badge>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default SupervisorDashboard
