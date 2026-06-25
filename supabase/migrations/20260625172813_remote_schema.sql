alter table "public"."user_credentials" add column "auth0_user_id" text not null default ''::text;

alter table "public"."user_credentials" add constraint "user_credentials_auth0_user_id_fkey" FOREIGN KEY (auth0_user_id) REFERENCES public.users(auth0_user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_credentials" validate constraint "user_credentials_auth0_user_id_fkey";


  create policy "user_credentials: delete own"
  on "public"."user_credentials"
  as permissive
  for delete
  to authenticated
using ((auth0_user_id = (auth.jwt() ->> 'sub'::text)));



  create policy "user_credentials: insert own"
  on "public"."user_credentials"
  as permissive
  for insert
  to authenticated
with check ((auth0_user_id = (auth.jwt() ->> 'sub'::text)));



  create policy "user_credentials: select own"
  on "public"."user_credentials"
  as permissive
  for select
  to authenticated
using ((auth0_user_id = (auth.jwt() ->> 'sub'::text)));



  create policy "user_credentials: update own"
  on "public"."user_credentials"
  as permissive
  for update
  to authenticated
using ((auth0_user_id = (auth.jwt() ->> 'sub'::text)))
with check ((auth0_user_id = (auth.jwt() ->> 'sub'::text)));



