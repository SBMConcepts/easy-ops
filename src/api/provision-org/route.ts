import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Use service-role key — bypasses RLS for administrative inserts
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function verifySignature(body: string, sig: string) {
  const expected = crypto
    .createHmac('sha256', process.env.AUTH0_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const sig = req.headers.get('x-auth0-signature') ?? ''

  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(raw)
  if (event.type !== 'organization.created') {
    return NextResponse.json({ ok: true }) // ignore other events
  }

  const { id: auth0OrgId, display_name, name, metadata } = event.data

  const { error } = await supabase.from('organizations').insert({
    auth0_org_id: auth0OrgId,
    name: display_name,
    slug: name,
    plan: metadata?.plan ?? 'free',
    status: 'active',
  })

  if (error) {
    console.error('Supabase insert failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
