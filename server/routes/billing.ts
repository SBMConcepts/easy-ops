import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { Router, type Request, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import {
  createSubscription,
  getPaystackPlanCode,
  getSubscriptionManagementLink,
  initializeCheckout,
  PaystackError,
  verifyTransaction,
} from '../lib/paystack.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { Json, TablesUpdate } from '../types/supabase.js'

const router = Router()
const PAID_PLANS = new Set(['starter', 'growth', 'pro'])

function getTrialDays(): number {
  const value = Number(process.env.BILLING_TRIAL_DAYS ?? 7)
  return Number.isInteger(value) && value >= 5 && value <= 7 ? value : 7
}

function getSetupAmount(): number {
  const value = Number(process.env.PAYSTACK_SETUP_AMOUNT_CENTS)
  if (!Number.isInteger(value) || value <= 0) {
    throw new PaystackError('Hosted payment setup is not configured.', 503)
  }
  return value
}

function billingCallbackUrl(): string {
  const appUrl = process.env.APP_URL ?? process.env.OIDC_BASE_URL ?? process.env.VITE_APP_URL
  if (!appUrl) throw new PaystackError('Billing callback URL is not configured.', 503)
  return `${appUrl.replace(/\/$/, '')}/app/workspace/billing?checkout=complete`
}

function publicError(error: unknown): { status: number; message: string } {
  if (error instanceof PaystackError) return { status: error.statusCode, message: error.message }
  return { status: 500, message: 'Billing request failed.' }
}

function isOperational(state: string, accessEndsAt: string | null): boolean {
  if (state === 'free' || state === 'active') return true
  return state === 'trialing' && (!accessEndsAt || new Date(accessEndsAt).getTime() > Date.now())
}

async function getSubscription(orgId: string) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('auth0_org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

function summary(subscription: NonNullable<Awaited<ReturnType<typeof getSubscription>>>) {
  return {
    plan: subscription.plan,
    billingState: subscription.billing_state,
    operationalAccess: isOperational(subscription.billing_state, subscription.access_ends_at),
    trialStartedAt: subscription.trial_started_at,
    trialEndsAt: subscription.trial_ends_at,
    currentPeriodEnd: subscription.current_period_end,
    accessEndsAt: subscription.access_ends_at,
    paymentMethod: subscription.payment_method_summary,
    canStartCheckout:
      PAID_PLANS.has(subscription.plan) &&
      ['pending_payment_method', 'past_due', 'cancelled'].includes(subscription.billing_state),
    canManagePayment: Boolean(subscription.provider_subscription_code),
  }
}

async function activateTrialFromTransaction(orgId: string, reference: string) {
  const subscription = await getSubscription(orgId)
  if (!subscription) throw new PaystackError('No subscription found for this organization.', 404)
  if (!PAID_PLANS.has(subscription.plan)) {
    throw new PaystackError('This plan does not require hosted payment setup.', 400)
  }
  if (subscription.provider_subscription_code) return subscription

  const transaction = await verifyTransaction(reference)
  if (transaction.status !== 'success') {
    throw new PaystackError('Payment authorization is not complete yet.', 409)
  }
  if (!transaction.customer?.customer_code || !transaction.authorization?.authorization_code) {
    throw new PaystackError('Paystack did not return a reusable payment authorization.', 409)
  }

  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + getTrialDays() * 86400000).toISOString()
  const providerSubscription = await createSubscription({
    customerCode: transaction.customer.customer_code,
    planCode: getPaystackPlanCode(subscription.plan),
    authorizationCode: transaction.authorization.authorization_code,
    startDate: trialEndsAt,
  })
  const update: TablesUpdate<'subscriptions'> = {
    status: 'trialing',
    billing_state: 'trialing',
    provider: 'paystack',
    provider_customer_code: transaction.customer.customer_code,
    provider_subscription_code: providerSubscription.subscription_code,
    provider_plan_code: getPaystackPlanCode(subscription.plan),
    provider_reference: reference,
    billing_started_at: now.toISOString(),
    trial_started_at: now.toISOString(),
    trial_ends_at: trialEndsAt,
    access_ends_at: trialEndsAt,
    current_period_end: providerSubscription.next_payment_date,
    payment_method_summary: {
      brand: transaction.authorization.brand ?? null,
      last4: transaction.authorization.last4 ?? null,
    } as Json,
  }
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update(update)
    .eq('id', subscription.id)
  if (error) throw new Error(error.message)
  return (await getSubscription(orgId))!
}

router.get(
  '/api/billing/summary',
  requireAuth,
  requireOrg,
  async (req: AuthedRequest, res: Response) => {
    try {
      const subscription = await getSubscription(req.orgId!)
      if (!subscription) {
        res.status(404).json({ error: 'No subscription found for this organization.' })
        return
      }
      res.json(summary(subscription))
    } catch (error) {
      const result = publicError(error)
      res.status(result.status).json({ error: result.message })
    }
  }
)

router.post(
  '/api/billing/checkout',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    try {
      const subscription = await getSubscription(req.orgId!)
      if (!subscription || !PAID_PLANS.has(subscription.plan)) {
        throw new PaystackError('This organization does not have an online-billable plan.', 400)
      }
      const email = req.auth?.email
      if (!email) throw new PaystackError('A billing email is required.', 400)

      const reference = `easyops_${randomUUID()}`
      const checkout = await initializeCheckout({
        email,
        amount: getSetupAmount(),
        reference,
        callbackUrl: billingCallbackUrl(),
        metadata: { auth0_org_id: req.orgId!, subscription_id: subscription.id },
      })
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({ provider: 'paystack', provider_reference: reference })
        .eq('id', subscription.id)
      if (error) throw new Error(error.message)
      res.json({ authorizationUrl: checkout.authorization_url })
    } catch (error) {
      const result = publicError(error)
      res.status(result.status).json({ error: result.message })
    }
  }
)

