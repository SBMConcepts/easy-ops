import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { useAttendanceRecords, useEmployees } from "../../hooks/useSupabaseData"
import {
    Users,
    UserCheck,
    Clock,
    AlertTriangle,
    Shield,
    TrendingUp,
} from "lucide-react"
import "../../index.css"

const statusColors: Record<string, string> = {
    present: "bg-secondary/10 text-secondary border-secondary/20",
    late: "bg-accent/10 text-accent-foreground border-accent/20",
    absent: "bg-destructive/10 text-destructive border-destructive/20",
    on_leave: "bg-muted text-muted-foreground border-muted",
}

const AdminDashboard = () => {
    const { data: reportData, isLoading: loadingReport } =
        useAttendanceRecords()
    const { data: employees, isLoading: loadingEmployees } = useEmployees()

    const stats = reportData?.stats
    const records = reportData?.records || []

    const statCards = [
        {
            label: "Total Employees",
            value: employees?.length || 0,
            icon: Users,
            color: "text-primary",
        },
        {
            label: "Present Today",
            value: stats?.present || 0,
            icon: UserCheck,
            color: "text-secondary",
        },
        {
            label: "Late Today",
            value: stats?.late || 0,
            icon: Clock,
            color: "text-accent",
        },
        {
            label: "Absent",
            value: stats?.absent || 0,
            icon: AlertTriangle,
            color: "text-destructive",
        },
        {
            label: "Avg Hours",
            value: stats?.total
                ? (stats.total_hours / stats.total).toFixed(1)
                : "0",
            icon: TrendingUp,
            color: "text-primary",
        },
        {
            label: "Overtime",
            value: `${(stats?.total_overtime || 0).toFixed(1)}h`,
            icon: Shield,
            color: "text-secondary",
        },
    ]

    if (loadingReport || loadingEmployees) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-2xl font-bold text-primary">
                    Admin Dashboard
                </h1>
                <p className="text-muted text-sm mt-1">
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
                            <p className="text-xs text-muted-foreground">
                                {stat.label}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle className="font-display text-lg">
                            Employees
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {(employees || []).slice(0, 6).map((emp: any) => (
                                <div
                                    key={emp.id}
                                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {emp.full_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {emp.department || "—"} ·{" "}
                                            {emp.site || "—"}
                                        </p>
                                    </div>
                                    <Badge variant="outline">
                                        {emp.user_roles?.[0]?.role ||
                                            "employee"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle className="font-display text-lg">
                            Recent Attendance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {records.slice(0, 6).map((rec: any) => (
                                <div
                                    key={rec.id}
                                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {rec.profiles?.full_name || "—"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {rec.method?.toUpperCase()} ·{" "}
                                            {rec.sites?.name || "—"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {rec.clock_in
                                                ? new Date(
                                                      rec.clock_in
                                                  ).toLocaleTimeString(
                                                      "en-ZA",
                                                      {
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                      }
                                                  )
                                                : "—"}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={
                                                statusColors[rec.status] || ""
                                            }
                                        >
                                            {rec.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {records.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No attendance records today.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default AdminDashboard
