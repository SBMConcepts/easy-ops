/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { useAttendanceRecords } from '../../hooks/useTenantData'
import { DashboardLoader, AttendanceRow } from './DashboardLoader'
import '../../styles/dashboard.css'

const SupervisorDashboard = () => {
  const { data: records = [], isLoading } = useAttendanceRecords()

  if (isLoading) return <DashboardLoader />

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div className="dashboard-heading-text">
          <h1 className="dashboard-title">Supervisor Terminal</h1>
          <p className="dashboard-subtitle">On-site tracking and team verification</p>
        </div>
      </div>

      <Card className="shadow-card mt-6">
        <CardHeader>
          <CardTitle className="card-title-with-icon">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="attendance-list">
            {records.map((rec: any) => (
              <AttendanceRow
                key={rec.id}
                fullName={rec.profiles?.full_name || rec.employee_name || '—'}
                metaText={rec.sites?.name || rec.site_name || '—'}
                clockIn={rec.clock_in}
                status={rec.status}
              />
            ))}
            {records.length === 0 && <p className="attendance-empty">No team records today.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SupervisorDashboard
