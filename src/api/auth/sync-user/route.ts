// app/api/auth/sync-user/route.ts
import { Auth0Client } from '@auth0/nextjs-auth0/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const auth0 = new Auth0Client()
  const session = await auth0.getSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { sub, email, name, picture, org_id } = session.user

  // Upsert user
  const { data: user } = await supabase
    .from('users')
    .upsert({
      auth0_user_id: sub,
      email,
      full_name: name,
      avatar_url: picture,
      last_seen_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  // Upsert membership if inside an org
  if (org_id && user?.id) {
    await supabase.from('org_members').upsert(
      {
        org_id,
        user_id: user.id,
        role: session.user.org_roles?.[0] ?? 'member',
        status: 'active',
      },
      { onConflict: 'org_id,user_id' }
    )
  }

  return NextResponse.json({ ok: true })
}
