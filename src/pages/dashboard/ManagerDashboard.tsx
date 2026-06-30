import { useAttendanceRecords } from '../../hooks/useOrgData'
import { BarChart3 } from 'lucide-react'
import { DashboardLoader, AttendanceRow } from './DashboardLoader'
import '../../styles/dashboard.css'

const ManagerDashboard = () => {
  const { data: records = [], isLoading } = useAttendanceRecords()

  if (isLoading) return <DashboardLoader />

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-header__title">Manager Dashboard</h1>
        <p className="dashboard-header__subtitle">Workforce monitoring and operational insights.</p>
      </header>

      <div className="dashboard-card mt-6">
        <div className="dashboard-card__header">
          <h2 className="dashboard-card__title">
            <BarChart3 className="dashboard-card__icon text-dashboard-secondary" />
            Attendance Overview
          </h2>
        </div>
        <div className="dashboard-card__content">
          <div className="dashboard-list">
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
              <p className="dashboard-list__empty">No attendance records today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManagerDashboard
