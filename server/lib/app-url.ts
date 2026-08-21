const DEFAULT_APP_URL = 'http://localhost:5173'

/** Returns the canonical browser origin used for OIDC redirects and public app links. */
export function appBaseUrl(): string {
  const configuredUrl =
    process.env.OIDC_BASE_URL ?? process.env.BASE_URL ?? process.env.APP_URL ?? DEFAULT_APP_URL

  return configuredUrl.replace(/\/+$/, '')
}