router.post(
  '/api/billing/verify-checkout',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    try {
      const reference = typeof req.body?.reference === 'string' ? req.body.reference : ''
      if (!reference) throw new PaystackError('A checkout reference is required.', 400)
      const subscription = await getSubscription(req.orgId!)
      if (!subscription || subscription.provider_reference !== reference) {
        throw new PaystackError('Checkout reference does not belong to this organization.', 404)
      }
      res.json(summary(await activateTrialFromTransaction(req.orgId!, reference)))
    } catch (error) {
      const result = publicError(error)
      res.status(result.status).json({ error: result.message })
    }
  }
)

router.post(
  '/api/billing/manage-payment',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    try {
      const subscription = await getSubscription(req.orgId!)
      if (!subscription?.provider_subscription_code) {
        throw new PaystackError('No managed payment subscription exists yet.', 404)
      }
      res.json({
        url: await getSubscriptionManagementLink(subscription.provider_subscription_code),
      })
    } catch (error) {
      const result = publicError(error)
      res.status(result.status).json({ error: result.message })
    }
  }
)

export async function handlePaystackWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('')
  const signature = req.header('x-paystack-signature')
  const secret = process.env.PAYSTACK_SECRET_KEY
  const expected = secret ? createHmac('sha512', secret).update(rawBody).digest('hex') : ''
  if (
    !signature ||
    !expected ||
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    res.status(401).json({ error: 'Invalid webhook signature.' })
    return
  }

  let event: { event?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody.toString('utf8')) as {
      event?: string
      data?: Record<string, unknown>
    }
  } catch {
    res.status(400).json({ error: 'Invalid webhook payload.' })
    return
  }
  const data = event.data ?? {}
  const reference = typeof data.reference === 'string' ? data.reference : null
  const eventKey = `${event.event ?? 'unknown'}:${reference ?? createHash('sha256').update(rawBody).digest('hex')}`
  const { error: eventError } = await supabaseAdmin.from('billing_webhook_events').insert({
    provider: 'paystack',
    event_key: eventKey,
    event_type: event.event ?? 'unknown',
    provider_reference: reference,
    payload: event as Json,
  })
  if (eventError?.code === '23505') {
    res.sendStatus(200)
    return
  }
  if (eventError) {
    res.status(500).json({ error: 'Could not record webhook event.' })
    return
  }

  const subscriptionCode =
    typeof data.subscription_code === 'string'
      ? data.subscription_code
      : typeof (data.subscription as { subscription_code?: unknown } | undefined)
            ?.subscription_code === 'string'
        ? (data.subscription as { subscription_code: string }).subscription_code
        : null
  const lookup = reference
    ? supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('provider_reference', reference)
        .maybeSingle()
    : subscriptionCode
      ? supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('provider_subscription_code', subscriptionCode)
          .maybeSingle()
      : null
  const { data: subscription } = lookup ? await lookup : { data: null }

  if (subscription) {
    const update: TablesUpdate<'subscriptions'> = {}
    if (event.event === 'invoice.payment_failed') {
      update.status = 'past_due'
      update.billing_state = 'past_due'
    } else if (event.event === 'invoice.update' && data.status === 'success') {
      update.status = 'active'
      update.billing_state = 'active'
    } else if (event.event === 'subscription.disable') {
      update.status = 'cancelled'
      update.billing_state = 'cancelled'
      update.cancelled_at = new Date().toISOString()
    }
    if (Object.keys(update).length > 0) {
      await supabaseAdmin.from('subscriptions').update(update).eq('id', subscription.id)
    }
  }
  res.sendStatus(200)
}

export default router
