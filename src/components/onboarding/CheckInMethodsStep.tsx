import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { QrCode, Fingerprint, MapPin, ShieldCheck } from 'lucide-react'
import '../../styles/form.css'
import '../../styles/checkinmethods.css'

export interface CheckInSettings {
  methods: {
    qrEnabled: boolean
    biometricEnabled: boolean
    whatsappEnabled: boolean
    manualEnabled: boolean
    geofencingEnabled: boolean
    defaultGeofenceRadius: number
  }
}

interface Props {
  data: CheckInSettings
  onChange: (d: CheckInSettings) => void
}

const CheckInMethodsStep = ({ data, onChange }: Props) => {
  const update = (key: keyof CheckInSettings['methods'], val: boolean | number) =>
    onChange({ ...data, methods: { ...data.methods, [key]: val } })

  const enabledCount = Object.values(data.methods).filter((v) => v === true).length

  return (
    <div className="checkin-step">
      <div className="checkin-step__section">
        <div className="checkin-step__section-header mb-4">
          <h2 className="checkin-step__section-title">Validation Methods</h2>
          <span className="checkin-step__enabled-count">{enabledCount} Active</span>
        </div>
      </div>

      <div className="space-y-3">
        <Card className="method-card">
          <CardContent className="method-card__content">
            <div className="method-card__icon-wrap method-card__icon-wrap--qr">
              <QrCode size={18} />
            </div>
            <Label className="method-card__label">QR Code Scanning</Label>
            <Switch
              checked={data.methods.qrEnabled}
              onCheckedChange={(v) => update('qrEnabled', v)}
            />
          </CardContent>
        </Card>

        <Card className="method-card">
          <CardContent className="method-card__content">
            <div className="method-card__icon-wrap method-card__icon-wrap--biometric">
              <Fingerprint size={18} />
            </div>
            <Label className="method-card__label">Biometric Verification</Label>
            <Switch
              checked={data.methods.biometricEnabled}
              onCheckedChange={(v) => update('biometricEnabled', v)}
            />
          </CardContent>
        </Card>

        <Card className="method-card">
          <CardContent className="method-card__content">
            <div className="method-card__icon-wrap method-card__icon-wrap--whatsapp">
              <ShieldCheck size={18} />
            </div>
            <Label className="method-card__label">Geofence Lock</Label>
            <Switch
              checked={data.methods.geofencingEnabled}
              onCheckedChange={(v) => update('geofencingEnabled', v)}
            />
          </CardContent>
        </Card>

        {data.methods.geofencingEnabled && (
          <div className="p-4 mt-2 border border-primary/10 rounded-lg bg-primary/5 flex gap-4 items-start">
            <MapPin className="text-primary mt-1 shrink-0" size={18} />
            <div className="flex-1">
              <Label className="method-card__label">Default Global Radius (meters)</Label>
              <p className="method-card__desc mb-2">Distance allowed from site coordinates.</p>
              <Input
                type="number"
                min={50}
                value={data.methods.defaultGeofenceRadius}
                onChange={(e) => update('defaultGeofenceRadius', Number(e.target.value))}
                className="method-card__input"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CheckInMethodsStep
