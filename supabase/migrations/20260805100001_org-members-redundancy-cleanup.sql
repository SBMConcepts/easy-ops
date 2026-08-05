-- ============================================================================
-- org_members redundancy cleanup
--
-- 1) permissions/leave_balances jsonb columns are write-only dead weight:
--    permissions is derived at read time via permissionsForRole() and leave
--    balances live in the dedicated org_leave_balances table; nothing in the
--    app reads or writes these two columns on org_members.
-- 2) org_members.full_name/first_name/last_name/email are functionally
--    dependent on auth0_user_id alone (a proper subset of the org_members
--    candidate key), not the whole key -- a partial-dependency redundancy
--    against the canonical copy in user_credentials. Previously kept in sync
--    by app code (server/routes/userinfo.ts's `nameSync` block); moved here so
--    it can no longer drift. avatar_url is NOT part of this: user_credentials
--    has no avatar_url column, so it isn't a duplicate and is left untouched.
-- ============================================================================

alter table public.org_members drop column if exists permissions;
alter table public.org_members drop column if exists leave_balances;

create or replace function public.sync_org_members_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.org_members
  set full_name = coalesce(new.full_name, ''),
      first_name = coalesce(new.first_name, ''),
      last_name = coalesce(new.last_name, ''),
      email = new.email
  where auth0_user_id = new.auth0_user_id
    and auth0_org_id = new.auth0_org_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_org_members_identity on public.user_credentials;
create trigger trg_sync_org_members_identity
  after update of full_name, first_name, last_name, email on public.user_credentials
  for each row
  when (
    new.full_name is distinct from old.full_name
    or new.first_name is distinct from old.first_name
    or new.last_name is distinct from old.last_name
    or new.email is distinct from old.email
  )
  execute function public.sync_org_members_identity();
