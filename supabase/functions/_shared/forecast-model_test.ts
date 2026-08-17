import { assert, assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import {
  addDays,
  applyAiAdjustments,
  buildDailySeries,
  clipOutliers,
  evaluateAccuracy,
  longestConsecutiveRun,
  mad,
  median,
  runForecast,
  seasonalIndices,
  type AttendanceRow,
} from './forecast-model.ts'

const TODAY = '2026-03-01' // Sunday

function syntheticAttendance(days: number, staff: number): AttendanceRow[] {
  const rows: AttendanceRow[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(TODAY, -i)
    const dow = new Date(date + 'T00:00:00Z').getUTCDay()
    const weekend = dow === 0 || dow === 6
    const count = weekend ? Math.max(1, Math.round(staff / 4)) : staff
    for (let s = 0; s < count; s++) {
      rows.push({
        employee_id: `emp-${s}`,
        date,
        hours_worked: 8,
        overtime: 0,
        status: 'present',
        site_id: null,
        full_name: `Emp ${s}`,
      })
    }
  }
  return rows
}

Deno.test('median and mad', () => {
  assertEquals(median([3, 1, 2]), 2)
  assertEquals(median([4, 1, 2, 3]), 2.5)
  assert(mad([10, 10, 10, 10]) === 0)
  assert(mad([1, 2, 3, 100]) > 0)
})

Deno.test('clipOutliers pulls in extreme spikes', () => {
  const values = [8, 8, 9, 8, 7, 8, 200]
  const clipped = clipOutliers(values)
  assert(clipped[6] < 200)
  assertEquals(clipped.slice(0, 6), values.slice(0, 6))
})

Deno.test('buildDailySeries zero-fills missing days', () => {
  const series = buildDailySeries(
    [
      {
        employee_id: 'a',
        date: TODAY,
        hours_worked: 8,
        overtime: 1,
        status: 'present',
        site_id: null,
      },
    ],
    TODAY,
    7
  )
  assertEquals(series.length, 7)
  assertEquals(series[series.length - 1].hours, 8)
  assertEquals(series[0].hours, 0)
})

Deno.test('buildDailySeries excludes absence and leave statuses from headcount', () => {
  const series = buildDailySeries(
    [
      {
        employee_id: 'present',
        date: TODAY,
        hours_worked: 8,
        overtime: 0,
        status: 'present',
        site_id: null,
      },
      {
        employee_id: 'leave',
        date: TODAY,
        hours_worked: 0,
        overtime: 0,
        status: 'leave',
        site_id: null,
      },
      {
        employee_id: 'sick',
        date: TODAY,
        hours_worked: 0,
        overtime: 0,
        status: 'sick_leave',
        site_id: null,
      },
    ],
    TODAY,
    1
  )
  assertEquals(series[0].headcount, 1)
  assertEquals(series[0].absent, 2)
})

Deno.test('seasonalIndices detects a weekly weekend dip', () => {
  const attendance = syntheticAttendance(56, 10)
  const series = buildDailySeries(attendance, TODAY, 56)
  const idx = seasonalIndices(
    series,
    series.map((d) => d.hours)
  )
  const weekend = (idx[0] + idx[6]) / 2
  const midweek = (idx[2] + idx[3] + idx[4]) / 3
  assert(weekend < midweek, `expected weekend ${weekend} < midweek ${midweek}`)
})

Deno.test('runForecast produces one entry per horizon day with an interval', () => {
  const out = runForecast({
    attendance: syntheticAttendance(56, 10),
    planned: [],
    activeStaff: 10,
    today: TODAY,
    horizonDays: 7,
  })
  assertEquals(out.daily.length, 7)
  assertEquals(out.daily[0].date, addDays(TODAY, 1))
  for (const d of out.daily) {
    assert(d.p10 <= d.predicted_hours && d.predicted_hours <= d.p90)
    assert(d.predicted_hours >= 0)
  }
  assert(out.confidence > 0.3 && out.confidence <= 0.95)
  assertEquals(out.model, 'baseline-v1')
})

Deno.test('overtime rule fires above the BCEA cap', () => {
  const rows = syntheticAttendance(28, 5).map((r) =>
    r.employee_id === 'emp-0' ? { ...r, hours_worked: 12, overtime: 3 } : r
  )
  const out = runForecast({
    attendance: rows,
    planned: [],
    activeStaff: 5,
    today: TODAY,
    horizonDays: 7,
    lookbackDays: 28,
  })
  const ot = out.alerts.filter((a) => a.alert_type === 'overtime_risk' && a.employee_id === 'emp-0')
  assert(ot.length > 0, 'expected overtime alert for emp-0')
  assertEquals(ot[0].severity, 'critical')
})

Deno.test('burnout rule fires on consecutive long days', () => {
  assertEquals(longestConsecutiveRun(['2026-02-01', '2026-02-02', '2026-02-03']), 3)
  assertEquals(longestConsecutiveRun(['2026-02-01', '2026-02-03']), 1)

  const rows = syntheticAttendance(28, 4).map((r) =>
    r.employee_id === 'emp-1' ? { ...r, hours_worked: 10 } : r
  )
  const out = runForecast({
    attendance: rows,
    planned: [],
    activeStaff: 4,
    today: TODAY,
    horizonDays: 5,
    lookbackDays: 28,
  })
  assert(out.alerts.some((a) => a.alert_type === 'burnout_risk' && a.employee_id === 'emp-1'))
})

Deno.test('staffing shortage fires when demand exceeds available staff', () => {
  const out = runForecast({
    attendance: syntheticAttendance(28, 12),
    planned: [],
    activeStaff: 3,
    today: TODAY,
    horizonDays: 5,
    lookbackDays: 28,
  })
  assert(out.alerts.some((a) => a.alert_type === 'staffing_shortage'))
})

Deno.test('understaffed shift fires when roster is below p10', () => {
  const tomorrow = addDays(TODAY, 1)
  const out = runForecast({
    attendance: syntheticAttendance(28, 10),
    planned: [
      {
        employee_id: 'emp-0',
        start_at: `${tomorrow}T06:00:00.000Z`,
        end_at: `${tomorrow}T08:00:00.000Z`,
        site_id: null,
      },
    ],
    activeStaff: 10,
    today: TODAY,
    horizonDays: 3,
    lookbackDays: 28,
  })
  assert(
    out.alerts.some((a) => a.alert_type === 'understaffed_shift' && a.target_date === tomorrow)
  )
})

Deno.test('applyAiAdjustments ignores out-of-bound factors', () => {
  const base = runForecast({
    attendance: syntheticAttendance(28, 6),
    planned: [],
    activeStaff: 6,
    today: TODAY,
    horizonDays: 3,
    lookbackDays: 28,
  }).daily

  const { daily, applied } = applyAiAdjustments(base, [
    { date: base[0].date, factor: 1.1 },
    { date: base[1].date, factor: 5 },
    { date: '1999-01-01', factor: 1.1 },
  ])
  assertEquals(applied, 1)
  assertEquals(daily[1].predicted_hours, base[1].predicted_hours)
  assert(daily[0].predicted_hours > base[0].predicted_hours)
})

Deno.test('evaluateAccuracy computes MAPE', () => {
  const res = evaluateAccuracy([
    {
      date: '2026-02-01',
      predicted_hours: 90,
      actual_hours: 100,
      predicted_staff: 10,
      actual_staff: 11,
    },
    {
      date: '2026-02-02',
      predicted_hours: 110,
      actual_hours: 100,
      predicted_staff: 12,
      actual_staff: 11,
    },
  ])
  assertEquals(res.sample_days, 2)
  assertEquals(res.hours_mape, 10)
  assertEquals(res.accuracy_pct, 90)
})
