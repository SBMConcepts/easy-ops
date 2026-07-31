# EasyOps — Data Flow & Relationships

Visual map of how the frontend **hooks** and **contexts** connect through the Express API
to the Supabase **schema** (`20260731_remote_schema.sql`).

Two columns join _everything_ together:

| Shared column   | Meaning                        | Where it comes from                               |
| --------------- | ------------------------------ | ------------------------------------------------- |
| `auth0_org_id`  | Tenant key (text, never empty) | Auth0 JWT `org_id` → RLS `auth0.current_org_id()` |
| `auth0_user_id` | User identity (Auth0 `sub`)    | Auth0 JWT `sub` → RLS `auth0.current_user_id()`   |

Every table carries `auth0_org_id`; every per-user table also carries `auth0_user_id`.
RLS policies filter each request on these two columns.

---

## 1. High-level data flow

```mermaid
flowchart LR
    subgraph FE["Frontend (React)"]
        direction TB
        AC["AuthContext<br/>useAuth()"]
        DC["DatabaseContext<br/>useDB()"]
        subgraph HOOKS["Hooks"]
            OA["useOrgApi()<br/>apiFetch()"]
            CU["useCurrentUser"]
            OD["useOrgData"]
            FC["useForecasting"]
            PR["usePayroll"]
            SF["useSafety"]
            SP["useSupport"]
            AR["useAccessRequestApi"]
        end
    end

    subgraph API["Express API (service_role)"]
        direction TB
        E1["/userinfo /session /login"]
        E2["/supabase-token"]
        E3["/org-sites /org-departments<br/>/org-roles /org-shifts"]
        E4["/org-attendance /org-leave<br/>/compliance"]
        E5["/labour-forecasts /labour-alerts"]
        E6["/payroll-export"]
        E7["/safety/*"]
        E8["/support/*"]
    end

    subgraph DB["Supabase / Postgres (RLS)"]
        direction TB
        T_ORG[("organizations")]
        T_USR[("users")]
        T_MEM[("org_members")]
        T_SUB[("subscriptions")]
        T_SITE[("org_sites")]
        T_DEPT[("org_departments")]
        T_ROLE[("org_roles")]
        T_SHIFT[("org_shifts")]
        T_ATT[("org_attendance")]
        T_LEAVE[("org_leave_balances")]
        T_FC[("labour_forecasts")]
        T_AL[("labour_alerts")]
        T_PAY[("payroll_export_runs")]
        T_ST[("safety_checklist_templates")]
        T_SR[("safety_checklist_responses")]
        T_INC[("incident_reports")]
        T_TIC[("support_tickets")]
        T_MSG[("support_messages")]
        T_CSM[("csm_assignments")]
    end

    AC --> OA
    CU --> OA
    OD --> OA
    FC --> OA
    PR --> OA
    SF --> OA
    SP --> OA
    AR --> OA

    OA --> API
    DC --> E2

    AC --> E1
    E1 --> T_USR & T_MEM & T_ORG & T_SUB & T_LEAVE
    E2 -.->|signed JWT| DB

    CU --> E1
    OD --> E3 & E4
    FC --> E5
    PR --> E6
    SF --> E7
    SP --> E8

    E3 --> T_SITE & T_DEPT & T_ROLE & T_SHIFT
    E4 --> T_ATT & T_LEAVE
    E4 --> T_USR
    E5 --> T_FC & T_AL
    E6 --> T_PAY & T_ATT & T_MEM
    E7 --> T_ST & T_SR & T_INC
    E8 --> T_TIC & T_MSG & T_CSM
```

---

## 2. Hook → endpoint → table → columns

