/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react'
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" /> Predictive Forecasting
          </h1>
          <p className="text-sm text-muted-foreground">
            AI-driven staffing predictions and risk alerts · Plan:{' '}
            <span className="font-medium capitalize">{plan || 'starter'}</span>
            {!enabled && ' · Upgrade to Pro for forecasting'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={siteId ?? 'all'}
            onValueChange={(v) => setSiteId(v && v !== 'all' ? v : undefined)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sites</SelectItem>
              {(sites ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[3, 7, 14, 21, 30]
                .filter((n) => n <= maxHorizon)
                .map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} days
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button onClick={() => regenerate.mutate()} disabled={!enabled || regenerate.isPending}>
            {regenerate.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Generate forecast
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['critical', 'high', 'medium', 'low'] as const).map((sev) => (
          <Card key={sev}>
            <CardContent className="pt-6">
              <div className="text-xs uppercase text-muted-foreground">{sev}</div>
              <div className="text-3xl font-bold mt-1">{alertCounts[sev]}</div>
              <div className="text-xs text-muted-foreground">alerts open</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="forecast">
        <TabsList>
          <TabsTrigger value="forecast">Demand forecast</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="roster">Roster ({rosterShifts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle>Predicted required staff &amp; hours</CardTitle>
              <div className="flex items-center gap-2">
                {modelLabel && <Badge variant="outline">{modelLabel}</Badge>}
                {accuracy?.rolling_30?.sample_days ? (
                  <Badge variant="secondary">
                    {accuracy.rolling_30.accuracy_pct}% accurate (30d)
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  No forecast yet. Click <strong>Generate forecast</strong> to run the model against
                  your last 8 weeks of attendance.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="staffFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Legend />
                    {/* p10–p90 confidence band, drawn as a transparent base + visible band */}
                    <Area
                      type="monotone"
                      dataKey="p10"
                      stackId="band"
                      stroke="none"
                      fill="transparent"
                      legendType="none"
                      name="p10"
                    />
                    <Area
                      type="monotone"
                      dataKey="band"
                      stackId="band"
                      stroke="none"
                      fill="hsl(var(--muted-foreground))"
                      fillOpacity={0.15}
                      name="Confidence band (p10–p90)"
                    />
                    <Area
                      type="monotone"
                      dataKey="staff"
                      name="Required staff"
                      stroke="hsl(var(--primary))"
                      fill="url(#staffFill)"
                    />
                    <Area
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

          <div className="grid gap-4 md:grid-cols-2">
            {forecasts && forecasts.length > 0 && forecasts[0].reasoning && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Model reasoning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {forecasts[0].reasoning}
                  </p>
                  {forecasts[0].confidence != null && (
                    <p className="text-xs mt-2">
                      Confidence:{' '}
                      <span className="font-medium">
                        {Math.round(Number(forecasts[0].confidence) * 100)}%
                      </span>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-4 w-4" /> Model accuracy (backtest)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!accuracy || accuracy.rolling_30.sample_days === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Not enough history yet — accuracy appears once forecasts have been compared
                    against at least one day of actual attendance.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Last 14 days</div>
                      <div className="text-2xl font-bold">{accuracy.rolling_14.accuracy_pct}%</div>
                      <div className="text-xs text-muted-foreground">
                        {accuracy.rolling_14.sample_days} day(s) scored
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Last 30 days</div>
                      <div className="text-2xl font-bold">{accuracy.rolling_30.accuracy_pct}%</div>
                      <div className="text-xs text-muted-foreground">
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

        <TabsContent value="alerts" className="mt-4 space-y-3">
          {(alerts ?? []).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No open alerts. Generate a forecast to detect risks.
              </CardContent>
            </Card>
          )}
          {(alerts ?? []).map((a) => {
            const Icon = typeIcon[a.alert_type] ?? AlertTriangle
            return (
              <Card
                key={a.id}
                className="border-l-4"
                style={{
                  borderLeftColor:
                    a.severity === 'critical' || a.severity === 'high'
                      ? 'hsl(var(--destructive))'
                      : 'hsl(var(--primary))',
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 flex-1">
                      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{a.title}</h3>
                          <Badge variant={severityColor[a.severity] as any}>{a.severity}</Badge>
                          <Badge variant="outline">{a.alert_type.replace(/_/g, ' ')}</Badge>
                          {a.status === 'acknowledged' && (
                            <Badge variant="secondary">acknowledged</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{a.detail}</p>
                        {a.recommended_action && (
                          <p className="text-sm mt-2">
                            <span className="font-medium">Recommended:</span> {a.recommended_action}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground mt-2 flex gap-3 flex-wrap">
                          {a.target_date && (
                            <span>Target: {format(parseISO(a.target_date), 'd MMM yyyy')}</span>
                          )}
                          {(a as any).sites?.name && <span>Site: {(a as any).sites.name}</span>}
                          {(a as any).profiles?.full_name && (
                            <span>Employee: {(a as any).profiles.full_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {a.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAlert.mutate({ id: a.id, status: 'acknowledged' })}
                        >
                          Acknowledge
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAlert.mutate({ id: a.id, status: 'resolved' })}
                      >
                        Resolve
                      </Button>
                      <Button
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

        <TabsContent value="roster" className="mt-4 space-y-4">
          {canManageRoster && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Schedule roster assignment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Select
                    value={rosterMemberId}
                    onValueChange={(value) => setRosterMemberId(value ?? '')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {rosterMembers.map((member) => (
                        <SelectItem key={member.auth0_user_id} value={member.auth0_user_id}>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">No site</SelectItem>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label="Shift start"
                    type="datetime-local"
                    value={rosterStart}
                    onChange={(event) => setRosterStart(event.target.value)}
                  />
                  <Input
                    aria-label="Shift end"
                    type="datetime-local"
                    value={rosterEnd}
                    onChange={(event) => setRosterEnd(event.target.value)}
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
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
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No roster assignments in the next 31 days.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upcoming assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rosterShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-0"
                  >
                    <div>
                      <div className="font-medium">{shift.member_name ?? shift.auth0_user_id}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(shift.start_at), 'd MMM, HH:mm')} -{' '}
                        {format(parseISO(shift.end_at), 'HH:mm')}
                        {shift.site_name ? ` · ${shift.site_name}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={shift.status === 'scheduled' ? 'secondary' : 'outline'}>
                        {shift.status}
                      </Badge>
                      {canManageRoster && shift.status === 'scheduled' && (
                        <Button
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
