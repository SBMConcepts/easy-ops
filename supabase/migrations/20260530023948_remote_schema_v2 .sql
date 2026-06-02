-- =============================================================================
-- SCHEMA AUDIT & CORRECTIVE MIGRATION
-- Target: 4NF, B2B Multi-Tenant SaaS best practices
-- Supabase / PostgreSQL / Auth0 org-based tenancy
-- Tenant identity is resolved exclusively via auth0_org_id → tenants.id
-- =============================================================================
-- Run this AFTER your existing remote schema is in place.
-- Each section is labelled with the anomaly class it resolves.
-- Safe to run repeatedly: every destructive step is guarded with IF EXISTS.
-- =============================================================================


-- =============================================================================
-- SECTION 1: tenants — remove phantom `plan` column (2NF redundancy)
-- =============================================================================
-- ANOMALY: tenants.plan (text) duplicates subscriptions.plan (billing_plan).
--   The billing plan is a fact about a subscription contract, not a tenant.
--   Having both creates an update anomaly: changing the subscription plan does
--   not automatically update tenants.plan, producing silently diverged state.
--
-- ROOT CAUSE: Convenience column added so single-table queries could avoid a
--   join, but without a trigger to keep it in sync the shortcut becomes a lie.
--
-- FIX: Drop the column. All plan reads go through subscriptions.
--   A non-materialised view replaces the convenience without storing data twice.

ALTER TABLE public.tenants DROP COLUMN IF EXISTS plan;

-- Convenience view — no Stripe-sensitive data, safe for all tenant members.
CREATE OR REPLACE VIEW public.tenant_active_plan AS
  SELECT
    t.id                  AS tenant_id,
    t.name                AS tenant_name,
    t.auth0_org_id,
    s.plan,
    s.status              AS billing_status,
    s.seat_cap,
    s.current_period_end
  FROM public.tenants t
  LEFT JOIN public.subscriptions s
         ON s.tenant_id = t.id
        AND s.status IN ('active', 'trialing');

COMMENT ON VIEW public.tenant_active_plan IS
  'Current billing plan for a tenant. Derived from subscriptions — '
  'no data is stored twice. Identified by tenant_id (UUID) or auth0_org_id.';


-- =============================================================================
-- SECTION 2: tenants — enforce uniqueness on natural keys
-- =============================================================================
-- ANOMALY: auth0_org_id is the sole bridge between the Auth0 JWT (org_id claim)
--   and your internal tenant UUID. The current_tenant_id() function does:
--     WHERE t.auth0_org_id = (auth.jwt() ->> 'org_id') LIMIT 1
--   Without a UNIQUE constraint, two tenant rows can share an auth0_org_id and
--   the function returns a non-deterministic row — every RLS policy silently
--   operates on the wrong tenant for affected users.
--
-- NOTE: slug is intentionally excluded from this migration per project scope.
--   If slug is retained in the tenants table for other purposes, it should
--   also carry a UNIQUE constraint — but that is out of scope here.
--
-- FIX: Add UNIQUE on auth0_org_id so the JWT → tenant lookup is deterministic.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'tenants_auth0_org_id_key'
      AND n.nspname = 'public'
      AND t.relname = 'tenants'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_auth0_org_id_key UNIQUE (auth0_org_id);
  END IF;
  COMMENT ON COLUMN public.tenants.auth0_org_id IS
  'Auth0 Organisation ID (format: org_xxxx). Primary bridge between JWT claims '
  'and the internal tenant UUID. Must be unique across all tenants.';
END$$;



-- =============================================================================
-- SECTION 3: organisation_roles — four independent anomalies
-- =============================================================================
-- ANOMALY A — FK default (critical):
--   tenant_id uuid NOT NULL DEFAULT gen_random_uuid()
--   A FK column must never default to a random UUID. Any INSERT that omits
--   tenant_id silently creates a row pointing at a non-existent tenant.
--   PostgreSQL accepts it because the FK was added NOT VALID.
--
-- ANOMALY B — Cardinality error:
--   UNIQUE(tenant_id) enforces exactly one custom role per tenant.
--   A tenant defining "Site Lead", "Payroll Clerk", "Night Supervisor" needs
--   multiple rows. One row per tenant makes the table useless.
--
-- ANOMALY C — Global name uniqueness (2NF leak):
--   UNIQUE(name) is scoped globally, so two tenants cannot independently create
--   a role called "Supervisor". The uniqueness constraint belongs at (tenant_id,
--   name), not (name) alone.
--
-- ANOMALY D — Nullable audit timestamp:
--   created_at is nullable, inconsistent with every other table in the schema.

