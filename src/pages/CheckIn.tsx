/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAttendanceRecords, attendanceKeys } from '../hooks/useOrgData'
import { useDB } from '../contexts/DatabaseContext'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { toast } from 'sonner'
import { QrCode, Fingerprint, MapPin, CheckCircle2, Loader2, Clock } from 'lucide-react'
import '../styles/checkin.css'

export default function CheckIn() {
  const supabase = useDB()
  const { profile: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  const { data: attendanceHistory = [], isLoading } = useAttendanceRecords()
  const [selectedMethod, setSelectedMethod] = useState<'qr' | 'biometric' | 'manual'>('qr')
  const [hoursWorked, setHoursWorked] = useState('8')
  const [overtime, setOvertime] = useState('0')

  const logAttendance = useMutation({
    mutationFn: async () => {
      if (!currentUser?.auth0_user_id || !currentUser.org_id) throw new Error('Not initialized')

      const dateStr = new Date().toISOString().split('T')[0]

      const { error } = await supabase.from('org_attendance').upsert(
        {
          user_id: currentUser.auth0_user_id,
          org_id: currentUser.org_id,
          date: dateStr,
          method: selectedMethod,
          hours_worked: Number(hoursWorked) || 0,
          overtime: Number(overtime) || 0,
        },
        { onConflict: 'user_id, date, organization_id' }
      )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all })
      toast.success('Attendance logged successfully!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to log attendance')
    },
  })

  return (
    <div className="checkin-page">
      <div className="checkin-card">
        <div className="checkin-card__content">
          <div className="text-center space-y-1 mb-2">
            <h2 className="text-2xl font-bold text-dashboard-text-main tracking-tight">
              Terminal Kiosk
            </h2>
            <p className="text-sm text-dashboard-text-muted">
              Select validation method to clock in.
            </p>
          </div>

          <div className="checkin-method-grid">
            <button
              className={`checkin-method-btn ${selectedMethod === 'qr' ? 'checkin-method-btn--active' : ''}`}
              onClick={() => setSelectedMethod('qr')}
            >
              <QrCode size={24} /> <span className="text-xs font-semibold">QR Code</span>
            </button>
            <button
              className={`checkin-method-btn ${selectedMethod === 'biometric' ? 'checkin-method-btn--active' : ''}`}
              onClick={() => setSelectedMethod('biometric')}
            >
              <Fingerprint size={24} /> <span className="text-xs font-semibold">Biometric</span>
            </button>
            <button
              className={`checkin-method-btn ${selectedMethod === 'manual' ? 'checkin-method-btn--active' : ''}`}
              onClick={() => setSelectedMethod('manual')}
            >
              <MapPin size={24} /> <span className="text-xs font-semibold">Manual</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-dashboard-text-muted uppercase tracking-wider">
                Standard Hours
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dashboard-text-muted" />
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  className="pl-9 bg-dashboard-bg"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-dashboard-text-muted uppercase tracking-wider">
                Overtime
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dashboard-text-muted" />
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={overtime}
                  onChange={(e) => setOvertime(e.target.value)}
                  className="pl-9 bg-dashboard-bg"
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full h-12 text-md mt-4 font-semibold"
            onClick={() => logAttendance.mutate()}
            disabled={logAttendance.isPending}
          >
            {logAttendance.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5 mr-2" />
            )}
            Log Today's Attendance
          </Button>

          {attendanceHistory.length > 0 && (
            <div className="checkin-history mt-4">
              <span className="text-xs font-semibold uppercase text-dashboard-text-muted tracking-wider mb-2">
                Recent Entries
              </span>
              {attendanceHistory.slice(0, 3).map((rec, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-sm p-3 bg-dashboard-bg rounded-md border border-dashboard-border"
                >
                  <span className="font-medium text-dashboard-text-main">{rec.date}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-dashboard-text-muted font-semibold uppercase">
                      {rec.method}
                    </span>
                    <span className="font-mono text-dashboard-text-main font-medium">
                      {rec.hours_worked}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
