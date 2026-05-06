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
import { useAttendanceRecords, useSites } from '../hooks/useSupabaseData'
import { MapPin, Users, Clock } from 'lucide-react'
import '../styles/pages.css'

const statusColors: Record<string, string> = {
  present: 'bg-secondary/10 text-secondary border-secondary/20',
  late: 'bg-accent/10 text-accent-foreground border-accent/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  on_leave: 'bg-muted text-muted-foreground border-muted',
}

const LiveAttendance = () => {
  const [siteFilter, setSiteFilter] = useState('all')
  const { data: reportData, isLoading: loadingRecords } = useAttendanceRecords()
  const { data: sites } = useSites()

  const records = reportData?.records || []
  const filtered = siteFilter === 'all' ? records : records.filter((r) => r.site_id === siteFilter)

  if (loadingRecords) {
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
          <h1 className="page-title">Live Attendance</h1>
          <p className="page-subtitle">Real-time employee status across all sites</p>
        </div>
        <Select value={siteFilter} onValueChange={(v) => setSiteFilter(v ?? 'all')}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {(sites || []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Site summary cards */}
      {(sites || []).length > 0 && (
        <div className="site-grid">
          {(sites || []).map((site) => {
            const siteRecords = records.filter((r) => r.site_id === site.id)
            const present = siteRecords.filter((r) => r.status === 'present').length
            return (
              <Card
                key={site.id}
                className="shadow-card cursor-pointer hover:shadow-card-hover transition-shadow"
                onClick={() => setSiteFilter(site.id)}
              >
                <CardContent className="site-card-body">
                  <div className="site-card-name-row">
                    <MapPin className="h-4 w-4 icon-secondary" />
                    <p className="site-card-name">{site.name}</p>
                  </div>
                  <div className="site-card-count-row">
                    <Users className="h-4 w-4 icon-muted" />
                    <p className="site-card-count">
                      {present}/{siteRecords.length} present
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Record list */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="card-title-row">
            <Clock className="h-5 w-5 icon-secondary" />
            {siteFilter === 'all'
              ? 'All Employees'
              : (sites || []).find((s) => s.id === siteFilter)?.name || 'Site'}
            <Badge variant="secondary" className="ml-1">
              {filtered.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="record-list">
            {filtered.map((rec) => (
              <div key={rec.id} className="record-row">
                <div className="record-row-left">
                  <p className="record-name">{rec.profiles?.full_name || '—'}</p>
                  <p className="record-meta">
                    {rec.profiles?.department || '—'} · {rec.sites?.name || '—'}
                  </p>
                </div>
                <div className="record-row-right">
                  <Badge variant="outline" className="text-xs">
                    {rec.method}
                  </Badge>
                  {rec.clock_in && (
                    <span className="record-time">
                      {new Date(rec.clock_in).toLocaleTimeString('en-ZA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                  <Badge variant="outline" className={statusColors[rec.status] || ''}>
                    {rec.status}
                  </Badge>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="record-empty">No attendance records found.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LiveAttendance
