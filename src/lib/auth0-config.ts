/**
 * Auth0 configuration for the EasyOps SPA.
 * Values are read from Vite environment variables so they can be overridden
 * per environment without code changes. Copy .env.example → .env.local and
 * fill in your Auth0 tenant details.
 *
 * Auth0 dashboard checklist:
 * 1. Application type:       Single Page Application
 * 2. Allowed Callback URLs:   http://localhost:5173/, https://your-production-domain/
 * 3. Allowed Logout URLs:     http://localhost:5173, https://your-production-domain
 * 4. Allowed Web Origins:     http://localhost:5173, https://your-production-domain
 * 5. Create an API with identifier matching VITE_AUTH0_AUDIENCE
 */

// Note: Switched from process.env to Vite's import.meta.env syntax
export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || ''
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || ''
export const AUTH0_CLIENT_SECRET = import.meta.env.VITE_AUTH0_MANAGEMENT_CLIENT_SECRET || ''
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE || ''

/**
 * Must match the exact domain namespace used in your Auth0 post-login Action
 * when applying custom claims (e.g., api.idToken.setCustomClaim(ns + 'role', ...))
 */
export const AUTH0_CLAIM_NS = 'https://easy-ops-za.vercel.app/' // <-- Trailing slash is important for namespacing claims
