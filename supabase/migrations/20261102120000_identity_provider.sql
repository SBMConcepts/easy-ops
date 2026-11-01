-- Record which Auth0 connection family a credential came from (auth0 = custom
-- database, google-oauth2, sms) so federated users can be told apart from
-- password users.
alter table public.user_credentials
  add column if not exists identity_provider text not null default 'auth0';
