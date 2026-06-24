import { Auth0Client } from '@auth0/nextjs-auth0/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { ManagementClient } from 'auth0'

// Accepting an invitation performs privileged, cross-org writes (adding the
// invitee to an organization they are not yet a member of) which the invitee
// cannot do under their own RLS scope — so this route uses the service-role key.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const auth0 = new Auth0Client()
  const session = await auth0.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const { token } = (await req.json()) as { token?: string }
  if (!token) {
    return NextResponse.json({ error: 'An invitation token is required.' }, { status: 400 })
  }

  // Look up a pending, unexpired invitation by its token.
  const { data: invite } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invitation.' }, { status: 400 })
  }

  // Add the accepting user to the Auth0 organization.
  const mgmt = new ManagementClient({
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_M2M_CLIENT_ID!,
    clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET!,
  })
  await mgmt.organizations.members.create({ id: invite.org_id }, { members: [session.user.sub] })

  // Upsert the user, then their active membership at the invited role.
  const { data: user } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        auth0_user_id: session.user.sub,
        email: session.user.email,
        full_name: session.user.name,
      },
      { onConflict: 'auth0_user_id' }
    )
    .select('id')
    .single()

  if (user?.id) {
    await supabaseAdmin.from('org_members').upsert(
      {
        org_id: invite.org_id,
        user_id: user.id,
        role: invite.role,
        status: 'active',
      },
      { onConflict: 'org_id,user_id' }
    )
  }

  // Mark the invitation as accepted so the token can't be reused.
  await supabaseAdmin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ ok: true, orgId: invite.org_id })
}
