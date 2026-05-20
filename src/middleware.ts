import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''

  // Define your root production domain name (set this in your env)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'easy-ops-za.vercel.app'

  let subdomain: string | null = null

  // 1. Extract the subdomain based on the environment
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    // Handle local development mapping (e.g., acme.localhost:3000)
    const parts = host.split('.')
    if (parts.length > 1 && !parts[0].includes('localhost')) {
      subdomain = parts[0].toLowerCase()
    }
  } else if (host.endsWith(rootDomain)) {
    // Handle cloud production environments (e.g., acme.your-saas.com)
    const parts = host.replace(`.${rootDomain}`, '').split('.')
    subdomain = parts[parts.length - 1].toLowerCase()
  }

  // 2. Filter out infrastructure-level reserved keywords
  const reservedSubdomains = ['www', 'api', 'admin', 'billing', 'status', 'app']

  // 3. Forward the request with isolation headers injected
  if (subdomain && !reservedSubdomains.includes(subdomain)) {
    // Clone the incoming headers so we can modify them
    const requestHeaders = new Headers(request.headers)

    // Inject the tenant slug safely into the request flow
    requestHeaders.set('x-tenant-slug', subdomain)

    // Continue the request pipeline, supplying the API routes with the header
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // If no tenant-specific subdomain is found (e.g., global landing page), continue normally
  return NextResponse.next()
}

// 4. Configure the middleware matcher to optimize performance
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
