/**
 * The root domain for production deployments.
 * Tenant workspaces live at {slug}.BASE_DOMAIN (e.g. acme.easy-ops-za.vercel.app).
 * The marketing site lives at BASE_DOMAIN itself.
 */
const BASE_DOMAIN = 'easy-ops-za.vercel.app'

/**
 * Extracts the tenant slug from the current URL hostname.
 *
 * Returns the slug (e.g. 'acme') when on a tenant subdomain,
 * or null on the root domain / reserved subdomains / localhost root.
 */
export function getSubdomain(): string | null {
  // Guard against environments where `window` is not defined (e.g., SSR/testing)
  if (typeof window === 'undefined') return null

  const host = window.location.hostname

  // ── Local Development (e.g., acme.localhost) ─────────────────────────────
  if (host.includes('localhost')) {
    const parts = host.split('.')
    // ["acme", "localhost"] → "acme"; ["localhost"] → null
    return parts.length > 1 && !parts[0].includes('localhost') ? parts[0].toLowerCase() : null
  }

  // ── Production (e.g., acme.easy-ops-za.vercel.app) ───────────────────────
  // Anchor against BASE_DOMAIN so that visiting easy-ops-za.vercel.app itself
  // (parts.length === 3) is never mistaken for a tenant subdomain.
  if (host === BASE_DOMAIN || !host.endsWith('.' + BASE_DOMAIN)) return null

  const subdomain = host.slice(0, host.length - BASE_DOMAIN.length - 1).toLowerCase()

  // Prevent core infrastructure subdomains from being treated as tenants
  const reserved = ['www', 'api', 'admin', 'app', 'billing', 'status', 'support', 'auth', 'login']
  if (reserved.includes(subdomain)) return null

  return subdomain
}
