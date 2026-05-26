import { Card, CardContent } from '../ui/card'
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
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import type { CompanyData } from './CompanyStep'
import type { SiteData } from './SitesStep'
import type { DepartmentData } from './DepartmentsStep'
import type { ShiftData, WorkRules } from './ShiftsStep'
import type { CheckInSettings } from './CheckInMethodsStep'

import '../../styles/form.css'
import '../../styles/reviewstep.css'

interface Props {
  company: CompanyData
  sites: SiteData[]
  departments: DepartmentData[]
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

const ReviewStep = ({ company, sites, departments, shifts, checkInMethods, workRules }: Props) => {
  return (
    <div className="review-step space-y-4">
      {/* Company Summary */}
      <Card className="review-card shadow-sm border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Building2 className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Organization</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span> {company.name || 'Not provided'}
            </p>
            <p>
              <span className="text-muted-foreground">Industry:</span>{' '}
              {company.industry || 'Not provided'}
            </p>
            <p>
              <span className="text-muted-foreground">Country:</span>{' '}
              {company.country || 'Not provided'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Operational Scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="review-card shadow-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <MapPin className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Sites</h3>
            </div>
            <p className="text-sm font-medium">{sites.length} Active Sites</p>
          </CardContent>
        </Card>

        <Card className="review-card shadow-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Users className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Departments</h3>
            </div>
            <p className="text-sm font-medium">{departments.length} Monitored Departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Policies & Rules */}
      <Card className="review-card shadow-sm border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Scale className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Compliance & Tracking Rules</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Weekly Limit:</p>
              <p className="font-medium">{workRules.weeklyHoursLimit} Hours</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Overtime Multiplier:</p>
              <p className="font-medium">{workRules.overtimeRate}x</p>
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm font-semibold mb-3">Allowed Check-In Terminals</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
