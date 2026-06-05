import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'

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

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Validation Methods</h2>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <Label>QR Code Scanning</Label>
            <Switch
              checked={data.methods.qrEnabled}
              onCheckedChange={(v) => update('qrEnabled', v)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <Label>Biometric Verification</Label>
            <Switch
              checked={data.methods.biometricEnabled}
              onCheckedChange={(v) => update('biometricEnabled', v)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <Label>Geofence Lock</Label>
            <Switch
              checked={data.methods.geofencingEnabled}
              onCheckedChange={(v) => update('geofencingEnabled', v)}
            />
          </CardContent>
        </Card>

        {data.methods.geofencingEnabled && (
          <div className="p-4 border rounded bg-muted/20">
            <Label>Default Global Radius (meters)</Label>
            <Input
              type="number"
              min={50}
              value={data.methods.defaultGeofenceRadius}
              onChange={(e) => update('defaultGeofenceRadius', Number(e.target.value))}
              className="mt-2"
            />
          </div>
        )}
      </div>
    </div>
  )
}
export default CheckInMethodsStep
