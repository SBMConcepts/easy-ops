import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RefreshCw, TrendingUp, AlertTriangle, Lock, ShieldCheck } from 'lucide-react'

import { Button } from '../components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { useAuthRole } from '../contexts/AuthContext'
import { useForecastingAccess } from '../lib/feature-flags'
import { useSites } from '../hooks/useOrgData'
import {
  useForecasts,
  useAlerts,
  useUpdateAlert,
  useGenerateForecast,
  type AlertRow,
  type AlertSeverity,
  type AlertStatus,
} from '../hooks/useForecasting'

import '../styles/forecasting.css'

const ALL_SITES_ID = 'All sites'
const ALL_SITES_NAME = 'All sites'

const HORIZON_OPTIONS = [
  { value: 7, label: 'Next 7 days' },
  { value: 14, label: 'Next 14 days' },
  { value: 30, label: 'Next 30 days' },
]

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const ALERT_TYPE_LABEL: Record<string, string> = {
  overtime_risk: 'Overtime risk',
  staffing_shortage: 'Staffing shortage',
  understaffed_shift: 'Understaffed shift',
  burnout_risk: 'Burnout risk',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatNumber(value: number | null, digits = 0): string {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export default function LabourForecasting() {
  const { canViewForecasting, canUseFullForecasting, plan } = useForecastingAccess()
  const { hasPermission } = useAuthRole()
  const canManageAlerts = canUseFullForecasting && hasPermission('write:labour_alerts')

  const [siteId, setSiteId] = useState<string>(ALL_SITES_ID)
  const [site_name, setSiteName] = useState<string>(ALL_SITES_NAME)
  const [horizon, setHorizon] = useState<number>(7)
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('open')

  const { data: sites = [] } = useSites()
  const forecastQuery = useForecasts({
    siteId: siteId === ALL_SITES_ID ? null : siteId,
    site_name: site_name === ALL_SITES_NAME ? null : site_name,
    limit: 30,
  })
  const alertsQuery = useAlerts(statusFilter)
  const updateAlert = useUpdateAlert()
  const generateForecast = useGenerateForecast()

  const forecasts = useMemo(() => forecastQuery.data ?? [], [forecastQuery.data])
  const latest = forecasts[0]

  // Demand-score bars, oldest → newest so the timeline reads left to right.
  const timeline = useMemo(() => {
    const rows = [...forecasts].reverse()
    const max = Math.max(1, ...rows.map((f) => Number(f.demand_score ?? 0)))
    return rows.map((f) => ({
      id: f.id,
      date: f.forecast_date,
      score: Number(f.demand_score ?? 0),
      height: Math.round((Number(f.demand_score ?? 0) / max) * 100),
    }))
  }, [forecasts])

  const handleGenerate = async () => {
    try {
      const result = await generateForecast.mutateAsync({
        siteId: siteId === ALL_SITES_ID ? null : siteId,
        site_name: site_name === ALL_SITES_NAME ? null : site_name,
        horizonDays: horizon,
      })
      const alertCount = result.alerts?.length ?? 0
      toast.success(
        alertCount > 0
          ? `Forecast generated — ${alertCount} alert${alertCount === 1 ? '' : 's'} raised.`
          : 'Forecast generated — no new alerts.'
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate forecast.')
    }
  }

  const handleAlertAction = async (alert: AlertRow, status: AlertStatus) => {
    try {
      await updateAlert.mutateAsync({ id: alert.id, status })
      toast.success(`Alert ${status}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update alert.')
    }
  }

  // ── No access ──────────────────────────────────────────────────────────────
  if (!canViewForecasting) {
    return (
      <div className="forecasting-page">
        <div className="forecasting-locked">
          <Lock className="forecasting-locked__icon" aria-hidden />
          <h2>Predictive Labour Forecasting</h2>
          <p>
            Forecasting is available on the Growth, Pro and Enterprise plans. Your current plan
            {plan ? ` (${plan})` : ''} does not include this feature.
          </p>
          <p className="forecasting-muted">
            Upgrade your subscription to unlock demand forecasting and staffing alerts.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="forecasting-page">
      {/* Header */}
      <header className="forecasting-header">
        <div>
          <h1 className="forecasting-title">
            <TrendingUp aria-hidden /> Predictive Labour Forecasting
          </h1>
          <p className="forecasting-subtitle">
            Anticipate staffing demand and surface risks before they become problems.
          </p>
        </div>
        <div className="forecasting-controls">
          <Select value={siteId} onValueChange={(v) => setSiteId(v ?? ALL_SITES_ID)}>
            <SelectTrigger className="forecasting-select" aria-label="Filter by site">
              <SelectValue placeholder="All sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SITES_ID}>{ALL_SITES_NAME}</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.site_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canUseFullForecasting && (
            <>
              <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v) || 7)}>
                <SelectTrigger className="forecasting-select" aria-label="Forecast horizon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HORIZON_OPTIONS.map((h) => (
                    <SelectItem key={h.value} value={String(h.value)}>
                      {h.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerate} disabled={generateForecast.isPending}>
                {generateForecast.isPending ? (
                  <Loader2 className="forecasting-spin" aria-hidden />
                ) : (
                  <RefreshCw aria-hidden />
                )}
                Generate forecast
              </Button>
            </>
          )}
        </div>
      </header>

      {!canUseFullForecasting && (
        <div className="forecasting-banner">
          <ShieldCheck aria-hidden />
          <span>
            You have read-only access on the Growth plan. Upgrade to Pro or Enterprise to generate
            forecasts and manage alerts.
          </span>
        </div>
      )}

      {/* Latest forecast summary */}
      <section className="forecasting-summary">
        {forecastQuery.isLoading ? (
          <div className="forecasting-empty">
            <Loader2 className="forecasting-spin" aria-hidden /> Loading forecasts…
          </div>
        ) : latest ? (
          <>
            <div className="forecasting-card">
              <span className="forecasting-card__label">Predicted staff needed</span>
              <span className="forecasting-card__value">
                {formatNumber(latest.predicted_required_staff)}
              </span>
              <span className="forecasting-card__meta">
                for {formatDate(latest.forecast_date)} · {latest.horizon_days}-day horizon
              </span>
            </div>
            <div className="forecasting-card">
              <span className="forecasting-card__label">Predicted hours</span>
              <span className="forecasting-card__value">
                {formatNumber(latest.predicted_hours, 1)}
              </span>
              <span className="forecasting-card__meta">total labour hours</span>
            </div>
            <div className="forecasting-card">
              <span className="forecasting-card__label">Demand score</span>
              <span className="forecasting-card__value">
                {formatNumber(latest.demand_score, 1)}
                <span className="forecasting-card__unit">/10</span>
              </span>
              <span className="forecasting-card__meta">
                {Math.round(Number(latest.confidence ?? 0) * 100)}% confidence
              </span>
            </div>
            <div className="forecasting-card forecasting-card--wide">
              <span className="forecasting-card__label">Model insight</span>
              <p className="forecasting-card__reasoning">
                {latest.reasoning ?? 'No reasoning provided.'}
              </p>
              <span className="forecasting-card__meta">
                {latest.model ?? 'heuristic'} · generated {formatDate(latest.created_at)}
              </span>
            </div>
          </>
        ) : (
          <div className="forecasting-empty">
            No forecasts yet.
            {canUseFullForecasting
              ? ' Generate one to get started.'
              : ' Ask an admin to generate the first forecast.'}
          </div>
        )}
      </section>

      {/* Demand timeline */}
      {timeline.length > 0 && (
        <section className="forecasting-chart">
          <h2 className="forecasting-section-title">Demand trend</h2>
          <div className="forecasting-bars" role="img" aria-label="Demand score over time">
            {timeline.map((bar) => (
              <div key={bar.id} className="forecasting-bar-col">
                <div
                  className="forecasting-bar"
                  style={{ height: `${Math.max(6, bar.height)}%` }}
                  title={`${formatDate(bar.date)}: ${bar.score.toFixed(1)}/10`}
                />
                <span className="forecasting-bar-label">{formatDate(bar.date)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Alerts */}
      <section className="forecasting-alerts">
        <div className="forecasting-alerts__head">
          <h2 className="forecasting-section-title">
            <AlertTriangle aria-hidden /> Staffing alerts
          </h2>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter((v as AlertStatus | 'all') ?? 'all')}
          >
            <SelectTrigger className="forecasting-select" aria-label="Filter alerts by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {alertsQuery.isLoading ? (
          <div className="forecasting-empty">
            <Loader2 className="forecasting-spin" aria-hidden /> Loading alerts…
          </div>
        ) : (alertsQuery.data?.length ?? 0) === 0 ? (
          <div className="forecasting-empty">No alerts for this filter.</div>
        ) : (
          <ul className="forecasting-alert-list">
            {alertsQuery.data!.map((alert) => (
              <li key={alert.id} className="forecasting-alert">
                <div className={`forecasting-alert__sev forecasting-alert__sev--${alert.severity}`}>
                  {SEVERITY_LABEL[alert.severity]}
                </div>
                <div className="forecasting-alert__body">
                  <div className="forecasting-alert__top">
                    <span className="forecasting-alert__title">{alert.title}</span>
                    <span className={`forecasting-status forecasting-status--${alert.status}`}>
                      {alert.status}
                    </span>
                  </div>
                  <span className="forecasting-alert__type">
                    {ALERT_TYPE_LABEL[alert.alert_type] ?? alert.alert_type}
                    {alert.target_date ? ` · ${formatDate(alert.target_date)}` : ''}
                  </span>
                  {alert.detail && <p className="forecasting-alert__detail">{alert.detail}</p>}
                  {alert.recommended_action && (
                    <p className="forecasting-alert__action">
                      <strong>Recommended:</strong> {alert.recommended_action}
                    </p>
                  )}
                </div>
                {canManageAlerts && (
                  <div className="forecasting-alert__actions">
                    {alert.status === 'open' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updateAlert.isPending}
                        onClick={() => handleAlertAction(alert, 'acknowledged')}
                      >
                        Acknowledge
                      </Button>
                    )}
                    {alert.status !== 'resolved' && alert.status !== 'dismissed' && (
                      <Button
                        size="sm"
                        disabled={updateAlert.isPending}
                        onClick={() => handleAlertAction(alert, 'resolved')}
                      >
                        Resolve
                      </Button>
                    )}
                    {alert.status !== 'dismissed' && alert.status !== 'resolved' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={updateAlert.isPending}
                        onClick={() => handleAlertAction(alert, 'dismissed')}
                      >
                        Dismiss
                      </Button>
                    )}
                    {(alert.status === 'resolved' || alert.status === 'dismissed') && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updateAlert.isPending}
                        onClick={() => handleAlertAction(alert, 'open')}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
