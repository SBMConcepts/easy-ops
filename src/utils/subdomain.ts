/**
 * Tenant routing mode.
 *
 * 'path'      → /t/{slug}/app/...   (default — works on Vercel free tier, any Auth0 plan)
 * 'subdomain' → {slug}.easy-ops-za.vercel.app/app/...  (requires Vercel Pro + Auth0 wildcard)
 *
 * Set VITE_TENANT_MODE=subdomain in .env.local when you are ready to switch.
 */
export const TENANT_MODE = (import.meta.env.VITE_TENANT_MODE as 'path' | 'subdomain') ?? 'path'

/**
 * Returns the current tenant slug from the URL, regardless of routing mode.
 * Prefer this over getSubdomain() in all new code.
 */
export function getTenantSlug(): string | null {
  return TENANT_MODE === 'subdomain' ? getSubdomain() : getPathSlug()
}

/** Reads the slug from a /t/:slug/... path. */
function getPathSlug(): string | null {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/^\/t\/([^/]+)/)
  return match ? match[1].toLowerCase() : null
}

// ── Subdomain mode (re-enabled when VITE_TENANT_MODE=subdomain) ───────────────

/**
 * The root domain for production subdomain deployments.
 * Tenant workspaces live at {slug}.BASE_DOMAIN.
 */
const BASE_DOMAIN = 'easy-ops-za.vercel.app'

/**
 * Extracts the tenant slug from the hostname.
 * Only used when VITE_TENANT_MODE=subdomain.
 */
export function getSubdomain(): string | null {
  if (typeof window === 'undefined') return null

  const host = window.location.hostname

  // ── Local Development (e.g., acme.localhost) ─────────────────────────────
  if (host.includes('localhost')) {
    const parts = host.split('.')
    return parts.length > 1 && !parts[0].includes('localhost') ? parts[0].toLowerCase() : null
  }

  // ── Production (e.g., acme.easy-ops-za.vercel.app) ───────────────────────
  // Anchor against BASE_DOMAIN so that easy-ops-za.vercel.app itself (no subdomain)
  // is never mistaken for a tenant workspace.
  if (host === BASE_DOMAIN || !host.endsWith('.' + BASE_DOMAIN)) return null

  const subdomain = host.slice(0, host.length - BASE_DOMAIN.length - 1).toLowerCase()

  const reserved = ['www', 'api', 'admin', 'app', 'billing', 'status', 'support', 'auth', 'login']
  if (reserved.includes(subdomain)) return null

  return subdomain
}
