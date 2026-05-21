/**
 * Extracts the tenant slug from the current URL hostname.
 * * In a multi-tenant SaaS, this is used to identify which workspace
 * the user is attempting to access (e.g., 'acme' from 'acme.easy-ops-za.vercel.app').
 * * @returns {string | null} The tenant slug if present, otherwise null.
 */
export function getSubdomain(): string | null {
  // Guard against environments where `window` is not defined (e.g., SSR/testing)
  if (typeof window === 'undefined') return null

  const host = window.location.hostname
  const parts = host.split('.')

  // ── Local Development (e.g., acme.localhost) ─────────────────────────────
  if (host.includes('localhost')) {
    // If there's more than one part before the port (e.g., ["acme", "localhost"]),
    // treat the first part as the tenant slug.
    return parts.length > 1 && !parts[0].includes('localhost') ? parts[0].toLowerCase() : null
  }

  // ── Production (e.g., acme.easy-ops-za.vercel.app) ───────────────────────
  // Assumes a standard domain format: subdomain.domain.com (at least 3 parts)
  if (parts.length >= 3) {
    const subdomain = parts[0].toLowerCase()

    // Prevent treating core infrastructure or marketing subdomains as tenants
    const reserved = [
      'www',
      'api',
      'admin',
      'app',
      'billing',
      'status',
      'support',
      'vercel',
      'auth',
      'login',
    ]

    if (reserved.includes(subdomain)) return null

    return subdomain
  }

  return null
}
