import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth0 } from '.auth0-config' // Your Auth0 config

export async function middleware(request: NextRequest) {
  // 1. Run Auth0's native middleware first to handle sessions and protected routes
  const authResponse = await auth0.middleware(request)

  // 2. Extract the subdomain for Multi-Tenancy
  const host = request.headers.get('host') || ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'easy-ops-za.vercel.app'

  let subdomain: string | null = null

  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const parts = host.split('.')
    if (parts.length > 1 && !parts[0].includes('localhost')) {
      subdomain = parts[0].toLowerCase()
    }
  } else if (host.endsWith(rootDomain)) {
    const parts = host.replace(`.${rootDomain}`, '').split('.')
    subdomain = parts[parts.length - 1].toLowerCase()
  }

  const reservedSubdomains = [
    'www',
    'api',
    'admin',
    'billing',
    'status',
    'app',
    'support',
    'vercel',
    'auth',
    'login',
  ]

  // 3. Inject Tenant Headers into the Auth0 Response
  if (subdomain && !reservedSubdomains.includes(subdomain)) {
    // We attach the header directly to the authResponse created by Auth0
    authResponse.headers.set('x-tenant-slug', subdomain)
  }

  // 4. Return the combined response
  return authResponse
}

// 5. Configure the matcher (Combined exclusions from both files)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sitemap.xml / robots.txt
     * - Public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
