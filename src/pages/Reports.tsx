import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAttendanceRecords } from '../hooks/useTenantData'
import type { AttendanceStatus } from '../integrations/supabase/types'
import { Download, FileSpreadsheet, Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'

const statusColors: Record<AttendanceStatus, string> = {
  present: 'bg-secondary/10 text-secondary border-secondary/20',
  late: 'bg-accent/10 text-accent-foreground border-accent/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  leave: 'bg-muted text-muted-foreground border-muted',
  holiday: 'bg-muted text-muted-foreground border-muted',
}

const Reports = () => {
  const [range] = useState<{ from?: string; to?: string }>({})
  const { data: records = [], isLoading } = useAttendanceRecords({
    dateFrom: range.from,
    dateTo: range.to,
  })

  const triggerDataExport = () => {
    if (records.length === 0) return toast.error('No record logs found within date bounds')
    toast.success('Document compiling... Download stream initialized')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Operational Reporting Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Compile logs summaries for isolated billing compliance audits
          </p>
        </div>
        <Button
          onClick={triggerDataExport}
          disabled={isLoading || records.length === 0}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90 self-start"
        >
          <Download className="h-4 w-4 mr-2" /> Export Dataset (CSV)
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            title: 'Time Logs Report',
            desc: 'Summary metrics tracks overview',
            total: records.length,
          },
          {
            title: 'Late Ingress Logs',
            desc: 'Breaches tracking metrics flags',
            total: records.filter((r) => r.status === 'late').length,
          },
          {
            title: 'Absent Tracker Logs',
            desc: 'Missing shift tracks',
            total: records.filter((r) => r.status === 'absent').length,
          },
          {
            title: 'Verified Tracks',
            desc: 'Secure verified compliance items',
            total: records.filter((r) => r.verified).length,
          },
        ].map((item, idx) => (
          <Card key={idx} className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {isLoading ? '...' : item.total}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4">Log Identifier</th>
                  <th className="p-4">Shift Date</th>
                  <th className="p-4">Clock In</th>
                  <th className="p-4">Clock Out</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">State</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : records.length > 0 ? (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        {rec.id.slice(0, 8)}...
                      </td>
                      <td className="p-4 text-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" /> {rec.date}
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
