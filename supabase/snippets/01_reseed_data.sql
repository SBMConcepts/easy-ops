-- =====================================================================
-- 01_reseed_data.sql  —  re-insert the exported live data
--
-- Runs AFTER 00_reset_public.sql and the canonical schema file.
-- Source: easy-ops/server/scripts/live-data-backup.json (2 test orgs).
--
-- Adjustments applied to satisfy the new constraints/enums:
--   * org_attendance.method  'manual' -> 'biometric'   (attendance_method enum)
--   * incident_reports.severity 'low' -> 'minor'        (incident_severity enum)
--   * org_members f9807bfd job_role_id NULLED            (was cross-tenant: role
--       c01335c8 belongs to org_LgTMP but member is in org_4QQJ)
--   * org_sites.geo_radius -> geo_radius_m
--   * incident_reports.manager_id -> manager_user_id (was NULL)
--   * users.id_type NULLED for rows with a NULL national_id
--       (users_id_type_chk requires both set or both null)
--
-- Insertion order respects the composite tenant FKs.
-- =====================================================================

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;

-- ---------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------
insert into public.organizations
  (auth0_org_id, name, slug, plan, status, industry, country, logo_url, metadata, created_at, updated_at)
values
  ('org_4QQJzxaTl8zyWd5e', 'Paul Matchett Stables', 'paul-matchett-stables', 'pro', 'active',
   'Hospitality & Tourism', 'South Africa', '',
   $json${"shifts":[{"name":"Day Shift","end_time":"16:00","site_index":0,"start_time":"07:45","grace_period_minutes":"15"}],"workRules":{"overtimeRate":1.5,"weeklyHoursLimit":40},"checkInMethods":{"qrEnabled":true,"manualEnabled":false,"whatsappEnabled":false,"biometricEnabled":false,"geofencingEnabled":false,"defaultGeofenceRadius":200}}$json$::jsonb,
   '2026-07-10T03:10:35.876Z', '2026-07-10T03:28:18.425Z'),
  ('org_LgTMPOk02reLtsN7', 'Dawn Analytics', 'dawn-analytics', 'pro', 'active',
   'Technology', 'South Africa', '',
   $json${"shifts":[{"name":"Day Shift","end_time":"16:00","site_index":0,"start_time":"07:30","grace_period_minutes":"15"}],"workRules":{"overtimeRate":1.6,"weeklyHoursLimit":40},"checkInMethods":{"qrEnabled":true,"manualEnabled":false,"whatsappEnabled":false,"biometricEnabled":false,"geofencingEnabled":false,"defaultGeofenceRadius":200}}$json$::jsonb,
   '2026-07-06T23:43:53.853Z', '2026-07-06T23:48:18.570Z');

-- ---------------------------------------------------------------------
-- users  (id_type nulled where national_id is null)
-- ---------------------------------------------------------------------
insert into public.users
  (id, auth0_user_id, auth0_org_id, email, full_name, first_name, last_name, avatar_url,
   mobile_number, national_id, id_type, address, emergency_contact_name, emergency_contact_phone,
   last_seen_at, created_at)
values
  ('d1901bb0-9f13-4036-a905-55412b7e5498', 'auth0|7b615936-70d2-4fb2-bb56-b81021bf1836', 'org_LgTMPOk02reLtsN7',
   'sbcmthethwa79@gmail.com', 'sbcmthethwa79@gmail.com', 'Siphesihle', 'Mthethwa',
   'https://s.gravatar.com/avatar/6d4dc81fbde1175a932d57fb711afe6d?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fsb.png',
   '+27649096152', '9701085412082', 'sa_id', '38 Greenlee blvd', 'Siphesihle B Mthethwa', '0662097017',
   '2026-07-30T18:45:03.134Z', '2026-07-06T23:44:25.176Z'),
  ('3d3215f0-0b88-461c-b1ea-b03c035b0b95', 'auth0|00d31f42-aac4-4430-9849-cb4219e64263', 'org_4QQJzxaTl8zyWd5e',
   'dev@easyops.co.za', 'dev@easyops.co.za', 'Siphesihle', 'Mthethwa',
   'https://s.gravatar.com/avatar/76848d3ee1e5189a45c6d1d111778fa2?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fde.png',
   '+27 64 909 6152', null, null, null, null, null,
   '2026-07-30T20:44:49.181Z', '2026-07-10T03:11:15.556Z'),
  ('30c62dfc-9b8d-43ae-97e1-a248ba6ba790', 'auth0|88c16862-1e27-454b-a644-c721ead7a074', 'org_4QQJzxaTl8zyWd5e',
   'kenannaidoo77@gmail.com', 'kenannaidoo77@gmail.com', '', '',
   'https://s.gravatar.com/avatar/d6df647050dc2b0622babbf32ed53884?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fke.png',
   null, null, null, null, null, null,
   '2026-07-21T11:55:18.980Z', '2026-07-10T09:16:42.371Z'),
  ('c3ca5441-80c2-4697-9865-f51269db760d', 'auth0|c3535e2e-5582-45dc-b79e-12231bf8b439', 'org_4QQJzxaTl8zyWd5e',
   'kgmwale23@gmail.com', 'kgmwale23@gmail.com', 'Kanjewele', 'Mwale',
   'https://s.gravatar.com/avatar/708914349c1b47e204d22dc6d11c745c?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fkg.png',
   '0749851122', null, null, null, null, null,
   '2026-07-22T17:06:37.013Z', '2026-07-22T17:04:35.716Z');

