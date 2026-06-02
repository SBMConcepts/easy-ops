import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { BillingPlan } from '../integrations/supabase/types'

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
  const [selectedPackage, setSelectedPackage] = useState<BillingPlan>('growth')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    adminEmail: '',
  })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const base = import.meta.env.VITE_API_URL ?? ''
      const res = await fetch(`${base}/api/tenants/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          adminEmail: form.adminEmail,
          plan: selectedPackage,
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || 'Registration failed')
      }

      toast.success('Workspace created! Check your email to complete setup.')
      navigate('/login')
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {step === 1 ? (
        <div className="max-w-4xl w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Choose your workspace plan</h1>
            <p className="text-muted-foreground">
              Select a package to start your EasyOps environment
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PACKAGES.map((pkg) => (
              <Card
                key={pkg.id}
                className={`cursor-pointer transition-all ${
                  selectedPackage === pkg.id
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                <CardHeader>
                  <CardTitle>{pkg.name}</CardTitle>
                  <p className="text-2xl font-bold">{pkg.price}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={selectedPackage === pkg.id ? 'default' : 'outline'}
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
        <Card className="w-full max-w-md p-6">
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
              You will receive an email invitation to set up your password via Auth0.
            </p>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                Create Workspace
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
