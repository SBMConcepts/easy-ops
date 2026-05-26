/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { ArrowLeft, Loader2, Building2, Globe } from 'lucide-react'
import { toast } from 'sonner'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

const Register = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    companyName: '',
    companySlug: '',
    adminEmail: '',
  })
  const [slugEdited, setSlugEdited] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!slugEdited) {
      setForm((f) => ({ ...f, companySlug: toSlug(f.companyName) }))
    }
  }, [form.companyName, slugEdited])

  const set = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }))
    if (errors[key])
      setErrors((e) => {
        const c = { ...e }
        delete c[key]
        return c
      })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.companyName) return setErrors({ companyName: 'Company title required' })
    if (!form.companySlug) return setErrors({ companySlug: 'Workspace identifier required' })
    if (!form.adminEmail) return setErrors({ adminEmail: 'Administrator contact email required' })

    setSubmitting(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      // Hit global provisioning route instead of client direct write
      const res = await fetch(`${API_URL}/api/workspaces/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const errorData = await res.text()
        throw new Error(errorData || 'Failed to initialize workspace organization.')
      }

      toast.success('Organization workspace initialized successfully!')
      // Redirect to success state or login layout
      navigate('/login')
    } catch (err: any) {
      toast.error(err.message || 'Registration processing failure')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to home
        </Link>
        <Card className="p-6 space-y-6 shadow-md border-border bg-card">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Create your workspace
            </h2>
            <p className="text-sm text-muted-foreground">
              Set up an isolated instance for your company operations
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="companyName"
                  className="pl-9"
                  value={form.companyName}
                  onChange={(e) => set('companyName', e.target.value)}
                  placeholder="Acme Logistics SA"
                />
              </div>
              {errors.companyName && (
                <p className="text-xs text-destructive">{errors.companyName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companySlug">Workspace Subdomain *</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="companySlug"
                  className="pl-9"
                  value={form.companySlug}
                  onChange={(e) => {
                    setSlugEdited(true)
                    set('companySlug', toSlug(e.target.value))
                  }}
                  placeholder="acme-logistics"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Access link:{' '}
                <span className="font-mono text-foreground">
                  {form.companySlug || 'slug'}.easyops.app
                </span>
              </p>
              {errors.companySlug && (
                <p className="text-xs text-destructive">{errors.companySlug}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Account Administrator Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={form.adminEmail}
                onChange={(e) => set('adminEmail', e.target.value)}
                placeholder="admin@company.com"
              />
              {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail}</p>}
            </div>

            <Button type="submit" className="w-full bg-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Provisioning Instance…
                </>
              ) : (
                'Create workspace'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default Register
