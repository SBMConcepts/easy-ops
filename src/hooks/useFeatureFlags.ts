import { useQuery } from '@tanstack/react-query'
import { supabasePublic } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export type FeatureKey =
  | 'smart_scheduling'
  | 'forecasting'
  | 'forecasting_limited'
  | 'payroll_export_pro'
  | 'priority_support'
  | 'premium_support'
  | 'safety_ops'

export type SubscriptionPlan = 'starter' | 'growth' | 'pro' | 'enterprise'

interface SubscriptionInfo {
  plan: SubscriptionPlan
  status: string
  //features: Set<FeatureKey>
}

export function useSubscription() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['subscription', organization?.auth0_org_id],
    queryFn: async (): Promise<SubscriptionInfo> => {
      if (!organization?.auth0_org_id) return { plan: 'starter', status: 'trialing' }
      const { data: sub } = await supabasePublic
        .from('subscriptions')
        .select('plan, status')
        .eq('auth0_org_id', organization.auth0_org_id)
        .maybeSingle()
      const plan = (sub?.plan ?? 'starter') as SubscriptionPlan
      const { data: features } = await supabasePublic
        .from('subscriptions')
        .select('feature_key')
        .eq('plan', plan)
      return {
        plan,
        status: sub?.status ?? 'trialing',
        //features: new Set((features ?? []).map((f) => f.feature_key as FeatureKey)),
      }
    },
    enabled: !!organization?.auth0_org_id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useFeatureFlag(feature: FeatureKey): boolean {
  const { data } = useSubscription()
  return false
}
