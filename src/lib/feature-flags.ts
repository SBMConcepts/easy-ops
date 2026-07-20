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
