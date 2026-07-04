alter table "public"."user_credentials" add constraint "user_credentials_auth0_org_id_fkey" FOREIGN KEY (auth0_org_id) REFERENCES public.users(auth0_org_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_credentials" validate constraint "user_credentials_auth0_org_id_fkey";


  create policy "avatars: users delete own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[2] = (auth.jwt() ->> 'sub'::text))));



  create policy "avatars: users update own"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[2] = (auth.jwt() ->> 'sub'::text))))
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[2] = (auth.jwt() ->> 'sub'::text))));



  create policy "avatars: users upload own"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[2] = (auth.jwt() ->> 'sub'::text))));