| Hook (file)                                              | Express endpoint                | Table(s)                                                                       | Key columns used / shared                                                                                           |
| -------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `useCurrentUser` / `AuthContext`                         | `/userinfo`, `/session`         | `users`, `org_members`, `organizations`, `subscriptions`, `org_leave_balances` | `auth0_user_id`, `auth0_org_id`, `role`, `permissions`, `plan`, `leave_type`, `balance_days`                        |
| `useSites` (`useOrgData`)                                | `/org-sites`                    | `org_sites`                                                                    | `id`, `auth0_org_id`, `site_name`, `department_id`, `latitude`, `longitude`, `geo_radius_m`                         |
| `useDepartments` (`useOrgData`)                          | `/org-departments`              | `org_departments`                                                              | `id`, `auth0_org_id`, `department_name`                                                                             |
| `useRoles` (`useOrgData`)                                | `/org-roles`                    | `org_roles`                                                                    | `id`, `auth0_org_id`, `name`, `base_role`                                                                           |
| `useShifts` (`useOrgData`)                               | `/org-shifts`                   | `org_shifts`                                                                   | `id`, `auth0_org_id`, `shift_name`, `start_time`, `end_time`, `grace_period_minutes`, `weekly_hours`                |
| `useAttendanceRecords` (`useOrgData`)                    | `/org-attendance`               | `org_attendance` (+ `users`, `org_departments`, `org_sites` for names)         | `auth0_org_id`, `auth0_user_id`, `date`, `hours_worked`, `overtime`, `department_id`, `site_id`                     |
| `useLeaveBalances` (`useOrgData`)                        | `/org-leave?user_id=`           | `org_leave_balances`                                                           | `auth0_org_id`, `auth0_user_id`, `leave_type`, `balance_days`                                                       |
| `useComplianceCheck` (`useOrgData`)                      | `/compliance`                   | `org_attendance` (+ `org_shifts`)                                              | derived from `hours_worked`, `overtime`                                                                             |
| `useForecasts` (`useForecasting`)                        | `/labour-forecasts`             | `labour_forecasts`                                                             | `auth0_org_id`, `site_id`, `forecast_date`, `predicted_required_staff`, `predicted_hours`, `generated_by`           |
| `useAlerts` / `useUpdateAlert` (`useForecasting`)        | `/labour-alerts`                | `labour_alerts`                                                                | `auth0_org_id`, `forecast_id`, `site_id`, `auth0_user_id`, `alert_type`, `severity`, `status`                       |
| `usePayrollRuns` / `useGeneratePayroll` (`usePayroll`)   | `/payroll-export`               | `payroll_export_runs` (+ `org_attendance`, `org_members`)                      | `auth0_org_id`, `period_start`, `period_end`, `gross_total`, `paye_total`, `uif_total`, `net_total`, `generated_by` |
| `useSafetyTemplates` … (`useSafety`)                     | `/safety/templates`             | `safety_checklist_templates`                                                   | `id`, `auth0_org_id`, `name`, `items`, `active`, `created_by`                                                       |
| `useSafetyResponses` / `useSubmitResponse` (`useSafety`) | `/safety/responses`             | `safety_checklist_responses` (+ `users`)                                       | `auth0_org_id`, `auth0_user_id`, `template_id`, `shift_id`, `site_id`, `signature_data`, `passed`                   |
| `useIncidents` … (`useSafety`)                           | `/safety/incidents`             | `incident_reports` (+ `org_members`)                                           | `auth0_org_id`, `reporter_id`, `manager_user_id`, `site_id`, `department_id`, `incident_type`, `severity`, `status` |
| `useSupportTickets` … (`useSupport`)                     | `/support/tickets`              | `support_tickets`                                                              | `auth0_org_id`, `created_by`, `assigned_to`, `subject`, `category`, `priority`, `status`                            |
| `usePostReply` / `useSupportTicket` (`useSupport`)       | `/support/tickets/:id/messages` | `support_messages` (+ `support_tickets`)                                       | `ticket_id`, `auth0_org_id`, `author_id`, `author_role`, `is_internal`                                              |
| `useCsmContact` / `useUpsertCsm` (`useSupport`)          | `/support/csm`                  | `csm_assignments`                                                              | `auth0_org_id`, `csm_name`, `csm_email`, `csm_phone`                                                                |
| `useAccessRequestApi`                                    | `/access-requests`              | _(dropped in v2 — 404 at runtime)_                                             | —                                                                                                                   |
| `DatabaseContext` (`useDB`)                              | `/supabase-token`               | _(all tables via RLS)_                                                         | Injects signed JWT with `org_id` + `sub`                                                                            |

