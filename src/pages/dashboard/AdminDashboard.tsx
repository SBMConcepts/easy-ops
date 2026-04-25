import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import {
	dashboardStats,
	employees,
	attendanceRecords,
} from "../../data/mockData"
import {
	Users,
	UserCheck,
	Clock,
	AlertTriangle,
	Shield,
	TrendingUp,
} from "lucide-react"

const statCards = [
	{
		label: "Total Employees",
		value: dashboardStats.totalEmployees,
		icon: Users,
		color: "text-primary",
	},
	{
		label: "Present Today",
		value: dashboardStats.presentToday,
		icon: UserCheck,
		color: "text-secondary",
	},
	{
		label: "Late Today",
		value: dashboardStats.lateToday,
		icon: Clock,
		color: "text-accent",
	},
	{
		label: "Absent",
		value: dashboardStats.absentToday,
		icon: AlertTriangle,
		color: "text-destructive",
	},
	{
		label: "Compliance Score",
		value: `${dashboardStats.complianceScore}%`,
		icon: Shield,
		color: "text-secondary",
	},
	{
		label: "Avg Hours",
		value: dashboardStats.avgHoursWorked,
		icon: TrendingUp,
		color: "text-primary",
	},
]

const statusColors: Record<string, string> = {
	present: "bg-secondary/10 text-secondary border-secondary/20",
	late: "bg-accent/10 text-accent-foreground border-accent/20",
	absent: "bg-destructive/10 text-destructive border-destructive/20",
	"on-leave": "bg-muted text-muted-foreground border-muted",
	"off-site": "bg-primary/10 text-primary border-primary/20",
}

const AdminDashboard = () => {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-display text-2xl font-bold text-foreground">
					Admin Dashboard
				</h1>
				<p className="text-muted-foreground text-sm mt-1">
					System-wide workforce overview
				</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
				{statCards.map((stat) => (
					<Card key={stat.label} className="shadow-card">
						<CardContent className="p-4 flex flex-col items-center text-center gap-2">
							<stat.icon className={`h-6 w-6 ${stat.color}`} />
							<p className="text-2xl font-bold font-display text-foreground">
								{stat.value}
							</p>
							<p className="text-xs text-muted-foreground">{stat.label}</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid md:grid-cols-2 gap-6">
				<Card className="shadow-card">
					<CardHeader>
						<CardTitle className="font-display text-lg">
							Live Employee Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{employees.slice(0, 6).map((emp) => (
								<div
									key={emp.id}
									className="flex items-center justify-between py-2 border-b border-border last:border-0">
									<div>
										<p className="text-sm font-medium text-foreground">
											{emp.name}
										</p>
										<p className="text-xs text-muted-foreground">
											{emp.department} · {emp.site}
										</p>
									</div>
									<div className="flex items-center gap-2">
										{emp.clockIn && (
											<span className="text-xs text-muted-foreground">
												{emp.clockIn}
											</span>
										)}
										<Badge
											variant="outline"
											className={statusColors[emp.status]}>
											{emp.status}
										</Badge>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className="shadow-card">
					<CardHeader>
						<CardTitle className="font-display text-lg">
							Recent Attendance Log
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{attendanceRecords.slice(0, 6).map((rec) => (
								<div
									key={rec.id}
									className="flex items-center justify-between py-2 border-b border-border last:border-0">
									<div>
										<p className="text-sm font-medium text-foreground">
											{rec.employeeName}
										</p>
										<p className="text-xs text-muted-foreground">
											{rec.method.toUpperCase()} · {rec.site}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-xs text-muted-foreground">
											{rec.clockIn || "—"}
										</span>
										<Badge
											variant="outline"
											className={statusColors[rec.status]}>
											{rec.status}
										</Badge>
										{rec.verified && (
											<Shield className="h-3 w-3 text-secondary" />
										)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

export default AdminDashboard
