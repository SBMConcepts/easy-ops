import { useAttendanceReport } from '../../hooks/useOrgData'
import { Users, UserPlus, UserMinus, UserX, ClockCheck, Clock, ListOrdered } from 'lucide-react'
import { DashboardLoader, AttendanceRow } from './DashboardLoader'
import '../../styles/dashboard.css'

const AdminDashboard = () => {
  const { data: report, isLoading: loadingReport } = useAttendanceReport()
  const records = report?.attendance ?? []
  const stats = report?.stats

  if (loadingReport) return <DashboardLoader />

  const statCards = [
    {
      label: 'Total Employees',
      value: stats?.total_employees ?? 0,
      icon: Users,
      modifier: 'primary',
    },
    {
      label: 'Present Today',
      value: stats?.present ?? 0,
      icon: UserPlus,
      modifier: 'secondary',
    },
    { label: 'Absent Today', value: stats?.absent ?? 0, icon: UserMinus, modifier: 'accent' },
    {
      label: 'On Leave Today',
      value: (stats?.leave ?? 0) + (stats?.sick_leave ?? 0),
      icon: UserX,
      modifier: 'error',
    },
    {
      label: 'Total Hours',
      value: stats?.total_hours ?? 0,
      icon: ClockCheck,
      modifier: 'primary',
    },
    {
      label: 'Overtime Hours',
      value: stats?.total_overtime ?? 0,
      icon: Clock,
      modifier: 'secondary',
    },
  ]

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-header__title">Admin Dashboard</h1>
        <p className="dashboard-header__subtitle">
          A quick overview of your organization's attendance data for today.
        </p>
      </header>

      <div className="dashboard-grid dashboard-grid--3-col">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <div key={i} className="dashboard-card">
              <div className="dashboard-card__content dashboard-stat">
                <div
                  className={`dashboard-stat__icon-wrap dashboard-stat__icon-wrap--${card.modifier}`}
                >
                  <Icon size={24} />
                </div>
                <div className="dashboard-stat__info">
                  <p className="dashboard-stat__value">{card.value}</p>
                  <p className="dashboard-stat__label">{card.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="dashboard-recent-attendance-card">
        <div className="dashboard-recent-attendance-card__header">
          <h2 className="dashboard-recent-attendance-card__title">
            <ListOrdered className="dashboard-recent-attendance-card__icon " /> Recent Attendance
          </h2>
        </div>
        <div className="dashboard-recent-attendance-card__content">
          <div className="dashboard-recent-attendance-card__list">
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
              <p className="dashboard-recent-attendance-card__empty">
                No attendance records logged today.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
