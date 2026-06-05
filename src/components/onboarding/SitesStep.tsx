import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent } from '../../components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

import '../../styles/form.css'
import '../../styles/sitesstep.css'

export interface SiteData {
  name: string
  address: string
  latitude: string
  longitude: string
  geofence_radius_m: string
}

interface Props {
  data: SiteData[]
  onChange: (data: SiteData[]) => void
}

const emptySite: SiteData = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  geofence_radius_m: '200',
}

const SitesStep = ({ data, onChange }: Props) => {
  const addSite = () => onChange([...data, { ...emptySite }])
  const removeSite = (i: number) => onChange(data.filter((_, idx) => idx !== i))
  const updateSite = (i: number, field: keyof SiteData, value: string) => {
    const updated = [...data]
    updated[i] = { ...updated[i], [field]: value }
    onChange(updated)
  }

  return (
    <div className="sites-step">
      <h2 className="text-xl font-bold mb-4">Operational Sites</h2>
      <div className="sites-step__list space-y-4">
        {data.map((site, i) => (
          <Card key={i} className="site-card">
            <CardContent className="site-card__content p-4 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-destructive"
                onClick={() => removeSite(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="form-field mb-2">
                <Label>Site Name</Label>
                <Input
                  placeholder="HQ Office"
                  value={site.name}
                  onChange={(e) => updateSite(i, 'name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={site.latitude}
                    onChange={(e) => updateSite(i, 'latitude', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={site.longitude}
                    onChange={(e) => updateSite(i, 'longitude', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button variant="outline" onClick={addSite} className="mt-4 w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Site
      </Button>
    </div>
  )
}
export default SitesStep
