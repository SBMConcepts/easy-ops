/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAttendanceRecords, attendanceKeys, useSites } from '../hooks/useTenantData'
import { useDB } from '../contexts/DatabaseContext'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'
import { QrCode, Fingerprint, MapPin, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { useCurrentUser } from '../hooks/useCurrentUser'

const CheckIn = () => {
  const supabase = useDB()
  const { user } = useAuth()
  const { profile: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  const { data: attendanceHistory, isLoading } = useAttendanceRecords()
  const { data: sites = [] } = useSites()
  const [selectedMethod, setSelectedMethod] = useState<'qr' | 'biometric' | 'manual'>('qr')

  // Direct Supabase Mutations replacing the old Express API calls
  const checkIn = useMutation({
    mutationFn: async ({
      method,
      site_id,
    }: {
      method: 'qr' | 'biometric' | 'manual'
      site_id: string
    }) => {
      if (!currentUser?.profile_id || !currentUser?.tenant_id) {
        throw new Error('User profile not loaded')
      }
      const { error } = await supabase.from('attendance_records').insert({
        employee_id: currentUser.profile_id,
        tenant_id: currentUser.tenant_id,
        method,
        site_id,
        status: 'present',
        clock_in: new Date().toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() }),
  })

  const clockOut = useMutation({
    mutationFn: async ({ recordId }: { recordId: string }) => {
      const { error } = await supabase
        .from('attendance_records')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', recordId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() }),
  })

  // Ascertain current shift clock-in state using structural evaluation from history[cite: 18]
  const activeRecord = attendanceHistory?.find((r) => r.clock_in && !r.clock_out)
  const isClockedIn = !!activeRecord
  const processing = checkIn.isPending || clockOut.isPending

  const handleClockIn = async () => {
    try {
      // attendance_records.site_id is a NOT-validated FK to public.sites, so a
      // real site id is required. Prefer the employee's assigned site; fall back
      // to the tenant's first available site.
      const siteId = currentUser?.assigned_site_id ?? sites[0]?.id
      if (!siteId) {
        toast.error('No site is assigned to your profile. Contact your administrator.')
        return
      }
      await checkIn.mutateAsync({ method: selectedMethod, site_id: siteId })
      toast.success(`Clock-in record captured via ${selectedMethod.toUpperCase()}`)
    } catch (err: any) {
      toast.error(err.message || 'Check-in processing failure')
    }
  }

  const handleClockOut = async () => {
    if (!activeRecord?.id) return
    try {
      await clockOut.mutateAsync({ recordId: activeRecord.id })
      toast.success('Clock-out transaction validated successfully')
    } catch (err: any) {
      toast.error(err.message || 'Clock-out processing failure')
    }
  }

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
            <span className="text-sm font-medium text-muted-foreground">Current State</span>
            <Badge
              variant={isClockedIn ? 'secondary' : 'outline'}
              className={isClockedIn ? 'bg-secondary/10 text-secondary border-secondary/20' : ''}
            >
              {isClockedIn ? 'On Shift Duty' : 'Off Duty'}
            </Badge>
          </div>

          {!isClockedIn && (
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
          )}

          <div className="flex justify-center pt-2">
            {isClockedIn ? (
              <Button
                size="lg"
                variant="destructive"
                className="w-full text-md py-6 shadow-sm"
                onClick={handleClockOut}
                disabled={processing}
              >
                <Clock className="h-5 w-5 mr-2" /> Clock Out of Shift
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full text-md py-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-sm"
                onClick={handleClockIn}
                disabled={processing}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" /> Clock In for Duty
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CheckIn
