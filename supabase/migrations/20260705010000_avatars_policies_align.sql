-- Align the avatars storage RLS policies with the object key convention used by
-- the backend upload route (server/routes/userinfo.ts):
--
--   {auth0_org_id}/{sanitized_sub}/avatar.{ext}
--
-- Two adjustments vs. the pulled remote policies:
--   1. Auth0 subjects (e.g. "auth0|abc") contain a "|" which Supabase storage
--      keys reject, so the backend sanitizes the subject to match /[^A-Za-z0-9_-]/.
--      The policy mirrors that transform with regexp_replace so a client-side
--      (authenticated) upload would match the same key.
--   2. The org id is the first folder segment, giving per-tenant isolation.
--
-- Note: the backend uses the service-role client, which bypasses RLS. These
-- policies are defense-in-depth for any future authenticated client access.

drop policy if exists "avatars: users upload own" on "storage"."objects";
drop policy if exists "avatars: users update own" on "storage"."objects";
drop policy if exists "avatars: users delete own" on "storage"."objects";

create policy "avatars: users upload own"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'org_id')
    and (storage.foldername(name))[2] = regexp_replace(auth.jwt() ->> 'sub', '[^a-zA-Z0-9_-]', '_', 'g')
  );

create policy "avatars: users update own"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'org_id')
    and (storage.foldername(name))[2] = regexp_replace(auth.jwt() ->> 'sub', '[^a-zA-Z0-9_-]', '_', 'g')
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'org_id')
    and (storage.foldername(name))[2] = regexp_replace(auth.jwt() ->> 'sub', '[^a-zA-Z0-9_-]', '_', 'g')
  );

create policy "avatars: users delete own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'org_id')
    and (storage.foldername(name))[2] = regexp_replace(auth.jwt() ->> 'sub', '[^a-zA-Z0-9_-]', '_', 'g')
  );
