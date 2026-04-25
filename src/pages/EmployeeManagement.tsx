import { Card, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { employees } from "../data/mockData"
import { UserPlus, Search } from "lucide-react"
import { Input } from "../components/ui/input"
import { useState } from "react"
import { toast } from "sonner"

const statusColors: Record<string, string> = {
	present: "bg-secondary/10 text-secondary border-secondary/20",
	late: "bg-accent/10 text-accent-foreground border-accent/20",
	absent: "bg-destructive/10 text-destructive border-destructive/20",
	"on-leave": "bg-muted text-muted-foreground border-muted",
	"off-site": "bg-primary/10 text-primary border-primary/20",
}

const EmployeeManagement = () => {
	const [search, setSearch] = useState("")

	const filtered = employees.filter(
		(e) =>
			e.name.toLowerCase().includes(search.toLowerCase()) ||
			e.department.toLowerCase().includes(search.toLowerCase()),
	)

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-4">
				<div>
					<h1 className="font-display text-2xl font-bold text-foreground">
						Employee Management
					</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Manage profiles, roles, and permissions
					</p>
				</div>
				<Button onClick={() => toast.info("Add employee form (prototype)")}>
					<UserPlus className="h-4 w-4 mr-2" />
					Add Employee
				</Button>
			</div>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search employees..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-10"
				/>
			</div>

			<Card className="shadow-card">
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border">
									<th className="text-left p-4 text-muted-foreground font-medium">
										Name
									</th>
									<th className="text-left p-4 text-muted-foreground font-medium">
										Email
									</th>
									<th className="text-left p-4 text-muted-foreground font-medium">
										Department
									</th>
									<th className="text-left p-4 text-muted-foreground font-medium">
										Site
									</th>
									<th className="text-left p-4 text-muted-foreground font-medium">
										Role
									</th>
									<th className="text-left p-4 text-muted-foreground font-medium">
										Status
									</th>
									<th className="text-left p-4 text-muted-foreground font-medium">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((emp) => (
									<tr
										key={emp.id}
										className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
										<td className="p-4 font-medium text-foreground">
											{emp.name}
										</td>
										<td className="p-4 text-muted-foreground">{emp.email}</td>
										<td className="p-4 text-foreground">{emp.department}</td>
										<td className="p-4 text-muted-foreground">{emp.site}</td>
										<td className="p-4">
											<Badge variant="outline">{emp.role}</Badge>
										</td>
										<td className="p-4">
											<Badge
												variant="outline"
												className={statusColors[emp.status]}>
												{emp.status}
											</Badge>
										</td>
										<td className="p-4">
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													toast.info(`Edit ${emp.name} (prototype)`)
												}>
												Edit
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default EmployeeManagement
