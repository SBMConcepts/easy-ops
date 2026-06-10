// Next.js route handler: returns the authenticated user's session summary —
// their memberships and the active membership for the token's organization.
// Mirrors the user row from token claims on each call (idempotent upsert).
import { withAuth } from '@/integrations/auth0/middleware.server'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { toJsonError } from '../_lib/respond'

export const GET = withAuth(async (_req, context) => {
  try {
    // Upsert the user row from token claims (mirrors handle_user_sync_from_jwt).
    await supabaseAdmin.from('users').upsert(
      {
        id: context.userId,
        email: (context.email ?? '').toLowerCase().trim(),
        full_name: (context.claims.name as string) ?? context.email ?? context.userId,
        avatar_url: (context.claims.picture as string) ?? null,
        status: 'active',
      },
      { onConflict: 'email' }
    )

    const { data: memberships, error } = await supabaseAdmin
      .from('memberships')
      .select(
        'id, role, status, tenant_id, tenants(id, name, slug, auth0_org_id, logo_url, status)'
      )
      .eq('user_id', context.userId)
    if (error) throw new Error(error.message)

    const activeMembership = context.orgId
      ? memberships?.find(
          (m) => m.tenants && (m.tenants as { auth0_org_id: string }).auth0_org_id === context.orgId
        )
      : undefined

    return Response.json({
      userId: context.userId,
      email: context.email,
      orgId: context.orgId,
      permissions: context.permissions,
      roles: context.roles,
      memberships: memberships ?? [],
      activeMembership: activeMembership ?? null,
    })
  } catch (err) {
    return toJsonError(err)
  }
})
