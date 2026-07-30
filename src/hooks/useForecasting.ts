import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../contexts/AuthContext'
import { useOrgApi } from './useOrgApi'
import type { Database } from '../integrations/supabase/types'

export type ForecastRow = Database['public']['Tables']['labour_forecasts']['Row']
export type AlertRow = Database['public']['Tables']['labour_alerts']['Row']
export type AlertStatus = Database['public']['Enums']['forecast_alert_status']
export type AlertSeverity = Database['public']['Enums']['forecast_alert_severity']

export const forecastingKeys = {
  all: ['labour-forecasting'] as const,
  forecasts: (params?: ForecastQuery) =>
    [...forecastingKeys.all, 'forecasts', params ?? {}] as const,
  alerts: (status?: AlertStatus | 'all') =>
    [...forecastingKeys.all, 'alerts', status ?? 'all'] as const,
}

export interface ForecastQuery {
  siteId?: string | null
  site_name?: string | null
  from?: string | null
  to?: string | null
  limit?: number
}

// ── Forecast snapshots ──────────────────────────────────────────────────────
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
export function useAlerts(status?: AlertStatus | 'all') {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()

  return useQuery({
    queryKey: forecastingKeys.alerts(status),
    queryFn: async () => {
      const search = new URLSearchParams()
      if (status && status !== 'all') search.set('status', status)
      const qs = search.toString()
      const res = await apiFetch<{ alerts: AlertRow[] }>(`labour-alerts${qs ? `?${qs}` : ''}`)
      return res.alerts ?? []
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

// ── Alert lifecycle (acknowledge / resolve / dismiss / reopen) ──────────────
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
export interface GenerateForecastInput {
  siteId?: string | null
  site_name?: string | null
  horizonDays?: number
}

export interface GenerateForecastResult {
  forecast: ForecastRow
  alerts: AlertRow[]
}

export function useGenerateForecast() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: GenerateForecastInput = {}) =>
      apiFetch<GenerateForecastResult>('labour-forecasts/generate', {
        method: 'POST',
        body: JSON.stringify({
          siteId: input.siteId ?? '',
          site_name: input.site_name ?? '',
          horizon_days: input.horizonDays ?? 7,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: forecastingKeys.all })
    },
  })
}
