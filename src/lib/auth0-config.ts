/**
 * Auth0 configuration for the EasyOps SPA.
 *
 * Values are read from Vite environment variables so they can be overridden
 * per environment without code changes. Copy .env.example → .env.local and
 * fill in your Auth0 tenant details.
 *
 * Auth0 dashboard checklist:
 * 1. Application type:        Single Page Application
 * 2. Allowed Callback URLs:   http://localhost:5173/app, https://your-production-domain/app
 * 3. Allowed Logout URLs:     http://localhost:5173, https://your-production-domain
 * 4. Allowed Web Origins:     http://localhost:5173, https://your-production-domain
 * 5. Create an API with identifier matching VITE_AUTH0_AUDIENCE
 * 6. Add an Auth0 Action (Login / Post Login) that attaches custom claims:
 * event.user.app_metadata.role          → api.idToken / accessToken
 * event.user.app_metadata.tenant_id
 * Example Action snippet:
 * exports.onExecutePostLogin = async (event, api) => {
 * const ns = 'https://easy-ops-za.vercel.app/';
 * api.idToken.setCustomClaim(ns + 'role', event.user.app_metadata?.role ?? 'employee');
 * api.idToken.setCustomClaim(ns + 'tenant_id', event.user.app_metadata?.tenant_id ?? null);
 * api.accessToken.setCustomClaim(ns + 'role', event.user.app_metadata?.role ?? 'employee');
 * api.accessToken.setCustomClaim(ns + 'tenant_id', event.user.app_metadata?.tenant_id ?? null);
 * };
 */

export const AUTH0_DOMAIN = import.meta.env.AUTH0_DOMAIN as string
export const AUTH0_CLIENT_ID = import.meta.env.AUTH0_CLIENT_ID as string
export const AUTH0_AUDIENCE = import.meta.env.AUTH0_AUDIENCE as string
export const AUTH0_CLAIM_NS = 'https://easy-ops-za.vercel.app/' // Must match the namespace used in your Auth0 Action custom claims