-- ---------------------------------------------------------------------
-- user_credentials  (password_hash preserved for the auth0 custom-db login)
-- ---------------------------------------------------------------------
insert into public.user_credentials
  (id, auth0_user_id, auth0_org_id, email, password_hash, email_verified, status, created_at, updated_at)
values
  ('00d31f42-aac4-4430-9849-cb4219e64263', 'auth0|00d31f42-aac4-4430-9849-cb4219e64263', 'org_4QQJzxaTl8zyWd5e',
   'dev@easyops.co.za', '$2b$10$GpJvY4rmWHlJlCRvwuI/BO0NrpyFQqvNqTvVJSnLZPXOSzHq/c29W', true, 'active',
   '2026-07-10T03:11:15.556Z', '2026-07-10T03:11:15.556Z'),
  ('88c16862-1e27-454b-a644-c721ead7a074', 'auth0|88c16862-1e27-454b-a644-c721ead7a074', 'org_4QQJzxaTl8zyWd5e',
   'kenannaidoo77@gmail.com', '$2b$10$TUqaw7cvNvCqnM6PtTXa..7vJxGq1sQ4I2TiThUF6MzIwyEfZQvyO', true, 'active',
   '2026-07-10T09:16:42.371Z', '2026-07-10T09:16:42.371Z'),
  ('c3535e2e-5582-45dc-b79e-12231bf8b439', 'auth0|c3535e2e-5582-45dc-b79e-12231bf8b439', 'org_4QQJzxaTl8zyWd5e',
   'kgmwale23@gmail.com', '$2b$10$PwHW1zieNX.egPEzOoVS3u8AQWj3rDKMwUojCDQzrnFM8EgT73gsO', true, 'active',
   '2026-07-22T17:04:35.716Z', '2026-07-22T17:04:35.716Z'),
  ('7b615936-70d2-4fb2-bb56-b81021bf1836', 'auth0|7b615936-70d2-4fb2-bb56-b81021bf1836', 'org_LgTMPOk02reLtsN7',
   'sbcmthethwa79@gmail.com', '$2b$10$V9oBkR8dU6QIrHqUk.zZR./Elb80NFGMI.CkAljEoRESMYOfOj5rO', true, 'active',
   '2026-07-06T23:44:25.176Z', '2026-07-06T23:44:25.176Z');

-- ---------------------------------------------------------------------
-- org_departments
-- ---------------------------------------------------------------------
insert into public.org_departments (id, auth0_org_id, department_name, created_at, updated_at)
values
  ('d621996d-40f2-475c-b778-58a430211a85', 'org_4QQJzxaTl8zyWd5e', 'Main Office',     '2026-07-10T03:28:19.021Z', '2026-07-10T03:28:19.021Z'),
  ('035ebfc3-1136-43fd-a369-042364c79fb2', 'org_4QQJzxaTl8zyWd5e', 'General Workers', '2026-07-10T03:28:19.021Z', '2026-07-10T03:28:19.021Z'),
  ('041a375c-b364-40f2-95c7-69cd86e84297', 'org_LgTMPOk02reLtsN7', 'Admin',           '2026-07-06T23:48:18.983Z', '2026-07-21T01:03:01.719Z'),
  ('b5d2ad9b-1fc9-4d90-9440-37a7da5b1a88', 'org_LgTMPOk02reLtsN7', 'Developers',      '2026-07-06T23:48:18.983Z', '2026-07-21T01:03:09.163Z');

