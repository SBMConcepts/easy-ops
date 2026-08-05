import { Router, type Request, type Response } from 'express'
import type { member_status, AccessRole } from '../types/supabase.js'

import { supabaseAdmin } from '../lib/supabase-admin.js'
import { hasRequiredRole, jobRoleToTier } from '../lib/rbac.js'
import { permissionsForRole } from '../lib/permissions.js'
import { findActiveOrgMember } from '../lib/org-members.js'
import { Json } from '../types/supabase.js'

const router = Router()

router.post('/api/auth/sync', async (req: Request, res: Response) => {
  const secret = process.env.AUTH0_SYNC_SECRET
  if (!secret || req.header('x-api-key') !== secret) {
    res.status(401).json({ error: 'Invalid sync credentials.' })
    return
  }

  const body = (req.body ?? {}) as {
    id: string
    auth0_org_id: string
    auth0_user_id: string
    email: string
    full_name: string
    first_name: string
    last_name: string
    status: member_status
    avatar_url: string | null
    department_id: string | null
    job_role_id: string | null
    joined_at: Date
    leave_balances: Json
    manager_id: string | null
    site_id: string | null
    shift_id: string | null
    permissions: Json
    employee_code: string | null
    employment_type: string | null
    hourly_rate: number | null
    mobile_number: string | ''
    tax_number: string | null
    role: AccessRole | null
    updated_at: string
  }

  if (!body.auth0_user_id || !body.email) {
    res.status(400).json({ error: 'auth0_user_id and email are required.' })
    return
  }

  // Every user in this B2B product belongs to a tenant: users.auth0_org_id is
  // NOT NULL. Reject an orgless sync with a clean 400 rather than a DB error.
  const auth0_org_id = typeof body.auth0_org_id === 'string' ? body.auth0_org_id : ''
  if (!auth0_org_id) {
    res.status(400).json({ error: 'auth0_org_id is required.' })
    return
  }

  // user_credentials is the tenant identity anchor: it exists independent of any
  // organization-scoped membership data and is keyed by the Auth0 subject.
  const { data: cred, error: credErr } = await supabaseAdmin
    .from('user_credentials')
    .upsert(
      {
        id: body.id,
        auth0_org_id: body.auth0_org_id,
        auth0_user_id: body.auth0_user_id,
        email: body.email,
        full_name: body.full_name,
        first_name: body.first_name,
        last_name: body.last_name,
        status: body.status,
        avatar_url: body.avatar_url ?? null,
        department_id: body.department_id ?? null,
        job_role_id: body.job_role_id ?? null,
        joined_at: body.joined_at ?? new Date().toISOString(),
        leave_balances: body.leave_balances ?? JSON.stringify([]),
        manager_id: body.manager_id ?? null,
        site_id: body.site_id ?? null,
        shift_id: body.shift_id ?? null,
        employment_type: body.employment_type ?? null,
        hourly_rate: body.hourly_rate ?? null,
        mobile_number: body.mobile_number ?? '',
        tax_number: body.tax_number ?? null,
        role: body.role ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'auth0_user_id' }
    )
    .select('auth0_user_id, auth0_org_id, email, full_name')
    .single()

  if (credErr || !cred) {
    res.status(500).json({ error: credErr?.message ?? 'Failed to sync user.' })
    return
  }

  let role: AccessRole = 'admin' // default to owner/admin if no org context
  if (body.auth0_org_id) {
    let roleHint = body.role
    // public.users is the invite table. The invite carries the provisioning-
    // time intent — the org creator is always invited as owner/admin. Let it
    // win whenever it grants at least as much privilege as the token hint, so a
    // stale or low app_metadata role can never downgrade the creator (or any
    // invited admin) below their intended tier.
    const { data: invite } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth0_org_id', body.auth0_org_id)
      .eq('email', body.email.toLowerCase())
      .maybeSingle()
    if (
      invite?.role &&
      (!roleHint || hasRequiredRole(jobRoleToTier(invite.role), jobRoleToTier(roleHint)))
    ) {
      roleHint = invite.role
    }

    const existingMember = await findActiveOrgMember(body.auth0_org_id, body.auth0_user_id)

    if (!invite && !existingMember) {
      res.json({ ok: true, role: 'admin', permissions: permissionsForRole('admin') })
      return
    }

    role = jobRoleToTier(roleHint)
    const { error: memberErr } = await supabaseAdmin.from('org_members').upsert(
      {
        id: existingMember?.id ?? '',
        auth0_org_id: body.auth0_org_id,
        auth0_user_id: body.auth0_user_id,
        full_name: body.full_name ?? '',
        first_name: body.first_name ?? '',
        last_name: body.last_name ?? '',
        email: body.email,
        avatar_url: body.avatar_url ?? null,
        department_id: body.department_id ?? null,
        job_role_id: body.job_role_id ?? null,
        joined_at: new Date().toISOString(),
        employee_code: body.employee_code ?? null,
        employment_type: body.employment_type,
        hourly_rate: body.hourly_rate ?? null,
        mobile_number: body.mobile_number ?? '',
        tax_number: body.tax_number ?? null,
        role: body.role ?? 'admin',
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'auth0_org_id,auth0_user_id' }
    )
    if (memberErr) {
      res.status(500).json({ error: memberErr.message })
      return
    }

    // Stamp the invite as accepted now that the membership exists.
    await supabaseAdmin
      .from('users')
      .update({ accepted_at: new Date().toISOString() })
      .eq('auth0_org_id', body.auth0_org_id)
      .eq('email', body.email.toLowerCase())
      .is('accepted_at', null)
  }

  res.json({ ok: true, role, permissions: permissionsForRole(role) })
})

export default router
