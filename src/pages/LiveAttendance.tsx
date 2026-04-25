import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { employees, sites } from "../data/mockData"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../components/ui/select"
import { useState } from "react"
import { MapPin, Users, Clock } from "lucide-react"

const statusColors: Record<string, string> = {
	present: "bg-secondary/10 text-secondary border-secondary/20",
	late: "bg-accent/10 text-accent-foreground border-accent/20",
	absent: "bg-destructive/10 text-destructive border-destructive/20",
	"on-leave": "bg-muted text-muted-foreground border-muted",
	"off-site": "bg-primary/10 text-primary border-primary/20",
}

const LiveAttendance = () => {
	const [siteFilter, setSiteFilter] = useState<string>("all")

	const filtered =
		siteFilter === "all" ? employees : (
			employees.filter((e) => e.site === siteFilter)
		)

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-4">
				<div>
					<h1 className="font-display text-2xl font-bold text-foreground">
						Live Attendance
					</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Real-time employee status across all sites
					</p>
				</div>
				<Select
					value={siteFilter}
					onValueChange={(value: string | null) =>
						setSiteFilter(value ?? "all")
					}>
					<SelectTrigger className="w-56">
						<SelectValue placeholder="Filter by site" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Sites</SelectItem>
						{sites.map((s) => (
							<SelectItem key={s} value={s}>
								{s}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Site summary cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{sites.map((site) => {
					const siteEmps = employees.filter((e) => e.site === site)
					const present = siteEmps.filter((e) => e.status === "present").length
					return (
						<Card
							key={site}
							className="shadow-card cursor-pointer hover:shadow-card-hover transition-shadow"
							onClick={() => setSiteFilter(site)}>
							<CardContent className="p-4">
								<div className="flex items-center gap-2 mb-2">
									<MapPin className="h-4 w-4 text-secondary" />
									<span className="text-sm font-medium text-foreground">
										{site}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Users className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm text-muted-foreground">
										{present}/{siteEmps.length} present
									</span>
								</div>
							</CardContent>
						</Card>
					)
				})}
			</div>

			<Card className="shadow-card">
				<CardHeader>
					<CardTitle className="font-display text-lg flex items-center gap-2">
						<Clock className="h-5 w-5 text-secondary" />
						{siteFilter === "all" ? "All Employees" : siteFilter}
						<Badge variant="secondary" className="ml-2">
							{filtered.length}
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{filtered.map((emp) => (
							<div
								key={emp.id}
								className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
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
										<Badge variant="outline" className="text-xs">
											{emp.checkInMethod}
										</Badge>
									)}
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

export default LiveAttendance