---

## 3. Schema relationships (entity view, join columns)

```mermaid
erDiagram
    organizations ||--o{ users : "auth0_org_id"
    organizations ||--o{ org_members : "auth0_org_id"
    organizations ||--o{ subscriptions : "auth0_org_id"
    organizations ||--o{ org_departments : "auth0_org_id"
    organizations ||--o{ org_sites : "auth0_org_id"
    organizations ||--o{ org_roles : "auth0_org_id"
    organizations ||--o{ org_shifts : "auth0_org_id"

    users ||--|| user_credentials : "auth0_user_id + auth0_org_id"
    users ||--o{ org_members : "auth0_user_id + auth0_org_id"

    org_members ||--o{ org_attendance : "auth0_org_id + auth0_user_id"
    org_members ||--o{ org_leave_balances : "auth0_org_id + auth0_user_id"
    org_members ||--o{ safety_checklist_responses : "auth0_user_id"
    org_members ||--o{ incident_reports : "reporter_id / manager_user_id"
    org_members ||--o{ support_tickets : "created_by"
    org_members ||--o{ labour_alerts : "auth0_user_id"
    org_members }o--o| org_members : "manager_id (self)"

    org_departments ||--o{ org_sites : "department_id"
    org_departments ||--o{ org_members : "department_id"
    org_sites ||--o{ org_members : "site_id"
    org_roles ||--o{ org_members : "job_role_id"
    org_shifts ||--o{ org_members : "shift_id"

    org_sites ||--o{ labour_forecasts : "site_id"
    labour_forecasts ||--o{ labour_alerts : "forecast_id"
    org_sites ||--o{ labour_alerts : "site_id"

    safety_checklist_templates ||--o{ safety_checklist_responses : "template_id"
    org_shifts ||--o{ safety_checklist_responses : "shift_id"
    org_sites ||--o{ safety_checklist_responses : "site_id"

    support_tickets ||--o{ support_messages : "ticket_id"
    organizations ||--|| csm_assignments : "auth0_org_id (1:1)"

    organizations ||--o{ payroll_export_runs : "auth0_org_id"
    organizations ||--o{ audit_logs : "auth0_org_id"
```

---

## 3b. Column-level schema (PK / FK / shared keys)

Full attribute view. `PK` = primary key, `FK` = foreign key, `UK` = unique key.
The two shared tenant columns (`auth0_org_id`, `auth0_user_id`) are flagged on every table
that carries them, since they are the join keys the RLS policies filter on.

### Identity & tenancy core

```mermaid
erDiagram
    organizations {
        text auth0_org_id PK "tenant key"
        text name
        text slug UK
        org_plan plan
        org_status status
        text industry
        text country
        text logo_url
        jsonb metadata
    }
    users {
        uuid id PK
        text auth0_user_id UK "shared"
        text auth0_org_id FK "shared tenant"
        citext email UK "unique per org"
        text full_name
        text first_name
        text last_name
        text mobile_number
        text national_id
        identification_type id_type
        text emergency_contact_name
        text emergency_contact_phone
    }
    user_credentials {
        uuid id PK
        text auth0_user_id FK "shared"
        text auth0_org_id FK "shared tenant"
        citext email
        text password_hash "revoked from PostgREST"
        boolean email_verified
        credential_status status
    }
    org_members {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        text auth0_user_id FK "shared, unique (1 org/user)"
        org_role role
        member_status status
        uuid department_id FK
        uuid site_id FK
        uuid job_role_id FK
        uuid shift_id FK
        uuid manager_id FK "self-ref"
        text employee_code UK
        employment_type employment_type
        numeric hourly_rate
        text tax_number
    }
    subscriptions {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        org_plan plan
        subscription_status status
        timestamptz trial_ends_at
        timestamptz current_period_end
    }
    invitations {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        citext email
        org_role role
        text token UK
        text invited_by FK "-> org_members.auth0_user_id"
        uuid accepted_member_id FK "-> org_members.id"
        timestamptz expires_at
    }

    organizations ||--o{ users : auth0_org_id
    organizations ||--o{ org_members : auth0_org_id
    organizations ||--o{ subscriptions : auth0_org_id
    organizations ||--o{ invitations : auth0_org_id
    users ||--|| user_credentials : "auth0_user_id + auth0_org_id"
    users ||--o{ org_members : "auth0_user_id + auth0_org_id"
    org_members }o--o| org_members : manager_id
    org_members ||--o{ invitations : "invited_by / accepted_member_id"
```

