import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { useAttendanceRecords, useEmployees } from '../../hooks/useTenantData'
import { Users, UserCheck, Clock, AlertTriangle, Shield, TrendingUp } from 'lucide-react'
import '../../styles/dashboard.css'

const statusColors: Record<string, string> = {
  present: 'bg-secondary/10 text-secondary border-secondary/20',
  late: 'bg-accent/10 text-accent-foreground border-accent/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  on_leave: 'bg-muted text-muted-foreground border-muted',
}

const AdminDashboard = () => {
  const { data: reportData, isLoading: loadingReport } = useAttendanceRecords()
  const { data: employees, isLoading: loadingEmployees } = useEmployees()

  const stats = reportData?.stats
  const records = reportData?.records || []

  const statCards = [
    { label: 'Total Employees', value: employees?.length || 0, icon: Users, color: 'icon-primary' },
    {
      label: 'Present Today',
      value: stats?.present || 0,
      icon: UserCheck,
      color: 'icon-secondary',
    },
    { label: 'Late Today', value: stats?.late || 0, icon: Clock, color: 'icon-accent' },
    { label: 'Absent', value: stats?.absent || 0, icon: AlertTriangle, color: 'icon-destructive' },
    {
      label: 'Avg Hours',
      value: stats?.total ? (stats.total_hours / stats.total).toFixed(1) : '0',
      icon: TrendingUp,
      color: 'icon-primary',
    },
    {
      label: 'Overtime',
      value: `${(stats?.total_overtime || 0).toFixed(1)}h`,
      icon: Shield,
      color: 'icon-secondary',
    },
  ]

  if (loadingReport || loadingEmployees) {
    return (
      <div className="dashboard-loader">
        <div className="dashboard-spinner" />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading-text">
        <h1 className="dashboard-title dashboard-title--admin">Admin Dashboard</h1>
        <p className="dashboard-subtitle">System-wide workforce overview</p>
      </div>

      <div className="dashboard-stat-grid dashboard-stat-grid--6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="stat-card-body--centered">
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
              <p className="stat-value">{stat.value}</p>
              <p className="stat-label">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="dashboard-two-col">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="card-title-with-icon">Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="attendance-list">
              {(employees || []).slice(0, 6).map((emp: any) => (
                <div key={emp.id} className="attendance-row">
                  <div className="attendance-row-left">
                    <p className="attendance-name">{emp.full_name}</p>
                    <p className="attendance-meta">
                      {emp.department || '—'} · {emp.site || '—'}
                    </p>
                  </div>
                  <Badge variant="outline">{emp.user_roles?.[0]?.role || 'employee'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="card-title-with-icon">Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="attendance-list">
              {records.slice(0, 6).map((rec: any) => (
                <div key={rec.id} className="attendance-row">
                  <div className="attendance-row-left">
                    <p className="attendance-name">{rec.profiles?.full_name || '—'}</p>
                    <p className="attendance-meta">
                      {rec.method?.toUpperCase()} · {rec.sites?.name || '—'}
                    </p>
                  </div>
                  <div className="attendance-row-right">
                    <span className="attendance-time">
                      {rec.clock_in
                        ? new Date(rec.clock_in).toLocaleTimeString('en-ZA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </span>
                    <Badge variant="outline" className={statusColors[rec.status] || ''}>
                      {rec.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {records.length === 0 && (
                <p className="attendance-empty">No attendance records today.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
