import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { dashboardStats, employees } from "../../data/mockData"
import { Users, UserCheck, Clock, AlertTriangle, BarChart3 } from "lucide-react"

const statusColors: Record<string, string> = {
	present: "bg-secondary/10 text-secondary border-secondary/20",
	late: "bg-accent/10 text-accent-foreground border-accent/20",
	absent: "bg-destructive/10 text-destructive border-destructive/20",
	"on-leave": "bg-muted text-muted-foreground border-muted",
	"off-site": "bg-primary/10 text-primary border-primary/20",
}

const ManagerDashboard = () => {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-display text-2xl font-bold text-foreground">
					Manager Dashboard
				</h1>
				<p className="text-muted-foreground text-sm mt-1">
					Workforce monitoring and operational insights
				</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card className="shadow-card">
					<CardContent className="p-4 flex items-center gap-3">
						<Users className="h-8 w-8 text-primary" />
						<div>
							<p className="text-2xl font-bold font-display">
								{dashboardStats.totalEmployees}
							</p>
							<p className="text-xs text-muted-foreground">Total Staff</p>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-card">
					<CardContent className="p-4 flex items-center gap-3">
						<UserCheck className="h-8 w-8 text-secondary" />
						<div>
							<p className="text-2xl font-bold font-display">
								{dashboardStats.presentToday}
							</p>
							<p className="text-xs text-muted-foreground">Present</p>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-card">
					<CardContent className="p-4 flex items-center gap-3">
						<Clock className="h-8 w-8 text-accent" />
						<div>
							<p className="text-2xl font-bold font-display">
								{dashboardStats.lateToday}
							</p>
							<p className="text-xs text-muted-foreground">Late</p>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-card">
					<CardContent className="p-4 flex items-center gap-3">
						<AlertTriangle className="h-8 w-8 text-destructive" />
						<div>
							<p className="text-2xl font-bold font-display">
								{dashboardStats.absentToday}
							</p>
							<p className="text-xs text-muted-foreground">Absent</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="shadow-card">
				<CardHeader>
					<CardTitle className="font-display text-lg flex items-center gap-2">
						<BarChart3 className="h-5 w-5 text-secondary" />
						Attendance Overview
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{employees.map((emp) => (
							<div
								key={emp.id}
								className="flex items-center justify-between py-2 border-b border-border last:border-0">
								<div className="flex-1">
									<p className="text-sm font-medium text-foreground">
										{emp.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{emp.department} · {emp.site}
									</p>
								</div>
								<div className="flex items-center gap-3">
									{emp.checkInMethod && (
										<span className="text-xs uppercase text-muted-foreground">
											{emp.checkInMethod}
										</span>
									)}
									{emp.clockIn && (
										<span className="text-xs text-foreground font-mono">
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

export default ManagerDashboard
