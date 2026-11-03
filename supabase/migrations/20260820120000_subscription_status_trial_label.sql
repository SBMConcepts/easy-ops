-- Some environments pre-created subscription_status with 'trialing'; the app and schema use 'trial'.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'subscription_status'
      AND e.enumlabel = 'trialing'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'subscription_status'
      AND e.enumlabel = 'trial'
  ) THEN
    ALTER TYPE public.subscription_status RENAME VALUE 'trialing' TO 'trial';
  END IF;
END
$$;
