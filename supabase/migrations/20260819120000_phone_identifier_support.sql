-- Support phone-number identifiers (invite, signup, login) alongside email.
-- Postgres side only — Auth0 Dashboard must separately enable Flexible
-- Identifiers + the Phone Number attribute on the Username-Password-
-- Authentication connection (see docs/auth0-metadata-checklist.txt SECTION 9).

alter table public.invitations
  alter column email drop not null,
add column
if not exists phone_number text;

alter table public.invitations
  add constraint invitations_identifier_chk check (email is not null or phone_number is not null);

create index
if not exists invitations_org_phone_idx
  on public.invitations
(auth0_org_id, phone_number)
  where phone_number is not null;

-- email uniqueness is app-level only (login.js/get-user.js do a LIMIT-1 lookup,
-- no DB constraint) — mirror the same laxity for phone rather than introduce
-- asymmetric rigor; add a lookup index only, not a unique constraint.
alter table public.user_credentials
  alter column email drop not null,
add column
if not exists phone_verified boolean not null default false;

alter table public.user_credentials
  add constraint user_credentials_identifier_chk check (email is not null or mobile_number is not null);

create index
if not exists user_credentials_mobile_number_idx
  on public.user_credentials
(mobile_number)
  where mobile_number is not null;

alter table public.users
  alter column email drop not null;

-- Matches the existing users_org_email_key shape (per-org uniqueness, not global).
create unique index
if not exists users_org_mobile_number_key
  on public.users
(auth0_org_id, mobile_number)
  where mobile_number is not null;
