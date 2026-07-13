/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabasePublic } from '../integrations/supabase/client'
import { toast } from 'sonner'
import { Loader2, Mail, Phone, Building2, ArrowLeft } from 'lucide-react'
import '../styles/loginpage.css'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export default function GetStarted() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ fullName: '', workEmail: '', companyName: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const emailDomain = form.workEmail.split('@')[1]

      const { error } = await (supabasePublic as any).from('access_requests').insert({
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
    <div className="login-page">
      <div className="login-content-column get-started-content-column">
        {/* Back navigation button matching standard workflow styling */}
        <button type="button" className="login-back-btn" onClick={() => navigate('/login')}>
          <ArrowLeft size={14} /> Back to login
        </button>

        <div className="login-card get-started-card">
          <div className="login-card-content">
            {/* Header Content */}
            <div className="login-flow-header">
              <h1 className="login-flow-title get-started-title">Get Started with EasyOps</h1>
              <p className="login-flow-desc">
                Ready to completely automate your workforce tracking operations? Submit an inquiry
                and our technical onboarding team will configure your environment.
              </p>
            </div>

            {/* Input Form Fields */}
            <form onSubmit={handleSubmit} className="login-fields">
              <div className="login-field">
                <Label className="login-label">Full Name</Label>
                <Input
                  required
                  type="text"
                  className="login-textarea get-started-input"
                  placeholder="Jane Doe"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>

              <div className="login-field">
                <Label className="login-label">Work Email</Label>
                <Input
                  required
                  type="email"
                  className="login-textarea get-started-input"
                  placeholder="jane@company.com"
                  value={form.workEmail}
                  onChange={(e) => setForm({ ...form, workEmail: e.target.value })}
                />
              </div>

              <div className="login-field">
                <Label className="login-label">Company Name</Label>
                <Input
                  required
                  type="text"
                  className="login-textarea get-started-input"
                  placeholder="Acme Logistics"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </div>

              <button type="submit" className="get-started-btn" disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Request Enterprise Access'
                )}
              </button>
            </form>

            {/* Bottom Contact Information Panel */}
            <div className="get-started-contact">
              <h3 className="get-started-contact-heading">Contact Information</h3>
              <div className="get-started-contact-list">
                <div className="get-started-contact-item">
                  <Mail size={14} className="get-started-contact-icon" />
                  <span>sales@easyops.co.za</span>
                </div>

                <div className="get-started-contact-item">
                  <Building2 size={14} className="get-started-contact-icon" />
                  <span>Johannesburg, South Africa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
