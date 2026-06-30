import { Card, CardContent } from '../../components/ui/card'
import {
  Building2,
  MapPin,
  QrCode,
  Fingerprint,
  MessageCircle,
  PenLine,
  Scale,
  Users,
} from 'lucide-react'
import type { CompanyData } from './CompanyStep'
import type { SiteData } from './SitesStep'
import type { DepartmentData } from './DepartmentsStep'
import type { RoleData } from './RolesStep'
import type { ShiftData, WorkRules } from './ShiftsStep'
import type { CheckInSettings } from './CheckInMethodsStep'

import '../../styles/form.css'
import '../../styles/reviewstep.css'

interface Props {
  company: CompanyData
  sites: SiteData[]
  departments: DepartmentData[]
  roles: RoleData[]
  shifts: ShiftData[]
  checkInMethods: CheckInSettings
  workRules: WorkRules
}

const METHOD_ICONS: Record<string, React.ElementType> = {
  qrEnabled: QrCode,
  biometricEnabled: Fingerprint,
  whatsappEnabled: MessageCircle,
  manualEnabled: PenLine,
}

const METHOD_LABELS: Record<string, string> = {
  qrEnabled: 'QR Code',
  biometricEnabled: 'Biometric',
  whatsappEnabled: 'WhatsApp',
  manualEnabled: 'Manual Entry',
}

const ReviewStep = ({ company, sites, departments, roles, shifts, checkInMethods }: Props) => {
  return (
    <div className="review-step ">
      <div className="review-step__header">
        <h2 className="review-step__heading">Review Configuration</h2>
        <p className="review-step__subheading">Verify your structural workspace setup</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Overview */}
        <Card className="review-card">
          <CardContent className="review-card__content">
            <div className="review-card__heading border-b pb-3 mb-1">
              <Building2 className="review-card__heading-icon" />
              <span className="review-card__heading--sub">Company Details</span>
            </div>
            <div className="review-card__body">
              <p className="review-company__name">
                <strong>Name:</strong> {company.name || '—'}
              </p>
              <p className="review-company__industry">
                <strong>Industry:</strong> {company.industry || '—'}
              </p>
              <p className="review-company__country">
                <strong>Country:</strong> {company.country || '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Operational Scope */}
        <Card className="review-card">
          <CardContent className="review-card__content">
            <div className="review-card__heading border-b pb-3 mb-1">
              <Scale className="review-card__heading-icon" />
              <span className="review-card__heading--sub">Operational Scope</span>
            </div>
            <div className="review-card__body">
              <p className="review-company__name">
                <strong>Locations:</strong> {sites.length} Active Sites
              </p>
              <p className="review-company__industry">
                <strong>Departments:</strong> {departments.length} Divisions
              </p>
              <p className="review-company__country">
                <strong>Roles:</strong> {roles.length} Custom Profiles
              </p>
              <p className="review-company__country">
                <strong>Shifts:</strong> {shifts.length} Schedules
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Summary (Using Badges) */}
      <Card className="review-card">
        <CardContent className="review-card__content">
          <div className="review-card__heading border-b pb-3 mb-1">
            <Users className="review-card__heading-icon" />
            <span className="review-card__heading--sub">Configured Roles</span>
          </div>
          <div className="review-roles">
            {roles.length === 0 ? (
              <span className="review-role">No custom roles defined.</span>
            ) : (
              roles.map((r, i) => (
                <span key={i} className={`review-role-badge review-role-badge--${r.base_role}`}>
                  <span className="review-role-badge__name">{r.name}</span>
                  <span className="review-role-badge__base">{r.base_role}</span>
                </span>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Check-In Methods */}
      <Card className="review-card">
        <CardContent className="review-card__content">
          <div className="review-card__heading border-b pb-3 mb-1">
            <MapPin className="review-card__heading-icon" />
            <span className="review-card__heading--sub">Clock-in Methods</span>
          </div>

          <div className="review-methods">
            {['qrEnabled', 'biometricEnabled', 'whatsappEnabled', 'manualEnabled'].map((key) => {
              const enabled = checkInMethods.methods[
                key as keyof typeof checkInMethods.methods
              ] as boolean
              const Icon = METHOD_ICONS[key]

              if (!enabled) return null // Only show enabled in review

              return (
                <div key={key} className="review-method review-method--on ">
                  <Icon className="review-method__icon " />
                  <span className="review-method__label">{METHOD_LABELS[key]}</span>
                </div>
              )
            })}
          </div>

          {checkInMethods.methods.geofencingEnabled && (
            <div className="review-method review-method--on mt-3">
              <MapPin className="review-method__icon " />
              <p className="review-method__status">
                Geofencing is <strong>active</strong> with a default global radius of{' '}
                <strong>{checkInMethods.methods.defaultGeofenceRadius} meters.</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ReviewStep
