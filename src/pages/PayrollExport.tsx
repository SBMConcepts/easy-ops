import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Download, FileSpreadsheet, Lock, Calculator } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { usePayrollAccess } from '../lib/feature-flags'
import {
  useGeneratePayroll,
  usePayrollRuns,
  type PayrollExportResult,
  type PayrollFormat,
} from '../hooks/usePayroll'

import '../styles/onboarding.css'
import '../styles/payroll.css'

const FORMAT_OPTIONS: { value: PayrollFormat; label: string }[] = [
  { value: 'full', label: 'Full register (CSV)' },
  { value: 'sage', label: 'Sage Pastel Payroll' },
  { value: 'xero', label: 'Xero Payroll' },
  { value: 'payspace', label: 'PaySpace' },
  { value: 'sars_emp201', label: 'SARS EMP201 summary' },
]

function firstOfMonth(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatRand(value: number): string {
  return `R ${Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Payroll Export Pro page: generate a payroll register/export for a pay period, gated by plan tier. */
export default function PayrollExport() {
  const { canUsePayrollExport, plan } = usePayrollAccess()

  const [periodStart, setPeriodStart] = useState<string>(firstOfMonth())
  const [periodEnd, setPeriodEnd] = useState<string>(today())
  const [format, setFormat] = useState<PayrollFormat>('full')
  const [result, setResult] = useState<PayrollExportResult | null>(null)

  const generate = useGeneratePayroll()
  const runsQuery = usePayrollRuns()

  const periodValid = useMemo(
    () => !!periodStart && !!periodEnd && periodStart <= periodEnd,
    [periodStart, periodEnd]
  )

  const handleGenerate = async () => {
    if (!periodValid) {
      toast.error('Select a valid pay period (start on or before end).')
      return
    }
    try {
      const res = await generate.mutateAsync({ periodStart, periodEnd, format })
      setResult(res)
      toast.success(
        res.summary.employee_count > 0
          ? `Payroll computed for ${res.summary.employee_count} employee${
              res.summary.employee_count === 1 ? '' : 's'
            }.`
          : 'No paid attendance found in this period.'
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate payroll export.')
    }
  }

  const handleDownload = (fmt: PayrollFormat) => {
    if (!result) return
    const content = result.formats[fmt]
    if (!content) {
      toast.error('That format is not available.')
      return
    }
    downloadCsv(`payroll_${fmt}_${result.period.start}_${result.period.end}.csv`, content)
  }

  // ── No access ───────────────────────────────────────────────────────────────
  if (!canUsePayrollExport) {
    return (
      <div className="payroll-page">
        <div className="payroll-locked">
          <Lock className="payroll-locked__icon" aria-hidden />
          <h2>Payroll Export Pro</h2>
          <p>
            Payroll export is available on the Business (Pro) and Enterprise plans. Your current
            plan
            {plan ? ` (${plan})` : ''} does not include this feature.
          </p>
          <p className="payroll-muted">
            Upgrade your subscription to generate BCEA-aligned pay registers and one-click exports
            for Sage, Xero, PaySpace and SARS.
          </p>
        </div>
      </div>
    )
  }

  const summary = result?.summary

  return (
    <div className="payroll-page">
      {/* Header */}
      <header className="payroll-header">
        <div>
          <h1 className="payroll-title">
            <FileSpreadsheet aria-hidden /> Payroll Export Pro
          </h1>
          <p className="payroll-subtitle">
            Generate a BCEA-aligned pay register and export to your payroll provider.
          </p>
        </div>
      </header>

      {/* Controls */}
      <section className="payroll-controls">
        <div className="payroll-field">
          <Label htmlFor="period-start">Period start</Label>
          <Input
            id="period-start"
            type="date"
            value={periodStart}
            max={periodEnd}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
        </div>
        <div className="payroll-field">
          <Label htmlFor="period-end">Period end</Label>
          <Input
            id="period-end"
            type="date"
            value={periodEnd}
            min={periodStart}
            max={today()}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </div>
        <div className="payroll-field">
          <Label htmlFor="format">Export format</Label>
          <Select value={format} onValueChange={(v) => setFormat((v as PayrollFormat) ?? 'full')}>
            <SelectTrigger id="format" className="payroll-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="payroll-field payroll-field--action">
          <Button onClick={handleGenerate} disabled={generate.isPending || !periodValid}>
            {generate.isPending ? (
              <Loader2 className="payroll-spin" aria-hidden />
            ) : (
              <Calculator aria-hidden />
            )}
            Generate
          </Button>
          <Button variant="outline" onClick={() => handleDownload(format)} disabled={!result}>
            <Download aria-hidden /> Download
          </Button>
        </div>
      </section>

      <p className="payroll-disclaimer">
        PAYE and UIF values are estimates (annualised SARS 2024/25 brackets; UIF 1% capped at the
        monthly ceiling). Overtime is paid at 1.5×; Sunday hours earn a 2× rate. Verify against your
        payroll provider before submission.
      </p>

      {/* Summary */}
      {summary && (
        <section className="payroll-summary">
          <div className="payroll-card">
            <span className="payroll-card__label">Employees</span>
            <span className="payroll-card__value">{summary.employee_count}</span>
          </div>
          <div className="payroll-card">
            <span className="payroll-card__label">Gross pay</span>
            <span className="payroll-card__value">{formatRand(summary.gross_total)}</span>
          </div>
          <div className="payroll-card">
            <span className="payroll-card__label">PAYE (est.)</span>
            <span className="payroll-card__value">{formatRand(summary.paye_total)}</span>
          </div>
          <div className="payroll-card">
            <span className="payroll-card__label">UIF (est.)</span>
            <span className="payroll-card__value">{formatRand(summary.uif_total)}</span>
          </div>
          <div className="payroll-card payroll-card--accent">
            <span className="payroll-card__label">Net pay</span>
            <span className="payroll-card__value">{formatRand(summary.net_total)}</span>
          </div>
        </section>
      )}

      {/* Register preview */}
      {result && (
        <section className="payroll-register">
          <div className="payroll-register__head">
            <h2 className="payroll-section-title">Register preview</h2>
            <div className="payroll-downloads">
              {FORMAT_OPTIONS.map((f) => (
                <Button
                  key={f.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(f.value)}
                >
                  <Download aria-hidden /> {f.label}
                </Button>
              ))}
            </div>
          </div>

          {result.register.length === 0 ? (
            <div className="payroll-empty">No paid attendance in the selected period.</div>
          ) : (
            <div className="payroll-table-wrap">
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th className="payroll-num">Rate</th>
                    <th className="payroll-num">Ord hrs</th>
                    <th className="payroll-num">OT hrs</th>
                    <th className="payroll-num">Sun hrs</th>
                    <th className="payroll-num">Gross</th>
                    <th className="payroll-num">PAYE</th>
                    <th className="payroll-num">UIF</th>
                    <th className="payroll-num">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {result.register.map((r) => (
                    <tr key={r.auth0_user_id}>
                      <td>
                        <span className="payroll-emp-name">{r.name}</span>
                        <span className="payroll-emp-code">{r.employee_code}</span>
                      </td>
                      <td className="payroll-num">{formatRand(r.hourly_rate)}</td>
                      <td className="payroll-num">{r.ordinary_hours}</td>
                      <td className="payroll-num">{r.overtime_hours}</td>
                      <td className="payroll-num">{r.sunday_hours}</td>
                      <td className="payroll-num">{formatRand(r.gross)}</td>
                      <td className="payroll-num">{formatRand(r.paye)}</td>
                      <td className="payroll-num">{formatRand(r.uif)}</td>
                      <td className="payroll-num payroll-num--strong">{formatRand(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* History */}
      <section className="payroll-history">
        <h2 className="payroll-section-title">Export history</h2>
        {runsQuery.isLoading ? (
          <div className="payroll-empty">
            <Loader2 className="payroll-spin" aria-hidden /> Loading history…
          </div>
        ) : (runsQuery.data?.length ?? 0) === 0 ? (
          <div className="payroll-empty">No exports yet.</div>
        ) : (
          <div className="payroll-table-wrap">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>Run date</th>
                  <th>Period</th>
                  <th>Format</th>
                  <th className="payroll-num">Employees</th>
                  <th className="payroll-num">Gross</th>
                  <th className="payroll-num">Net</th>
                </tr>
              </thead>
              <tbody>
                {runsQuery.data!.map((run) => (
                  <tr key={run.id}>
                    <td>{formatDate(run.created_at)}</td>
                    <td>
                      {formatDate(run.period_start)} – {formatDate(run.period_end)}
                    </td>
                    <td>
                      <span className="payroll-badge">{run.format}</span>
                    </td>
                    <td className="payroll-num">{run.employee_count}</td>
                    <td className="payroll-num">{formatRand(run.gross_total)}</td>
                    <td className="payroll-num">{formatRand(run.net_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
