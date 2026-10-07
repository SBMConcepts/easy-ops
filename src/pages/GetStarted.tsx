/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Mail, Phone, Building2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PLANS = {
  trial: 'Free Trial / Demo - 14 days',
  starter: 'Starter - R249/mo',
  growth: 'Growth - R699/mo',
  pro: 'Pro - R1,849/mo',
  enterprise: 'Enterprise - Custom',
} as const

type PlanId = keyof typeof PLANS

function planFromSearch(value: string | null): PlanId {
  return value && value in PLANS ? (value as PlanId) : 'trial'
}

/** Public trial and demo request form delivered to the sales inbox through the Express API. */
export default function GetStarted() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    workEmail: '',
    phone: '',
    companyName: '',
    employeeCount: '',
    selectedPlan: planFromSearch(searchParams.get('plan')),
    country: 'South Africa',
    message: '',
  })

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !form.fullName.trim() ||
      !form.workEmail.trim() ||
      !form.companyName.trim() ||
      !form.employeeCount
    ) {
      toast.error('Complete your name, work email, company name, and employee count.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          email: form.workEmail,
          company: form.companyName,
          size: form.employeeCount,
          plan: form.selectedPlan,
          country: form.country,
          phone: form.phone,
          message: form.message,
        }),
      })

      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Submission failed. Please try again.')

      setSubmitted(true)
    } catch (err: any) {
      toast.error(err.message || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">Your request is on its way</h1>
          <p className="text-muted-foreground">
            Thanks {form.fullName.split(' ')[0]}. Our onboarding team will contact you at{' '}
            {form.workEmail} about {form.companyName} and the {PLANS[form.selectedPlan]} plan.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to home
            </Button>
            <Button onClick={() => navigate('/login')}>Already have an account?</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to pricing
        </Link>
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <Card className="p-6 md:p-8">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold">Get started with EasyOps</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Tell us about your business and our onboarding team will help you set up your trial
                or demo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full name *</Label>
                  <Input
                    required
                    type="text"
                    id="full-name"
                    placeholder="Jane Doe"
                    value={form.fullName}
                    onChange={(e) => updateForm('fullName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work-email">Work email *</Label>
                  <Input
                    required
                    type="email"
                    id="work-email"
                    placeholder="jane@company.com"
                    value={form.workEmail}
                    onChange={(e) => updateForm('workEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+27 ..."
                    value={form.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => updateForm('country', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company name *</Label>
                  <Input
                    required
                    type="text"
                    id="company-name"
                    placeholder="Acme Logistics"
                    value={form.companyName}
                    onChange={(e) => updateForm('companyName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-count">Employee count *</Label>
                  <Select
                    value={form.employeeCount}
                    onValueChange={(value) => updateForm('employeeCount', value ?? '')}
                  >
                    <SelectTrigger id="employee-count">
                      <SelectValue placeholder="Select a range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-25">1 - 25</SelectItem>
                      <SelectItem value="26-50">26 - 50</SelectItem>
                      <SelectItem value="51-100">51 - 100</SelectItem>
                      <SelectItem value="101-250">101 - 250</SelectItem>
                      <SelectItem value="250+">250+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="selected-plan">Plan of interest *</Label>
                  <Select
                    value={form.selectedPlan}
                    onValueChange={(value) => {
                      if (value) updateForm('selectedPlan', value)
                    }}
                  >
                    <SelectTrigger id="selected-plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLANS).map(([id, label]) => (
                        <SelectItem key={id} value={id}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="message">Anything we should know?</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    value={form.message}
                    onChange={(e) => updateForm('message', e.target.value)}
                    placeholder="Sites, current systems, timeline, integrations..."
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Request onboarding'
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                By submitting you agree that we may contact you about EasyOps.
              </p>
            </form>
          </Card>

          <div className="space-y-4">
            <Card className="p-6 bg-primary/5 border-primary/20">
              <h3 className="font-bold mb-1">Selected plan</h3>
              <p className="text-2xl font-bold text-primary">{PLANS[form.selectedPlan]}</p>
            </Card>
            <Card className="p-6 space-y-4">
              <h3 className="font-bold">What happens next</h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li>1. We receive and review your request.</li>
                <li>2. We contact you within one business day.</li>
                <li>3. We set up your trial or book your demo.</li>
                <li>4. Your team is ready to go live.</li>
              </ol>
              <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> sales@easyops.co.za
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> +27 (0) 11 000 0000
                </p>
                <p className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Johannesburg, South Africa
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
