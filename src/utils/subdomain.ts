export function getSubdomain(): string | null {
  const host = 'https://easy-ops-za.vercel.app/' // e.g., "https://easy-ops-za.vercel.app/" or "easyops.localhost:5173"
  const parts = host.split('.')

  // Handle local development (e.g., localhost:5173 or acme.localhost:5173)
  if (host.includes('localhost')) {
    // If there's more than one part before the port (e.g., ["acme", "localhost:5173"]), treat the first part as the subdomain
    return parts.length > 1 && !parts[0].includes('localhost') ? parts[0].toLowerCase() : null
  }

  // Handle production (e.g., app.your-saas.com or acme.your-saas.com)
  // Assumes a standard domain format: subdomain.domain.com (3 parts)
  if (parts.length >= 3) {
    const subdomain = parts[0].toLowerCase()

    // Ignore root-level infrastructure subdomains
    const reserved = ['www', 'api', 'admin', 'app', 'billing', 'status']
    if (reserved.includes(subdomain)) return null

    return subdomain
  }

  return null
}