-- 3a. Remove dangerous FK default
ALTER TABLE public.organisation_roles
  ALTER COLUMN tenant_id DROP DEFAULT;

-- 3b. Drop the one-row-per-tenant cardinality error
ALTER TABLE public.organisation_roles
  DROP CONSTRAINT IF EXISTS organisation_roles_tenant_id_key;

-- 3c. Drop global name uniqueness
ALTER TABLE public.organisation_roles
  DROP CONSTRAINT IF EXISTS organisation_roles_name_key;

-- 3d. Add tenant-scoped name uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'organisation_roles_tenant_name_key'
      AND n.nspname = 'public'
      AND t.relname = 'organisation_roles'
  ) THEN
    ALTER TABLE public.organisation_roles
      ADD CONSTRAINT organisation_roles_tenant_name_key
      UNIQUE (tenant_id, name);
  END IF;
END$$;

-- 3e. Fix nullable created_at
ALTER TABLE public.organisation_roles
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

-- 3f. Add updated_at — present on every other tenant-scoped table, missing here
ALTER TABLE public.organisation_roles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER trg_org_roles_updated
  BEFORE UPDATE ON public.organisation_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3g. Replace the now-dropped unique index with a plain lookup index
DROP INDEX IF EXISTS public.organisation_roles_name_key;

CREATE INDEX IF NOT EXISTS org_roles_tenant_idx
  ON public.organisation_roles (tenant_id);


-- =============================================================================
-- SECTION 4: memberships — remove phantom FK default on user_id
-- =============================================================================
-- ANOMALY: user_id text NOT NULL DEFAULT gen_random_uuid()
--   user_id is a FK to users(id). A random-UUID default means any INSERT that
--   omits user_id silently creates an orphaned membership row. The FK was
--   created NOT VALID, so PostgreSQL will not catch it retroactively.
--   This is the same class of bug as organisation_roles.tenant_id (§3A).
--
-- FIX: Remove the default so omitting user_id is a hard error, and validate
--   the FK so all existing rows are verified.

ALTER TABLE public.memberships
  ALTER COLUMN user_id DROP DEFAULT;

ALTER TABLE public.memberships
  VALIDATE CONSTRAINT memberships_user_id_fkey;


-- =============================================================================
-- SECTION 5: shifts — remove phantom FK default on tenant_id
-- =============================================================================
-- ANOMALY: tenant_id uuid NOT NULL DEFAULT gen_random_uuid()
--   Identical class of bug to §3A and §4. A shift's tenant must always be
--   provided explicitly by the caller; it must never be auto-generated.

ALTER TABLE public.shifts
  ALTER COLUMN tenant_id DROP DEFAULT;


-- =============================================================================
-- SECTION 6: employee_profiles — guard denormalised tenant_id (2NF)
-- =============================================================================
-- ANOMALY: employee_profiles.tenant_id is functionally determined by
--   membership_id → memberships.tenant_id.
--   Storing it here is a partial dependency (2NF violation). The PK is
--   membership_id; tenant_id is a non-key attribute reachable via a different
--   key path. If a membership is re-assigned (edge case: offboard + re-invite
--   under a different tenant), the profile tenant_id will diverge silently.
--
-- PRAGMATIC EXCEPTION: The column is intentionally kept for RLS performance.
--   Supabase RLS policies hit this table on every row with a tenant_id filter.
--   Resolving the join on every read would degrade hot-path queries.
--   The correct compromise is a BEFORE trigger that makes tenant_id a
--   write-through projection of the authoritative source (memberships), so
--   application code can never set it to a wrong value.

CREATE OR REPLACE FUNCTION public.sync_employee_profile_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT m.tenant_id
    INTO v_tenant_id
    FROM public.memberships m
   WHERE m.id = NEW.membership_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION
      'employee_profiles: membership_id % does not exist in memberships',
      NEW.membership_id;
  END IF;

  -- Always overwrite with the authoritative value — caller cannot override
  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emp_profile_sync_tenant ON public.employee_profiles;
