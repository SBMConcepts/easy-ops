-- Keep provider billing state separate from the legacy subscription_status enum.
-- This lets paid organizations remain pending until a hosted payment method is
-- authorized without weakening the existing trial/active constraints.
ALTER TABLE public.subscriptions
  ADD COLUMN
IF NOT EXISTS billing_state text NOT NULL DEFAULT 'trial'
    CONSTRAINT subscriptions_billing_state_chk CHECK
(
      billing_state IN
(
        'trial',
        'pending_payment_method',
        'active',
        'past_due',
        'cancelled'
      )
    ),
ADD COLUMN
IF NOT EXISTS provider text,
ADD COLUMN
IF NOT EXISTS provider_customer_code text,
ADD COLUMN
IF NOT EXISTS provider_subscription_code text,
ADD COLUMN
IF NOT EXISTS provider_plan_code text,
ADD COLUMN
IF NOT EXISTS provider_reference text,
ADD COLUMN
IF NOT EXISTS trial_started_at timestamptz,
ADD COLUMN
IF NOT EXISTS billing_started_at timestamptz,
ADD COLUMN
IF NOT EXISTS access_ends_at timestamptz,
ADD COLUMN
IF NOT EXISTS cancelled_at timestamptz,
ADD COLUMN
IF NOT EXISTS payment_method_summary jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.subscriptions
SET billing_state = CASE
  WHEN plan = 'trial' THEN 'trial'
  WHEN status = 'trial' THEN 'trial'
  WHEN status = 'active' THEN 'active'
  WHEN status = 'past_due' THEN 'past_due'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'pending_payment_method'
END
WHERE billing_state = 'trial' AND plan <> 'trial';

CREATE UNIQUE INDEX
IF NOT EXISTS subscriptions_provider_subscription_code_key
  ON public.subscriptions
(provider_subscription_code)
  WHERE provider_subscription_code IS NOT NULL;

CREATE UNIQUE INDEX
IF NOT EXISTS subscriptions_provider_reference_key
  ON public.subscriptions
(provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE INDEX
IF NOT EXISTS subscriptions_entitlement_lookup_idx
  ON public.subscriptions
(auth0_org_id, billing_state, access_ends_at DESC);

CREATE TABLE
IF NOT EXISTS public.billing_webhook_events
(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid
(),
  provider text NOT NULL CONSTRAINT billing_webhook_events_provider_chk CHECK
(provider = 'paystack'),
  event_key text NOT NULL,
  event_type text NOT NULL,
  auth0_org_id text,
  provider_reference text,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now
(),
  processed_at timestamptz,
  processing_error text,
  CONSTRAINT billing_webhook_events_event_key_key UNIQUE
(provider, event_key),
  CONSTRAINT billing_webhook_events_org_fkey FOREIGN KEY
(auth0_org_id)
    REFERENCES public.organizations
(auth0_org_id) ON
DELETE
SET NULL
);

CREATE INDEX
IF NOT EXISTS billing_webhook_events_org_received_idx
  ON public.billing_webhook_events
(auth0_org_id, received_at DESC);

ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.billing_webhook_events FROM anon, authenticated;