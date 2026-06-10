// Next.js route handlers for member management within the active tenant.
// GET lists members (requires read:members); POST invites a member (requires
// invite:members). Auth0 RBAC gates access here; Supabase RLS re-checks.
import { z } from 'zod'
import { withPermission } from '@/integrations/auth0/middleware.server'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import * as mgmt from '@/integrations/auth0/management.server'
import { PERMISSIONS, TENANT_ROLES, type TenantRole } from '@/lib/auth/permissions'
import { getActiveTenantId } from './_shared'
import { toJsonError } from '../_lib/respond'

const tenantRole = z.enum(TENANT_ROLES as unknown as [TenantRole, ...TenantRole[]])

const inviteInput = z.object({
  email: z.string().email().max(255).toLowerCase(),
  role: tenantRole.default('employee'),
  name: z.string().min(1).max(120).optional(),
})

export const GET = withPermission(PERMISSIONS.MembersRead, async (_req, context) => {
  try {
    const tenantId = await getActiveTenantId(context.orgId)
    const { data, error } = await supabaseAdmin
      .from('memberships')
      .select('id, role, status, joined_at, user_id, users(email, full_name, avatar_url)')
      .eq('tenant_id', tenantId)
      .order('joined_at', { ascending: false })
    if (error) throw new Error(error.message)
    return Response.json(data ?? [])
  } catch (err) {
    return toJsonError(err)
  }
})

export const POST = withPermission(PERMISSIONS.MembersInvite, async (req, context) => {
  try {
    if (!context.orgId) throw new Error('No active organization')
    const data = inviteInput.parse(await req.json())
    const tenantId = await getActiveTenantId(context.orgId)

    // Create the Auth0 invitation (sends the email itself if configured).
    const clientId = process.env.AUTH0_CLIENT_ID
    if (!clientId) throw new Error('AUTH0_CLIENT_ID is not set')
    const roleId = await mgmt.resolveRoleIdByName(data.role)
    const inviterName = (context.claims.name as string) ?? context.email ?? 'EasyOps admin'
    const invitation = await mgmt.createInvitation(context.orgId, {
      inviter: { name: inviterName },
      invitee: { email: data.email },
      client_id: clientId,
      roles: roleId ? [roleId] : undefined,
      ttl_sec: 60 * 60 * 24 * 7,
      send_invitation_email: true,
      app_metadata: { tenant_id: tenantId, invited_by: context.userId },
    })

    // Mirror as a placeholder membership so the UI can show pending invites.
    // The user id is `pending|<email>`; handle_user_sync_from_jwt promotes it
    // to the real Auth0 sub on first login (UNIQUE on email handles upgrade).
    const placeholderId = `pending|${data.email}`
    await supabaseAdmin.from('users').upsert(
      {
        id: placeholderId,
        email: data.email,
        full_name: data.name ?? data.email,
        status: 'active',
      },
      { onConflict: 'email' }
    )
    await supabaseAdmin.from('memberships').insert({
      tenant_id: tenantId,
      user_id: placeholderId,
      role: data.role,
      status: 'invited',
      invited_by: context.userId,
      joined_at: new Date().toISOString(),
    })

    return Response.json({
      invitationUrl: invitation.invitation_url,
      invitationId: invitation.id,
    })
  } catch (err) {
    return toJsonError(err)
  }
})
