import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../contexts/AuthContext'
import { useOrgApi } from './useOrgApi'
import type { Database } from '../integrations/supabase/types'

export type PayrollExportRun = Database['public']['Tables']['payroll_export_runs']['Row']

export type PayrollFormat = 'full' | 'sage' | 'xero' | 'payspace' | 'sars_emp201'

export interface PayrollRegisterLine {
  auth0_user_id: string
  employee_code: string
  name: string
  tax_number: string
  hourly_rate: number
  ordinary_hours: number
  overtime_hours: number
  sunday_hours: number
  ordinary_pay: number
  overtime_pay: number
  sunday_pay: number
  gross: number
  paye: number
  uif: number
  net: number
}

export interface PayrollSummary {
  employee_count: number
  gross_total: number
  paye_total: number
  uif_total: number
  net_total: number
  overtime_hours: number
  sunday_hours: number
}

export interface PayrollExportResult {
  period: { start: string; end: string }
  summary: PayrollSummary
  register: PayrollRegisterLine[]
  formats: Record<PayrollFormat, string>
}

export interface GeneratePayrollInput {
  periodStart: string
  periodEnd: string
  format?: PayrollFormat
}

export const payrollKeys = {
  all: ['payroll-export'] as const,
  runs: (limit?: number) => [...payrollKeys.all, 'runs', limit ?? 50] as const,
}

// ── Generate a payroll export (Express → Edge Function) ─────────────────────
export function useGeneratePayroll() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: GeneratePayrollInput) =>
      apiFetch<PayrollExportResult>('payroll-export/generate', {
        method: 'POST',
        body: JSON.stringify({
          period_start: input.periodStart,
          period_end: input.periodEnd,
          format: input.format ?? 'full',
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: payrollKeys.all })
    },
  })
}

// ── Export audit history ────────────────────────────────────────────────────
export function usePayrollRuns(limit = 50) {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()

  return useQuery({
    queryKey: payrollKeys.runs(limit),
    queryFn: async () => {
      const res = await apiFetch<{ runs: PayrollExportRun[] }>(`payroll-export/runs?limit=${limit}`)
      return res.runs ?? []
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}
