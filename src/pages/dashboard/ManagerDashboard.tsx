import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { useAttendanceRecords } from '../../hooks/useOrgData'
import { BarChart3 } from 'lucide-react'
import { DashboardLoader, AttendanceRow } from './DashboardLoader'
import '../../styles/dashboard.css'

const ManagerDashboard = () => {
  const { data: records = [], isLoading } = useAttendanceRecords()

  if (isLoading) return <DashboardLoader />

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading-text">
        <h1 className="dashboard-title">Manager Dashboard</h1>
        <p className="dashboard-subtitle">Workforce monitoring and operational insights</p>
      </div>

      <Card className="shadow-card mt-6">
        <CardHeader>
          <CardTitle className="card-title-with-icon">
            <BarChart3 className="icon-secondary mr-2 h-5 w-5" />
            Attendance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="attendance-list">
            {records.map((rec) => (
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

export default ManagerDashboard
