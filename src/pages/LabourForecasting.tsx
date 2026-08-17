/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react'
import '../styles/labourforecasting.css'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useOrgApi } from '@/hooks/useOrgApi'
import { useForecastingAccess } from '@/lib/feature-flags'
import type { AlertRow, AlertStatus, ForecastRow } from '@/hooks/useForecasting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  AlertTriangle,
  Brain,
  Gauge,
  Loader2,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SiteRow } from '@/hooks/useOrgData'

const severityColor: Record<string, string> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
  critical: 'destructive',
}

const typeIcon: Record<string, React.ElementType> = {
  overtime_risk: TrendingUp,
  staffing_shortage: Users,
  understaffed_shift: ShieldAlert,
  burnout_risk: AlertTriangle,
}

interface ForecastAccuracy {
  rolling_14: { sample_days: number; accuracy_pct: number; hours_mae: number }
  rolling_30: {
    sample_days: number
    accuracy_pct: number
    hours_mae: number
    staff_mae: number
  }
}

interface GenerateForecastResult {
  alerts: AlertRow[]
  ai_error: { status: number; message: string } | null
  forecast_id: string | null
  suppressed_duplicates: number
}

interface UpdateAlertInput {
  id: string
  status: 'acknowledged' | 'resolved' | 'dismissed'
}

interface RosterShiftRow {
  id: string
  auth0_user_id: string
  end_at: string
  member_name: string | null
  site_id: string | null
  site_name: string | null
  start_at: string
  status: 'scheduled' | 'cancelled'
}

interface RosterMember {
  auth0_user_id: string
  full_name: string
  status: string
}

