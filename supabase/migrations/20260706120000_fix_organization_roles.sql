-- Corrective migration: enforce the canonical role set everywhere.
--
-- The only acceptable roles are the `organization_role` enum values:
--   owner, admin, manager, member
--
-- This migration removes the legacy values 'supervisor' and 'employee' from the
-- enum, drops 'viewer' from the org_members CHECK constraint, and rewrites the
-- org_sites read policy that still referenced the legacy values. Rows carrying a
-- removed value are folded down to 'member' (the least-privileged access tier),
-- matching jobRoleToTier() in server/lib/rbac.ts.

BEGIN;

    -- 1. Rebuild the organization_role enum without 'supervisor'/'employee' and with
    --    'member'. Postgres cannot drop enum values in place, so swap the type.
    ALTER TYPE "public"."organization_role" RENAME TO "organization_role__old";

CREATE TYPE "public"."organization_role" AS ENUM
(
    'owner',
    'admin',
    'manager',
    'member'
);

ALTER TYPE "public"."organization_role" OWNER TO "postgres";

-- Remap org_roles.name onto the new type, folding removed values into 'member'.
ALTER TABLE "public"."org_roles"
    ALTER COLUMN "name" TYPE
"public"."organization_role"
    USING
(
        CASE "name"::"text"
            WHEN 'supervisor' THEN 'member'
            WHEN 'employee' THEN 'member'
            ELSE "name"::"text"
END::"public"."organization_role"
    );

DROP TYPE "public"."organization_role__old";

-- 2. Fix the org_members role CHECK: drop 'viewer', add 'manager'.
UPDATE "public"."org_members"
    SET "role" = 'member'
    WHERE "role" = 'viewer';

ALTER TABLE "public"."org_members"
    DROP CONSTRAINT IF EXISTS "org_members_role_check";

ALTER TABLE "public"."org_members"
    ADD CONSTRAINT "org_members_role_check"
    CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'manager'::"text", 'member'::"text"]))
);

-- 3. Rewrite the org_sites read policy that still referenced 'employee'/'supervisor'.
DROP POLICY
IF EXISTS "org_sites: members read" ON "public"."org_sites";

CREATE POLICY "org_sites: members read" ON "public"."org_sites" FOR
SELECT USING ((("auth0_org_id" = "public"."org_id"()) AND (EXISTS ( SELECT 1
        FROM "public"."org_members" "om"
        WHERE (("om"."auth0_org_id" = "org_sites"."auth0_org_id") AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['member'::"text", 'admin'::"text", 'manager'::"text", 'owner'::"text"])) AND ("om"."auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text"))))))
);

COMMIT;
