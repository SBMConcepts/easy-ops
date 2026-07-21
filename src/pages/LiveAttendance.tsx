/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useAttendanceRecords } from '../hooks/useOrgData'
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
  const employeeName = (rec: (typeof records)[number]) =>
    [rec.first_name, rec.last_name].filter(Boolean).join(' ') || rec.full_name || 'Unknown employee'

  const methods = Array.from(new Set(records.map((r) => r.method)))
  const filteredRecords =
    methodFilter === 'all' ? records : records.filter((r) => r.method === methodFilter)

  return (
    <div className="live-page">
      <div className="live-header">
        <div className="live-header__title-container">
          <h1 className="live-header__title">
            <Activity className="h-6 w-6" /> Live Attendance
          </h1>
          <p className="live-header__subtitle">Real-time tracking and monitoring.</p>
        </div>
        <div className="w-45">
          <Select value={methodFilter} onValueChange={setMethodFilter as any}>
            <SelectTrigger className="live-header__select-trigger">
              <SelectValue className="live-header__select-value" placeholder="Filter by method" />
            </SelectTrigger>
            <SelectContent className="live-header__select-content">
              <SelectItem className="live-header__select-item" value="all">
                All Methods
              </SelectItem>
              {methods.map((m) => (
                <SelectItem className="live-header__select-item" key={m} value={m}>
                  {m.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="live-card">
        <div className="live-card__header">
          <h2 className="live-card__title">Today's Record Logs</h2>
          <span className="live-card__count">Count: {filteredRecords.length}</span>
        </div>
        <div className="live-card__content">
          {isLoading ? (
            <div className="live-card__loading">
              <Loader2 className="live-card__loader" />
            </div>
          ) : filteredRecords.length > 0 ? (
            filteredRecords.map((rec) => (
              <div key={rec.id} className="live-row">
                <div className="live-row__details">
                  <p className="live-row__details-name">{employeeName(rec)}</p>
                  <p className="live-row__details-meta">
                    <MapPin className="h-3 w-3 text-dashboard-primary" /> {rec.method.toUpperCase()}{' '}
                    · {rec.date}
                    {rec.site_name && ` · ${rec.site_name}`}
                    {rec.department_name && ` · ${rec.department_name}`}
                  </p>
                </div>
                <span className="live-row__hours">
                  {rec.hours_worked}h{rec.overtime ? ` +${rec.overtime}h OT` : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="live-row__no-records">
              <div className="live-row__no-records-icon">
                <MapPin className="h-6 w-6 text-dashboard-text-muted/50" />
              </div>
              <p className="live-row__no-records-title">No records found</p>
              <p className="live-row__no-records-subtitle">
                No operational entries recorded today matching your filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
