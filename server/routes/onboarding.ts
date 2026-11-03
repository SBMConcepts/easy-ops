import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { Json } from '../types/supabase.js'

const router = Router()

function getTrialDays(): number {
  const value = Number(process.env.BILLING_TRIAL_DAYS ?? 7)
  return Number.isInteger(value) && value >= 5 && value <= 7 ? value : 7
}

interface OnboardingBody {
  company?: { name?: string; country?: string; industry?: string }
  sites?: Array<{
    name?: string
    address?: string | null
    latitude?: number | null
    longitude?: number | null
    geofence_radius_m?: number | null
  }>
  departments?: Array<{ name?: string; site_name?: string | null }>
  roles?: Array<{ name?: string; base_role?: string }>
  shifts?: Array<{
    name?: string
    start_time?: string | null
    end_time?: string | null
    grace_period_minutes?: number | null
    weekly_hours?: number | null
  }>
  workRules?: Record<string, unknown>
  checkInMethods?: Record<string, unknown>
}

router.post(
  '/api/onboarding/complete',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as OnboardingBody

    try {
      // Provisioning and the trial start run in one DB transaction over HTTPS.
      const { data: completion, error } = await supabaseAdmin.rpc('complete_onboarding', {
        p_org_id: orgId,
        p_payload: body as Json,
        p_trial_days: getTrialDays(),
      })
      if (error) throw new Error(error.message)

      res.json({ ok: true, ...(completion as Record<string, unknown>) })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onboarding failed.'
      console.error('onboarding/complete failed:', message)
      res.status(500).json({ error: message })
    }
  }
)

export default router
