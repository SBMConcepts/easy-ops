import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAttendanceRecords } from '../hooks/useTenantData'
import type { Database } from '../integrations/supabase/types'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type AttendanceStatus = Database['public']['Enums']['attendance_status']

const statusColors: Record<AttendanceStatus, string> = {
  present: 'bg-secondary/10 text-secondary border-secondary/20',
  late: 'bg-accent/10 text-accent-foreground border-accent/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  leave: 'bg-muted text-muted-foreground border-muted',
  holiday: 'bg-muted text-muted-foreground border-muted',
}

const Reports = () => {
  // Utilizing the RLS-backed hook directly
  const { data: records = [], isLoading } = useAttendanceRecords()

  const triggerDataExport = () => {
    if (records.length === 0) return toast.error('No record logs found within date bounds')
    toast.success('Document compiling... Download stream initialized')

    // Simplistic CSV mapping for real-time dataset export
    const csvContent =
      'Date,Employee ID,Status,Clock In,Clock Out,Hours\n' +
      records
        .map(
          (r) =>
            `${r.date},${r.employee_id},${r.status},${r.clock_in},${r.clock_out},${r.hours_worked || 0}`
        )
        .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance & Reporting</h1>
          <p className="text-sm text-muted-foreground">Exportable system audit logs</p>
        </div>
        <Button
          variant="outline"
          className="bg-card"
          onClick={triggerDataExport}
          disabled={isLoading}
        >
          <Download className="mr-2 h-4 w-4" /> Export Document
        </Button>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/10 border-b border-border">
          <CardTitle className="text-base font-semibold">Attendance Log Array</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Operator ID</th>
                  <th className="p-4 font-medium">Clock In</th>
                  <th className="p-4 font-medium">Clock Out</th>
                  <th className="p-4 font-medium">Method</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : records.length > 0 ? (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/5">
                      <td className="p-4 font-medium text-foreground">{rec.date}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        {rec.employee_id?.slice(0, 8)}
                      </td>
                      <td className="p-4 font-mono text-xs text-foreground">
                        {rec.clock_in
                          ? new Date(rec.clock_in).toLocaleTimeString('en-ZA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="p-4 font-mono text-xs text-foreground">
                        {rec.clock_out
                          ? new Date(rec.clock_out).toLocaleTimeString('en-ZA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs uppercase">
                          {rec.method}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${statusColors[rec.status] || ''}`}
                        >
                          {rec.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No logs records discovered within active parameters.
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
