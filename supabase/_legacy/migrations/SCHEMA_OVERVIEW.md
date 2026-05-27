# Database Schema Overview

> **Platform:** Supabase (PostgreSQL)
> **Schema:** `public`

---

## Table of Contents

- [Enums](#enums)
- [Tables](#tables)
- [Functions](#functions)
- [Triggers](#triggers)
- [Indexes](#indexes)
- [Migration File Summary](#migration-file-summary)

---

## Enums

| Enum                | Values                                             |
| ------------------- | -------------------------------------------------- |
| `app_role`          | `admin` \| `manager` \| `supervisor` \| `employee` |
| `check_in_method`   | `qr` \| `biometric` \| `whatsapp` \| `manual`      |
| `attendance_status` | `present` \| `late` \| `absent` \| `on_leave`      |

---

## Tables

### `profiles` — RLS: Enabled

| Column                    | Type          | Notes                  |
| ------------------------- | ------------- | ---------------------- |
| `id`                      | `UUID` PK     | FK → `auth.users(id)`  |
| `full_name`               | `TEXT`        | NOT NULL, default `''` |
| `email`                   | `TEXT`        | NOT NULL, default `''` |
| `department`              | `TEXT`        | Legacy text column     |
| `site`                    | `TEXT`        | Legacy text column     |
| `avatar_url`              | `TEXT`        |                        |
| `organisation_id`         | `UUID`        | FK → `organisations`   |
| `department_id`           | `UUID`        | FK → `departments`     |
| `profile_site_id`         | `UUID`        | FK → `sites`           |
| `phone`                   | `TEXT`        |                        |
| `address`                 | `TEXT`        |                        |
| `emergency_contact_name`  | `TEXT`        |                        |
| `emergency_contact_phone` | `TEXT`        |                        |
| `bio`                     | `TEXT`        |                        |
| `id_number`               | `TEXT`        |                        |
| `job_title`               | `TEXT`        |                        |
| `date_of_birth`           | `DATE`        |                        |
| `start_date`              | `DATE`        |                        |
| `created_at`              | `TIMESTAMPTZ` | NOT NULL, `now()`      |
| `updated_at`              | `TIMESTAMPTZ` | NOT NULL, `now()`      |

---

### `user_roles` — RLS: Enabled

| Column    | Type       | Notes                                      |
| --------- | ---------- | ------------------------------------------ |
| `id`      | `UUID` PK  | `gen_random_uuid()`                        |
| `user_id` | `UUID`     | FK → `auth.users(id)`, FK → `profiles(id)` |
| `role`    | `app_role` | NOT NULL, UNIQUE `(user_id, role)`         |

---

### `organisations` — RLS: Enabled

| Column                 | Type          | Notes                              |
| ---------------------- | ------------- | ---------------------------------- |
| `id`                   | `UUID` PK     | `gen_random_uuid()`                |
| `name`                 | `TEXT`        | NOT NULL                           |
| `industry`             | `TEXT`        |                                    |
| `country`              | `TEXT`        | NOT NULL, default `'South Africa'` |
| `logo_url`             | `TEXT`        |                                    |
| `onboarding_completed` | `BOOLEAN`     | NOT NULL, default `false`          |
| `settings`             | `JSONB`       | NOT NULL, default `'{}'`           |
| `created_by`           | `UUID`        | NOT NULL                           |
| `created_at`           | `TIMESTAMPTZ` | NOT NULL, `now()`                  |
| `updated_at`           | `TIMESTAMPTZ` | NOT NULL, `now()`                  |

---

### `organisation_roles` — RLS: Enabled

| Column            | Type          | Notes                |
| ----------------- | ------------- | -------------------- |
| `id`              | `UUID` PK     | `gen_random_uuid()`  |
| `organisation_id` | `UUID`        | FK → `organisations` |
| `name`            | `TEXT`        | NOT NULL             |
| `base_role`       | `app_role`    | NOT NULL             |
| `created_at`      | `TIMESTAMPTZ` | NOT NULL, `now()`    |

---

### `sites` — RLS: Enabled

| Column              | Type               | Notes                |
| ------------------- | ------------------ | -------------------- |
| `id`                | `UUID` PK          | `gen_random_uuid()`  |
| `name`              | `TEXT`             | NOT NULL             |
| `address`           | `TEXT`             |                      |
| `latitude`          | `DOUBLE PRECISION` |                      |
| `longitude`         | `DOUBLE PRECISION` |                      |
| `geofence_radius_m` | `INTEGER`          | default `200`        |
| `organisation_id`   | `UUID`             | FK → `organisations` |
| `created_at`        | `TIMESTAMPTZ`      | NOT NULL, `now()`    |

---

### `departments` — RLS: Enabled

| Column            | Type          | Notes                |
| ----------------- | ------------- | -------------------- |
| `id`              | `UUID` PK     | `gen_random_uuid()`  |
| `name`            | `TEXT`        | NOT NULL             |
| `site_id`         | `UUID`        | FK → `sites`         |
| `organisation_id` | `UUID`        | FK → `organisations` |
| `created_at`      | `TIMESTAMPTZ` | NOT NULL, `now()`    |

---

### `shifts` — RLS: Enabled

| Column                 | Type          | Notes                  |
| ---------------------- | ------------- | ---------------------- |
| `id`                   | `UUID` PK     | `gen_random_uuid()`    |
| `name`                 | `TEXT`        | NOT NULL               |
| `start_time`           | `TIME`        | NOT NULL               |
| `end_time`             | `TIME`        | NOT NULL               |
| `grace_period_minutes` | `INTEGER`     | NOT NULL, default `15` |
| `site_id`              | `UUID`        | FK → `sites` (legacy)  |
| `organisation_id`      | `UUID`        | FK → `organisations`   |
| `created_at`           | `TIMESTAMPTZ` | NOT NULL, `now()`      |

---

### `shift_sites` — RLS: Enabled _(junction table — 4NF fix)_

| Column     | Type                  | Notes         |
| ---------- | --------------------- | ------------- |
| `shift_id` | `UUID` PK (composite) | FK → `shifts` |
| `site_id`  | `UUID` PK (composite) | FK → `sites`  |

---

### `attendance_records` — RLS: Enabled

| Column         | Type                | Notes                         |
| -------------- | ------------------- | ----------------------------- |
| `id`           | `UUID` PK           | `gen_random_uuid()`           |
| `employee_id`  | `UUID`              | FK → `auth.users(id)`         |
| `date`         | `DATE`              | NOT NULL                      |
| `clock_in`     | `TIMESTAMPTZ`       |                               |
| `clock_out`    | `TIMESTAMPTZ`       |                               |
| `method`       | `check_in_method`   | NOT NULL, default `'manual'`  |
| `status`       | `attendance_status` | NOT NULL, default `'present'` |
| `site_id`      | `UUID`              | FK → `sites`                  |
| `latitude`     | `DOUBLE PRECISION`  |                               |
| `longitude`    | `DOUBLE PRECISION`  |                               |
| `verified`     | `BOOLEAN`           | NOT NULL, default `false`     |
| `verified_by`  | `UUID`              | FK → `auth.users(id)`         |
| `hours_worked` | `NUMERIC(5,2)`      |                               |
| `overtime`     | `NUMERIC(5,2)`      |                               |
| `notes`        | `TEXT`              |                               |
| `created_at`   | `TIMESTAMPTZ`       | NOT NULL, `now()`             |
| `updated_at`   | `TIMESTAMPTZ`       | NOT NULL, `now()`             |

---

### `audit_log` — RLS: Enabled

| Column         | Type          | Notes                 |
| -------------- | ------------- | --------------------- |
| `id`           | `UUID` PK     | `gen_random_uuid()`   |
| `user_id`      | `UUID`        | FK → `auth.users(id)` |
| `action`       | `TEXT`        | NOT NULL              |
| `target_table` | `TEXT`        |                       |
| `target_id`    | `UUID`        |                       |
| `details`      | `JSONB`       | default `'{}'`        |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL, `now()`     |

---

## Functions

### `has_role(user_id UUID, role app_role) → BOOLEAN`

- **Modifiers:** `STABLE`, `SECURITY DEFINER`
- Returns `TRUE` if the given user holds the specified role.
- Used by RLS policies to avoid recursive lookups.

### `get_user_role(user_id UUID) → app_role`

- **Modifiers:** `STABLE`, `SECURITY DEFINER`
- Returns the first role found for the given user in `user_roles`.

### `get_user_department(user_id UUID) → TEXT`

- **Modifiers:** `STABLE`, `SECURITY DEFINER`
- Returns `profiles.department` (legacy text) for the given user.

### `get_user_site(user_id UUID) → TEXT`

- **Modifiers:** `STABLE`, `SECURITY DEFINER`
- Returns `profiles.site` (legacy text) for the given user.

### `update_updated_at_column() → TRIGGER`

- Sets `NEW.updated_at = now()` before any `UPDATE`.
- Used by: `update_profiles_updated_at`, `update_attendance_updated_at`, `update_organisations_updated_at`

### `handle_new_user() → TRIGGER`

- **Modifiers:** `SECURITY DEFINER`
- Fires `AFTER INSERT` on `auth.users`.
- Creates a matching row in `profiles` and assigns the `employee` role.

---

## Triggers

| Trigger                           | Event           | Table                | Function                     |
| --------------------------------- | --------------- | -------------------- | ---------------------------- |
| `on_auth_user_created`            | `AFTER INSERT`  | `auth.users`         | `handle_new_user()`          |
| `update_profiles_updated_at`      | `BEFORE UPDATE` | `profiles`           | `update_updated_at_column()` |
| `update_attendance_updated_at`    | `BEFORE UPDATE` | `attendance_records` | `update_updated_at_column()` |
| `update_organisations_updated_at` | `BEFORE UPDATE` | `organisations`      | `update_updated_at_column()` |

---

## Indexes

| Index                          | On                                  |
| ------------------------------ | ----------------------------------- |
| `idx_profiles_department_id`   | `profiles(department_id)`           |
| `idx_profiles_profile_site_id` | `profiles(profile_site_id)`         |
| `idx_profiles_organisation_id` | `profiles(organisation_id)`         |
| `idx_shift_sites_site_id`      | `shift_sites(site_id)`              |
| `idx_attendance_employee_id`   | `attendance_records(employee_id)`   |
| `idx_attendance_site_date`     | `attendance_records(site_id, date)` |
| `idx_user_roles_user_id`       | `user_roles(user_id)`               |

---

## Migration File Summary

| File             | Description                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260415132916` | **Core schema** — enums, `profiles`, `user_roles`, `sites`, `departments`, `shifts`, `attendance_records`, `audit_log`, base RLS policies, functions, and triggers           |
| `20260415132927` | **Audit log policy fix** — replaced `"System insert audit logs"` with `"Authenticated users insert audit logs"` (requires `auth.uid()`)                                      |
| `20260416004707` | **Multi-tenancy** — added `organisations`, `organisation_roles`; added `organisation_id` FK to `profiles`, `sites`, `departments`, `shifts`                                  |
| `20260506000000` | **Schema fix + PostgREST FK** — idempotent re-run of organisations schema; added `user_roles → profiles` FK for PostgREST embedding                                          |
| `20260506000002` | **3NF / 4NF normalisation** — added `department_id` and `profile_site_id` FKs to `profiles`; added `shift_sites` junction table; added performance indexes                   |
| `20260506000003` | **Extended profile columns** — added `phone`, `address`, `emergency_contact_name`, `emergency_contact_phone`, `bio`, `id_number`, `job_title`, `date_of_birth`, `start_date` |
