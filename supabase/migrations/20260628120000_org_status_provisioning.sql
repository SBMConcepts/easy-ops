-- Allow a 'provisioning' organization status.
--
-- Newly created organizations start in 'provisioning' so the admin who created
-- them is gated into the onboarding flow (DashboardRouter / ProtectedRoute)
-- until setup completes, at which point POST /api/onboarding/complete flips the
-- status to 'active'. The previous CHECK constraint only permitted
-- active|suspended|cancelled, which made the onboarding gate unreachable.

ALTER TABLE "public"."organizations"
  DROP CONSTRAINT IF EXISTS "organizations_status_check";

ALTER TABLE "public"."organizations"
  ADD CONSTRAINT "organizations_status_check"
  CHECK (("status" = ANY (ARRAY[
    'provisioning'::"text",
    'active'::"text",
    'suspended'::"text",
    'cancelled'::"text"
  ]))
);