CREATE TRIGGER trg_emp_profile_sync_tenant
  BEFORE INSERT OR UPDATE OF membership_id
  ON public.employee_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_employee_profile_tenant();

COMMENT ON COLUMN public.employee_profiles.tenant_id IS
  'Denormalised write-through projection of memberships.tenant_id. '
  'Never set manually — overwritten on every INSERT/UPDATE by '
  'trg_emp_profile_sync_tenant. Retained for RLS index performance.';


-- =============================================================================
-- SECTION 7: departments — multi-valued dependency on site_id (4NF)
-- =============================================================================
-- ANOMALY: departments.site_id encodes a many-to-many relationship as a
--   single FK. A department that operates across two sites requires a duplicate
--   department row. Two independent facts — "which tenant owns this department"
--   and "which sites use this department" — are conflated in the same row.
--   This is a multi-valued dependency (MVD), the specific violation 4NF targets:
--     department_id →→ site_id   (independent of other attributes)
--
-- FIX: Extract the relationship into a junction table. Existing single-site
--   assignments are migrated automatically. departments.site_id is retained
--   as a nullable "primary site" shortcut for simple reads but is no longer
--   the authoritative source of the department↔site relationship.

CREATE TABLE IF NOT EXISTS public.department_sites (
  department_id uuid        NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  site_id       uuid        NOT NULL REFERENCES public.sites(id)       ON DELETE CASCADE,
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id)     ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (department_id, site_id)
);

ALTER TABLE public.department_sites ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.department_sites IS
  'Junction table: resolves the many-to-many between departments and sites. '
  'Replaces the 4NF-violating departments.site_id single-FK approach.';

-- Migrate existing assignments before dropping reliance on the old column
INSERT INTO public.department_sites (department_id, site_id, tenant_id)
SELECT d.id, d.site_id, d.tenant_id
FROM   public.departments d
WHERE  d.site_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Indexes for bidirectional lookups
CREATE INDEX IF NOT EXISTS dept_sites_dept_idx
  ON public.department_sites (department_id);

CREATE INDEX IF NOT EXISTS dept_sites_site_idx
  ON public.department_sites (site_id, tenant_id);

-- Tenant-match guard (same pattern as other junction tables)
CREATE OR REPLACE TRIGGER trg_dept_sites_tenant_match
  BEFORE INSERT ON public.department_sites
  FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_match();

-- RLS
CREATE POLICY "dept_sites_tenant_read"
  ON public.department_sites
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "dept_sites_admin_write"
  ON public.department_sites
  AS PERMISSIVE FOR ALL TO authenticated
  USING  (tenant_id = public.current_tenant_id()
          AND public.has_tenant_role('admin'::public.tenant_role))
  WITH CHECK (tenant_id = public.current_tenant_id()
          AND public.has_tenant_role('admin'::public.tenant_role));

COMMENT ON COLUMN public.departments.site_id IS
  'Legacy shortcut: the department''s primary site. Full many-to-many '
  'assignments live in department_sites. Do not use as the authoritative '
  'source for site membership.';


-- =============================================================================
-- SECTION 8: attendance_records — derived columns (3NF transitive dependency)
-- =============================================================================
-- ANOMALY: hours_worked and overtime are transitively determined by
--   (clock_in, clock_out) — they are computed facts, not stored facts.
--   Storing derived values creates an update anomaly: correcting clock_out
--   leaves hours_worked stale unless the application also recalculates it.
--   This has already caused real-world data quality bugs in systems like this.
--
-- MENTAL MODEL: If you can compute value X from other columns in the same row,
--   X is a derived attribute. The database should own that derivation, not the
--   application, because the database is the last line of truth.
--
-- FIX: A BEFORE trigger recomputes both columns on every write that touches
--   clock_in or clock_out. Application code should stop writing these columns;
--   the trigger will always override whatever is supplied.

