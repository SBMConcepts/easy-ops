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
      <div className="sites-step__header">
        <h2 className="sites-step__heading">Operational Sites</h2>
        <p className="sites-step__subheading">
          Add the physical locations or offices where your employees check in.
        </p>
      </div>

      <div className="sites-step__list">
        {data.map((site, i) => (
          <Card key={i} className="site-card relative">
            <CardContent className="site-card__content">
              <button
                type="button"
                className="site-card__remove absolute top-2 right-2"
                onClick={() => removeSite(i)}
              >
                <Trash2 className="site-card__remove-icon" />
              </button>

              <div className="site-card__grid">
                <div className="site-card__row pr-2">
                  <Label className="site-card__label">Site Name</Label>
                  <Input
                    className="site-card__input mt-1.5"
                    placeholder="HQ Office"
                    value={site.name}
                    onChange={(e) => updateSite(i, 'name', e.target.value)}
                  />
                </div>

                <div className="site-card__row pr-2">
                  <Label className="site-card__label">Address</Label>
                  <Input
                    className="site-card__input mt-1.5"
                    placeholder="123 Main Street"
                    value={site.address}
                    onChange={(e) => updateSite(i, 'address', e.target.value)}
                  />
                </div>

                <div className="site-card__row pr-2">
                  <Label className="site-card__label">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    className="site-card__input mt-1.5"
                    placeholder="-25.747"
                    value={site.latitude}
                    onChange={(e) => updateSite(i, 'latitude', e.target.value)}
                  />
                </div>

                <div className="site-card__row pr-2">
                  <Label className="site-card__label">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    className="site-card__input mt-1.5"
                    placeholder="28.188"
                    value={site.longitude}
                    onChange={(e) => updateSite(i, 'longitude', e.target.value)}
                  />
                </div>

                <div className="site-card__row pr-2">
                  <Label className="site-card__label">Geofence Radius (meters)</Label>
                  <Input
                    type="number"
                    className="site-card__input mt-1.5"
                    value={site.geofence_radius_m}
                    onChange={(e) => updateSite(i, 'geofence_radius_m', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <button onClick={addSite} className="site-step__add-btn ">
        <Plus className="site-step__add-btn-icon" /> Add Site
      </button>
    </div>
  )
}

export default SitesStep
