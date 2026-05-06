import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAttendanceRecords } from '../hooks/useSupabaseData'
import { supabase } from '../integrations/supabase/client'
import { FileText, Download, BarChart3, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import '../styles/pages.css'

const statusColors: Record<string, string> = {
  present: 'bg-secondary/10 text-secondary border-secondary/20',
  late: 'bg-accent/10 text-accent-foreground border-accent/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  on_leave: 'bg-muted text-muted-foreground border-muted',
}

const reportCards = [
  { title: 'Attendance Report', desc: 'Daily/weekly attendance summary', icon: BarChart3 },
  { title: 'Overtime Report', desc: 'Hours exceeding standard working time', icon: Clock },
  { title: 'Absenteeism Report', desc: 'Absence patterns and trends', icon: AlertTriangle },
  { title: 'Payroll Integration', desc: 'Export data for salary processing', icon: FileText },
]

const Reports = () => {
  const { data: reportData, isLoading } = useAttendanceRecords()
  const stats = reportData?.stats
  const records = reportData?.records || []

  const handleExport = async (type: string) => {
    if (type === 'Payroll Integration') {
      try {
        const today = new Date().toISOString().split('T')[0]
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
        const { data, error } = await supabase.functions.invoke(
          `payroll-export?date_from=${thirtyDaysAgo}&date_to=${today}&format=csv`,
          { method: 'GET' }
        )
        if (error) throw error
        const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data)], {
          type: 'text/csv',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payroll_export_${today}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Payroll data exported')
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Export failed')
      }
    } else {
      toast.success(`${type} report exported`)
    }
  }

  if (isLoading) {
    return (
      <div className="page-loader">
        <div className="page-spinner" />
      </div>
    )
  }

  return (
    <div className="page">
      {/* Heading */}
      <div className="page-heading">
        <div className="page-heading-text">
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Automated attendance and workforce reports</p>
        </div>
        <Button variant="outline" onClick={() => handleExport('Full')}>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Summary stats */}
      <div className="report-stat-grid">
        <Card className="shadow-card">
          <CardContent className="report-stat-body">
            <BarChart3 className="h-6 w-6 icon-secondary mx-auto" />
            <p className="report-stat-value">{stats?.present || 0}</p>
            <p className="report-stat-label">Present</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="report-stat-body">
            <Clock className="h-6 w-6 icon-accent mx-auto" />
            <p className="report-stat-value">{stats?.late || 0}</p>
            <p className="report-stat-label">Late</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="report-stat-body">
            <AlertTriangle className="h-6 w-6 icon-destructive mx-auto" />
            <p className="report-stat-value">{stats?.absent || 0}</p>
            <p className="report-stat-label">Absent</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="report-stat-body">
            <TrendingUp className="h-6 w-6 icon-primary mx-auto" />
            <p className="report-stat-value">{(stats?.total_hours || 0).toFixed(1)}h</p>
            <p className="report-stat-label">Total Hours</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="report-stat-body">
            <TrendingUp className="h-6 w-6 icon-accent mx-auto" />
            <p className="report-stat-value">{(stats?.total_overtime || 0).toFixed(1)}h</p>
            <p className="report-stat-label">Overtime</p>
          </CardContent>
        </Card>
      </div>

      {/* Export cards */}
      <div className="report-card-grid">
        {reportCards.map((report) => (
          <Card
            key={report.title}
            className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
          >
            <CardContent className="report-card-body">
              <div className="report-card-icon-wrap">
                <report.icon className="h-6 w-6 icon-secondary" />
              </div>
              <div className="report-card-text">
                <p className="report-card-title">{report.title}</p>
                <p className="report-card-desc">{report.desc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport(report.title)}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed records table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="card-title-row">Detailed Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="records-table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Hours</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id}>
                    <td>{rec.profiles?.full_name || '—'}</td>
                    <td className="cell-muted">{rec.date}</td>
                    <td className="cell-mono">
                      {rec.clock_in
                        ? new Date(rec.clock_in).toLocaleTimeString('en-ZA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="cell-mono">
                      {rec.clock_out
                        ? new Date(rec.clock_out).toLocaleTimeString('en-ZA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td>{rec.hours_worked ? `${rec.hours_worked}h` : '—'}</td>
                    <td>
                      <Badge variant="outline" className="text-xs">
                        {rec.method}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusColors[rec.status] || ''}`}
                      >
                        {rec.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={7} className="cell-empty">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Reports
