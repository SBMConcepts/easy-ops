import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { useAttendanceRecords } from '../../hooks/useTenantData'
import { Users, UserCheck, Clock, AlertTriangle, BarChart3 } from 'lucide-react'
import '../../styles/dashboard.css'

const statusColors: Record<string, string> = {
  present: 'bg-secondary/10 text-secondary border-secondary/20',
  late: 'bg-accent/10 text-accent-foreground border-accent/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  on_leave: 'bg-muted text-muted-foreground border-muted',
}

const ManagerDashboard = () => {
  const { data: reportData, isLoading } = useAttendanceRecords()
  const stats = reportData?.stats
  const records = reportData?.records || []

  if (isLoading) {
    return (
      <div className="dashboard-loader">
        <div className="dashboard-spinner" />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading-text">
        <h1 className="dashboard-title">Manager Dashboard</h1>
        <p className="dashboard-subtitle">Workforce monitoring and operational insights</p>
      </div>

      <div className="dashboard-stat-grid dashboard-stat-grid--4">
        <Card className="shadow-card">
          <CardContent className="stat-card-body--row">
            <Users className="h-8 w-8 icon-primary" />
            <div>
              <p className="stat-value">{stats?.total || 0}</p>
              <p className="stat-label">Total Records</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="stat-card-body--row">
            <UserCheck className="h-8 w-8 icon-secondary" />
            <div>
              <p className="stat-value">{stats?.present || 0}</p>
              <p className="stat-label">Present</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="stat-card-body--row">
            <Clock className="h-8 w-8 icon-accent" />
            <div>
              <p className="stat-value">{stats?.late || 0}</p>
              <p className="stat-label">Late</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="stat-card-body--row">
            <AlertTriangle className="h-8 w-8 icon-destructive" />
            <div>
              <p className="stat-value">{stats?.absent || 0}</p>
              <p className="stat-label">Absent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="card-title-with-icon">
            <BarChart3 className="h-5 w-5 icon-secondary" />
            Attendance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="attendance-list">
            {records.map((rec) => (
              <div key={rec.id} className="attendance-row">
                <div className="attendance-row-left">
                  <p className="attendance-name">{rec.profiles?.full_name || '—'}</p>
                  <p className="attendance-meta">
                    {rec.profiles?.department || '—'} · {rec.sites?.name || '—'}
                  </p>
                </div>
                <div className="attendance-row-right">
                  <span className="attendance-method">{rec.method}</span>
                  {rec.clock_in && (
                    <span className="attendance-time">
                      {new Date(rec.clock_in).toLocaleTimeString('en-ZA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
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
  )
}

export default ManagerDashboard
