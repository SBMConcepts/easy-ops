/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth } from '../../contexts/AuthContext'
import { useOrgApi } from '../../hooks/useOrgApi'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, CreditCard, ExternalLink, CheckCircle2 } from 'lucide-react'
import '../../styles/settings.css'

/** Workspace settings page for viewing the current plan and opening the billing portal. */
export default function WorkspaceBilling() {
  const { organization } = useAuth()
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const verifiedReference = useRef<string | null>(null)

  const billing = useQuery({
    queryKey: ['billing-summary'],
    queryFn: () =>
      apiFetch<{
        plan: string
        billingState: string
        trialEndsAt: string | null
        canStartCheckout: boolean
        canManagePayment: boolean
      }>('billing/summary'),
  })

  const startCheckout = useMutation({
    mutationFn: async () => {
      const res = (await apiFetch('billing/checkout', {
        method: 'POST',
      })) as { authorizationUrl: string }
      return res.authorizationUrl
    },
    onSuccess: (url) => {
      window.location.href = url
    },
    onError: (err: any) => {
      toast.error(err.message || 'Could not start secure payment setup')
    },
  })

  const managePayment = useMutation({
    mutationFn: () => apiFetch<{ url: string }>('billing/manage-payment', { method: 'POST' }),
    onSuccess: ({ url }) => {
      window.location.href = url
    },
    onError: (err: any) => toast.error(err.message || 'Could not open payment management'),
  })

  const verifyCheckout = useMutation({
    mutationFn: (reference: string) =>
      apiFetch('billing/verify-checkout', { method: 'POST', body: JSON.stringify({ reference }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing-summary'] })
      toast.success('Payment method confirmed. Your trial is active.')
    },
    onError: (err: any) => toast.error(err.message || 'Payment confirmation is still pending'),
  })

  useEffect(() => {
    const reference = searchParams.get('reference')
    if (reference && verifiedReference.current !== reference) {
      verifiedReference.current = reference
      verifyCheckout.mutate(reference)
    }
  }, [searchParams, verifyCheckout])

  // Format plan name gracefully
  const planName = organization.plan
    ? organization.plan.charAt(0).toUpperCase() + organization.plan.slice(1)
    : 'Free'
  const state = billing.data?.billingState ?? 'Loading'

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
                  {state.replaceAll('_', ' ')}
                </span>
              </h2>
              <div className="settings-card-tab__footer">
                <button
                  onClick={() => {
                    if (billing.data?.canManagePayment) managePayment.mutate()
                    else startCheckout.mutate()
                  }}
                  disabled={startCheckout.isPending || managePayment.isPending || billing.isLoading}
                  className="settings-card-tab__save-btn "
                >
                  {startCheckout.isPending || managePayment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {billing.data?.canManagePayment
                    ? 'Manage Payment Method'
                    : 'Start Secure Payment Setup'}
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
