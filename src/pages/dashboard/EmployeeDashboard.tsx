/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { useAuth } from '../../contexts/AuthContext'
import { useAttendanceRecords } from '../../hooks/useTenantData' // <-- Replaced useMyAttendance
import { Clock, CalendarDays } from 'lucide-react'
import { DashboardLoader, AttendanceRow } from './DashboardLoader'
import '../../styles/dashboard.css'

const EmployeeDashboard = () => {
  const { user } = useAuth()

  // The Express API + Postgres RLS guarantees this only contains their own records!
  const { data: records = [], isLoading } = useAttendanceRecords()

  if (isLoading) return <DashboardLoader />

  const totalHours = records.reduce((sum, r) => sum + parseFloat(r.hours_worked ?? '0'), 0)
  const absentDays = records.filter((r) => r.status === 'absent').length

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div className="dashboard-heading-text">
          <h1 className="dashboard-title">Welcome, {user?.full_name || 'User'}</h1>
          <p className="dashboard-subtitle">Your personalized performance metric tracker</p>
        </div>
      </div>

      <div className="dashboard-stat-grid dashboard-stat-grid-2">
        <Card className="shadow-card">
          <CardContent className="stat-card-content">
            <div className="icon-container icon-secondary">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="stat-value">{totalHours.toFixed(1)}h</p>
              <p className="stat-label">Hours Worked</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="stat-card-content">
            <div className="icon-container icon-accent">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <p className="stat-value">{absentDays}</p>
              <p className="stat-label">Days Absent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card mt-6">
        <CardHeader>
          <CardTitle className="card-title-with-icon">My Shift Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="attendance-empty">No shifts recorded during this payroll frame.</p>
          ) : (
            <div className="attendance-list">
              {records.map((rec: any) => (
                <AttendanceRow
                  key={rec.id}
                  fullName={rec.date}
                  metaText={rec.method?.toUpperCase()}
                  clockIn={rec.clock_in}
                  clockOut={rec.clock_out}
                  status={rec.status}
                  hoursWorked={rec.hours_worked}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EmployeeDashboard
