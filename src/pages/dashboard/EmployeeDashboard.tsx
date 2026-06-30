import { useAuth } from '../../contexts/AuthContext'
import { useAttendanceRecords } from '../../hooks/useOrgData'
import { Clock, CalendarDays, ClipboardList } from 'lucide-react'
import { DashboardLoader, AttendanceRow } from './DashboardLoader'
import '../../styles/dashboard.css'

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const { data: records = [], isLoading } = useAttendanceRecords()

  if (isLoading) return <DashboardLoader />

  const totalHours = records.reduce((sum, r) => sum + Number(r.hours_worked), 0)
  const overtimeHours = records.reduce((sum, r) => sum + Number(r.overtime), 0)

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-header__title">Welcome, {user?.full_name || 'User'}</h1>
        <p className="dashboard-header__subtitle">Your personalized performance metric tracker.</p>
      </header>

      <div className="dashboard-grid dashboard-grid--2-col">
        <div className="dashboard-card">
          <div className="dashboard-card__content dashboard-stat">
            <div className="dashboard-stat__icon-wrap dashboard-stat__icon-wrap--secondary">
              <Clock size={24} />
            </div>
            <div className="dashboard-stat__info">
              <p className="dashboard-stat__value">{totalHours.toFixed(1)}h</p>
              <p className="dashboard-stat__label">Hours Worked</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card__content dashboard-stat">
            <div className="dashboard-stat__icon-wrap dashboard-stat__icon-wrap--accent">
              <CalendarDays size={24} />
            </div>
            <div className="dashboard-stat__info">
              <p className="dashboard-stat__value">{overtimeHours.toFixed(1)}h</p>
              <p className="dashboard-stat__label">Overtime Hours</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-card mt-6">
        <div className="dashboard-card__header">
          <h2 className="dashboard-card__title">
            <ClipboardList className="dashboard-card__icon text-dashboard-primary" /> My Shift
            Activity
          </h2>
        </div>
        <div className="dashboard-card__content">
          {records.length === 0 ? (
            <p className="dashboard-list__empty">No shifts recorded during this payroll frame.</p>
          ) : (
            <div className="dashboard-list">
              {records.map((rec) => (
                <AttendanceRow
                  key={rec.id}
                  fullName={rec.date}
                  metaText={rec.method.toUpperCase()}
                  status={rec.method}
                  hoursWorked={String(rec.hours_worked)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmployeeDashboard
