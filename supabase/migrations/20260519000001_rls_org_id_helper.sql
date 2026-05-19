-- ============================================================
-- auth.org_id() — reads the Auth0 org_id claim from the
-- current request JWT so RLS policies can filter by it.
--
-- Auth0 embeds org_id in the token whenever the user logs in
-- via an organization (subdomain login flow).  Supabase exposes
-- all JWT claims via current_setting('request.jwt.claims').
--
-- Usage in RLS policies:
--   USING (organisation_id IN (
--     SELECT id FROM public.organisations
--     WHERE auth0_org_id = auth.org_id()
--   ))
-- ============================================================

CREATE OR REPLACE FUNCTION auth.org_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT nullif(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'),
    ''
  )
$$;
