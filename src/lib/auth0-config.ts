/**
 * Auth0 configuration for the EasyOps SPA.
 *
 * Values are read from Vite environment variables so they can be overridden
 * per environment without code changes. Copy .env.example → .env.local and
 * fill in your Auth0 tenant details.
 *
 * Auth0 dashboard checklist:
 *  1. Application type:        Single Page Application
 *  2. Allowed Callback URLs:   http://localhost:5173/app, https://your-production-domain/app
 *  3. Allowed Logout URLs:     http://localhost:5173, https://your-production-domain
 *  4. Allowed Web Origins:     http://localhost:5173, https://your-production-domain
 *  5. Create an API with identifier matching VITE_AUTH0_AUDIENCE
 *  6. Add an Auth0 Action (Login / Post Login) that attaches custom claims:
 *       event.user.app_metadata.role          → api.idToken / accessToken
 *       event.user.app_metadata.organisation_id
 *     Example Action snippet:
 *       exports.onExecutePostLogin = async (event, api) => {
 *         const ns = 'https://easyops.app/';
 *         api.idToken.setCustomClaim(ns + 'role', event.user.app_metadata?.role ?? 'employee');
 *         api.idToken.setCustomClaim(ns + 'organisation_id', event.user.app_metadata?.organisation_id ?? null);
 *         api.accessToken.setCustomClaim(ns + 'role', event.user.app_metadata?.role ?? 'employee');
 *         api.accessToken.setCustomClaim(ns + 'organisation_id', event.user.app_metadata?.organisation_id ?? null);
 *       };
 */

export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN as string
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID as string
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE as string

/**
 * The custom claim namespace used in Auth0 Actions.
 * All non-standard JWT claims must be namespaced to avoid conflicts.
 */
export const AUTH0_CLAIM_NS = 'https://easy-ops-za.vercel.app/'
