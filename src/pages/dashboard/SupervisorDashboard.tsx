import { useAttendanceRecords } from '../../hooks/useOrgData'
import { UsersRound } from 'lucide-react'
import { DashboardLoader, AttendanceRow } from './DashboardLoader'
import '../../styles/dashboard.css'

const SupervisorDashboard = () => {
  const { data: records = [], isLoading } = useAttendanceRecords()

  if (isLoading) return <DashboardLoader />

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-header__title">Supervisor Terminal</h1>
        <p className="dashboard-header__subtitle">On-site tracking and team verification.</p>
      </header>

      <div className="dashboard-card mt-6">
        <div className="dashboard-card__header">
          <h2 className="dashboard-card__title">
            <UsersRound className="dashboard-card__icon text-dashboard-primary" />
            Team Members
          </h2>
        </div>
        <div className="dashboard-card__content">
          <div className="dashboard-list">
            {records.map((rec) => (
              <AttendanceRow
                key={rec.id}
                fullName={
                  [rec.first_name, rec.last_name].filter(Boolean).join(' ') ||
                  rec.full_name ||
                  'Unknown employee'
                }
                metaText={[rec.method.toUpperCase(), rec.date, rec.site_name, rec.department_name]
                  .filter(Boolean)
                  .join(' · ')}
                status={rec.method}
                hoursWorked={String(rec.hours_worked)}
              />
            ))}
            {records.length === 0 && (
              <p className="dashboard-list__empty">No team records verified today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupervisorDashboard
