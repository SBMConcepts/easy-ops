/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '../integrations/supabase/types'
import { supabase } from '../integrations/supabase/client'

type BillingPlan = Database['public']['Enums']['billing_plan']

const PACKAGES: { id: BillingPlan; name: string; price: string; features: string[] }[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'R299/mo',
    features: ['Up to 10 Employees', 'Basic Check-in', 'QR & Manual'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'R799/mo',
    features: ['Up to 100 Employees', 'Geofencing', 'Reports', 'WhatsApp Check-in'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited Employees', 'API Access', 'Custom Roles', 'Priority Support'],
  },
]

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({
    companyName: '',
    adminEmail: '',
    plan: 'starter' as BillingPlan,
  })
  const [submitting, setSubmitting] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Public signup → privileged Edge Function provisions the tenant,
      // subscription, admin auth user and membership (service-role).
      const { error } = await supabase.functions.invoke('tenant-provision', {
        body: {
          orgName: form.companyName,
          adminEmail: form.adminEmail,
          plan: form.plan,
        },
      })

      if (error) throw error

      toast.success('Workspace provisioned! Check your email to set your admin password.')
      navigate('/login')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      {step === 1 ? (
        <div className="w-full max-w-4xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Select your operational capacity</h1>
            <p className="text-muted-foreground">Choose a plan that fits your workforce size.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PACKAGES.map((pkg) => (
              <Card
                key={pkg.id}
                className={`relative cursor-pointer transition-all hover:border-secondary ${form.plan === pkg.id ? 'border-secondary ring-1 ring-secondary' : ''}`}
                onClick={() => setForm({ ...form, plan: pkg.id })}
              >
                {form.plan === pkg.id && (
                  <div className="absolute top-4 right-4 text-secondary">
                    <Check className="h-5 w-5" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{pkg.name}</CardTitle>
                  <div className="text-2xl font-bold">{pkg.price}</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-secondary" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-6"
                    variant={form.plan === pkg.id ? 'default' : 'outline'}
                    onClick={() => setStep(2)}
                  >
                    Select {pkg.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="w-full max-w-md p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">Create your workspace</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div>
              <Label>Admin Email</Label>
              <Input
                type="email"
                required
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You will receive an email to set up your secure password.
            </p>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin h-4 w-4 mr-2" />} Create Workspace
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
