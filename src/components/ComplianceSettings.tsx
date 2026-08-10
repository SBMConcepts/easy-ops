/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthRole } from '../contexts/AuthContext'
import { useOrgApi } from '../hooks/useOrgApi'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { toast } from 'sonner'
import { Loader2, Save, ShieldAlert } from 'lucide-react'

// Define the validation rules mirroring backend restrictions (e.g., South African BCEA benchmarks)
const complianceSchema = z.object({
  max_ordinary_hours_per_week: z.coerce
    .number()
    .min(1, 'Must be at least 1 hour')
    .max(60, 'Exceeds maximum logical regular work week parameters'),
  max_overtime_hours_per_week: z.coerce
    .number()
    .min(0, 'Overtime cannot be negative')
    .max(30, 'Exceeds standard safe legal limits'),
  lookback_weeks: z.coerce
    .number()
    .min(1, 'Lookback window must be at least 1 week')
    .max(52, 'Lookback history cannot exceed a full calendar year'),
})

type ComplianceFormValues = z.infer<typeof complianceSchema>

const DEFAULT_COMPLIANCE: ComplianceFormValues = {
  max_ordinary_hours_per_week: 45,
  max_overtime_hours_per_week: 10,
  lookback_weeks: 12,
}

// Query key factory — keeps fetch/invalidation in sync.
const complianceKeys = {
  config: ['compliance', 'config'] as const,
}

/** Admin form for editing the org's BCEA compliance thresholds (overtime/ordinary-hours caps, lookback window). */
export const ComplianceSettings = () => {
  const { hasMinRole } = useAuthRole()
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ComplianceFormValues>({
    resolver: zodResolver(complianceSchema),
    defaultValues: DEFAULT_COMPLIANCE,
  })

  // Role Gate Check: Ensure only managers or higher can view or modify compliance thresholds
  const canManageCompliance = hasMinRole('admin') || hasMinRole('owner')

  const { data: config, isLoading: isLoadingSettings } = useQuery({
    queryKey: complianceKeys.config,
    queryFn: () => apiFetch<ComplianceFormValues>('compliance/config'),
    enabled: canManageCompliance,
  })

  // Hydrate the form once the tenant's stored thresholds arrive.
  useEffect(() => {
    if (config) {
      reset({
        max_ordinary_hours_per_week:
          config.max_ordinary_hours_per_week ?? DEFAULT_COMPLIANCE.max_ordinary_hours_per_week,
        max_overtime_hours_per_week:
          config.max_overtime_hours_per_week ?? DEFAULT_COMPLIANCE.max_overtime_hours_per_week,
        lookback_weeks: config.lookback_weeks ?? DEFAULT_COMPLIANCE.lookback_weeks,
      })
    }
  }, [config, reset])

  const saveConfig = useMutation({
    mutationFn: (values: ComplianceFormValues) =>
      apiFetch<ComplianceFormValues>('compliance/config', {
        method: 'PUT',
        body: JSON.stringify(values),
      }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.config })
      toast.success('Labour compliance configurations updated successfully.')
      reset(saved) // reset form state dirty flags
    },
    onError: (err: any) => {
      toast.error(err.message || 'An error occurred while updating configuration attributes.')
    },
  })

  const onSubmit = (values: ComplianceFormValues) => {
    saveConfig.mutate(values)
  }

  if (!canManageCompliance) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/20">
        <ShieldAlert className="h-8 w-8 text-destructive mb-2" />
        <h3 className="text-sm font-semibold">Access Restriction</h3>
        <p className="text-xs text-muted-foreground text-center max-w-sm mt-1">
          You do not possess the administrative privileges required to alter workforce legal
          thresholds. Contact your manager or workspace owner.
        </p>
      </div>
    )
  }

  if (isLoadingSettings) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="settings-card-tab">
      <div className="settings-card-tab__header">
        <h2 className="settings-card-tab__title">Compliance & Labour Benchmarks</h2>
        <p className="settings-card-tab__desc">
          Configure local statutory limits for shift evaluations. Overages dynamically trigger
          dashboard violations.
        </p>
      </div>

      <div className="settings-card-tab__content">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_ordinary_hours_per_week">Max Ordinary Hours / Week</Label>
              <Input
                id="max_ordinary_hours_per_week"
                type="number"
                {...register('max_ordinary_hours_per_week')}
                placeholder="45"
              />
              {errors.max_ordinary_hours_per_week && (
                <p className="text-xs text-destructive">
                  {errors.max_ordinary_hours_per_week.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Standard baseline total before hours scale into calculation metrics as overtime.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_overtime_hours_per_week">Max Allowed Overtime Hours / Week</Label>
              <Input
                id="max_overtime_hours_per_week"
                type="number"
                {...register('max_overtime_hours_per_week')}
                placeholder="10"
              />
              {errors.max_overtime_hours_per_week && (
                <p className="text-xs text-destructive">
                  {errors.max_overtime_hours_per_week.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Maximum legal threshold allowed per individual in standard operational cycles.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="lookback_weeks">Rolling Audit Lookback Scope (Weeks)</Label>
              <Input
                id="lookback_weeks"
                type="number"
                {...register('lookback_weeks')}
                placeholder="12"
              />
              {errors.lookback_weeks && (
                <p className="text-xs text-destructive">{errors.lookback_weeks.message}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                The timeframe historical parameters evaluate across to monitor average rolling
                benchmarks.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saveConfig.isPending || !isDirty} className="gap-2">
              {saveConfig.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Configuration Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