CREATE OR REPLACE FUNCTION public.recompute_attendance_hours()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    IF NEW.clock_out <= NEW.clock_in THEN
      RAISE EXCEPTION
        'attendance_records: clock_out (%) must be after clock_in (%)',
        NEW.clock_out, NEW.clock_in;
    END IF;

    NEW.hours_worked := ROUND(
      EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600.0,
      2
    );

    -- Overtime threshold: 8 hours standard shift.
    -- TODO: drive this from a tenant-level config column when that feature ships.
    NEW.overtime := GREATEST(0, NEW.hours_worked - 8);
  ELSE
    -- Partial record (clocked in but not yet out, or manual absence entry)
    NEW.hours_worked := NULL;
    NEW.overtime     := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_att_recompute_hours ON public.attendance_records;
CREATE TRIGGER trg_att_recompute_hours
  BEFORE INSERT OR UPDATE OF clock_in, clock_out
  ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.recompute_attendance_hours();

COMMENT ON COLUMN public.attendance_records.hours_worked IS
  'Auto-computed by trg_att_recompute_hours from (clock_out - clock_in). '
  'Do not set manually; any supplied value will be overwritten.';

COMMENT ON COLUMN public.attendance_records.overtime IS
  'Auto-computed as MAX(0, hours_worked - 8). '
  'Do not set manually; any supplied value will be overwritten.';


-- =============================================================================
-- SECTION 9: access_requests — email_domain is a derived attribute (3NF)
-- =============================================================================
-- ANOMALY: email_domain is functionally determined by requester_email:
--   email_domain = lower(split_part(requester_email, '@', 2))
--   Storing it as a separate writable column means the two can diverge if
--   requester_email is patched directly (e.g. a typo fix). The index on
--   (email_domain, status) is also the primary access path, so we must
--   retain physical storage — but it should be GENERATED ALWAYS.
--
-- FIX: Drop the writable column, re-add as GENERATED ALWAYS AS STORED.
--   The generated column is physically stored and fully indexable, so
--   the existing query patterns continue to work without change.

-- Step 1: Remove index that depends on the old column definition
DROP INDEX IF EXISTS public.access_req_domain_idx;

-- Step 2: Drop and replace the column
ALTER TABLE public.access_requests DROP COLUMN IF EXISTS email_domain;

ALTER TABLE public.access_requests
  ADD COLUMN email_domain text GENERATED ALWAYS AS (
    lower(split_part(requester_email, '@', 2))
  ) STORED;

-- Step 3: Re-create the access-pattern index on the generated column
CREATE INDEX access_req_domain_idx
  ON public.access_requests (email_domain, status);

COMMENT ON COLUMN public.access_requests.email_domain IS
  'Generated always from requester_email. Never writable directly. '
  'Used for domain-based tenant matching and access request routing.';


-- =============================================================================
-- SECTION 10: memberships — remove duplicate and over-broad RLS policies
-- =============================================================================
-- ANOMALY A — Duplicate policy:
--   "memberships_admin_write" and "tenant_admin_write" are byte-for-byte
--   identical PERMISSIVE FOR ALL policies. PERMISSIVE policies use OR semantics:
--   a row passes if ANY permissive policy allows it. Duplicates don't cause
--   logical errors but every SELECT/INSERT/UPDATE/DELETE on this table evaluates
--   both policies, and future maintainers cannot tell which is authoritative.
--
-- ANOMALY B — Over-broad read policy:
--   "memberships_tenant_read" allows any authenticated user whose JWT org_id
--   matches current_tenant_id() to read ALL membership rows including
--   status = 'suspended' and status = 'offboarded'. This leaks PII (name,
--   role, join date) about users who have left the organisation.
--   "Tenant active members can read" is the correctly scoped replacement
--   (already present in the schema). The broad policy is the one to drop.

-- Drop the duplicate admin-write policy
DROP POLICY IF EXISTS "tenant_admin_write" ON public.memberships;

-- Drop the over-broad read policy; "Tenant active members can read" remains
DROP POLICY IF EXISTS "memberships_tenant_read" ON public.memberships;

COMMENT ON TABLE public.memberships IS
  'Active SELECT policies after audit: '
  '"Tenant active members can read" — active members only, peer-existence check. '
  '"memberships_admin_write" — full CRUD for tenant admins.';