-- ---------------------------------------------------------------------
-- org_sites  (geo_radius -> geo_radius_m)
-- ---------------------------------------------------------------------
insert into public.org_sites (id, auth0_org_id, department_id, site_name, address, latitude, longitude, geo_radius_m)
values
  ('223519b0-1109-48c6-a669-21e720b082b2', 'org_LgTMPOk02reLtsN7', '041a375c-b364-40f2-95c7-69cd86e84297',
   'The Reid', '37 Linbro Park', -50.55, 56.11, 150),
  ('801ac9f3-ddfc-45f3-997c-1d0f7077e349', 'org_LgTMPOk02reLtsN7', '041a375c-b364-40f2-95c7-69cd86e84297',
   'Red Ivory', '13 Bannacle Rd', -25.55, 28.188, 150),
  ('2f176973-a001-4456-aec9-125d8911989a', 'org_4QQJzxaTl8zyWd5e', 'd621996d-40f2-475c-b778-58a430211a85',
   'Stables', 'North Rand Training Center Randjesfontein, 1683 south, 49 Olievenhoutbosch Rd, Louwlardia, Centurion, 1683',
   -25.931571, 28.160056, 50);

-- ---------------------------------------------------------------------
-- org_roles
-- ---------------------------------------------------------------------
insert into public.org_roles (id, auth0_org_id, name, base_role)
values
  ('279c2d7f-c8df-4e4e-bc8a-b695452f2c1f', 'org_4QQJzxaTl8zyWd5e', 'Owner',   'owner'),
  ('b5e6a7ef-eda0-4801-bcaf-23dc5672411e', 'org_4QQJzxaTl8zyWd5e', 'EasyOps', 'admin'),
  ('a15beb47-cc94-4ea2-ad08-17cc85ca3cd9', 'org_LgTMPOk02reLtsN7', 'member',  'member'),
  ('c01335c8-0348-4333-80ac-6a35f00bd2a5', 'org_LgTMPOk02reLtsN7', 'manager', 'manager');

-- ---------------------------------------------------------------------
-- org_members  (f9807bfd job_role_id nulled — was cross-tenant)
-- ---------------------------------------------------------------------
insert into public.org_members
  (id, auth0_org_id, auth0_user_id, role, status, department_id, site_id, job_role_id, joined_at)
values
  ('a8f6d778-795c-4c03-8da1-047939917d39', 'org_4QQJzxaTl8zyWd5e', 'auth0|c3535e2e-5582-45dc-b79e-12231bf8b439',
   'admin', 'active', null, null, null, '2026-07-22T17:04:35.716Z'),
  ('e7e96dab-9d2e-4cc2-bd09-7c784af1b8d9', 'org_LgTMPOk02reLtsN7', 'auth0|7b615936-70d2-4fb2-bb56-b81021bf1836',
   'admin', 'active', '041a375c-b364-40f2-95c7-69cd86e84297', '801ac9f3-ddfc-45f3-997c-1d0f7077e349',
   'c01335c8-0348-4333-80ac-6a35f00bd2a5', '2026-07-06T23:44:25.176Z'),
  ('30297b8e-d185-4c2f-8bf6-d1f9c28d9197', 'org_4QQJzxaTl8zyWd5e', 'auth0|00d31f42-aac4-4430-9849-cb4219e64263',
   'admin', 'active', 'd621996d-40f2-475c-b778-58a430211a85', '2f176973-a001-4456-aec9-125d8911989a',
   'b5e6a7ef-eda0-4801-bcaf-23dc5672411e', '2026-07-10T03:11:15.556Z'),
  ('f9807bfd-c887-4454-a435-6277d69312f3', 'org_4QQJzxaTl8zyWd5e', 'auth0|88c16862-1e27-454b-a644-c721ead7a074',
   'admin', 'active', 'd621996d-40f2-475c-b778-58a430211a85', '2f176973-a001-4456-aec9-125d8911989a',
   null, '2026-07-10T09:16:42.371Z');

