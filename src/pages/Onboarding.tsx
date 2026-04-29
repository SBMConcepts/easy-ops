import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../integrations/supabase/client'
import { Button } from '../components/ui/button'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { useToast } from '../hooks/use-toast'
import {
    Building2,
    MapPin,
    Users,
    ShieldCheck,
    Clock,
    QrCode,
    CheckCircle2,
    ArrowLeft,
    ArrowRight,
    Loader2,
} from 'lucide-react'
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
} from '../components/ui/navigation-menu'
import CompanyStep, {
    type CompanyData,
} from '../components/onboarding/CompanyStep'
import SitesStep, { type SiteData } from '../components/onboarding/SitesStep'
import DepartmentsStep, {
    type DepartmentData,
} from '../components/onboarding/DepartmentsStep'
import RolesStep, { type RoleData } from '../components/onboarding/RolesStep'
import ShiftsStep, {
    type ShiftData,
    type WorkRules,
} from '../components/onboarding/ShiftsStep'
import CheckInMethodsStep, {
    type CheckInSettings,
} from '../components/onboarding/CheckInMethodsStep'
import ReviewStep from '../components/onboarding/ReviewStep'

import '../styles/onboarding.css'

// ── Step manifest ──

const STEPS = [
    { title: 'Company Details', icon: Building2 },
    { title: 'Sites', icon: MapPin },
    { title: 'Departments', icon: Users },
    { title: 'Roles', icon: ShieldCheck },
    { title: 'Shifts & Rules', icon: Clock },
    { title: 'Check-In', icon: QrCode },
    { title: 'Review', icon: CheckCircle2 },
] as const

const LAST_STEP = STEPS.length - 1

// ── Default state ──

const DEFAULT_COMPANY: CompanyData = {
    name: '',
    industry: '',
    country: 'South Africa',
}

const DEFAULT_SITES: SiteData[] = [
    {
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        geofence_radius_m: '200',
    },
]

const DEFAULT_DEPARTMENTS: DepartmentData[] = [{ name: '', site_index: 0 }]

const DEFAULT_ROLES: RoleData[] = [
    { name: 'Admin', base_role: 'admin' },
    { name: 'Manager', base_role: 'manager' },
    { name: 'Supervisor', base_role: 'supervisor' },
    { name: 'Employee', base_role: 'employee' },
]

const DEFAULT_SHIFTS: ShiftData[] = [
    {
        name: 'Day Shift',
        start_time: '08:00',
        end_time: '17:00',
        grace_period_minutes: '15',
        site_index: 0,
    },
]

const DEFAULT_WORK_RULES: WorkRules = {
    max_weekly_hours: '45',
    overtime_multiplier: '1.5',
}

const DEFAULT_CHECKIN: CheckInSettings = {
    methods: { qr: true, biometric: false, whatsapp: false, manual: true },
    geofencing_enabled: false,
    default_geofence_radius: '200',
}

// ── Component ──────

