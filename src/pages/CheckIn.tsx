import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAttendanceRecords, attendanceKeys } from '../hooks/useTenantData'
import { useDB } from '../contexts/DatabaseContext'
import { toast } from 'sonner'
import { QrCode, Fingerprint, MapPin, CheckCircle2, Loader2 } from 'lucide-react'
import { useCurrentUser } from '../hooks/useCurrentUser'

const CheckIn = () => {
  const supabase = useDB()
  const { profile: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  const { data: attendanceHistory = [], isLoading } = useAttendanceRecords()
  const [selectedMethod, setSelectedMethod] = useState<'qr' | 'biometric' | 'manual'>('qr')
  const [hoursWorked, setHoursWorked] = useState('8')
  const [overtime, setOvertime] = useState('0')

  // org_attendance is a daily aggregate (one row per user per day), so logging
  // attendance inserts a record with the chosen method and the hours worked /
  // overtime for the day rather than a clock-in/clock-out event pair.
  const logAttendance = useMutation({
    mutationFn: async () => {
      if (!currentUser?.auth0_user_id || !currentUser?.tenant_id) {
        throw new Error('User profile not loaded')
      }
      const hours = Number(hoursWorked)
      const ot = Number(overtime)
      if (!Number.isFinite(hours) || hours < 0) throw new Error('Enter valid hours worked')
      if (!Number.isFinite(ot) || ot < 0) throw new Error('Enter valid overtime hours')

      const { error } = await supabase.from('org_attendance').insert({
        org_id: currentUser.tenant_id,
        user_id: currentUser.auth0_user_id,
        date: new Date().toISOString().slice(0, 10),
        method: selectedMethod,
        hours_worked: hours,
        overtime: ot,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })
      toast.success(`Attendance logged via ${selectedMethod.toUpperCase()}`)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Attendance logging failure'),
  })

  const processing = logAttendance.isPending

  const methods = [
    { id: 'qr' as const, label: 'QR Scan', icon: QrCode, desc: 'Stationary scanner check' },
    {
      id: 'biometric' as const,
      label: 'Biometric',
      icon: Fingerprint,
      desc: 'On-device verification',
    },
    {
      id: 'manual' as const,
      label: 'Manual Check',
      icon: MapPin,
      desc: 'GPS geolocation fallback',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pt-4">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Shift Gateway Terminal
        </h1>
        <p className="text-sm text-muted-foreground">Log shift hours for audit payroll logs</p>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="text-sm font-medium text-muted-foreground">Check-in Method</span>
            <Badge variant="outline" className="uppercase">
              {selectedMethod}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMethod(m.id)}
                className={`flex items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                  selectedMethod === m.id
                    ? 'border-secondary bg-secondary/5 ring-1 ring-secondary'
                    : 'border-border hover:border-muted-foreground/30 bg-card'
                }`}
              >
                <m.icon
                  className={`h-6 w-6 shrink-0 ${selectedMethod === m.id ? 'text-secondary' : 'text-muted-foreground'}`}
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Hours worked</span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Overtime hours</span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={overtime}
                onChange={(e) => setOvertime(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              size="lg"
              className="w-full text-md py-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-sm"
              onClick={() => logAttendance.mutate()}
              disabled={processing}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" /> Log Today's Attendance
            </Button>
          </div>

          {attendanceHistory.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-medium text-muted-foreground">Recent entries</span>
              {attendanceHistory.slice(0, 5).map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
                >
                  <span className="font-medium text-foreground">{rec.date}</span>
                  <span className="uppercase text-muted-foreground">{rec.method}</span>
                  <span className="font-mono text-foreground">
                    {rec.hours_worked}h{rec.overtime ? ` +${rec.overtime}h OT` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CheckIn
