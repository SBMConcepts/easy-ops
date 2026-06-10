// Next.js route handlers for a single membership (by id): PATCH updates the
// role, DELETE offboards the member. Both require manage:members. Auth0 role
// assignments are kept in sync on a best-effort basis.
import { z } from 'zod'
import { withPermission } from '@/integrations/auth0/middleware.server'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import * as mgmt from '@/integrations/auth0/management.server'
import { PERMISSIONS, TENANT_ROLES, type TenantRole } from '@/lib/auth/permissions'
import { getActiveTenantId } from '../_shared'
import { toJsonError } from '../../_lib/respond'

const tenantRole = z.enum(TENANT_ROLES as unknown as [TenantRole, ...TenantRole[]])
const membershipId = z.string().uuid()

export const PATCH = withPermission(PERMISSIONS.MembersManage, async (req, context, segment) => {
  try {
    const { id } = await segment.params
    const membership_id = membershipId.parse(id)
    const { role } = z.object({ role: tenantRole }).parse(await req.json())
    const tenantId = await getActiveTenantId(context.orgId)

    const { data: existing, error } = await supabaseAdmin
      .from('memberships')
      .select('id, user_id, role, tenant_id')
      .eq('id', membership_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!existing) throw new Error('Membership not found')

    await supabaseAdmin.from('memberships').update({ role }).eq('id', existing.id)

    // Best-effort Auth0 role sync (only for already-real users).
    if (context.orgId && !existing.user_id.startsWith('pending|')) {
      try {
        const [newRoleId, prevRoleId] = await Promise.all([
          mgmt.resolveRoleIdByName(role),
          mgmt.resolveRoleIdByName(existing.role),
        ])
        if (prevRoleId)
          await mgmt.removeOrgMemberRoles(context.orgId, existing.user_id, [prevRoleId])
        if (newRoleId) await mgmt.assignOrgMemberRoles(context.orgId, existing.user_id, [newRoleId])
      } catch (e) {
        console.warn('[updateMemberRole] Auth0 role sync failed:', e)
      }
    }
    return Response.json({ ok: true })
  } catch (err) {
    return toJsonError(err)
  }
})

export const DELETE = withPermission(PERMISSIONS.MembersManage, async (_req, context, segment) => {
  try {
    const { id } = await segment.params
    const membership_id = membershipId.parse(id)
    const tenantId = await getActiveTenantId(context.orgId)

    const { data: existing, error } = await supabaseAdmin
      .from('memberships')
      .select('id, user_id, status')
      .eq('id', membership_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!existing) throw new Error('Membership not found')

    await supabaseAdmin.from('memberships').update({ status: 'offboarded' }).eq('id', existing.id)

    if (context.orgId && !existing.user_id.startsWith('pending|')) {
      try {
        await mgmt.removeOrgMember(context.orgId, existing.user_id)
      } catch (e) {
        console.warn('[removeMember] Auth0 removal failed:', e)
      }
    }
    return Response.json({ ok: true })
  } catch (err) {
    return toJsonError(err)
  }
})
