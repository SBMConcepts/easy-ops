import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { useAttendanceRecords } from '../hooks/useTenantData'
import { MapPin, Loader2 } from 'lucide-react'

const LiveAttendance = () => {
  const [methodFilter, setMethodFilter] = useState('all')

  // Safely scoped directly via database RLS.
  const { data: records = [], isLoading } = useAttendanceRecords()

  // org_attendance has no site dimension; filter the daily aggregate by the
  // check-in method instead.
  const methods = Array.from(new Set(records.map((r) => r.method)))
  const filteredRecords =
    methodFilter === 'all' ? records : records.filter((r) => r.method === methodFilter)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Live Tracking Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time attendance streams across active company zones
          </p>
        </div>

        <div className="w-full sm:w-48">
          <Select value={methodFilter} onValueChange={(value) => setMethodFilter(value ?? 'all')}>
            <SelectTrigger className="w-full border-border">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {methods.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/10">
          <CardTitle className="flex items-center justify-between text-base font-semibold">
            <span>Active Record Logs</span>
            <Badge variant="outline" className="font-mono text-xs">
              Count: {filteredRecords.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between p-4 hover:bg-muted/5 transition-all"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Employee {rec.user_id?.slice(0, 8)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Method: {rec.method.toUpperCase()} · {rec.date}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono font-medium text-foreground">
                  {rec.hours_worked}h{rec.overtime ? ` +${rec.overtime}h OT` : ''}
                </span>
              </div>
            </div>
          ))}
          {filteredRecords.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-12 bg-card">
              No operational entries recorded today.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LiveAttendance