const Forecasting = () => {
  const { organization, user } = useAuth()
  const qc = useQueryClient()
  const { apiFetch } = useOrgApi()
  const { canUseFullForecasting: enabled, plan } = useForecastingAccess()
  const maxHorizon = enabled ? 30 : 7
  const [horizon, setHorizon] = useState(7)
  const [siteId, setSiteId] = useState<string | undefined>()
  const [rosterMemberId, setRosterMemberId] = useState('')
  const [rosterSiteId, setRosterSiteId] = useState('')
  const [rosterStart, setRosterStart] = useState('')
  const [rosterEnd, setRosterEnd] = useState('')
  const canManageRoster = enabled && user?.permissions.includes('write:org_roster_shifts')

  const { data: sites = [] } = useQuery<SiteRow[]>({
    queryKey: ['org_sites'],
    queryFn: () => apiFetch('org-sites'),
  })

  const { data: forecasts = [] } = useQuery<ForecastRow[]>({
    queryKey: ['labour_forecasts', organization?.auth0_org_id, siteId ?? 'all'],
    queryFn: async () => {
      const query = siteId ? `?site_id=${encodeURIComponent(siteId)}` : ''
      const result = await apiFetch<{ forecasts: ForecastRow[] }>(`labour-forecasts${query}`)
      return result.forecasts ?? []
    },
    enabled: enabled && !!organization?.auth0_org_id,
  })

  const { data: alerts = [] } = useQuery<AlertRow[]>({
    queryKey: ['alerts', organization?.auth0_org_id, siteId ?? 'all'],
    queryFn: async () => {
      const query = siteId ? `?site_id=${encodeURIComponent(siteId)}` : ''
      const result = await apiFetch<{ alerts: AlertRow[] }>(`labour-alerts${query}`)
      return result.alerts ?? []
    },
    enabled: enabled && !!organization?.auth0_org_id,
  })

  const { data: accuracy } = useQuery<ForecastAccuracy>({
    queryKey: ['forecast-accuracy', organization?.auth0_org_id, siteId ?? 'all'],
    queryFn: async () => {
      const params = new URLSearchParams({ window: '30' })
      if (siteId) params.set('site_id', siteId)
      return apiFetch<ForecastAccuracy>(`labour-forecasts/accuracy?${params.toString()}`)
    },
    enabled: enabled && !!organization?.auth0_org_id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const rosterWindow = useMemo(() => {
    const from = new Date()
    const to = new Date(from)
    to.setDate(to.getDate() + 31)
    return { from: from.toISOString(), to: to.toISOString() }
  }, [])

  const { data: rosterShifts = [] } = useQuery<RosterShiftRow[]>({
    queryKey: ['org_roster_shifts', organization?.auth0_org_id, siteId ?? 'all', rosterWindow],
    queryFn: async () => {
      const params = new URLSearchParams(rosterWindow)
      if (siteId) params.set('site_id', siteId)
      const result = await apiFetch<{ roster_shifts: RosterShiftRow[] }>(
        `org-roster-shifts?${params.toString()}`
      )
      return result.roster_shifts ?? []
    },
    enabled: enabled && !!organization?.auth0_org_id,
  })

  const { data: rosterMembers = [] } = useQuery<RosterMember[]>({
    queryKey: ['org-members', 'roster'],
    queryFn: async () => {
      const result = await apiFetch<{ members: RosterMember[] }>('org-members')
      return (result.members ?? []).filter((member) => member.status === 'active')
    },
    enabled: !!canManageRoster,
  })

  const regenerate = useMutation<GenerateForecastResult>({
    mutationFn: () =>
      apiFetch<GenerateForecastResult>('labour-forecasts/generate', {
        method: 'POST',
        body: JSON.stringify({
          horizon_days: horizon,
          site_id: siteId,
        }),
      }),
    onSuccess: (data) => {
      const suppressed = data.suppressed_duplicates
      toast.success(
        `Forecast generated · ${data.alerts.length} new alert(s)` +
          (suppressed ? ` · ${suppressed} duplicate(s) suppressed` : '')
      )
      if (data.ai_error) {
        const s = data.ai_error.status
        toast.warning(
          s === 429
            ? 'AI refinement rate-limited — showing the statistical baseline forecast.'
            : s === 402
              ? 'AI credits exhausted — showing the statistical baseline forecast.'
              : 'AI refinement unavailable — showing the statistical baseline forecast.'
        )
      }
      qc.invalidateQueries({ queryKey: ['labour_forecasts'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['forecast-accuracy'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Forecast failed'),
  })

  const updateAlert = useMutation<{ alert: AlertRow }, Error, UpdateAlertInput>({
    mutationFn: ({ id, status }) =>
      apiFetch<{ alert: AlertRow }>(`labour-alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: status as AlertStatus }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const createRosterShift = useMutation({
    mutationFn: async () => {
      const startAt = new Date(rosterStart)
      const endAt = new Date(rosterEnd)
      if (!rosterMemberId || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        throw new Error('Choose an employee, start time, and end time.')
      }
      if (endAt <= startAt) throw new Error('End time must be after start time.')
      return apiFetch<{ roster_shift: RosterShiftRow }>('org-roster-shifts', {
        method: 'POST',
        body: JSON.stringify({
          auth0_user_id: rosterMemberId,
          site_id: rosterSiteId || null,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
        }),
      })
    },
    onSuccess: () => {
      setRosterMemberId('')
      setRosterSiteId('')
      setRosterStart('')
      setRosterEnd('')
      toast.success('Roster assignment scheduled')
      qc.invalidateQueries({ queryKey: ['org_roster_shifts'] })
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not schedule shift'),
  })

  const cancelRosterShift = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ roster_shift: RosterShiftRow }>(`org-roster-shifts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      }),
    onSuccess: () => {
      toast.success('Roster assignment cancelled')
      qc.invalidateQueries({ queryKey: ['org_roster_shifts'] })
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not cancel shift'),
  })

  const chartData = useMemo(() => {
    return (forecasts ?? []).map((f) => {
      const summary = (f.input_summary ?? {}) as { p10?: number; p90?: number }
      const hours = Number(f.predicted_hours ?? 0)
      const p10 = Number(summary.p10 ?? hours)
      const p90 = Number(summary.p90 ?? hours)
      return {
        date: format(parseISO(f.forecast_date), 'd MMM'),
        staff: f.predicted_required_staff ?? 0,
        hours,
        demand: Number(f.demand_score ?? 0),
        p10,
        band: Math.max(p90 - p10, 0),
      }
    })
  }, [forecasts])

  const modelLabel = useMemo(() => {
    const m = forecasts?.[0]?.model
    if (!m) return null
    return m.startsWith('ai-refined') ? 'AI-refined' : 'Statistical baseline'
  }, [forecasts])

  const alertCounts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const a of alerts ?? [])
      c[a.severity as keyof typeof c] = (c[a.severity as keyof typeof c] ?? 0) + 1
    return c
  }, [alerts])

  return (
    <div className="forecasting">
      <div className="forecasting__header ">
        <div className="forecasting__heading">
          <h1 className="forecasting__title">
            <Brain className="forecasting__title-icon " /> Predictive Forecasting
          </h1>
          <p className="forecasting__subtitle">
            AI-driven staffing predictions and risk alerts · Plan:{' '}
            <span className="forecasting__plan font-medium capitalize">{plan || 'starter'}</span>
            {!enabled && ' · Upgrade to Pro for forecasting'}
          </p>
        </div>
        <div className="forecasting__controls">
          <Select
            value={siteId ?? 'all'}
            onValueChange={(v) => setSiteId(v && v !== 'all' ? v : undefined)}
          >
            <SelectTrigger className="forecasting__site-filter w-44">
              <SelectValue placeholder="All sites" />
            </SelectTrigger>
            <SelectContent className="forecasting__site-filter-menu">
              <SelectItem className="forecasting__site-option" value="all">
                All sites
              </SelectItem>
              {(sites ?? []).map((s) => (
                <SelectItem className="forecasting__site-option" key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
            <SelectTrigger className="forecasting__horizon-filter w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="forecasting__horizon-filter-menu">
              {[3, 7, 14, 21, 30]
                .filter((n) => n <= maxHorizon)
                .map((n) => (
                  <SelectItem className="forecasting__horizon-option" key={n} value={String(n)}>
                    {n} days
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            className="forecasting__generate-button"
            onClick={() => regenerate.mutate()}
            disabled={!enabled || regenerate.isPending}
          >
            {regenerate.isPending ? (
              <Loader2 className="forecasting__generate-icon h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="forecasting__generate-icon h-4 w-4 mr-1" />
            )}
            Generate forecast
          </Button>
        </div>
      </div>

      <div className="forecasting__alert-summary grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['critical', 'high', 'medium', 'low'] as const).map((sev) => (
          <Card key={sev} className={`forecasting__alert-count forecasting__alert-count--${sev}`}>
            <CardContent className="forecasting__alert-count-content pt-6">
              <div className="forecasting__alert-severity text-xs uppercase text-muted-foreground">
                {sev}
              </div>
              <div className="forecasting__alert-total text-3xl font-bold mt-1">
                {alertCounts[sev]}
              </div>
              <div className="forecasting__alert-label text-xs text-muted-foreground">
                alerts open
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs className="forecasting__tabs" defaultValue="forecast">
        <TabsList className="forecasting__tab-list" variant="line">
          <TabsTrigger className="forecasting__tab-trigger" value="forecast">
            Demand forecast
          </TabsTrigger>
          <TabsTrigger className="forecasting__tab-trigger" value="alerts">
            Alerts ({alerts?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger className="forecasting__tab-trigger" value="roster">
            Roster ({rosterShifts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="forecasting__tab-content mt-4 space-y-4">
          <Card className="forecasting__chart-card">
            <CardHeader className="forecasting__chart-header flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="forecasting__chart-title">
                Predicted required staff &amp; hours
              </CardTitle>
              <div className="forecasting__chart-badges flex items-center gap-2">
                {modelLabel && (
                  <Badge className="forecasting__model-badge" variant="outline">
                    {modelLabel}
                  </Badge>
                )}
                {accuracy?.rolling_30?.sample_days ? (
                  <Badge className="forecasting__accuracy-badge" variant="secondary">
                    {accuracy.rolling_30.accuracy_pct}% accurate (30d)
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="forecasting__chart-content">
              {chartData.length === 0 ? (
                <p className="forecasting__empty-chart text-sm text-muted-foreground py-12 text-center">
                  No forecast yet. Click{' '}
                  <strong className="forecasting__empty-chart-action">Generate forecast</strong> to
                  run the model against your last 8 weeks of attendance.
                </p>
              ) : (
                <ResponsiveContainer className="forecasting__chart" width="100%" height={320}>
                  <AreaChart className="forecasting__area-chart" data={chartData}>
                    <defs className="forecasting__chart-definitions">
                      <linearGradient
                        className="forecasting__staff-gradient"
                        id="staffFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          className="forecasting__staff-gradient-start"
                          offset="0%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.4}
                        />
                        <stop
                          className="forecasting__staff-gradient-end"
                          offset="100%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      className="forecasting__chart-grid"
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      className="forecasting__chart-axis forecasting__chart-axis--x"
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      className="forecasting__chart-axis forecasting__chart-axis--y"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Legend className="forecasting__chart-legend" />
                    {/* p10–p90 confidence band, drawn as a transparent base + visible band */}
                    <Area
                      className="forecasting__chart-area forecasting__chart-area--lower-bound"
                      type="monotone"
                      dataKey="p10"
                      stackId="band"
                      stroke="none"
                      fill="transparent"
                      legendType="none"
                      name="p10"
                    />
                    <Area
                      className="forecasting__chart-area forecasting__chart-area--confidence-band"
                      type="monotone"
                      dataKey="band"
                      stackId="band"
                      stroke="none"
                      fill="hsl(var(--muted-foreground))"
                      fillOpacity={0.15}
                      name="Confidence band (p10–p90)"
                    />
                    <Area
                      className="forecasting__chart-area forecasting__chart-area--staff"
                      type="monotone"
                      dataKey="staff"
                      name="Required staff"
                      stroke="hsl(var(--primary))"
                      fill="url(#staffFill)"
                    />
                    <Area
                      className="forecasting__chart-area forecasting__chart-area--hours"
                      type="monotone"
                      dataKey="hours"
                      name="Predicted hours"
                      stroke="hsl(var(--secondary))"
                      fill="hsl(var(--secondary))"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="forecasting__insights grid gap-4 md:grid-cols-2">
            {forecasts && forecasts.length > 0 && forecasts[0].reasoning && (
              <Card className="forecasting__reasoning-card">
                <CardHeader className="forecasting__reasoning-header">
                  <CardTitle className="forecasting__reasoning-title text-base">
                    Model reasoning
                  </CardTitle>
                </CardHeader>
                <CardContent className="forecasting__reasoning-content">
                  <p className="forecasting__reasoning-text text-sm text-muted-foreground whitespace-pre-line">
                    {forecasts[0].reasoning}
                  </p>
                  {forecasts[0].confidence != null && (
                    <p className="forecasting__confidence text-xs mt-2">
                      Confidence:{' '}
                      <span className="forecasting__confidence-value font-medium">
                        {Math.round(Number(forecasts[0].confidence) * 100)}%
                      </span>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="forecasting__accuracy-card">
              <CardHeader className="forecasting__accuracy-header">
                <CardTitle className="forecasting__accuracy-title text-base flex items-center gap-2">
                  <Gauge className="forecasting__accuracy-icon h-4 w-4" /> Model accuracy (backtest)
                </CardTitle>
              </CardHeader>
              <CardContent className="forecasting__accuracy-content">
                {!accuracy || accuracy.rolling_30.sample_days === 0 ? (
                  <p className="forecasting__accuracy-empty text-sm text-muted-foreground">
                    Not enough history yet — accuracy appears once forecasts have been compared
                    against at least one day of actual attendance.
                  </p>
                ) : (
                  <div className="forecasting__accuracy-metrics grid grid-cols-2 gap-4 text-sm">
                    <div className="forecasting__accuracy-metric">
                      <div className="forecasting__accuracy-period text-xs uppercase text-muted-foreground">
                        Last 14 days
                      </div>
                      <div className="forecasting__accuracy-value text-2xl font-bold">
                        {accuracy.rolling_14.accuracy_pct}%
                      </div>
                      <div className="forecasting__accuracy-detail text-xs text-muted-foreground">
                        {accuracy.rolling_14.sample_days} day(s) scored
                      </div>
                    </div>
                    <div className="forecasting__accuracy-metric">
                      <div className="forecasting__accuracy-period text-xs uppercase text-muted-foreground">
                        Last 30 days
                      </div>
                      <div className="forecasting__accuracy-value text-2xl font-bold">
                        {accuracy.rolling_30.accuracy_pct}%
                      </div>
                      <div className="forecasting__accuracy-detail text-xs text-muted-foreground">
                        MAE {accuracy.rolling_30.hours_mae}h · staff ±
                        {accuracy.rolling_30.staff_mae}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="forecasting__tab-content mt-4 space-y-3">
          {(alerts ?? []).length === 0 && (
            <Card className="forecasting__empty-alerts-card">
              <CardContent className="forecasting__empty-alerts py-12 text-center text-sm text-muted-foreground">
                No open alerts. Generate a forecast to detect risks.
              </CardContent>
            </Card>
          )}
          {(alerts ?? []).map((a) => {
            const Icon = typeIcon[a.alert_type] ?? AlertTriangle
            return (
              <Card
                key={a.id}
                className={`forecasting__alert forecasting__alert--${a.severity} border-l-4`}
                style={{
                  borderLeftColor:
                    a.severity === 'critical' || a.severity === 'high'
                      ? 'hsl(var(--destructive))'
                      : 'hsl(var(--primary))',
                }}
              >
                <CardContent className="forecasting__alert-content pt-4">
                  <div className="forecasting__alert-layout flex items-start justify-between gap-4">
                    <div className="forecasting__alert-main flex gap-3 flex-1">
                      <Icon className="forecasting__alert-icon h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="forecasting__alert-details flex-1 min-w-0">
                        <div className="forecasting__alert-heading flex items-center gap-2 flex-wrap">
                          <h3 className="forecasting__alert-title font-semibold">{a.title}</h3>
                          <Badge
                            className="forecasting__alert-severity-badge"
                            variant={severityColor[a.severity] as any}
                          >
                            {a.severity}
                          </Badge>
                          <Badge className="forecasting__alert-type" variant="outline">
                            {a.alert_type.replace(/_/g, ' ')}
                          </Badge>
                          {a.status === 'acknowledged' && (
                            <Badge className="forecasting__alert-status" variant="secondary">
                              acknowledged
                            </Badge>
                          )}
                        </div>
                        <p className="forecasting__alert-description text-sm text-muted-foreground mt-1">
                          {a.detail}
                        </p>
                        {a.recommended_action && (
                          <p className="forecasting__alert-recommendation text-sm mt-2">
                            <span className="forecasting__alert-recommendation-label font-medium">
                              Recommended:
                            </span>{' '}
                            {a.recommended_action}
                          </p>
                        )}
                        <div className="forecasting__alert-meta text-xs text-muted-foreground mt-2 flex gap-3 flex-wrap">
                          {a.target_date && (
                            <span className="forecasting__alert-target">
                              Target: {format(parseISO(a.target_date), 'd MMM yyyy')}
                            </span>
                          )}
                          {(a as any).sites?.name && (
                            <span className="forecasting__alert-site">
                              Site: {(a as any).sites.name}
                            </span>
                          )}
                          {(a as any).profiles?.full_name && (
                            <span className="forecasting__alert-employee">
                              Employee: {(a as any).profiles.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="forecasting__alert-actions flex flex-col gap-1">
                      {a.status === 'open' && (
                        <Button
                          className="forecasting__alert-action forecasting__alert-action--acknowledge"
                          size="sm"
                          variant="outline"
                          onClick={() => updateAlert.mutate({ id: a.id, status: 'acknowledged' })}
                        >
                          Acknowledge
                        </Button>
                      )}
                      <Button
                        className="forecasting__alert-action forecasting__alert-action--resolve"
                        size="sm"
                        variant="outline"
                        onClick={() => updateAlert.mutate({ id: a.id, status: 'resolved' })}
                      >
                        Resolve
                      </Button>
                      <Button
                        className="forecasting__alert-action forecasting__alert-action--dismiss"
                        size="sm"
                        variant="ghost"
                        onClick={() => updateAlert.mutate({ id: a.id, status: 'dismissed' })}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="roster" className="forecasting__tab-content mt-4 space-y-4">
          {canManageRoster && (
            <Card className="forecasting__roster-form-card">
              <CardHeader className="forecasting__roster-form-header">
                <CardTitle className="forecasting__roster-form-title text-base">
                  Schedule roster assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="forecasting__roster-form-content">
                <div className="forecasting__roster-fields grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Select
                    value={rosterMemberId}
                    onValueChange={(value) => setRosterMemberId(value ?? '')}
                  >
                    <SelectTrigger className="forecasting__roster-member-select">
                      <SelectValue placeholder="Employee" />
                    </SelectTrigger>
                    <SelectContent className="forecasting__roster-member-menu">
                      {rosterMembers.map((member) => (
                        <SelectItem
                          className="forecasting__roster-member-option"
                          key={member.auth0_user_id}
                          value={member.auth0_user_id}
                        >
                          {member.full_name || member.auth0_user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={rosterSiteId || 'unassigned'}
                    onValueChange={(value) =>
                      setRosterSiteId(value === 'unassigned' || !value ? '' : value)
                    }
                  >
                    <SelectTrigger className="forecasting__roster-site-select">
                      <SelectValue placeholder="Site" />
                    </SelectTrigger>
                    <SelectContent className="forecasting__roster-site-menu">
                      <SelectItem className="forecasting__roster-site-option" value="unassigned">
                        No site
                      </SelectItem>
                      {sites.map((site) => (
                        <SelectItem
                          className="forecasting__roster-site-option"
                          key={site.id}
                          value={site.id}
                        >
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label="Shift start"
                    className="forecasting__roster-start"
                    type="datetime-local"
                    value={rosterStart}
                    onChange={(event) => setRosterStart(event.target.value)}
                  />
                  <Input
                    aria-label="Shift end"
                    className="forecasting__roster-end"
                    type="datetime-local"
                    value={rosterEnd}
                    onChange={(event) => setRosterEnd(event.target.value)}
                  />
                </div>
                <div className="forecasting__roster-submit mt-3 flex justify-end">
                  <Button
                    className="forecasting__roster-submit-button"
                    onClick={() => createRosterShift.mutate()}
                    disabled={createRosterShift.isPending}
                  >
                    Schedule assignment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {rosterShifts.length === 0 ? (
            <Card className="forecasting__empty-roster-card">
              <CardContent className="forecasting__empty-roster py-12 text-center text-sm text-muted-foreground">
                No roster assignments in the next 31 days.
              </CardContent>
            </Card>
          ) : (
            <Card className="forecasting__roster-card">
              <CardHeader className="forecasting__roster-header">
                <CardTitle className="forecasting__roster-title text-base">
                  Upcoming assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="forecasting__roster-list space-y-2">
                {rosterShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="forecasting__roster-shift flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-0"
                  >
                    <div className="forecasting__roster-shift-details">
                      <div className="forecasting__roster-member font-medium">
                        {shift.member_name ?? shift.auth0_user_id}
                      </div>
                      <div className="forecasting__roster-schedule text-sm text-muted-foreground">
                        {format(parseISO(shift.start_at), 'd MMM, HH:mm')} -{' '}
                        {format(parseISO(shift.end_at), 'HH:mm')}
                        {shift.site_name ? ` · ${shift.site_name}` : ''}
                      </div>
                    </div>
                    <div className="forecasting__roster-shift-actions flex items-center gap-2">
                      <Badge
                        className={`forecasting__roster-status forecasting__roster-status--${shift.status}`}
                        variant={shift.status === 'scheduled' ? 'secondary' : 'outline'}
                      >
                        {shift.status}
                      </Badge>
                      {canManageRoster && shift.status === 'scheduled' && (
                        <Button
                          className="forecasting__roster-cancel"
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelRosterShift.mutate(shift.id)}
                          disabled={cancelRosterShift.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Forecasting
