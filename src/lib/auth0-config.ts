// lib/auth0-config.ts

export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE

// The namespace used in your AuthContext and Auth0 Post-Login Action
export const AUTH0_CLAIM_NS = 'https://easy-ops-za.vercel.app/'
