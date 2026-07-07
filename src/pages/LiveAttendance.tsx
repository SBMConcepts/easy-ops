/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useAttendanceRecords, useSites, useDepartments } from '../hooks/useOrgData'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { MapPin, Loader2, Activity } from 'lucide-react'
import '../styles/liveattendance.css'

export default function LiveAttendance() {
  const [methodFilter, setMethodFilter] = useState('all')
  const { data: records = [], isLoading } = useAttendanceRecords()
  const { data: sites = [] } = useSites()
  const { data: departments = [] } = useDepartments()
  const siteName = (id: string | null) => (id ? sites.find((s) => s.id === id)?.site_name : null)
  const deptName = (id: string | null) => (id ? departments.find((d) => d.id === id)?.name : null)

  const methods = Array.from(new Set(records.map((r) => r.method)))
  const filteredRecords =
    methodFilter === 'all' ? records : records.filter((r) => r.method === methodFilter)

  return (
    <div className="live-page">
      <header className="live-header">
        <div>
          <h1 className="live-header__title text-2xl font-bold text-dashboard-text-main tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-dashboard-primary" /> Live Attendance
          </h1>
          <p className="text-sm text-dashboard-text-muted mt-1">
            Real-time tracking and monitoring.
          </p>
        </div>
        <div className="w-45">
          <Select value={methodFilter} onValueChange={setMethodFilter as any}>
            <SelectTrigger className="bg-dashboard-surface border-dashboard-border h-9">
              <SelectValue placeholder="Filter by method" />
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
      </header>

      <div className="live-card">
        <div className="live-card__header">
          <h2 className="text-md font-semibold text-dashboard-text-main">Today's Record Logs</h2>
          <span className="px-2.5 py-1 text-xs font-semibold bg-dashboard-bg border border-dashboard-border rounded-full text-dashboard-text-muted">
            Count: {filteredRecords.length}
          </span>
        </div>
        <div className="live-card__content">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-dashboard-text-muted h-8 w-8" />
            </div>
          ) : filteredRecords.length > 0 ? (
            filteredRecords.map((rec) => (
              <div key={rec.id} className="live-row">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-dashboard-text-main">
                    Employee {rec.auth0_user_id?.slice(0, 8)}
                  </p>
                  <p className="text-xs text-dashboard-text-muted flex items-center gap-1 font-medium">
                    <MapPin className="h-3 w-3 text-dashboard-primary" /> {rec.method.toUpperCase()}{' '}
                    · {rec.date}
                    {rec.site_id && ` · ${siteName(rec.site_id) ?? 'Unknown site'}`}
                    {rec.department_id && ` · ${deptName(rec.department_id) ?? 'Unknown dept'}`}
                  </p>
                </div>
                <span className="text-sm font-mono font-medium text-dashboard-text-main bg-dashboard-bg px-3 py-1.5 rounded-md border border-dashboard-border">
                  {rec.hours_worked}h{rec.overtime ? ` +${rec.overtime}h OT` : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-dashboard-bg flex items-center justify-center mb-3">
                <MapPin className="h-6 w-6 text-dashboard-text-muted/50" />
              </div>
              <p className="text-sm font-medium text-dashboard-text-main">No records found</p>
              <p className="text-xs text-dashboard-text-muted mt-1">
                No operational entries recorded today matching your filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
