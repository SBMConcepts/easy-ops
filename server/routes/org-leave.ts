import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { roleHasPermission } from '../lib/permissions.js'
import type { TablesInsert } from '../types/supabase.js'

const router = Router()

// BCEA-aligned leave categories tracked per member. Balances are days.
export const LEAVE_TYPES = ['annual', 'sick', 'family_responsibility'] as const
type LeaveType = (typeof LEAVE_TYPES)[number]

function isLeaveType(value: unknown): value is LeaveType {
  return typeof value === 'string' && (LEAVE_TYPES as readonly string[]).includes(value)
}

// Resolve a client-supplied member handle (the Auth0 subject) within the
// current org. org_leave_balances is keyed by auth0_user_id (composite FK to
// org_members), so writes/reads for a specific member are validated against an
// existing membership before proceeding.
async function resolveSub(orgId: string, userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('org_members')
    .select('auth0_user_id')
    .eq('auth0_user_id', userId)
    .eq('auth0_org_id', orgId)
    .maybeSingle()
  return data?.auth0_user_id ?? null
}

// GET /api/org-leave[?user_id=<users.id>]
// Without user_id: returns the caller's own balances (self-service view).
// With user_id: returns that member's balances, but only for admins
// (write:org_leave); members cannot read other members' leave.
router.get(
  '/api/org-leave',
  requireAuth,
  requireOrg,
  requirePermission('read:org_leave'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const callerSub = req.auth!.sub
    const requestedUserId =
      typeof req.query.user_id === 'string' && req.query.user_id ? req.query.user_id : null

    let targetSub = callerSub
    if (requestedUserId) {
      const resolved = await resolveSub(orgId, requestedUserId)
      if (!resolved) {
        res.status(404).json({ error: 'User not found in this organization.' })
        return
      }
      if (resolved !== callerSub && !roleHasPermission(req.memberRole, 'write:org_leave')) {
        res.status(403).json({ error: "Requires 'write:org_leave' permission." })
        return
      }
      targetSub = resolved
    }

    const { data, error } = await supabaseAdmin
      .from('org_leave_balances')
      .select('leave_type, balance_days, updated_at')
      .eq('auth0_org_id', orgId)
      .eq('auth0_user_id', targetSub)
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    // Return every category so the UI can render a complete set; unset
    // categories default to 0.
    const byType = new Map((data ?? []).map((r) => [r.leave_type, r]))
    const balances = LEAVE_TYPES.map((leave_type) => {
      const row = byType.get(leave_type)
      return {
        leave_type,
        balance_days: row ? Number(row.balance_days) : 0,
        updated_at: row?.updated_at ?? null,
      }
    })
    res.json({ balances })
  }
)

// PUT /api/org-leave — admin sets a member's leave balances (write:org_leave).
// Body: { user_id: <users.id>, balances: [{ leave_type, balance_days }] }
router.put(
  '/api/org-leave',
  requireAuth,
  requireOrg,
  requirePermission('write:org_leave'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as {
      user_id?: string
      balances?: Array<{ leave_type?: string; balance_days?: unknown }>
    }
    if (!body.user_id) {
      res.status(400).json({ error: 'user_id is required.' })
      return
    }
    if (!Array.isArray(body.balances) || body.balances.length === 0) {
      res.status(400).json({ error: 'balances must be a non-empty array.' })
      return
    }

    const rows: TablesInsert<'org_leave_balances'>[] = []
    for (const entry of body.balances) {
      if (!isLeaveType(entry.leave_type)) {
        res.status(400).json({ error: `Invalid leave_type: ${String(entry.leave_type)}.` })
        return
      }
      const days = Number(entry.balance_days)
      if (!Number.isFinite(days) || days < 0) {
        res.status(400).json({ error: `Invalid balance_days for ${entry.leave_type}.` })
        return
      }
      rows.push({
        auth0_org_id: orgId,
        auth0_user_id: '', // set after sub resolution below
        leave_type: entry.leave_type,
        balance_days: days,
        updated_at: new Date().toISOString(),
      })
    }

    const targetSub = await resolveSub(orgId, body.user_id)
    if (!targetSub) {
      res.status(404).json({ error: 'User not found in this organization.' })
      return
    }
    for (const row of rows) row.auth0_user_id = targetSub

    const { error } = await supabaseAdmin
      .from('org_leave_balances')
      .upsert(rows, { onConflict: 'auth0_org_id,auth0_user_id,leave_type' })
    if (error) {
      // Composite FK violation => the target has no membership in this org.
      if (error.code === '23503') {
        res.status(400).json({ error: 'User is not an active member of this organization.' })
        return
      }
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ success: true })
  }
)

export default router
