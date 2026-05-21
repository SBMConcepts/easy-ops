import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { useAuth } from '../../contexts/AuthContext'
import { useMyAttendance } from '../../hooks/useTenantData'
import { QrCode, Clock, CalendarDays, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import '../../styles/dashboard.css'

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: records, isLoading } = useMyAttendance()

  const myRecords = records || []
  const totalHours = myRecords.reduce((sum, r) => sum + parseFloat(r.hours_worked ?? '0'), 0)
  const totalOvertime = myRecords.reduce((sum, r) => sum + parseFloat(r.overtime ?? '0'), 0)
  const absentDays = myRecords.filter((r) => r.status === 'absent').length

  if (isLoading) {
    return (
      <div className="dashboard-loader">
        <div className="dashboard-spinner" />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div className="dashboard-heading-text">
          <h1 className="dashboard-title">Welcome, {user?.name?.split(' ')[0] || 'Employee'}</h1>
          <p className="dashboard-subtitle">Your attendance summary</p>
        </div>
        <Button
          onClick={() => navigate('/app/check-in')}
          size="lg"
          className="bg-secondary hover:bg-secondary/90"
        >
          <QrCode className="h-5 w-5 mr-2" />
          Clock In / Out
        </Button>
      </div>

      <div className="dashboard-stat-grid dashboard-stat-grid--3">
        <Card className="shadow-card">
          <CardContent className="stat-card-body--row">
            <Clock className="h-8 w-8 icon-secondary" />
            <div>
              <p className="stat-value">{totalHours.toFixed(1)}h</p>
              <p className="stat-label">Hours Worked</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="stat-card-body--row">
            <TrendingUp className="h-8 w-8 icon-accent" />
            <div>
              <p className="stat-value">{totalOvertime.toFixed(1)}h</p>
              <p className="stat-label">Overtime</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="stat-card-body--row">
            <CalendarDays className="h-8 w-8 icon-primary" />
            <div>
              <p className="stat-value">{absentDays}</p>
              <p className="stat-label">Absent Days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="card-title-with-icon">Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {myRecords.length === 0 ? (
            <p className="attendance-empty">No records yet. Clock in to get started!</p>
          ) : (
            <div className="attendance-list">
              {myRecords.map((rec) => (
                <div key={rec.id} className="attendance-row">
                  <div className="attendance-row-left">
                    <p className="attendance-name">{rec.date}</p>
                    <p className="attendance-meta">{rec.method?.toUpperCase()}</p>
                  </div>
                  <div className="attendance-row-right">
                    <span className="attendance-time">
                      {rec.clock_in
                        ? new Date(rec.clock_in).toLocaleTimeString('en-ZA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                      {' — '}
                      {rec.clock_out
                        ? new Date(rec.clock_out).toLocaleTimeString('en-ZA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '...'}
                    </span>
                    {rec.hours_worked && (
                      <span className="attendance-hours">{rec.hours_worked}h</span>
                    )}
                    <Badge
                      variant="outline"
                      className="bg-secondary/10 text-secondary border-secondary/20"
                    >
                      {rec.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EmployeeDashboard