### Org structure & operations

```mermaid
erDiagram
    org_departments {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        text department_name UK
    }
    org_sites {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        uuid department_id FK
        text site_name UK
        text address
        double latitude
        double longitude
        numeric geo_radius_m
    }
    org_roles {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        text name UK
        org_role base_role
    }
    org_shifts {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        text shift_name UK
        time start_time
        time end_time
        int grace_period_minutes
        numeric weekly_hours
    }
    org_attendance {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        text auth0_user_id FK "shared"
        date date UK "(org,user,date)"
        attendance_method method
        numeric hours_worked
        numeric overtime
        uuid department_id FK
        uuid site_id FK
    }
    org_leave_balances {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        text auth0_user_id FK "shared"
        leave_type leave_type UK "(org,user,type)"
        numeric balance_days
    }
    audit_logs {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        text auth0_user_id FK "shared actor"
        text action
        text resource_type
        text resource_id
        jsonb diff
    }

    org_departments ||--o{ org_sites : department_id
    org_departments ||--o{ org_members : department_id
    org_sites ||--o{ org_members : site_id
    org_roles ||--o{ org_members : job_role_id
    org_shifts ||--o{ org_members : shift_id
    org_members ||--o{ org_attendance : "auth0_org_id + auth0_user_id"
    org_members ||--o{ org_leave_balances : "auth0_org_id + auth0_user_id"
    org_departments ||--o{ org_attendance : department_id
    org_sites ||--o{ org_attendance : site_id
```

### Forecasting, payroll, safety & support

```mermaid
erDiagram
    labour_forecasts {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        uuid site_id FK
        date forecast_date
        int horizon_days
        int predicted_required_staff
        numeric predicted_hours
        numeric confidence
        text generated_by FK "-> org_members.auth0_user_id"
    }
    labour_alerts {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        uuid forecast_id FK
        uuid site_id FK
        text auth0_user_id FK "shared"
        forecast_alert_type alert_type
        forecast_alert_severity severity
        forecast_alert_status status
        text acknowledged_by FK
    }
    payroll_export_runs {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        date period_start
        date period_end
        payroll_export_format format
        numeric gross_total
        numeric paye_total
        numeric uif_total
        numeric net_total
        text generated_by FK
    }
    safety_checklist_templates {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        text name UK
        jsonb items
        boolean active
        text created_by FK
    }
    safety_checklist_responses {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        uuid template_id FK
        text auth0_user_id FK "shared"
        uuid shift_id FK
        uuid site_id FK
        jsonb responses
        boolean passed
        text signature_data
    }
    incident_reports {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        text reporter_id FK "shared -> member"
        uuid site_id FK
        uuid department_id FK
        incident_type incident_type
        incident_severity severity
        incident_status status
        text manager_user_id FK "countersign"
    }
    support_tickets {
        uuid id PK
        text auth0_org_id FK "shared tenant"
        text subject
        support_ticket_category category
        support_ticket_priority priority
        support_ticket_status status
        text created_by FK
        text assigned_to "internal agent"
    }
    support_messages {
        uuid id PK
        uuid ticket_id FK
        text auth0_org_id FK "shared tenant"
        text author_id
        support_message_author author_role
        boolean is_internal
        text body
    }
    csm_assignments {
        uuid id PK
        text auth0_org_id FK "shared tenant, 1:1"
        text csm_name
        citext csm_email
        text csm_phone
    }

    labour_forecasts ||--o{ labour_alerts : forecast_id
    org_sites ||--o{ labour_forecasts : site_id
    org_sites ||--o{ labour_alerts : site_id
    safety_checklist_templates ||--o{ safety_checklist_responses : template_id
    org_shifts ||--o{ safety_checklist_responses : shift_id
    org_sites ||--o{ safety_checklist_responses : site_id
    org_sites ||--o{ incident_reports : site_id
    org_departments ||--o{ incident_reports : department_id
    support_tickets ||--o{ support_messages : ticket_id
```

