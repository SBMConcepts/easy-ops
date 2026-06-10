// Next.js route handlers for tenant lifecycle: GET lists the caller's active
// tenants; POST self-serve creates a tenant (Auth0 organization + Supabase
// rows). Any authenticated user may create a tenant.
import { z } from 'zod'
import { withAuth } from '@/integrations/auth0/middleware.server'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import * as mgmt from '@/integrations/auth0/management.server'
import { toJsonError } from '../_lib/respond'

const createTenantInput = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens'),
  industry: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
})

export const GET = withAuth(async (_req, context) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('memberships')
      .select('role, status, tenants(id, name, slug, auth0_org_id, logo_url)')
      .eq('user_id', context.userId)
      .eq('status', 'active')
    if (error) throw new Error(error.message)
    return Response.json(data ?? [])
  } catch (err) {
    return toJsonError(err)
  }
})

export const POST = withAuth(async (req, context) => {
  try {
    const data = createTenantInput.parse(await req.json())

    // 1) Create the Auth0 organization (display name is the human label).
    const org = await mgmt.createOrganization({
      name: data.slug,
      display_name: data.name,
      metadata: { created_by: context.userId },
    })

    // 2) Insert the tenant row tied to the Auth0 org id.
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: data.name,
        slug: data.slug,
        industry: data.industry ?? null,
        country: data.country ?? 'South Africa',
        auth0_org_id: org.id,
        status: 'active',
      })
      .select('id, name, slug, auth0_org_id')
      .single()
    if (tenantErr || !tenant) {
      // Best-effort cleanup of the dangling Auth0 org.
      try {
        await mgmt.deleteOrganization(org.id)
      } catch {
        /* ignore cleanup failure */
      }
      throw new Error(tenantErr?.message ?? 'Failed to create tenant')
    }

    // 3) Add the current user to the Auth0 org with the `owner` role.
    try {
      await mgmt.addOrgMembers(org.id, [context.userId])
      const ownerRoleId = await mgmt.resolveRoleIdByName('owner')
      if (ownerRoleId) {
        await mgmt.assignOrgMemberRoles(org.id, context.userId, [ownerRoleId])
      }
    } catch (e) {
      console.warn('[createTenant] Auth0 member assignment failed (continuing):', e)
    }

    // 4) Insert active owner membership in Supabase.
    const { error: memberErr } = await supabaseAdmin.from('memberships').insert({
      tenant_id: tenant.id,
      user_id: context.userId,
      role: 'owner',
      status: 'active',
      invited_by: context.userId,
      joined_at: new Date().toISOString(),
    })
    if (memberErr) {
      console.warn('[createTenant] membership insert failed:', memberErr.message)
    }

    return Response.json(tenant)
  } catch (err) {
    return toJsonError(err)
  }
})
