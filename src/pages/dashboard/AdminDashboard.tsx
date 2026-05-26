/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { useAttendanceRecords } from '../../hooks/useTenantData'
import { Users, UserCheck, Clock } from 'lucide-react'
import { DashboardLoader, AttendanceRow } from './DashboardLoader'
import '../../styles/dashboard.css'

const AdminDashboard = () => {
  // Directly default to an empty array so TypeScript knows it's AttendanceRecord[]
  const { data: records = [], isLoading: loadingReport } = useAttendanceRecords()

  if (loadingReport) return <DashboardLoader />

  // Compute stats securely on the client from the flat array
  const presentCount = records.filter((r) => r.status === 'present').length
  const lateCount = records.filter((r) => r.status === 'late').length
  const uniqueEmployees = new Set(records.map((r) => r.employee_profile_id)).size

  const statCards = [
    { label: 'Active Today', value: uniqueEmployees, icon: Users, color: 'icon-primary' },
    { label: 'Present', value: presentCount, icon: UserCheck, color: 'icon-secondary' },
    { label: 'Late', value: lateCount, icon: Clock, color: 'icon-accent' },
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
            {records.slice(0, 6).map((rec: any) => (
              <AttendanceRow
                key={rec.id}
                fullName={rec.profiles?.full_name || rec.employee_name || '—'}
                metaText={`${rec.method?.toUpperCase()} · ${rec.sites?.name || rec.site_name || '—'}`}
                clockIn={rec.clock_in}
                status={rec.status}
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
