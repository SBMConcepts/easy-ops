import { useState } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../contexts/AuthContext'
import { useTodayStatus, checkIn, checkOut } from '../hooks/useTenantData'
import { toast } from 'sonner'
import { QrCode, Fingerprint, MessageCircle, Clock, CheckCircle2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

type CheckInMethod = 'qr' | 'biometric' | 'whatsapp'

const CheckIn = () => {
  const { user, getAccessToken } = useAuth()
  const queryClient = useQueryClient()
  const { data: todayRecord, isLoading } = useTodayStatus()
  const [selectedMethod, setSelectedMethod] = useState<CheckInMethod>('qr')
  const [loading, setLoading] = useState(false)

  const isClockedIn = !!todayRecord

  const handleClockIn = async () => {
    setLoading(true)
    try {
      await checkIn(getAccessToken, selectedMethod)
      toast.success(`Clocked in via ${selectedMethod.toUpperCase()}`)
      queryClient.invalidateQueries({ queryKey: ['today-status'] })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Check-in failed')
    }
    setLoading(false)
  }

  const handleClockOut = async () => {
    setLoading(true)
    try {
      await checkOut(getAccessToken)
      toast.success('Clocked out successfully')
      queryClient.invalidateQueries({ queryKey: ['today-status'] })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Check-out failed')
    }
    setLoading(false)
  }

  const methods = [
    {
      id: 'qr' as const,
      label: 'QR Code',
      icon: QrCode,
      desc: 'Scan workplace QR code',
    },
    {
      id: 'biometric' as const,
      label: 'Biometric',
      icon: Fingerprint,
      desc: 'Fingerprint verification',
    },
    {
      id: 'whatsapp' as const,
      label: 'WhatsApp',
      icon: MessageCircle,
      desc: 'Chat-based check-in',
    },
  ]

  const clockInTime = todayRecord?.clock_in
    ? new Date(todayRecord.clock_in).toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Attendance Check-In</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {user?.name} ·{' '}
          {new Date().toLocaleDateString('en-ZA', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      <Card
        className={`shadow-card border-2 ${isClockedIn ? 'border-secondary' : 'border-border'}`}
      >
        <CardContent className="p-6 text-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          ) : isClockedIn ? (
            <div className="space-y-3">
              <CheckCircle2 className="h-12 w-12 text-secondary mx-auto" />
              <p className="font-display text-xl font-bold text-foreground">You are clocked in</p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Since {clockInTime}</span>
              </div>
              <Badge
                className="bg-secondary/10 text-secondary border-secondary/20"
                variant="outline"
              >
                {todayRecord?.method?.toUpperCase()} verified
              </Badge>
            </div>
          ) : (
            <div className="space-y-3">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="font-display text-xl font-bold text-foreground">Not clocked in</p>
              <p className="text-sm text-muted-foreground">Select a method and clock in below</p>
            </div>
          )}
        </CardContent>
      </Card>

      {!isClockedIn && (
        <div className="grid grid-cols-3 gap-3">
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                selectedMethod === method.id
                  ? 'border-secondary bg-secondary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <method.icon
                className={`h-8 w-8 ${selectedMethod === method.id ? 'text-secondary' : 'text-muted-foreground'}`}
              />
              <span className="text-sm font-medium text-foreground">{method.label}</span>
              <span className="text-xs text-muted-foreground text-center">{method.desc}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-center">
        {isClockedIn ? (
          <Button
            size="lg"
            variant="destructive"
            className="w-full max-w-xs text-lg py-6"
            onClick={handleClockOut}
            disabled={loading}
          >
            <Clock className="h-5 w-5 mr-2" />
            Clock Out
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full max-w-xs text-lg py-6 bg-secondary hover:bg-secondary/90"
            onClick={handleClockIn}
            disabled={loading}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Clock In
          </Button>
        )}
      </div>
    </div>
  )
}

export default CheckIn