---

## 4. Context boundary (how identity reaches the DB)

```mermaid
sequenceDiagram
    participant UI as React UI
    participant AC as AuthContext
    participant DC as DatabaseContext
    participant API as Express (service_role)
    participant PG as Postgres (RLS)

    UI->>AC: useAuth()
    AC->>API: GET /session (cookie)
    AC->>API: GET /userinfo
    API->>PG: read users + org_members + organizations + subscriptions
    PG-->>API: profile rows (filtered by auth0_org_id)
    API-->>AC: CurrentUserProfile { role, permissions, org, leave_balances }

    UI->>DC: useDB()
    DC->>API: GET /supabase-token
    API-->>DC: signed JWT { org_id, sub, role }
    DC->>PG: PostgREST call with Bearer JWT
    Note over PG: auth0.current_org_id() = org_id<br/>auth0.current_user_id() = sub<br/>RLS filters every row
```

---

## 5. Hooks → Contexts → Schema (the join map)

Every hook depends on exactly two contexts, and each context resolves to a
concrete set of schema columns. `AuthContext` supplies the **identity**
(`auth0_org_id`, `auth0_user_id`, `role`, `permissions`); `DatabaseContext`
supplies the **typed, RLS-scoped client** used for direct reads.

| Consumer (hook)              | `AuthContext` field used     | `DatabaseContext` used | Schema columns reached (via API/RLS)                                                             |
| ---------------------------- | ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `useCurrentUser`             | `user.id`, `isAuthenticated` | –                      | `users.*`, `org_members.role`, `organizations.*`, `subscriptions.plan`, `org_leave_balances`     |
| `useSites`                   | `user` (gate)                | `useDB()` (gate)       | `org_sites.id/site_name/department_id/lat/lng/geo_radius_m`                                      |
| `useDepartments`             | `user` (gate)                | –                      | `org_departments.id/department_name`                                                             |
| `useRoles`                   | `user` (gate)                | –                      | `org_roles.id/name/base_role`                                                                    |
| `useShifts`                  | `user` (gate)                | –                      | `org_shifts.id/shift_name/start_time/end_time`                                                   |
| `useAttendanceRecords`       | `user` (gate)                | –                      | `org_attendance.*` + `users` + `org_departments`/`org_sites` names                               |
| `useLeaveBalances`           | –                            | –                      | `org_leave_balances.leave_type/balance_days`                                                     |
| `useComplianceCheck`         | `user` (gate)                | –                      | `org_attendance` (+ `org_shifts`) derived                                                        |
| `useForecasts` / `useAlerts` | `user` (gate)                | –                      | `labour_forecasts.*`, `labour_alerts.*`                                                          |
| `usePayrollRuns`             | `user` (gate)                | –                      | `payroll_export_runs.*` (+ `org_attendance`, `org_members`)                                      |
| `useSafety*`                 | `user` (gate)                | –                      | `safety_checklist_templates/_responses`, `incident_reports`                                      |
| `useSupport*`                | `user` (gate)                | –                      | `support_tickets/_messages`, `csm_assignments`                                                   |
| `AuthContext` (self)         | –                            | –                      | `/userinfo` → `users` + `org_members` + `organizations` + `subscriptions` + `org_leave_balances` |
| `DatabaseContext` (self)     | –                            | issues client          | `/supabase-token` → signed JWT `{ org_id, sub, role }` for RLS                                   |

