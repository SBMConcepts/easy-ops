import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { supabase } from '../integrations/supabase/client'
import type { Database } from '../integrations/supabase/types'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { useToast } from '../hooks/use-toast'
import { ArrowLeft, CheckCircle2, Loader2, Mail, Phone, Building2 } from 'lucide-react'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your full name').max(100),
  work_email: z.string().trim().email('Enter a valid work email').max(255),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  company_name: z.string().trim().min(2, 'Company name is required').max(150),
  employee_count: z.string().min(1, 'Select a range'),
  selected_plan: z.string().min(1),
  country: z.string().trim().max(80).optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional().or(z.literal('')),
})

const PLANS: Record<string, string> = {
  Starter: 'Starter — R499/mo',
  Growth: 'Growth — R699/mo',
  Pro: 'Pro — R849/mo',
  Enterprise: 'Enterprise — Custom',
}

const GetStarted = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const planFromUrl = params.get('plan') || 'Growth'

  const [form, setForm] = useState({
    full_name: '',
    work_email: '',
    phone: '',
    company_name: '',
    employee_count: '',
    selected_plan: PLANS[planFromUrl] ? planFromUrl : 'Growth',
    country: 'South Africa',
    message: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      const flat: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (v && v[0]) flat[k] = v[0]
      }
      setErrors(flat)
      return
    }
    setErrors({})
    setSubmitting(true)
    const payload: Database['public']['Tables']['easy_ops_sales_leads']['Insert'] = {
      full_name: parsed.data.full_name,
      lead_email: parsed.data.work_email,
      lead_phone: parsed.data.phone || '',
      company_name: parsed.data.company_name,
      employee_count: parsed.data.employee_count,
      selected_plan: parsed.data.selected_plan,
      country: parsed.data.country || '',
      message: parsed.data.message || '',
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('easy_ops_sales_leads').insert(payload as any)
    setSubmitting(false)
    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' })
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">You're on the list!</h1>
          <p className="text-muted-foreground">
            Thanks {form.full_name.split(' ')[0]}. Our onboarding team will reach out to{' '}
            <strong className="text-foreground">{form.work_email}</strong> within one business day
            to set up <strong className="text-foreground">{form.company_name}</strong> on the{' '}
            {form.selected_plan} plan.
          </p>
          <div className="flex gap-3 justify-center pt-2">
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
              <h1 className="font-display text-2xl md:text-3xl font-bold">
                Get started with EasyOps
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Tell us a bit about your business. Our onboarding team will contact you to provision
                your account and walk you through setup.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name *</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => set('full_name', e.target.value)}
                    placeholder="Jane Dlamini"
                  />
                  {errors.full_name && (
                    <p className="text-xs text-destructive">{errors.full_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_email">Work email *</Label>
                  <Input
                    id="work_email"
                    type="email"
                    value={form.work_email}
                    onChange={(e) => set('work_email', e.target.value)}
                    placeholder="jane@company.co.za"
                  />
                  {errors.work_email && (
                    <p className="text-xs text-destructive">{errors.work_email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+27 ..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => set('country', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company name *</Label>
                  <Input
                    id="company_name"
                    value={form.company_name}
                    onChange={(e) => set('company_name', e.target.value)}
                    placeholder="Acme Logistics (Pty) Ltd"
                  />
                  {errors.company_name && (
                    <p className="text-xs text-destructive">{errors.company_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_count">Employee count *</Label>
                  <Select
                    value={form.employee_count}
                    onValueChange={(v) => set('employee_count', '' + v)}
                  >
                    <SelectTrigger id="employee_count">
                      <SelectValue placeholder="Select a range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-25">1 – 25</SelectItem>
                      <SelectItem value="26-50">26 – 50</SelectItem>
                      <SelectItem value="51-100">51 – 100</SelectItem>
                      <SelectItem value="101-250">101 – 250</SelectItem>
                      <SelectItem value="250+">250+</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.employee_count && (
                    <p className="text-xs text-destructive">{errors.employee_count}</p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="selected_plan">Plan of interest *</Label>
                  <Select
                    value={form.selected_plan}
                    onValueChange={(v) => set('selected_plan', '' + v)}
                  >
                    <SelectTrigger id="selected_plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLANS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
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
                    onChange={(e) => set('message', e.target.value)}
                    placeholder="Sites, current systems, timeline, integrations..."
                  />
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                  </>
                ) : (
                  'Request onboarding'
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                By submitting you agree we may contact you about EasyOps. We never share your
                details.
              </p>
            </form>
          </Card>

          <div className="space-y-4">
            <Card className="p-6 bg-primary/5 border-primary/20">
              <h3 className="font-display font-bold mb-1">Selected plan</h3>
              <p className="text-2xl font-bold text-primary">{form.selected_plan}</p>
              <p className="text-xs text-muted-foreground mt-1">{PLANS[form.selected_plan]}</p>
            </Card>
            <Card className="p-6 space-y-4">
              <h3 className="font-display font-bold">What happens next</h3>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="font-bold text-primary">1.</span>
                  <span>We receive your request and route it to the onboarding team.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">2.</span>
                  <span>
                    You get a call/email within 1 business day to confirm fit and pricing.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">3.</span>
                  <span>
                    Your admin account is provisioned — you complete the 7-step organisation setup.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">4.</span>
                  <span>Invite your team and go live.</span>
                </li>
              </ol>
              <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> sales@EasyOps.co.za
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

export default GetStarted
