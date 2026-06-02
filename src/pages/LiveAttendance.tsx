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
import type { AttendanceStatus } from '../integrations/supabase/types'
import { Clock, MapPin, Loader2 } from 'lucide-react'

const statusColors: Record<AttendanceStatus, string> = {
  present: 'bg-secondary/10 text-secondary border-secondary/20',
  late: 'bg-accent/10 text-accent-foreground border-accent/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  leave: 'bg-muted text-muted-foreground border-muted',
  holiday: 'bg-muted text-muted-foreground border-muted',
}

const LiveAttendance = () => {
  const [siteFilter, setSiteFilter] = useState('all')

  // Directly binds backend dataset scoped safely via headers
  const { data: records = [], isLoading } = useAttendanceRecords()

  // Collect distinct operational locations present in real-time records
  const uniqueSites = Array.from(new Map(records.map((r) => [r.site_id, r])).values())
  const filteredRecords =
    siteFilter === 'all' ? records : records.filter((r) => r.site_id === siteFilter)

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
          <Select value={siteFilter} onValueChange={(value) => setSiteFilter(value ?? 'all')}>
            <SelectTrigger className="w-full border-border">
              <SelectValue placeholder="All Operations Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueSites.map((r) => (
                <SelectItem key={r.site_id} value={r.site_id}>
                  Location Space {r.site_id.slice(0, 5)}
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
                  Employee {rec.employee_id.slice(0, 8)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Method: {rec.method.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {rec.clock_in && (
                  <span className="text-xs font-mono font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(rec.clock_in).toLocaleTimeString('en-ZA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                <Badge
                  variant="outline"
                  className={`capitalize text-xs ${statusColors[rec.status] || ''}`}
                >
                  {rec.status}
                </Badge>
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