const Onboarding = () => {
    const [step, setStep] = useState(0)
    const [submitting, setSubmitting] = useState(false)

    const [company, setCompany] = useState<CompanyData>(DEFAULT_COMPANY)
    const [sites, setSites] = useState<SiteData[]>(DEFAULT_SITES)
    const [departments, setDepartments] =
        useState<DepartmentData[]>(DEFAULT_DEPARTMENTS)
    const [roles, setRoles] = useState<RoleData[]>(DEFAULT_ROLES)
    const [shifts, setShifts] = useState<ShiftData[]>(DEFAULT_SHIFTS)
    const [workRules, setWorkRules] = useState<WorkRules>(DEFAULT_WORK_RULES)
    const [checkIn, setCheckIn] = useState<CheckInSettings>(DEFAULT_CHECKIN)

    const { refreshOrganisation } = useAuth()
    const navigate = useNavigate()
    const { toast } = useToast()

    // ── Validation ─────────────────────────────────────────────────────────

    const canProceed = (): boolean => {
        if (step === 0) return company.name.trim().length > 0
        if (step === 1) return sites.some((s) => s.name.trim().length > 0)
        return true
    }

    // ── Submit ───

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            const payload = {
                company,
                sites: sites.filter((s) => s.name.trim()),
                departments: departments.filter((d) => d.name.trim()),
                roles: roles.filter((r) => r.name.trim()),
                shifts: shifts
                    .filter((s) => s.name.trim())
                    .map((s) => ({
                        ...s,
                        grace_period_minutes:
                            Number(s.grace_period_minutes) || 15,
                    })),
                settings: {
                    check_in_methods: Object.entries(checkIn.methods)
                        .filter(([, v]) => v)
                        .map(([k]) => k),
                    geofencing_enabled: checkIn.geofencing_enabled,
                    default_geofence_radius:
                        Number(checkIn.default_geofence_radius) || 200,
                    max_weekly_hours: Number(workRules.max_weekly_hours) || 45,
                    overtime_multiplier:
                        Number(workRules.overtime_multiplier) || 1.5,
                },
            }

            const { data, error } = await supabase.functions.invoke(
                'organisation-setup',
                { body: payload }
            )
            if (error) throw error
            if (data?.error) throw new Error(data.error)

            toast({
                title: 'Organisation created!',
                description: `${company.name} has been set up successfully.`,
            })
            await refreshOrganisation?.()
            navigate('/app')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast({
                title: 'Setup failed',
                description: err.message || 'Something went wrong.',
                variant: 'destructive',
            })
        } finally {
            setSubmitting(false)
        }
    }

    const StepIcon = STEPS[step].icon
    const progress = ((step + 1) / STEPS.length) * 100

    return (
        <div className="onboarding-page">
            <div className="onboarding-container">
                {/* Header */}
                <header className="onboarding-header">
                    <h1 className="onboarding-title">
                        Set Up Your Organisation
                    </h1>
                    <p className="onboarding-subtitle">
                        Step {step + 1} of {STEPS.length}: {STEPS[step].title}
                    </p>
                    <Progress
                        value={progress}
                        className="onboarding-progress"
                    />
                </header>

                {/* Step nav */}
                <NavigationMenu className="onboarding-steps-nav">
                    <NavigationMenuList className="onboarding-steps-nav__list">
                        {STEPS.map((s, i) => (
                            <NavigationMenuItem key={i}>
                                <button
                                    onClick={() => i < step && setStep(i)}
                                    disabled={i > step}
                                    className={`onboarding-step-btn ${
                                        i === step
                                            ? 'onboarding-step-btn--active'
                                            : i < step
                                              ? 'onboarding-step-btn--completed'
                                              : 'onboarding-step-btn--upcoming'
                                    }`}
                                >
                                    <s.icon className="onboarding-step-btn__icon" />
                                    <span className="onboarding-step-btn__label">
                                        {s.title}
                                    </span>
                                </button>
                            </NavigationMenuItem>
                        ))}
                    </NavigationMenuList>
                </NavigationMenu>

                {/* Step card */}
                <Card className="onboarding-card">
                    <CardHeader className="onboarding-card__header">
                        <CardTitle className="onboarding-card__title">
                            <StepIcon className="onboarding-card__title-icon" />
                            {STEPS[step].title}
                        </CardTitle>
                        <CardDescription className="onboarding-card__desc">
                            {step === LAST_STEP
                                ? 'Confirm everything looks correct before submitting.'
                                : 'Fill in the details below.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="onboarding-card__content">
                        {step === 0 && (
                            <CompanyStep data={company} onChange={setCompany} />
                        )}
                        {step === 1 && (
                            <SitesStep data={sites} onChange={setSites} />
                        )}
                        {step === 2 && (
                            <DepartmentsStep
                                data={departments}
                                sites={sites}
                                onChange={setDepartments}
                            />
                        )}
                        {step === 3 && (
                            <RolesStep data={roles} onChange={setRoles} />
                        )}
                        {step === 4 && (
                            <ShiftsStep
                                shifts={shifts}
                                workRules={workRules}
                                sites={sites}
                                onShiftsChange={setShifts}
                                onWorkRulesChange={setWorkRules}
                            />
                        )}
                        {step === 5 && (
                            <CheckInMethodsStep
                                data={checkIn}
                                onChange={setCheckIn}
                            />
                        )}
                        {step === 6 && (
                            <ReviewStep
                                company={company}
                                sites={sites}
                                departments={departments}
                                roles={roles}
                                shifts={shifts}
                                checkInMethods={checkIn}
                                workRules={workRules}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Footer nav */}
                <footer className="onboarding-footer">
                    <Button
                        variant="outline"
                        onClick={() => setStep((s) => s - 1)}
                        disabled={step === 0}
                    >
                        <ArrowLeft className="onboarding-btn-icon--left" /> Back
                    </Button>

                    {step < LAST_STEP ? (
                        <Button
                            onClick={() => setStep((s) => s + 1)}
                            disabled={!canProceed()}
                        >
                            Next{' '}
                            <ArrowRight className="onboarding-btn-icon--right" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="onboarding-btn-icon--spin" />{' '}
                                    Saving...
                                </>
                            ) : (
                                'Confirm & Complete Setup'
                            )}
                        </Button>
                    )}
                </footer>
            </div>
        </div>
    )
}

export default Onboarding
