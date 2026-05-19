-- Add Auth0 Organisation ID to organisations table.
-- Stores the Auth0 Organisation `org_*` identifier so the backend can
-- reference the Auth0 org without an extra Management API lookup.
BEGIN
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS auth0_org_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_organisations_auth0_org_id
  ON public.organisations (auth0_org_id);
END $$;