```mermaid
flowchart TB
    subgraph CTX["Contexts (identity boundary)"]
        AC["AuthContext.user<br/>{ id, auth0_org_id, auth0_user_id,<br/>role, permissions }"]
        DC["DatabaseContext<br/>TypedSupabaseClient(JWT)"]
    end

    subgraph H["Hooks (consumers)"]
        CU["useCurrentUser"]
        OD["useOrgData*"]
        FC["useForecasting*"]
        PR["usePayroll*"]
        SF["useSafety*"]
        SP["useSupport*"]
    end

    subgraph K["Join keys"]
        ORG(["auth0_org_id"])
        USR(["auth0_user_id"])
    end

    AC --> CU & OD & FC & PR & SF & SP
    DC --> OD
    AC --> ORG & USR
    DC --> ORG & USR

    ORG --> TBL["every table<br/>(tenant filter)"]
    USR --> UTBL["per-user tables<br/>users, org_members, org_attendance,<br/>org_leave_balances, labour_alerts,<br/>safety_*, incident_reports, support_*"]
```

---

## 6. Final end-to-end data flow

```mermaid
flowchart LR
    subgraph BROWSER["Browser — React"]
        direction TB
        PAGES["Pages / Components"]
        subgraph CTX["Contexts"]
            AUTH["AuthContext<br/>useAuth()"]
            DB["DatabaseContext<br/>useDB()"]
        end
        subgraph HK["Hooks"]
            OAPI["useOrgApi.apiFetch()"]
            DATA["useCurrentUser · useOrgData<br/>useForecasting · usePayroll<br/>useSafety · useSupport"]
        end
        RQ["React Query cache<br/>(queryKeys)"]
    end

    subgraph EDGE["Express API — service_role"]
        SESS["/session · /userinfo · /login"]
        TOK["/supabase-token"]
        REST["/org-* · /labour-* · /payroll-*<br/>/safety/* · /support/*"]
    end

    subgraph PGDB["Supabase Postgres"]
        RLS{{"RLS gate<br/>auth0.current_org_id() = org_id<br/>auth0.current_user_id() = sub"}}
        TABLES[("22 tenant tables<br/>keyed on auth0_org_id<br/>(+ auth0_user_id)")]
    end

    PAGES --> AUTH & DB & DATA
    DATA --> OAPI
    DATA <--> RQ
    AUTH --> SESS
    DB --> TOK
    OAPI --> REST

    SESS --> RLS
    REST --> RLS
    TOK -.->|signs JWT<br/>org_id + sub + role| DB
    DB -->|Bearer JWT| RLS
    RLS --> TABLES
    TABLES -->|rows scoped to tenant| RLS
    RLS -->|JSON| REST
    REST -->|JSON| OAPI
    OAPI -->|typed data| DATA
    DATA -->|render| PAGES
```

**Read path:** Component → hook → `useOrgApi` → Express (service_role) → RLS-scoped query → table rows → JSON back up the chain, cached by React Query.
**Identity path:** `AuthContext` establishes the session (`auth0_org_id` + `auth0_user_id`); `DatabaseContext` mints the signed JWT so any direct `useDB()` read is filtered by the same two keys.

---

### Notes

- **`useOrgApi`** is the shared transport — every data hook calls its `apiFetch`, which sends the session cookie (`credentials: 'include'`). It touches no table directly.
- **`org_attendance`** has RLS enabled but _no direct-read policy_, so the client cannot read it via `useDB()`; it is served only through the service-role Express `/org-attendance` endpoint (see [useOrgData.ts](../src/hooks/useOrgData.ts#L74-L90)).
- **`user_credentials.password_hash`** is never exposed through PostgREST (column-level `revoke`); only the Auth0 custom-DB scripts and Express (service_role) read it.
- **`useAccessRequestApi`** targets a feature removed in v2; its endpoints 404.
