import { jwtVerify, createRemoteJWKSet } from 'jose'
const JWKS = createRemoteJWKSet(new URL(Deno.env.get('AUTH0_JWKS_URL')!))
export async function verifyAuth0(req: Request) {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer /, '')
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: Deno.env.get('AUTH0_ISSUER')!,
    audience: Deno.env.get('AUTH0_AUDIENCE')!,
  })
  return payload as {
    sub: string
    org_id: string
    roles?: string[]
    email?: string
  }
}
