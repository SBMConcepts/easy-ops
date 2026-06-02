import { useState } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAttendanceRecords, useAttendanceMutations } from '../hooks/useTenantData'
import type { CheckInMethod } from '../integrations/supabase/types'
import { toast } from 'sonner'
import { QrCode, Fingerprint, MapPin, Clock, CheckCircle2, Loader2 } from 'lucide-react'

const CheckIn = () => {
  // Use secure multi-tenant queries and mutations
  const { data: attendanceHistory, isLoading } = useAttendanceRecords()
  const { checkIn, clockOut } = useAttendanceMutations()

  const [selectedMethod, setSelectedMethod] = useState<CheckInMethod>('qr')
  const [processing, setProcessing] = useState(false)

  // Ascertain current shift clock-in state using structural evaluation from history
  const activeRecord = attendanceHistory?.find((r) => r.clock_in && !r.clock_out)
  const isClockedIn = !!activeRecord

  const handleClockIn = async () => {
    setProcessing(true)
    try {
      const defaultSiteId = '00000000-0000-0000-0000-000000000000'
      await checkIn.mutateAsync({ method: selectedMethod, site_id: defaultSiteId })
      toast.success(`Clock-in record captured via ${selectedMethod.toUpperCase()}`)
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || 'Check-in processing failure')
    } finally {
      setProcessing(false)
    }
  }

  const handleClockOut = async () => {
    if (!activeRecord?.id) return
    setProcessing(true)
    try {
      await clockOut.mutateAsync({ recordId: activeRecord.id })
      toast.success('Clock-out transaction validated successfully')
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || 'Clock-out processing failure')
    } finally {
      setProcessing(false)
    }
  }

  const methods = [
    { id: 'qr' as const, label: 'QR Scan', icon: QrCode, desc: 'Stationary scanner check' },
    {
      id: 'biometric' as const,
      label: 'Biometric',
      icon: Fingerprint,
      desc: 'On-device fingerprint verification',
    },
    {
      id: 'manual' as const,
      label: 'Manual Check',
      icon: MapPin,
      desc: 'GPS geolocation fallback verification',
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
                <Clock className="h-5 w-5 mr-2" />
                Clock Out of Shift
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full text-md py-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-sm"
                onClick={handleClockIn}
                disabled={processing}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Clock In for Duty
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CheckIn