-- ---------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------
insert into public.subscriptions (id, auth0_org_id, plan, status, trial_ends_at, current_period_end, created_at)
values
  ('a8f00115-1563-4539-b5f5-1daead2a86a3', 'org_4QQJzxaTl8zyWd5e', 'pro', 'trialing', '2026-07-24T03:10:36.305Z', null, '2026-07-10T03:10:36.560Z'),
  ('b7fdd882-b7c6-4de5-a72d-5b947ec96288', 'org_LgTMPOk02reLtsN7', 'pro', 'trialing', '2026-07-20T23:43:54.325Z', null, '2026-07-06T23:43:54.593Z');

-- ---------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------
insert into public.invitations (id, auth0_org_id, email, role, token, expires_at, accepted_at)
values
  ('28b188f6-9d25-4ee4-a5e4-a69871261e0b', 'org_4QQJzxaTl8zyWd5e', 'dev@easyops.co.za', 'admin',
   'ef40ebbf82273d647a489a09b1d7d1684485be287bebeca559961d43a9912e85', '2026-07-17T03:10:36.243Z', null),
  ('f7371822-4209-4d25-871d-c6daf9c3e824', 'org_4QQJzxaTl8zyWd5e', 'kenannaidoo77@gmail.com', 'admin',
   '3ff00bbb1062519b6b30a159bd08eb4b324dd7f6ebca0f37581d34fe8e9286da', '2026-07-17T03:29:24.340Z', null),
  ('2496d4f6-3f42-43df-8875-ed98c5f23f20', 'org_LgTMPOk02reLtsN7', 'sbcmthethwa79@gmail.com', 'admin',
   '0432daacfaf4355a24004ef03ad37aa4e72b34df7f0abca9ca10e3012769921b', '2026-07-13T23:43:54.260Z', null),
  ('0a5f2883-e398-4166-9f7e-2e7f25244709', 'org_4QQJzxaTl8zyWd5e', 'kgmwale23@gmail.com', 'admin',
   '07cc0d92468bf049daa0c830ea947d74420d829537f0409c1b98b6f80109ae8d', '2026-07-17T03:30:02.984Z', null),
  ('bc1660aa-f1db-466b-aaf9-e94ae9e6cf35', 'org_LgTMPOk02reLtsN7', 'blessinkpoetic@gmail.com', 'member',
   '770ef24cde4fa78af1b046d540e32696d03119f084a5cc3f80dde450fa0fba0e', '2026-07-14T01:49:11.242Z', null);

-- ---------------------------------------------------------------------
-- org_attendance  (method 'manual' -> 'biometric')
-- ---------------------------------------------------------------------
insert into public.org_attendance
  (id, auth0_org_id, auth0_user_id, date, method, hours_worked, overtime, department_id, site_id, created_at)
values
  ('b0fc887c-a6cb-448a-9ad4-d561766f0e7e', 'org_LgTMPOk02reLtsN7', 'auth0|7b615936-70d2-4fb2-bb56-b81021bf1836',
   '2026-07-20', 'biometric', 9, 1, '041a375c-b364-40f2-95c7-69cd86e84297', '801ac9f3-ddfc-45f3-997c-1d0f7077e349',
   '2026-07-20T23:00:43.208Z');

-- ---------------------------------------------------------------------
-- incident_reports  (severity 'low' -> 'minor', manager_id -> manager_user_id NULL)
-- ---------------------------------------------------------------------
insert into public.incident_reports
  (id, auth0_org_id, reporter_id, site_id, department_id, incident_type, severity, status, occurred_at,
   description, actions_taken, witnesses, photos, reporter_signature, reporter_signed_at,
   manager_user_id, created_at, updated_at)
values
  ('2b8722a0-2fe6-4694-8cca-b9b8e112a384', 'org_LgTMPOk02reLtsN7', 'auth0|7b615936-70d2-4fb2-bb56-b81021bf1836',
   null, '041a375c-b364-40f2-95c7-69cd86e84297', 'injury', 'minor', 'open', '2026-07-22T23:52:00.000Z',
   'wesdf', 'wesrdf', 'werdf', '[]'::jsonb, 'signed:awsedfg:2026-07-22T23:55:16.050Z', '2026-07-22T23:55:17.200Z',
   null, '2026-07-22T23:55:17.200Z', '2026-07-22T23:55:17.200Z');

commit;
