/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabasePublic } from '../integrations/supabase/client'
import { toast } from 'sonner'
import { Loader2, Mail, Phone, Building2, ArrowLeft } from 'lucide-react'
import '../styles/loginpage.css'

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
      <div className="login-content-column" style={{ maxWidth: '520px' }}>
        {/* Back navigation button matching standard workflow styling */}
        <button type="button" className="login-back-btn" onClick={() => navigate('/login')}>
          <ArrowLeft size={14} /> Back to login
        </button>

        <div className="login-card">
          <div className="login-card-content">
            {/* Header Content */}
            <div className="login-flow-header">
              <h1
                className="login-flow-title"
                style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}
              >
                Get Started with EasyOps
              </h1>
              <p className="login-flow-desc">
                Ready to completely automate your workforce tracking operations? Submit an inquiry
                and our technical onboarding team will configure your environment.
              </p>
            </div>

            {/* Input Form Fields */}
            <form onSubmit={handleSubmit} className="login-fields">
              <div className="login-field">
                <label className="login-label">Full Name</label>
                <input
                  required
                  type="text"
                  className="login-textarea"
                  style={{ height: '42px' }}
                  placeholder="Jane Doe"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>

              <div className="login-field">
                <label className="login-label">Work Email</label>
                <input
                  required
                  type="email"
                  className="login-textarea"
                  style={{ height: '42px' }}
                  placeholder="jane@company.com"
                  value={form.workEmail}
                  onChange={(e) => setForm({ ...form, workEmail: e.target.value })}
                />
              </div>

              <div className="login-field">
                <label className="login-label">Company Name</label>
                <input
                  required
                  type="text"
                  className="login-textarea"
                  style={{ height: '42px' }}
                  placeholder="Acme Logistics"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </div>

              <button type="submit" className="login-button mt-4" disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Request Enterprise Access'
                )}
              </button>
            </form>

            {/* Bottom Contact Information Panel */}
            <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#888780] mb-3">
                Contact Information
              </h3>
              <div className="flex flex-col gap-2.5 text-xs text-[#5f5e5a] dark:text-[#b4b2a9]">
                <div className="flex items-center gap-2.5">
                  <Mail size={14} className="text-[#534ab7]" />
                  <span>sales@easyops.co.za</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-[#534ab7]" />
                  <span>+27 (0) 11 000 0000</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Building2 size={14} className="text-[#534ab7]" />
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
