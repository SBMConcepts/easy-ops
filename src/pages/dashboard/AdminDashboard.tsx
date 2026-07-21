import { useAttendanceRecords } from '../../hooks/useOrgData'
import { Users, UserCheck, Clock, ListOrdered } from 'lucide-react'
import { DashboardLoader, AttendanceRow } from './DashboardLoader'
import '../../styles/dashboard.css'

const AdminDashboard = () => {
  const { data: records = [], isLoading: loadingReport } = useAttendanceRecords()

  if (loadingReport) return <DashboardLoader />

  const uniqueEmployees = new Set(
    records.map((r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.full_name)
  ).size
  const totalHours = records.reduce((sum, r) => sum + Number(r.hours_worked), 0)
  const totalOvertime = records.reduce((sum, r) => sum + Number(r.overtime), 0)

  const statCards = [
    { label: 'Active Today', value: uniqueEmployees, icon: Users, modifier: 'primary' },
    { label: 'Total Hours', value: totalHours, icon: UserCheck, modifier: 'secondary' },
    { label: 'Overtime Hours', value: totalOvertime, icon: Clock, modifier: 'accent' },
  ]

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-header__title">Executive Overview</h1>
        <p className="dashboard-header__subtitle">
          Organisation-wide workforce analytics and status.
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

      <div className="dashboard-card mt-6">
        <div className="dashboard-card__header">
          <h2 className="dashboard-card__title">
            <ListOrdered className="dashboard-card__icon text-dashboard-primary" /> Recent
            Attendance
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
              <p className="dashboard-list__empty">No attendance records logged today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
