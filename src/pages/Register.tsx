import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabasePublic } from '../integrations/supabase/client'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { ArrowLeft, CheckCircle2, Loader2, Building2, Globe } from 'lucide-react'

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
    password: '',
    confirmPassword: '',
  })
  const [slugEdited, setSlugEdited] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [workspace, setWorkspace] = useState<string | null>(null)

  // Auto-derive slug from company name unless the user has manually edited it
  useEffect(() => {
    if (!slugEdited) {
      setForm((f) => ({ ...f, companySlug: toSlug(f.companyName) }))
    }
  }, [form.companyName, slugEdited])

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.companyName.trim()) e.companyName = 'Company name is required'
    if (!form.companySlug.trim()) e.companySlug = 'Workspace slug is required'
    if (!/^[a-z0-9-]{2,50}$/.test(form.companySlug)) {
      e.companySlug = 'Slug may only contain lowercase letters, numbers and hyphens'
    }
    if (!form.adminEmail.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.adminEmail)) {
      e.adminEmail = 'A valid email address is required'
    }
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    const { data, error } = await supabasePublic.functions.invoke('register', {
      body: {
        companyName: form.companyName.trim(),
        companySlug: form.companySlug.trim(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        password: form.password,
      },
    })
    setSubmitting(false)

    if (error || data?.error) {
      setErrors({ form: data?.error || error?.message || 'Registration failed. Please try again.' })
      return
    }

    setWorkspace(data.workspace)
  }

  if (workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">Your workspace is ready!</h1>
          <p className="text-muted-foreground text-sm">
            Check your inbox at <strong className="text-foreground">{form.adminEmail}</strong> to
            verify your account, then sign in to your workspace.
          </p>
          <div className="rounded-md bg-muted px-4 py-3 font-mono text-sm break-all">
            {workspace}
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to home
            </Button>
            <Button asChild>
              <a href={workspace + '/login'}>Go to workspace</a>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <Card className="p-6 md:p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl md:text-3xl font-bold">Create your workspace</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Set up your company on EasyOps in minutes. No credit card required.
            </p>
          </div>

          {errors.form && (
            <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {errors.form}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Company name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">
                <Building2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                Company name *
              </Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                placeholder="Acme Corp"
                autoComplete="organization"
              />
              {errors.companyName && (
                <p className="text-xs text-destructive">{errors.companyName}</p>
              )}
            </div>

            {/* Workspace slug */}
            <div className="space-y-2">
              <Label htmlFor="companySlug">
                <Globe className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                Workspace URL *
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="companySlug"
                  value={form.companySlug}
                  onChange={(e) => {
                    setSlugEdited(true)
                    set('companySlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }}
                  placeholder="acme-corp"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your workspace:{' '}
                <span className="font-mono">
                  {form.companySlug || 'your-company'}.easy-ops-za.vercel.app
                </span>
              </p>
              {errors.companySlug && (
                <p className="text-xs text-destructive">{errors.companySlug}</p>
              )}
            </div>

            {/* Admin email */}
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={form.adminEmail}
                onChange={(e) => set('adminEmail', e.target.value)}
                placeholder="admin@acmecorp.com"
                autoComplete="email"
              />
              {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating workspace…
                </>
              ) : (
                'Create workspace'
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="underline hover:text-foreground">
                Sign in
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default Register
