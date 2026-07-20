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
