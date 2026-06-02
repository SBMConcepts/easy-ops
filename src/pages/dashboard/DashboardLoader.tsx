/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import { Badge } from '../../components/ui/badge'
import type { AttendanceStatus } from '../../integrations/supabase/types'

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-secondary/10 text-secondary border-secondary/20',
  late: 'bg-accent/10 text-accent-foreground border-accent/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  leave: 'bg-muted text-muted-foreground border-muted',
  holiday: 'bg-muted text-muted-foreground border-muted',
}

export const DashboardLoader = () => (
  <div className="dashboard-loader">
    <div className="dashboard-spinner" />
  </div>
)

interface AttendanceItemProps {
  fullName?: string
  metaText: string
  clockIn?: string | null
  clockOut?: string | null
  status: AttendanceStatus
  hoursWorked?: string | null
}

export const AttendanceRow: React.FC<AttendanceItemProps> = ({
  fullName,
  metaText,
  clockIn,
  clockOut,
  status,
  hoursWorked,
}) => {
  const formatTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="attendance-row">
      <div className="attendance-row-left">
        <p className="attendance-name">{fullName || '—'}</p>
        <p className="attendance-meta">{metaText}</p>
      </div>
      <div className="attendance-row-right">
        <span className="attendance-time">
          {clockIn ? formatTime(clockIn) : '—'}
          {clockOut !== undefined && ` — ${clockOut ? formatTime(clockOut) : '...'}`}
        </span>
        {hoursWorked && <span className="attendance-hours">{hoursWorked}h</span>}
        <Badge variant="outline" className={STATUS_COLORS[status] || ''}>
          {status}
        </Badge>
      </div>
    </div>
  )
}
