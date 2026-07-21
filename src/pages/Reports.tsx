import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAttendanceRecords } from '../hooks/useOrgData'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const Reports = () => {
  // Utilizing the RLS-backed hook directly
  const { data: records = [], isLoading } = useAttendanceRecords()
  const employeeName = (rec: (typeof records)[number]) =>
    [rec.first_name, rec.last_name].filter(Boolean).join(' ') || rec.full_name || ''

  const triggerDataExport = () => {
    if (records.length === 0) return toast.error('No record logs found within date bounds')
    toast.success('Document compiling... Download stream initialized')

    // CSV mapping for the daily attendance aggregate.
    const csvContent =
      'Date,Employee,Method,Site,Department,Hours,Overtime\n' +
      records
        .map(
          (r) =>
            `${r.date},${employeeName(r)},${r.method},${r.site_name ?? ''},${
              r.department_name ?? ''
            },${r.hours_worked},${r.overtime}`
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
                  <th className="p-4 font-medium">Employee</th>
                  <th className="p-4 font-medium">Method</th>
                  <th className="p-4 font-medium">Site</th>
                  <th className="p-4 font-medium">Department</th>
                  <th className="p-4 font-medium">Hours</th>
                  <th className="p-4 font-medium">Overtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : records.length > 0 ? (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/5">
                      <td className="p-4 font-medium text-foreground">{rec.date}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {employeeName(rec) || '—'}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs uppercase">
                          {rec.method}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">{rec.site_name || '—'}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {rec.department_name || '—'}
                      </td>
                      <td className="p-4 font-mono text-xs text-foreground">{rec.hours_worked}</td>
                      <td className="p-4 font-mono text-xs text-foreground">{rec.overtime}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
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
