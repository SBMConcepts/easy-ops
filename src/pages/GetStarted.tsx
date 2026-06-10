/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabasePublic } from '../integrations/supabase/client'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { toast } from 'sonner'
import { Loader2, Mail, Phone, Building2 } from 'lucide-react'

export default function GetStarted() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ fullName: '', workEmail: '', companyName: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const emailDomain = form.workEmail.split('@')[1]

      const { error } = await supabasePublic.from('access_requests').insert({
        requester_name: form.fullName,
        requester_email: form.workEmail,
        email_domain: emailDomain,
        message: `Company: ${form.companyName}`,
        status: 'pending',
      })

      if (error) throw error

      toast.success('Inquiry submitted. Our technical sales team will contact you shortly.')
      navigate('/')
    } catch (err: any) {
      toast.error(err.message || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-start mt-8">
        <div className="space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Get Started with EasyOps
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Ready to completely automate your workforce tracking operations? Submit an inquiry and
            our technical onboarding team will configure your environment.
          </p>

          <Card className="p-6 border-border bg-card">
            <h3 className="font-semibold mb-4 text-foreground">Contact Information</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-3">
                <Mail className="h-4 w-4" /> sales@easyops.co.za
              </p>
              <p className="flex items-center gap-3">
                <Phone className="h-4 w-4" /> +27 (0) 11 000 0000
              </p>
              <p className="flex items-center gap-3">
                <Building2 className="h-4 w-4" /> Johannesburg, South Africa
              </p>
            </div>
          </Card>
        </div>

        <Card className="p-8 shadow-xl border-border">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                required
                placeholder="Jane Doe"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Work Email</Label>
              <Input
                required
                type="email"
                placeholder="jane@company.com"
                value={form.workEmail}
                onChange={(e) => setForm({ ...form, workEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                required
                placeholder="Acme Logistics"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full mt-4 h-12 text-md" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
              Request Enterprise Access
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
