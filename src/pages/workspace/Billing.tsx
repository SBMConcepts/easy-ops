/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth } from '../../contexts/AuthContext'
import { useOrgApi } from '../../hooks/useOrgApi'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, CreditCard, ExternalLink, CheckCircle2 } from 'lucide-react'
import '../../styles/settings.css'

/** Workspace settings page for viewing the current plan and opening the billing portal. */
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
    <div className="settings-page">
      <div className="settings-content">
        <div className="settings-header p-2">
          <h1 className="settings-header__title ">Billing & Subscription</h1>
          <p className="settings-header__subtitle">
            Manage your plan, payment methods, and download invoices.
          </p>
        </div>

        {/* Current Plan Overview */}
        <div className="settings-tabs__content">
          <div className="settings-card-tab">
            <div className="settings-card-tab__header">
              <p className="settings-header__subtitle ">Current Plan</p>
              <h2 className="settings-header__title flex items-center gap-2">
                {planName}{' '}
                <span className="text-sm font-normal bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </h2>
              <div className="settings-card-tab__footer">
                <button
                  onClick={() => createPortalSession.mutate()}
                  disabled={createPortalSession.isPending}
                  className="settings-card-tab__save-btn "
                >
                  {createPortalSession.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Manage Billing Portal
                </button>
              </div>
            </div>

            {/* Feature List (Optional visual flair) */}
            <div className="settings-card-tab__header">
              <h3 className="settings-card-tab__title">Your Plan Includes:</h3>
              <div className="settings-card-tab__content">
                <ul className="settings-card-tab__feature-list">
                  <li className="settings-card-tab__feature-row">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="settings-card-tab__feature-text">Unlimited Employees</span>
                  </li>
                  <li className="settings-card-tab__feature-row">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="settings-card-tab__feature-text">
                      Real-time Attendance Tracking
                    </span>
                  </li>
                  <li className="settings-card-tab__feature-row">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="settings-card-tab__feature-text">
                      Advanced Compliance Reporting
                    </span>
                  </li>
                  <li className="settings-card-tab__feature-row">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="settings-card-tab__feature-text">Priority Email Support</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
