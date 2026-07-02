/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth } from '../../contexts/AuthContext'
import { useOrgApi } from '../../hooks/useOrgApi'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, CreditCard, ExternalLink, CheckCircle2 } from 'lucide-react'

export default function WorkspaceBilling() {
  const { organization } = useAuth()
  const { apiFetch } = useOrgApi()

  // Mutation to fetch Stripe Customer Portal session URL from backend
  const createPortalSession = useMutation({
    mutationFn: async () => {
      const res = (await apiFetch('billing/portal-session', {
        method: 'POST',
      })) as { url: string }
      return res.url // Expecting backend to return { url: string }
    },
    onSuccess: (url) => {
      window.location.href = url
    },
    onError: (err: any) => {
      toast.error(err.message || 'Could not open billing portal')
    },
  })

  // Format plan name gracefully
  const planName = organization.plan
    ? organization.plan.charAt(0).toUpperCase() + organization.plan.slice(1)
    : 'Free'

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6 shadow-sm max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Billing & Subscription</h1>
            <p className="text-muted-foreground text-sm">
              Manage your plan, payment methods, and download invoices.
            </p>
          </div>
        </div>

        {/* Current Plan Overview */}
        <div className="bg-muted/30 border rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Current Plan
            </p>
            <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
              {planName}{' '}
              <span className="text-sm font-normal bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                Active
              </span>
            </h2>
          </div>
          <button
            onClick={() => createPortalSession.mutate()}
            disabled={createPortalSession.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createPortalSession.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Manage Billing Portal
          </button>
        </div>

        {/* Feature List (Optional visual flair) */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Your Plan Includes:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Unlimited Employees
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Real-time Attendance Tracking
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Advanced Compliance Reporting
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Priority Email Support
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