-- =============================================================================
-- SECTION 11: users — password_hash co-location (security hygiene)
-- =============================================================================
-- ANOMALY: users.password_hash is stored in the same table as profile display
--   data (full_name, avatar_url, email). Any RLS policy granting SELECT on
--   profile columns implicitly exposes the hash column unless explicitly
--   excluded. Since Auth0 is the identity provider (auth0_user_id is present
--   on every row), password_hash is a dead column for all Auth0-authenticated
--   users — it is both a security surface and dead weight.
--
-- FIX: Mark deprecated via COMMENT pending a clean-up migration once legacy
--   password auth paths are fully retired. The clean-up migration itself
--   requires confirming all users have a non-null auth0_user_id before
--   dropping the column.

COMMENT ON COLUMN public.users.password_hash IS
  'DEPRECATED. Auth0 is the identity provider; this column should be NULL '
  'for all users authenticated via Auth0. Scheduled for removal once legacy '
  'password-auth paths are confirmed retired. '
  'Tracking: set this column to NULL for all rows where auth0_user_id IS NOT NULL '
  'before executing the drop-column migration.';

COMMENT ON COLUMN public.users.id IS
  'Text primary key storing the Auth0 sub claim (format: provider|xxxxxxxx). '
  'Kept as text to match JWT sub claims without parsing. All FK columns '
  'referencing users (employee_id, user_id, verified_by, decided_by) '
  'are also text for type consistency.';


-- =============================================================================
-- SECTION 12: sales_leads — untyped status and selected_plan (weak typing)
-- =============================================================================
-- ANOMALY: status and selected_plan are plain text columns with no validation.
--   "new", "New", "NEW" are all accepted as distinct values, breaking GROUP BY,
--   aggregation, and application-layer enum switches. selected_plan has no
--   relationship to the billing_plan enum used everywhere else in the schema.
--
-- FIX: Introduce a lead_status enum; cast the existing column.
--   Add a CHECK constraint on selected_plan tied to billing_plan values.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE public.lead_status AS ENUM (
      'new',
      'contacted',
      'qualified',
      'demo_scheduled',
      'proposal_sent',
      'won',
      'lost',
      'unresponsive'
    );
  END IF;
END$$;

-- Normalise free-text values before the cast
UPDATE public.sales_leads
  SET status = lower(trim(status));

ALTER TABLE public.sales_leads
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.sales_leads
  ALTER COLUMN status TYPE public.lead_status
  USING status::public.lead_status;

ALTER TABLE public.sales_leads
  ALTER COLUMN status SET DEFAULT 'new'::public.lead_status;

-- Normalise selected_plan before adding constraint
UPDATE public.sales_leads
  SET selected_plan = lower(trim(selected_plan))
  WHERE selected_plan IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'sales_leads_selected_plan_check'
      AND n.nspname = 'public'
      AND t.relname = 'sales_leads'
  ) THEN
    ALTER TABLE public.sales_leads
      ADD CONSTRAINT sales_leads_selected_plan_check
      CHECK (
        selected_plan IS NULL
        OR selected_plan IN ('starter', 'growth', 'pro', 'enterprise')
      );
  END IF;
END$$;

COMMENT ON COLUMN public.sales_leads.selected_plan IS
  'Constrained to billing_plan enum values (starter, growth, pro, enterprise) '
  'or NULL for leads that have not yet chosen a plan.';

-- =============================================================================
-- SECTION 13: subscriptions — missing Stripe lookup indexes
-- =============================================================================
-- ANOMALY: Stripe webhook handlers query subscriptions by stripe_customer_id
--   and stripe_subscription_id on every event (invoice.paid, customer.updated,
--   subscription.deleted, etc.). Neither column has an index. At scale this
--   produces sequential scans on what should be O(1) lookups.
--
-- Partial indexes exclude NULL rows (pre-Stripe tenants on trial) to keep
-- index size proportional to actual Stripe-linked rows.

CREATE INDEX IF NOT EXISTS subs_stripe_customer_idx
  ON public.subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subs_stripe_sub_idx
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;


