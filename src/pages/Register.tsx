/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    features: ['Up to 10 Employees', 'Basic Check-in'],
  },
  {
    id: 'pro',
    name: 'Professional',
    price: '$49/mo',
    features: ['Up to 100 Employees', 'Geofencing', 'Reports'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited', 'API Access', 'Custom Roles'],
  },
]

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedPackage, setSelectedPackage] = useState('pro')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    companySlug: '',
    adminEmail: '',
    password: '',
  })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Pass the selected package to the backend!
        body: JSON.stringify({ ...form, subscriptionPlan: selectedPackage }),
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success('Workspace created! Please log in to complete onboarding.')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
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
                className={`cursor-pointer transition-all ${selectedPackage === pkg.id ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
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
          <h2 className="text-xl font-bold mb-4">Create Admin Account</h2>
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
              <Label>Subdomain (e.g., acme)</Label>
              <Input
                required
                value={form.companySlug}
                onChange={(e) => setForm({ ...form, companySlug: e.target.value })}
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
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null} Create
                Workspace
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
