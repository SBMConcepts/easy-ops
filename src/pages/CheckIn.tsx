/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAttendanceRecords, attendanceKeys } from '../hooks/useOrgData'
import { useOrgApi } from '../hooks/useOrgApi'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { toast } from 'sonner'
import { QrCode, Fingerprint, MapPin, CheckCircle2, Loader2, Clock } from 'lucide-react'
import '../styles/checkin.css'

export default function CheckIn() {
  const { apiFetch } = useOrgApi()
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

      // Writes go through the Express API (service-role); org_attendance has RLS
      // enabled with no policies, so a direct authenticated-client insert is denied.
      await apiFetch('org-attendance', {
        method: 'POST',
        body: JSON.stringify({
          date: dateStr,
          method: selectedMethod,
          hours_worked: Number(hoursWorked) || 0,
          overtime: Number(overtime) || 0,
        }),
      })
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
      <div className="checkin-container">
        <div className="checkin-header">
          <h2 className="checkin-header__heading">Shift Gateway Terminal</h2>
          <p className="checkin-header__subheading">
            Log your shift hours, including standard and overtime hours.
          </p>
        </div>
        <div className="checkin-card">
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

          <div className="checkin-hours">
            <div className="checkin-hours__row">
              <Label className="checkin-hours__label">Standard Hours</Label>
              <div className="relative">
                <Clock className="checkin-hours__icon" />
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  className="checkin-hours__input"
                />
              </div>
            </div>
            <div className="checkin-hours__row">
              <Label className="checkin-hours__label">Overtime</Label>
              <div className="relative">
                <Clock className="checkin-hours__icon" />
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={overtime}
                  onChange={(e) => setOvertime(e.target.value)}
                  className="checkin-hours__input"
                />
              </div>
            </div>
          </div>

          <button
            className="checkin-log-btn"
            onClick={() => logAttendance.mutate()}
            disabled={logAttendance.isPending}
          >
            {logAttendance.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5 mr-2" />
            )}
            Log Today's Attendance
          </button>

          {attendanceHistory.length > 0 && (
            <div className="checkin-history mt-4">
              <span className="checkin-history__label">Recent Entries</span>
              {attendanceHistory.slice(0, 3).map((rec, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-sm p-3 bg-dashboard-bg rounded-md border border-dashboard-border"
                >
                  <span className="font-medium text-dashboard-text-main">{rec.date}</span>
                  <div className="flex items-center gap-3">
                    <span className="checkin-history__method">{rec.method}</span>
                    <span className="checkin-history__hours">{rec.hours_worked}h</span>
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