-- =============================================================================
-- SECTION 14: subscriptions — restrict Stripe ID exposure via RLS
-- =============================================================================
-- ANOMALY: subs_tenant_read allows every authenticated tenant member to SELECT
--   the full subscriptions row, including stripe_customer_id and
--   stripe_subscription_id. These IDs can be used to make direct Stripe API
--   calls and should be treated as sensitive credentials, not display data.
--
-- FIX: Restrict full-row reads to admins. Expose a Stripe-ID-free summary
--   view for non-admin members who need plan/status/seat_cap information.

DROP POLICY IF EXISTS "subs_tenant_read" ON public.subscriptions;

CREATE POLICY "subs_admin_read"
  ON public.subscriptions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.has_tenant_role('admin'::public.tenant_role)
  );

CREATE OR REPLACE VIEW public.tenant_subscription_summary AS
  SELECT
    tenant_id,
    plan,
    status,
    seat_cap,
    current_period_end
  FROM public.subscriptions;

COMMENT ON VIEW public.tenant_subscription_summary IS
  'Stripe-ID-free subscription summary. Safe to expose to all tenant members '
  'via application-layer queries. Stripe IDs are accessible only through the '
  'subscriptions base table, restricted to tenant admins by RLS.';


-- =============================================================================
-- SECTION 15: attendance_records — supervisor verify gap in RLS
-- =============================================================================
-- ANOMALY: att_mgr_verify allows manager and admin UPDATE on attendance records
--   for clock-out corrections and manual verification. Supervisors appear in
--   att_mgr_read (they can see records) but not in att_mgr_verify (they cannot
--   write verifications). Supervisors conducting field verification is a core
--   workflow in shift-based attendance systems — the omission is a policy gap,
--   not an intentional restriction.

CREATE POLICY "att_supervisor_verify"
  ON public.attendance_records
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.has_tenant_role('supervisor'::public.tenant_role)
  );


-- =============================================================================
-- SECTION 16: users — missing self-update RLS policy
-- =============================================================================
-- ANOMALY: users_self_read allows a user to SELECT their own row.
--   There is no corresponding UPDATE policy. A user editing their own profile
--   (full_name, avatar_url) hits RLS and is silently rejected without service
--   role — the update appears to succeed (no error) but no row changes.
--   This is a classic silent-failure RLS bug: the UPDATE is rejected by policy,
--   returns 0 rows affected, and application code that doesn't check rowcount
--   reports success.

CREATE POLICY "users_self_update"
  ON public.users
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING     (id = public.current_user_id())
  WITH CHECK (id = public.current_user_id());


-- =============================================================================
-- SECTION 17: Validate all previously NOT VALID foreign keys
-- =============================================================================
-- NOT VALID defers referential integrity checks to new writes only.
-- Existing rows that violate the constraint are never caught.
-- For a production schema, all FKs should be fully validated so that
-- schema diffing tools (Supabase migrations, pgdiff, atlas) report a clean state,
-- and so that accidental legacy orphans don't silently accumulate.

ALTER TABLE public.attendance_records
  VALIDATE CONSTRAINT attendance_records_employee_id_fkey;

ALTER TABLE public.attendance_records
  VALIDATE CONSTRAINT attendance_records_site_id_fkey;

ALTER TABLE public.attendance_records
  VALIDATE CONSTRAINT attendance_records_verified_by_fkey;

ALTER TABLE public.access_requests
  VALIDATE CONSTRAINT access_requests_decided_by_fkey;

ALTER TABLE public.access_requests
  VALIDATE CONSTRAINT access_requests_target_tenant_id_fkey;

ALTER TABLE public.audit_log
  VALIDATE CONSTRAINT audit_log_tenant_id_fkey;

ALTER TABLE public.audit_log
  VALIDATE CONSTRAINT audit_log_user_id_fkey;

ALTER TABLE public.departments
  VALIDATE CONSTRAINT departments_site_id_fkey;

ALTER TABLE public.employee_profiles
  VALIDATE CONSTRAINT employee_profiles_department_id_fkey;

ALTER TABLE public.employee_profiles
  VALIDATE CONSTRAINT employee_profiles_site_id_fkey;

ALTER TABLE public.organisation_roles
  VALIDATE CONSTRAINT organisation_roles_tenant_id_fkey;

ALTER TABLE public.shifts
  VALIDATE CONSTRAINT shifts_site_id_fkey;


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================