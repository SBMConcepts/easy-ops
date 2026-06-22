-- Resolve the internal tenant UUID from the Auth0 organization id carried in
-- the JWT `org_id` claim. The claim is the Auth0 org id (org_xxxx), NOT a UUID,
-- so the previous `::uuid` cast failed for org-scoped logins. This looks the
-- tenant up by tenants.auth0_org_id, matching server-side resolveTenantId() and
-- the withTenantContext() simulated-claims injection.
CREATE OR REPLACE FUNCTION "public"."current_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT t.id
  FROM public.tenants t
  WHERE t.auth0_org_id = NULLIF(auth.jwt() ->> 'org_id', '')
  LIMIT 1
$$;

ALTER FUNCTION "public"."current_tenant_id"() OWNER TO "postgres";
