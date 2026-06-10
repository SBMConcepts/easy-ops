// Shared helper for member routes: resolves the Supabase tenant id from the
// Auth0 org id present in the verified token.
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export async function getActiveTenantId(orgId: string | undefined): Promise<string> {
  if (!orgId) throw new Error('No active organization in token')
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('auth0_org_id', orgId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error(`No tenant mapped to Auth0 org ${orgId}`)
  return data.id
}
