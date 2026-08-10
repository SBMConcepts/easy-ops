// Shared org_members lookups.
import { supabaseAdmin } from './supabase-admin.js'
import type { Database } from '../types/supabase.js'

/** An org_members row for a member whose status is 'active' — the RLS-equivalent membership shape. */
export interface ActiveOrgMember {
  id: string
  auth0_user_id: string
  auth0_org_id: string
  role: Database['public']['Enums']['org_role']
}

/**
 * Look up the (orgId, userId) org_members row with status = 'active' — the
 * same predicate auth0.current_role() uses in RLS, so Express and the DB agree
 * on who counts as an active member. Returns null if no such row exists.
 */
export async function findActiveOrgMember(
  orgId: string,
  userId: string
): Promise<ActiveOrgMember | null> {
  const { data, error } = await supabaseAdmin
    .from('org_members')
    .select('id, auth0_user_id, auth0_org_id, role')
    .eq('auth0_org_id', orgId)
    .eq('auth0_user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}
