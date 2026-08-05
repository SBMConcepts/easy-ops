-- ============================================================================
-- Fix sync_org_members_identity(): live public.org_members has no `email`
-- column (it never existed here — the 08-01 migration's aspirational
-- org_members shape, which included email/avatar_url, never actually applied
-- to this pre-existing table). The trigger function as originally written
-- would raise "column email of relation org_members does not exist" the
-- moment it fires (any UPDATE of user_credentials.full_name/first_name/
-- last_name/email), breaking login sync and profile saves. full_name/
-- first_name/last_name ARE real columns on both tables, so keep syncing those.
-- ============================================================================

create or replace function public.sync_org_members_identity
()
returns trigger
language plpgsql
set search_path
= ''
as $$
begin
    update public.org_members
  set full_name = coalesce(new.full_name, ''),
      first_name = coalesce(new.first_name, ''),
      last_name = coalesce(new.last_name, '')
  where auth0_user_id = new.auth0_user_id
        and auth0_org_id = new.auth0_org_id;
    return new;
end;
$$;
