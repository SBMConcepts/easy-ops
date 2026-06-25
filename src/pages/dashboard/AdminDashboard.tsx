import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { useAttendanceRecords } from '../../hooks/useOrgData'
import { Users, UserCheck, Clock } from 'lucide-react'
import { DashboardLoader, AttendanceRow } from './DashboardLoader'
import '../../styles/dashboard.css'

const AdminDashboard = () => {
  // Directly default to an empty array so TypeScript knows it's AttendanceRecord[]
  const { data: records = [], isLoading: loadingReport } = useAttendanceRecords()

  if (loadingReport) return <DashboardLoader />

  // Compute stats client-side from the daily attendance aggregate.
  const uniqueEmployees = new Set(records.map((r) => r.user_id)).size
  const totalHours = records.reduce((sum, r) => sum + Number(r.hours_worked), 0)
  const totalOvertime = records.reduce((sum, r) => sum + Number(r.overtime), 0)

  const statCards = [
    { label: 'Active Today', value: uniqueEmployees, icon: Users, color: 'icon-primary' },
    { label: 'Total Hours', value: totalHours, icon: UserCheck, color: 'icon-secondary' },
    { label: 'Overtime Hours', value: totalOvertime, icon: Clock, color: 'icon-accent' },
  ]

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <p className="dashboard-subtitle">System overview and multi-site telemetry</p>
      </div>

      <div className="dashboard-stat-grid dashboard-stat-grid-3">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <Card key={i} className="shadow-card">
              <CardContent className="stat-card-content">
                <div className={`icon-container ${card.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="stat-value">{card.value}</p>
                  <p className="stat-label">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="shadow-card mt-6">
        <CardHeader>
          <CardTitle className="card-title-with-icon">Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="attendance-list">
            {records.slice(0, 6).map((rec) => (
              <AttendanceRow
                key={rec.id}
                fullName={rec.user_id?.slice(0, 8)}
                metaText={`${rec.method.toUpperCase()} · ${rec.date}`}
                status={rec.method}
                hoursWorked={String(rec.hours_worked)}
              />
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

export default AdminDashboard
