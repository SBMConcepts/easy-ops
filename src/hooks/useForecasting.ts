import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../contexts/AuthContext'
import { useOrgApi } from './useOrgApi'
import type { Database } from '../integrations/supabase/types'

/** A labour forecast snapshot row. */
export type ForecastRow = Database['public']['Tables']['labour_forecasts']['Row']
/** A labour-forecasting alert row. */
export type AlertRow = Database['public']['Tables']['labour_alerts']['Row']
/** Lifecycle status of a {@link AlertRow}. */
export type AlertStatus = Database['public']['Enums']['forecast_alert_status']
/** Severity of a {@link AlertRow}. */
export type AlertSeverity = Database['public']['Enums']['forecast_alert_severity']

export const forecastingKeys = {
  all: ['labour-forecasting'] as const,
  forecasts: (params?: ForecastQuery) =>
    [...forecastingKeys.all, 'forecasts', params ?? {}] as const,
  alerts: (params?: AlertQuery) => [...forecastingKeys.all, 'alerts', params ?? {}] as const,
}

/** Optional filters for {@link useForecasts}: site, date range, and result limit. */
export interface ForecastQuery {
  siteId?: string | null
  site_name?: string | null
  from?: string | null
  to?: string | null
  limit?: number
}

/** Optional filters for {@link useAlerts}. */
export interface AlertQuery {
  siteId?: string | null
  status?: AlertStatus | 'all'
}

// ── Forecast snapshots ──────────────────────────────────────────────────────
/** Fetch labour forecast snapshots, optionally filtered by site and date range. */
export function useForecasts(params?: ForecastQuery) {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()

  return useQuery({
    queryKey: forecastingKeys.forecasts(params),
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.siteId) search.set('site_id', params.siteId)
      if (params?.site_name) search.set('site_name', params.site_name)
      if (params?.from) search.set('from', params.from)
      if (params?.to) search.set('to', params.to)
      if (params?.limit) search.set('limit', String(params.limit))
      const qs = search.toString()
      const res = await apiFetch<{ forecasts: ForecastRow[] }>(
        `labour-forecasts${qs ? `?${qs}` : ''}`
      )
      return res.forecasts ?? []
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  })
}

// ── Alerts ──────────────────────────────────────────────────────────────────
/** Fetch labour-forecasting alerts, optionally filtered by status. */
export function useAlerts(params?: AlertQuery) {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()

  return useQuery({
    queryKey: forecastingKeys.alerts(params),
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params?.siteId) search.set('site_id', params.siteId)
      if (params?.status && params.status !== 'all') search.set('status', params.status)
      const qs = search.toString()
      const res = await apiFetch<{ alerts: AlertRow[] }>(`labour-alerts${qs ? `?${qs}` : ''}`)
      return res.alerts ?? []
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

// ── Alert lifecycle (acknowledge / resolve / dismiss / reopen) ──────────────
/** Update an alert's lifecycle status and invalidate the alerts cache. */
export function useUpdateAlert() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AlertStatus }) =>
      apiFetch<{ alert: AlertRow }>(`labour-alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...forecastingKeys.all, 'alerts'] })
    },
  })
}

// ── Generate a new forecast (Express → Edge Function) ───────────────────────
/** Input for triggering a new forecast generation run. */
export interface GenerateForecastInput {
  siteId?: string | null
  horizonDays?: number
}

/** Result returned by the generation Edge Function through Express. */
export interface GenerateForecastResult {
  alerts: Array<{
    alert_type: string
    severity: AlertSeverity
    target_date: string | null
    title: string
  }>
  ai_error: { status: number; message: string } | null
  forecast_id: string | null
  suppressed_duplicates: number
}

/** Trigger forecast generation (Express proxies to the forecasting Edge Function) and invalidate cached forecasts/alerts. */
export function useGenerateForecast() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: GenerateForecastInput = {}) =>
      apiFetch<GenerateForecastResult>('labour-forecasts/generate', {
        method: 'POST',
        body: JSON.stringify({
          site_id: input.siteId ?? undefined,
          horizon_days: input.horizonDays ?? 7,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: forecastingKeys.all })
    },
  })
}
