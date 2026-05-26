import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent } from '../ui/card'
import { Plus, Trash2, MapPin } from 'lucide-react'

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
      <p className="sites-step__desc">
        Add all your work sites or locations where employees check in.
      </p>

      <div className="sites-step__list">
        {data.map((site, i) => (
          <Card key={i} className="site-card">
            <CardContent className="site-card__content">
              <div className="site-card__header">
                <span className="site-card__label">
                  <MapPin className="site-card__pin-icon" />
                  Site {i + 1}
                  {site.name && <span className="site-card__name-preview">— {site.name}</span>}
                </span>
                {data.length > 1 && (
                  <button
                    className="site-card__remove"
                    onClick={() => removeSite(i)}
                    aria-label={`Remove site ${i + 1}`}
                  >
                    <Trash2 className="site-card__remove-icon" />
                  </button>
                )}
              </div>

              <div className="site-card__grid">
                <div className="form-field site-card__field--full">
                  <Label className="form-label form-label--required">Site Name</Label>
                  <Input
                    className="form-input"
                    placeholder="e.g. Johannesburg HQ"
                    value={site.name}
                    onChange={(e) => updateSite(i, 'name', e.target.value)}
                  />
                </div>

                <div className="form-field site-card__field--full">
                  <Label className="form-label">Address</Label>
                  <Input
                    className="form-input"
                    placeholder="e.g. 123 Main Rd, Sandton"
                    value={site.address}
                    onChange={(e) => updateSite(i, 'address', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <Label className="form-label">Latitude</Label>
                  <Input
                    className="form-input form-input--mono"
                    type="number"
                    step="any"
                    placeholder="-26.1076"
                    value={site.latitude}
                    onChange={(e) => updateSite(i, 'latitude', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <Label className="form-label">Longitude</Label>
                  <Input
                    className="form-input form-input--mono"
                    type="number"
                    step="any"
                    placeholder="28.0567"
                    value={site.longitude}
                    onChange={(e) => updateSite(i, 'longitude', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <Label className="form-label">Geofence Radius (m)</Label>
                  <Input
                    className="form-input form-input--mono"
                    type="number"
                    min="50"
                    max="10000"
                    placeholder="200"
                    value={site.geofence_radius_m}
                    onChange={(e) => updateSite(i, 'geofence_radius_m', e.target.value)}
                  />
                  <span className="form-hint">Minimum 50 m recommended</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addSite} className="site-step__add-btn">
        <Plus className="h-4 w-4 mr-2" /> Add Another Site
      </Button>
    </div>
  )
}

export default SitesStep
