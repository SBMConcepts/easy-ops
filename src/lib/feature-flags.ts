import { useAuth } from '../contexts/AuthContext'

// Predictive Labour Forecasting is gated behind the subscription plan carried on
// the organization profile (organizations.plan). Two tiers of access:
//   - "view"  → Growth plan: read forecasts + alerts, but cannot generate or act.
//   - "full"  → Pro / Enterprise: generate forecasts + manage the alert lifecycle.
// Free / Starter (and any unknown plan) get no forecasting access at all.
//
// Keep these sets in sync with the server plan gate
// (server/routes/labour-forecasting.ts FULL_FORECAST_PLANS) and the edge
// function (supabase/functions/labour-forecast/index.ts FULL_FORECAST_PLANS).

/** Plans that may view forecasting (read-only or better). */
export const FORECASTING_VIEW_PLANS = new Set(['growth', 'pro', 'enterprise'])

/** Plans that unlock full forecasting (generate + manage alerts). */
export const FORECASTING_FULL_PLANS = new Set(['pro', 'enterprise'])

export interface ForecastingAccess {
  /** Growth+ : the forecasting page and data are visible. */
  canViewForecasting: boolean
  /** Pro / Enterprise : generation + alert management are enabled. */
  canUseFullForecasting: boolean
  /** The normalized plan string used to derive the flags. */
  plan: string
}

function normalizePlan(plan: string | null | undefined): string {
  return (plan ?? '').trim().toLowerCase()
}

/** Pure helper — derive forecasting access from a raw plan string. */
export function getForecastingAccess(plan: string | null | undefined): ForecastingAccess {
  const normalized = normalizePlan(plan)
  return {
    plan: normalized,
    canViewForecasting: FORECASTING_VIEW_PLANS.has(normalized),
    canUseFullForecasting: FORECASTING_FULL_PLANS.has(normalized),
  }
}

/** React hook — forecasting access for the current organization. */
export function useForecastingAccess(): ForecastingAccess {
  const { organization } = useAuth()
  return getForecastingAccess(organization?.plan)
}

// ── Payroll Export Pro ──────────────────────────────────────────────────────
// Gated behind the Business tier (mapped to the Pro + Enterprise plans, since
// the plan enum has no dedicated 'business' value). Keep in sync with the
// server plan gate (server/routes/payroll-export.ts) and the edge function
// (supabase/functions/payroll-export/index.ts) FULL_PAYROLL_PLANS.

/** Plans that unlock Payroll Export Pro. */
export const PAYROLL_EXPORT_PLANS = new Set(['pro', 'enterprise'])

export interface PayrollAccess {
  /** Pro / Enterprise : payroll export generation + download are enabled. */
  canUsePayrollExport: boolean
  /** The normalized plan string used to derive the flag. */
  plan: string
}

/** Pure helper — derive payroll access from a raw plan string. */
export function getPayrollAccess(plan: string | null | undefined): PayrollAccess {
  const normalized = normalizePlan(plan)
  return {
    plan: normalized,
    canUsePayrollExport: PAYROLL_EXPORT_PLANS.has(normalized),
  }
}

/** React hook — payroll export access for the current organization. */
export function usePayrollAccess(): PayrollAccess {
  const { organization } = useAuth()
  return getPayrollAccess(organization?.plan)
}

// ── Premium Support ─────────────────────────────────────────────────────────
// The Support Centre itself is available on every plan (support must always be
// reachable). The "premium" tiers differ in SLA speed and in whether a dedicated
// Customer Success Manager is assigned. Keep SUPPORT_SLA_TIERS in sync with the
// edge function (supabase/functions/support-ticket/index.ts SLA_TIERS).

/** Plans that receive a dedicated Customer Success Manager contact. */
export const CSM_PLANS = new Set(['enterprise'])

export interface SlaTier {
  /** First-response SLA target, in hours. */
  responseHours: number
  /** Resolution SLA target, in hours. */
  resolutionHours: number
}

/** Plan → SLA targets. Unknown plans fall back to the 'free' tier. */
export const SUPPORT_SLA_TIERS: Record<string, SlaTier> = {
  enterprise: { responseHours: 2, resolutionHours: 24 },
  pro: { responseHours: 4, resolutionHours: 48 },
  growth: { responseHours: 8, resolutionHours: 72 },
  starter: { responseHours: 24, resolutionHours: 120 },
  free: { responseHours: 48, resolutionHours: 168 },
}

export interface SupportAccess {
  /** Enterprise : a dedicated CSM contact card is shown. */
  hasCsm: boolean
  /** The SLA targets that apply to this organization's plan. */
  sla: SlaTier
  /** The normalized plan string used to derive the flags. */
  plan: string
}

/** Pure helper — derive support access + SLA tier from a raw plan string. */
export function getSupportAccess(plan: string | null | undefined): SupportAccess {
  const normalized = normalizePlan(plan)
  return {
    plan: normalized,
    hasCsm: CSM_PLANS.has(normalized),
    sla: SUPPORT_SLA_TIERS[normalized] ?? SUPPORT_SLA_TIERS.free,
  }
}

/** React hook — support access + SLA tier for the current organization. */
export function useSupportAccess(): SupportAccess {
  const { organization } = useAuth()
  return getSupportAccess(organization?.plan)
}
