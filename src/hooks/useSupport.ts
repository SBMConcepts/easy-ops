import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../contexts/AuthContext'
import { useOrgApi } from './useOrgApi'
import type { Database } from '../integrations/supabase/types'

/** A support ticket row. */
export type SupportTicket = Database['public']['Tables']['support_tickets']['Row']
/** A message posted to a support ticket thread. */
export type SupportMessage = Database['public']['Tables']['support_messages']['Row']
/** The org's assigned Customer Success Manager contact row. */
export type CsmContact = Database['public']['Tables']['csm_assignments']['Row']

/** Lifecycle status of a support ticket. */
export type TicketStatus = Database['public']['Enums']['support_ticket_status']
/** Priority of a support ticket. */
export type TicketPriority = Database['public']['Enums']['support_ticket_priority']
/** Category of a support ticket. */
export type TicketCategory = Database['public']['Enums']['support_ticket_category']

/** A ticket in the list view, enriched with reporter/assignee display names. */
export interface SupportTicketListItem extends SupportTicket {
  reporter_name: string | null
  assignee_name: string | null
}

/** A ticket plus its full message thread. */
export interface TicketDetail {
  ticket: SupportTicket
  messages: SupportMessage[]
}

/** Input for opening a new support ticket. */
export interface CreateTicketInput {
  subject: string
  description?: string
  category?: TicketCategory
  priority?: TicketPriority
}

/** Input for posting a reply to a ticket thread. */
export interface PostReplyInput {
  ticketId: string
  body: string
  isInternal?: boolean
}

/** Partial update for a ticket's status, priority, or assignee. */
export interface UpdateTicketInput {
  ticketId: string
  status?: TicketStatus
  priority?: TicketPriority
  assignedTo?: string | null
}

/** Input for creating or updating the org's CSM contact. */
export interface UpsertCsmInput {
  csm_name: string
  csm_email: string
  csm_phone?: string | null
  csm_title?: string | null
  calendar_url?: string | null
  notes?: string | null
}

export const supportKeys = {
  all: ['support'] as const,
  tickets: (status?: string) => [...supportKeys.all, 'tickets', status ?? 'all'] as const,
  ticket: (id: string) => [...supportKeys.all, 'ticket', id] as const,
  csm: () => [...supportKeys.all, 'csm'] as const,
}

// ── Ticket list ─────────────────────────────────────────────────────────────
/** Fetch the org's support tickets, optionally filtered by status. */
export function useSupportTickets(status?: TicketStatus | 'all') {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()
  const effective = !status || status === 'all' ? undefined : status

  return useQuery({
    queryKey: supportKeys.tickets(effective),
    queryFn: async () => {
      const qs = effective ? `?status=${effective}` : ''
      const res = await apiFetch<{ tickets: SupportTicketListItem[] }>(`support/tickets${qs}`)
      return res.tickets ?? []
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  })
}

// ── Ticket detail (thread) ──────────────────────────────────────────────────
/** Fetch a single ticket with its full message thread. */
export function useSupportTicket(ticketId: string | null) {
  const { apiFetch } = useOrgApi()

  return useQuery({
    queryKey: supportKeys.ticket(ticketId ?? ''),
    queryFn: () => apiFetch<TicketDetail>(`support/tickets/${ticketId}`),
    enabled: !!ticketId,
    staleTime: 1000 * 15,
  })
}

// ── Create a ticket ─────────────────────────────────────────────────────────
/** Open a new support ticket. */
export function useCreateTicket() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTicketInput) =>
      apiFetch<{ ticket: SupportTicket }>('support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: input.subject,
          description: input.description ?? null,
          category: input.category ?? 'general',
          priority: input.priority ?? 'medium',
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.all })
    },
  })
}

// ── Post a reply ────────────────────────────────────────────────────────────
/** Post a reply to a ticket thread. */
export function usePostReply() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PostReplyInput) =>
      apiFetch<{ message: SupportMessage }>(`support/tickets/${input.ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: input.body, is_internal: input.isInternal ?? false }),
      }),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.ticket(input.ticketId) })
      void queryClient.invalidateQueries({ queryKey: supportKeys.all })
    },
  })
}

// ── Update a ticket (status / priority / assignment) ─────────────────────────
/** Update a ticket's status, priority, and/or assignee. */
export function useUpdateTicket() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateTicketInput) =>
      apiFetch<{ ticket: SupportTicket }>(`support/tickets/${input.ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.assignedTo !== undefined ? { assigned_to: input.assignedTo } : {}),
        }),
      }),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.ticket(input.ticketId) })
      void queryClient.invalidateQueries({ queryKey: supportKeys.all })
    },
  })
}

// ── CSM contact ─────────────────────────────────────────────────────────────
/** Fetch the org's assigned CSM contact, if any. */
export function useCsmContact(enabled: boolean) {
  const { apiFetch } = useOrgApi()

  return useQuery({
    queryKey: supportKeys.csm(),
    queryFn: async () => {
      const res = await apiFetch<{ csm: CsmContact | null }>('support/csm')
      return res.csm
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

/** Create or update the org's CSM contact. */
export function useUpsertCsm() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpsertCsmInput) =>
      apiFetch<{ csm: CsmContact }>('support/csm', {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.csm() })
    },
  })
}
