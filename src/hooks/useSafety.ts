import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../contexts/AuthContext'
import { useOrgApi } from './useOrgApi'
import type { Database } from '../integrations/supabase/types'

/** A safety checklist template row. */
export type SafetyTemplate = Database['public']['Tables']['safety_checklist_templates']['Row']
/** A submitted safety checklist response row. */
export type SafetyResponse = Database['public']['Tables']['safety_checklist_responses']['Row']
/** An incident report row. */
export type IncidentReport = Database['public']['Tables']['incident_reports']['Row']

/** Category of a reported incident. */
export type IncidentType = Database['public']['Enums']['incident_type']
/** Severity of a reported incident. */
export type IncidentSeverity = Database['public']['Enums']['incident_severity']
/** Review/lifecycle status of a reported incident. */
export type IncidentStatus = Database['public']['Enums']['incident_status']

/** A single checklist item definition stored in a template's `items` array. */
export interface ChecklistItem {
  key: string
  label: string
  required: boolean
}

/** A staff member's answer to one checklist item. */
export interface ChecklistAnswer {
  key: string
  label: string
  checked: boolean
  note?: string
}

/** A submitted checklist response, enriched with the submitter's display name. */
export interface SafetyResponseListItem extends SafetyResponse {
  user_name: string | null
}

/** An incident row, enriched with reporter/manager display names. */
export interface IncidentListItem extends IncidentReport {
  reporter_name: string | null
  manager_name: string | null
}

/** Input for creating a safety checklist template. */
export interface CreateTemplateInput {
  name: string
  description?: string | null
  items: ChecklistItem[]
  required_at_shift_start?: boolean
  active?: boolean
}

/** Partial update for an existing safety checklist template. */
export interface UpdateTemplateInput {
  id: string
  name?: string
  description?: string | null
  items?: ChecklistItem[]
  required_at_shift_start?: boolean
  active?: boolean
}

/** Input for submitting a completed checklist response. `shift_id`/`site_id` are required by the DB constraint. */
export interface SubmitResponseInput {
  template_id: string
  responses: ChecklistAnswer[]
  passed: boolean
  notes?: string | null
  signature_data: string
  // NOT NULL on safety_checklist_responses — the server 400s without these.
  shift_id: string
  site_id: string
}

/** Input for filing a new safety incident report. */
export interface FileIncidentInput {
  incident_type: IncidentType
  severity: IncidentSeverity
  occurred_at?: string
  description: string
  actions_taken?: string | null
  witnesses?: string | null
  reporter_signature: string
  site_id?: string | null
  department_id?: string | null
}

/** Input for a manager's review of a filed incident (status/severity/notes). */
export interface ReviewIncidentInput {
  id: string
  status?: IncidentStatus
  severity?: IncidentSeverity
  manager_notes?: string | null
  manager_signature?: string
}

export const safetyKeys = {
  all: ['safety'] as const,
  templates: () => [...safetyKeys.all, 'templates'] as const,
  responses: (templateId?: string) =>
    [...safetyKeys.all, 'responses', templateId ?? 'all'] as const,
  incidents: (status?: string) => [...safetyKeys.all, 'incidents', status ?? 'all'] as const,
  incident: (id: string) => [...safetyKeys.all, 'incident', id] as const,
}

// ── Checklist templates ──────────────────────────────────────────────────────
/** Fetch the org's safety checklist templates. */
export function useSafetyTemplates(activeOnly = false) {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()

  return useQuery({
    queryKey: safetyKeys.templates(),
    queryFn: async () => {
      const qs = activeOnly ? '?active=1' : ''
      const res = await apiFetch<{ templates: SafetyTemplate[] }>(`safety/templates${qs}`)
      return res.templates ?? []
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

/** Create a safety checklist template. */
export function useCreateTemplate() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTemplateInput) =>
      apiFetch<{ template: SafetyTemplate }>('safety/templates', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: safetyKeys.templates() })
    },
  })
}

/** Update a safety checklist template. */
export function useUpdateTemplate() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...rest }: UpdateTemplateInput) =>
      apiFetch<{ template: SafetyTemplate }>(`safety/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(rest),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: safetyKeys.templates() })
    },
  })
}

/** Delete a safety checklist template. */
export function useDeleteTemplate() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiFetch<null>(`safety/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: safetyKeys.all })
    },
  })
}

// ── Checklist responses ──────────────────────────────────────────────────────
/** Fetch submitted checklist responses, optionally filtered by template. */
export function useSafetyResponses(templateId?: string) {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()

  return useQuery({
    queryKey: safetyKeys.responses(templateId),
    queryFn: async () => {
      const qs = templateId ? `?template_id=${templateId}` : ''
      const res = await apiFetch<{ responses: SafetyResponseListItem[] }>(`safety/responses${qs}`)
      return res.responses ?? []
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  })
}

/** Submit a completed checklist response. */
export function useSubmitResponse() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SubmitResponseInput) =>
      apiFetch<{ response: SafetyResponse }>('safety/responses', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: safetyKeys.all })
    },
  })
}

// ── Incident reports ─────────────────────────────────────────────────────────
/** Fetch incident reports, optionally filtered by status. */
export function useIncidents(status?: IncidentStatus | 'all') {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()
  const effective = !status || status === 'all' ? undefined : status

  return useQuery({
    queryKey: safetyKeys.incidents(effective),
    queryFn: async () => {
      const qs = effective ? `?status=${effective}` : ''
      const res = await apiFetch<{ incidents: IncidentListItem[] }>(`safety/incidents${qs}`)
      return res.incidents ?? []
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  })
}

/** Fetch a single incident report by id. */
export function useIncident(id: string | null) {
  const { apiFetch } = useOrgApi()

  return useQuery({
    queryKey: safetyKeys.incident(id ?? ''),
    queryFn: async () => {
      const res = await apiFetch<{ incident: IncidentReport }>(`safety/incidents/${id}`)
      return res.incident
    },
    enabled: !!id,
    staleTime: 1000 * 15,
  })
}

/** File a new safety incident report. */
export function useFileIncident() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: FileIncidentInput) =>
      apiFetch<{ incident: IncidentReport }>('safety/incidents', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: safetyKeys.all })
    },
  })
}

/** Review (and update the status of) a filed incident. */
export function useReviewIncident() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...rest }: ReviewIncidentInput) =>
      apiFetch<{ incident: IncidentReport }>(`safety/incidents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(rest),
      }),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: safetyKeys.incident(input.id) })
      void queryClient.invalidateQueries({ queryKey: safetyKeys.all })
    },
  })
}
