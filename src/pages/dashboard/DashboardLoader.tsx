/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import { Badge } from '../../components/ui/badge'
import type { Database } from '../../integrations/supabase/types'

type AttendanceStatus = Database['public']['Enums']['attendance_status']

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-secondary/10 text-secondary border-secondary/20',
  late: 'bg-accent/10 text-accent-foreground border-accent/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  leave: 'bg-muted text-muted-foreground border-muted',
  holiday: 'bg-muted text-muted-foreground border-muted',
}

export const DashboardLoader = () => (
  <div className="flex items-center justify-center min-h-100">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
)

interface AttendanceItemProps {
  fullName?: string
  metaText: string // e.g. "Clock-in · Site Name"
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
    <div className="flex justify-between items-center py-3 border-b border-border last:border-0 hover:bg-muted/5 transition-colors px-2 rounded-md">
      <div className="space-y-1">
        <p className="font-medium text-sm text-foreground">{fullName || '—'}</p>
        <p className="text-xs text-muted-foreground">{metaText}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-muted-foreground">
          {clockIn ? formatTime(clockIn) : '—'}
          {clockOut !== undefined && ` — ${clockOut ? formatTime(clockOut) : '...'}`}
        </span>
        {hoursWorked && <span className="text-xs font-medium text-foreground">{hoursWorked}h</span>}
        <Badge variant="outline" className={`capitalize text-xs ${STATUS_COLORS[status] || ''}`}>
          {status}
        </Badge>
      </div>
    </div>
  )
}
