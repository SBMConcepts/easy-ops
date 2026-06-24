/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/onboarding/create-org/route.ts
import { Auth0Client } from '@auth0/nextjs-auth0/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { addOrgMember, createAuth0Org } from '../../../../server/lib/auth0-admin'

export async function POST(req: NextRequest) {
  const auth0 = new Auth0Client()

  const session = await auth0.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const { orgName, slug } = await req.json()
  const auth0UserId = session.user.sub

  try {
    // 1. Create the org in Auth0
    const auth0Org = await createAuth0Org(orgName, slug)

    // 2. Add the creator as owner in Auth0
    await addOrgMember(auth0Org.id, auth0UserId, ['owner'])

    // 3. Insert the org into Supabase (idempotent — webhook may also fire)
    await supabaseAdmin.from('organizations').upsert(
      {
        auth0_org_id: auth0Org.id,
        name: orgName,
        slug,
        plan: 'free',
        status: 'active',
      },
      { onConflict: 'auth0_org_id' }
    )

    // 4. Ensure user row exists in Supabase
    const { data: user } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          auth0_user_id: auth0UserId,
          email: session.user.email,
          full_name: session.user.name,
          avatar_url: session.user.picture,
        },
        { onConflict: 'auth0_user_id' }
      )
      .select('id')
      .single()

    // 5. Insert owner membership
    if (user?.id) {
      await supabaseAdmin.from('org_members').upsert(
        {
          org_id: auth0Org.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
        },
        { onConflict: 'org_id,user_id' }
      )
    }

    // 6. Create a starter subscription row
    await supabaseAdmin.from('subscriptions').insert({
      org_id: auth0Org.id,
      plan: 'free',
      status: 'trialing',
      trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    })

    // 7. Log the action
    await supabaseAdmin.from('audit_logs').insert({
      org_id: auth0Org.id,
      actor_user_id: user?.id,
      action: 'organization.created',
      resource_type: 'organization',
      resource_id: auth0Org.id,
      diff: { name: orgName, slug },
    })

    return NextResponse.json({ orgId: auth0Org.id, slug })
  } catch (err: any) {
    console.error('Org creation failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
