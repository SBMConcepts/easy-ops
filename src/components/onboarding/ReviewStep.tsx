import { Card, CardContent } from '../../components/ui/card'
import {
  Building2,
  MapPin,
  Users,
  Clock,
  QrCode,
  Fingerprint,
  MessageCircle,
  PenLine,
  Scale,
  ShieldCheck,
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

const ReviewStep = ({
  company,
  sites,
  departments,
  roles,
  shifts,
  checkInMethods,
  workRules,
}: Props) => {
  return (
    <div className="review-step space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Review Configuration</h2>
        <p className="text-sm text-muted-foreground">Verify your structural workspace setup</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Overview */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold border-b pb-2">
              <Building2 className="h-4 w-4" /> Company Details
            </div>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Name:</span> {company.name || '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Industry:</span> {company.industry || '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Country:</span> {company.country || '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Operational Scope */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold border-b pb-2">
              <Scale className="h-4 w-4" /> Operational Scope
            </div>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Locations:</span> {sites.length} Active
                Sites
              </p>
              <p>
                <span className="text-muted-foreground">Departments:</span> {departments.length}{' '}
                Divisions
              </p>
              <p>
                <span className="text-muted-foreground">Roles:</span> {roles.length} Custom Profiles
              </p>
              <p>
                <span className="text-muted-foreground">Shifts:</span> {shifts.length} Schedules
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check-In Methods */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold border-b pb-2">
            <MapPin className="h-4 w-4" /> Clock-in Validation Methods
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['qrEnabled', 'biometricEnabled', 'whatsappEnabled', 'manualEnabled'].map((key) => {
              const enabled = checkInMethods.methods[
                key as keyof typeof checkInMethods.methods
              ] as boolean
              const Icon = METHOD_ICONS[key]
              return (
                <div
                  key={key}
                  className={`flex flex-col items-center p-3 rounded-lg border ${enabled ? 'bg-secondary/10 border-secondary' : 'bg-muted/30 border-transparent opacity-50'}`}
                >
                  <Icon
                    className={`h-6 w-6 mb-1 ${enabled ? 'text-secondary' : 'text-muted-foreground'}`}
                  />
                  <span className="text-xs font-medium text-center">{METHOD_LABELS[key]}</span>
                </div>
              )
            })}
          </div>

          {checkInMethods.methods.geofencingEnabled && (
            <div className="bg-primary/10 border border-primary/20 rounded p-3 text-sm flex items-start gap-2 mt-2">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p>
                Geofencing is <strong>active</strong> with a default global radius of{' '}
                {checkInMethods.methods.defaultGeofenceRadius} meters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ReviewStep
