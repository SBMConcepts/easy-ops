# EasyOps — Billing & Plan Model (v1)

Plans: `trial` | `starter` | `growth` | `pro` | `enterprise`
Currency: ZAR (VAT-inclusive display, 15% VAT). Billing provider: Paystack.

---

## 1. Pricing formula

`Monthly price = (Included employees × Per-employee rate) + R49 platform base`

| Plan         | Included employees | Per-employee      | Base   | Monthly                | Annual (2 months free ≈ 17% off) | Extra employee (overage) |
| ------------ | ------------------ | ----------------- | ------ | ---------------------- | -------------------------------- | ------------------------ |
| Trial / Demo | up to 25           | —                 | —      | R0 (14 days)           | —                                | Blocked at cap           |
| Starter      | 25                 | R8                | R49    | **R249**               | R2,490                           | R10 / employee           |
| Growth       | 50                 | R13               | R49    | **R699**               | R6,990                           | R15 / employee           |
| Pro          | 100                | R18               | R49    | **R1,849**             | R18,490                          | R20 / employee           |
| Enterprise   | 250+ (contracted)  | from R16 (volume) | Custom | **POA** (from ~R4,500) | Annual contract                  | Negotiated               |

> The current website shows annual as 12 × monthly (e.g. R2,988). Pick one: keep "12 × monthly", or switch to the "2 months free" values above and update the pricing section to match.

---

## 2. Usage limits per plan

| Limit                       | Trial   | Starter   | Growth    | Pro        | Enterprise                               |
| --------------------------- | ------- | --------- | --------- | ---------- | ---------------------------------------- |
| Employees (seats)           | 25      | 25        | 50        | 100        | Unlimited (contracted)                   |
| Sites                       | 1       | 1         | 3         | 10         | Unlimited                                |
| Departments                 | 3       | 3         | 6         | 25         | Unlimited                                |
| Admin users                 | 1       | 1         | 3         | 10         | Unlimited                                |
| Custom roles                | —       | —         | 5         | 20         | Unlimited                                |
| Data retention (attendance) | 30 days | 12 months | 24 months | 5 years    | 7 years+ (BCEA ≥3 yrs met on paid plans) |
| WhatsApp check-ins / month  | 100     | 500       | 2,000     | 10,000     | Custom                                   |
| AI forecast runs / month    | 3       | —         | 30        | 150        | Unlimited (fair use)                     |
| Forecast horizon            | 7 days  | —         | 7 days    | 30 days    | 90 days                                  |
| Report/export history       | 30 days | 3 months  | 12 months | 36 months  | Unlimited                                |
| API access                  | —       | —         | Read-only | Read/Write | Full + webhooks                          |

---

## 3. Feature matrix (with gating keys)

`feature_key` = value stored in `plan_features`, checked by `has_feature()`.

| Feature                                                   | feature_key            | Trial        | Starter | Growth   | Pro    | Enterprise |
| --------------------------------------------------------- | ---------------------- | ------------ | ------- | -------- | ------ | ---------- |
| Attendance clock-in/out (QR, manual)                      | `attendance_core`      | ✓            | ✓       | ✓        | ✓      | ✓          |
| Geofence + time validation                                | `geofence`             | ✓            | ✓       | ✓        | ✓      | ✓          |
| WhatsApp check-in                                         | `whatsapp_checkin`     | ✓            | ✓       | ✓        | ✓      | ✓          |
| Biometric check-in                                        | `biometric_checkin`    | ✓            | —       | ✓        | ✓      | ✓          |
| Live attendance board                                     | `live_attendance`      | ✓            | ✓       | ✓        | ✓      | ✓          |
| Employee management + invites                             | `employee_mgmt`        | ✓            | ✓       | ✓        | ✓      | ✓          |
| Sites & departments                                       | `sites_departments`    | ✓            | ✓       | ✓        | ✓      | ✓          |
| Basic reports / payslips                                  | `reports_basic`        | ✓            | ✓       | ✓        | ✓      | ✓          |
| Custom roles & permissions                                | `custom_roles`         | ✓            | —       | ✓        | ✓      | ✓          |
| BCEA compliance checks & audit log                        | `compliance_audit`     | ✓            | —       | ✓        | ✓      | ✓          |
| Smart Shift Scheduling (rosters, drag & drop, variance)   | `smart_scheduling`     | ✓            | —       | ✓        | ✓      | ✓          |
| Predictive Labour Forecasting (7-day)                     | `labour_forecasting`   | ✓            | —       | ✓        | ✓      | ✓          |
| Extended forecasting (30/90-day, AI refinement, accuracy) | `forecasting_extended` | —            | —       | —        | ✓      | ✓          |
| Payroll Export Pro (Sage, Xero, PaySpace, EMP201)         | `payroll_export_pro`   | Preview only | —       | CSV only | ✓      | ✓          |
| Safety Ops (checklists, incidents, e-signatures)          | `safety_ops`           | ✓            | —       | —        | ✓      | ✓          |
| Advanced analytics & cost-leak detection                  | `advanced_analytics`   | —            | —       | —        | ✓      | ✓          |
| Automation workflows                                      | `automation`           | —            | —       | —        | ✓      | ✓          |
| Support Centre — tickets                                  | `support_center`       | ✓            | ✓       | ✓        | ✓      | ✓          |
| Premium support SLA                                       | `premium_support`      | —            | —       | —        | ✓ (4h) | ✓ (2h)     |
| Dedicated Customer Success Manager                        | `dedicated_csm`        | —            | —       | —        | —      | ✓          |
| SSO (SAML/OIDC)                                           | `sso`                  | —            | —       | —        | —      | ✓          |
| Custom integrations / private cloud                       | `custom_integrations`  | —            | —       | —        | —      | ✓          |

**Support SLA (first response):** Trial 48h (email) · Starter 24h · Growth 12h · Pro 4h · Enterprise 2h (24/7 for urgent).

> Note: the app currently uses the plan name `business` for the tier above Growth. Rename `business` → `pro` so the app, website and Paystack use the same name (see section 8).

---

## 4. Trial and Demo — one mechanism, two entry points

Trial and Demo are **the same thing in the system**: an organisation on plan `trial` with status `trialing` and an end date. Only the entry point and the starting data differ.

|               | Self-serve Trial                           | Sales Demo                                                               |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| Started by    | Prospect via "Start free trial" on pricing | Sales team via Get Started lead                                          |
| Length        | 14 days                                    | 14 days (sales can extend to 30)                                         |
| Data          | Empty org → onboarding wizard              | Pre-loaded sample data (sites, 20 employees, 4 weeks attendance, roster) |
| Card required | No                                         | No                                                                       |
| Features      | Growth + Pro preview (see matrix)          | Same                                                                     |
| Flag          | `settings.trial_source = 'self_serve'`     | `settings.trial_source = 'demo'`, `settings.demo_data = true`            |

Rules:

- Switching demo ↔ trial just changes `trial_source`; on conversion, demo sample data is cleared (with a "keep my data" choice for trial users).
- Reminders: day 7, day 11, day 13, and on expiry (email + in-app banner).
- On expiry with no payment: status → `suspended` (read-only for 30 days, then data archived). The user can still log in, see data, and upgrade.
- One trial per organisation / company registration number / admin email.

---

## 5. Subscription lifecycle

```text
 trial(trialing) ──pay──► active ──renewal fails──► past_due ──7 days + 3 retries──► suspended
       │                    │  ▲                         │                               │
       └──expires──► suspended  └──────payment ok────────┘◄──────────pay────────────────┘
                            │
                     cancel ─► cancelled (active until period end, then read-only)
```

- **Upgrade:** immediate; charge prorated difference for the rest of the period.
- **Downgrade:** applied at next renewal; blocked if usage is above the new plan's limits (e.g. 60 employees → Starter).
- **Seat overage:** counted at month-end from active employees, invoiced as an extra charge on the next bill.
- **Dunning (past_due):** retries day 1, 3, 5; banner shown to admins; full access kept for 7 days.

---

## 6. Paystack setup

Create one Paystack **Plan** per plan × interval. Amounts are in **cents** (R249 = 24900).

| Plan code (your reference) | Name                    | Interval           | Amount (cents) |
| -------------------------- | ----------------------- | ------------------ | -------------- |
| `EZ_STARTER_M`             | EazyOps Starter Monthly | monthly            | 24900          |
| `EZ_STARTER_Y`             | EazyOps Starter Annual  | annually           | 249000         |
| `EZ_GROWTH_M`              | EazyOps Growth Monthly  | monthly            | 69900          |
| `EZ_GROWTH_Y`              | EazyOps Growth Annual   | annually           | 699000         |
| `EZ_PRO_M`                 | EazyOps Pro Monthly     | monthly            | 184900         |
| `EZ_PRO_Y`                 | EazyOps Pro Annual      | annually           | 1849000        |
| Enterprise                 | Custom plan per client  | annually / monthly | Contracted     |

Trial is **not** a Paystack plan — it lives only in your database. When the trial converts, create the Paystack subscription for the chosen plan.

Overage: charge via Paystack `charge_authorization` on the saved card at month-end (not part of the plan amount).

Paystack webhook events to handle:

| Event                               | Action in EazyOps                                   |
| ----------------------------------- | --------------------------------------------------- |
| `charge.success`                    | Mark invoice paid; status → `active`                |
| `subscription.create`               | Save `subscription_code`, `email_token`, period end |
| `invoice.create` / `invoice.update` | Store invoice; if failed → `past_due`               |
| `invoice.payment_failed`            | `past_due`, start dunning                           |
| `subscription.not_renew`            | Flag cancel at period end                           |
| `subscription.disable`              | status → `cancelled` / `suspended`                  |

Verify every webhook with the `x-paystack-signature` header (HMAC SHA-512 with your secret key).

---

## 7. Single source of truth (config for app + pricing section)

```ts
export type PlanId = 'trial' | 'starter' | 'growth' | 'pro' | 'enterprise'

export const PLANS: Record<
  PlanId,
  {
    name: string
    monthlyZAR: number | null
    annualZAR: number | null
    includedEmployees: number | null
    perEmployee: number | null
    overagePerEmployee: number | null
    limits: {
      sites: number | null
      departments: number | null
      admins: number | null
      forecastHorizonDays: number
      retentionMonths: number
    }
    paystack: { monthly?: string; annual?: string }
    features: string[]
    slaHours: number
    trialDays?: number
  }
> = {
  trial: {
    name: 'Free Trial',
    monthlyZAR: 0,
    annualZAR: null,
    includedEmployees: 25,
    perEmployee: null,
    overagePerEmployee: null,
    limits: { sites: 1, departments: 3, admins: 1, forecastHorizonDays: 7, retentionMonths: 1 },
    paystack: {},
    slaHours: 48,
    trialDays: 14,
    features: [
      'attendance_core',
      'geofence',
      'whatsapp_checkin',
      'biometric_checkin',
      'live_attendance',
      'employee_mgmt',
      'sites_departments',
      'reports_basic',
      'custom_roles',
      'compliance_audit',
      'smart_scheduling',
      'labour_forecasting',
      'payroll_export_preview',
      'safety_ops',
      'support_center',
    ],
  },
  starter: {
    name: 'Starter',
    monthlyZAR: 249,
    annualZAR: 2490,
    includedEmployees: 25,
    perEmployee: 8,
    overagePerEmployee: 10,
    limits: { sites: 1, departments: 3, admins: 1, forecastHorizonDays: 0, retentionMonths: 12 },
    paystack: { monthly: 'PLN_xxx_starter_m', annual: 'PLN_xxx_starter_y' },
    slaHours: 24,
    features: [
      'attendance_core',
      'geofence',
      'whatsapp_checkin',
      'live_attendance',
      'employee_mgmt',
      'sites_departments',
      'reports_basic',
      'support_center',
    ],
  },
  growth: {
    name: 'Growth',
    monthlyZAR: 699,
    annualZAR: 6990,
    includedEmployees: 50,
    perEmployee: 13,
    overagePerEmployee: 15,
    limits: { sites: 3, departments: 6, admins: 3, forecastHorizonDays: 7, retentionMonths: 24 },
    paystack: { monthly: 'PLN_xxx_growth_m', annual: 'PLN_xxx_growth_y' },
    slaHours: 12,
    features: [
      'attendance_core',
      'geofence',
      'whatsapp_checkin',
      'biometric_checkin',
      'live_attendance',
      'employee_mgmt',
      'sites_departments',
      'reports_basic',
      'custom_roles',
      'compliance_audit',
      'smart_scheduling',
      'labour_forecasting',
      'payroll_export_csv',
      'support_center',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyZAR: 1849,
    annualZAR: 18490,
    includedEmployees: 100,
    perEmployee: 18,
    overagePerEmployee: 20,
    limits: {
      sites: 10,
      departments: 25,
      admins: 10,
      forecastHorizonDays: 30,
      retentionMonths: 60,
    },
    paystack: { monthly: 'PLN_xxx_pro_m', annual: 'PLN_xxx_pro_y' },
    slaHours: 4,
    features: [
      'attendance_core',
      'geofence',
      'whatsapp_checkin',
      'biometric_checkin',
      'live_attendance',
      'employee_mgmt',
      'sites_departments',
      'reports_basic',
      'custom_roles',
      'compliance_audit',
      'smart_scheduling',
      'labour_forecasting',
      'forecasting_extended',
      'payroll_export_pro',
      'safety_ops',
      'advanced_analytics',
      'automation',
      'support_center',
      'premium_support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    monthlyZAR: null,
    annualZAR: null,
    includedEmployees: null,
    perEmployee: null,
    overagePerEmployee: null,
    limits: {
      sites: null,
      departments: null,
      admins: null,
      forecastHorizonDays: 90,
      retentionMonths: 84,
    },
    paystack: {},
    slaHours: 2,
    features: ['*'], // all features incl. dedicated_csm, sso, custom_integrations
  },
}
```

The pricing section, the upgrade prompts, feature gating and Paystack checkout should all read from this one list so prices never drift apart.

---

## 8. Database changes needed to adopt this model

```sql
-- 1. Plan names: add trial + pro, retire business
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'trial';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'pro';
-- (separate migration) UPDATE subscriptions SET plan='pro' WHERE plan='business';
--                      UPDATE plan_features SET plan='pro' WHERE plan='business';

-- 2. Billing columns on subscriptions
ALTER TABLE subscriptions
  ADD COLUMN billing_interval text DEFAULT 'monthly',      -- monthly | annual
  ADD COLUMN trial_ends_at timestamptz,
  ADD COLUMN trial_source text,                            -- self_serve | demo
  ADD COLUMN cancel_at_period_end boolean DEFAULT false,
  ADD COLUMN paystack_customer_code text,
  ADD COLUMN paystack_subscription_code text,
  ADD COLUMN paystack_email_token text,
  ADD COLUMN paystack_authorization_code text;

-- 3. Limits table (numbers live in data, not code)
CREATE TABLE plan_limits (plan subscription_plan, limit_key text, value integer, PRIMARY KEY (plan, limit_key));

-- 4. Invoices
CREATE TABLE billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid REFERENCES organisations(id),
  paystack_reference text UNIQUE, amount_cents integer, currency text DEFAULT 'ZAR',
  kind text,               -- subscription | overage | proration
  status text,             -- pending | paid | failed | refunded
  period_start date, period_end date, created_at timestamptz DEFAULT now());
```

Plus: `has_feature()` should also allow `trialing` only while `trial_ends_at > now()`.

---

## 9. Pricing section copy (ready to use)

- **Free Trial** — "14 days, no card. Try scheduling, forecasting and safety tools with up to 25 staff."
- **Starter — R249/mo** — "Digital attendance for one site and up to 25 staff."
- **Growth — R699/mo** _(Most popular)_ — "Multi-site rosters, BCEA compliance and 7-day labour forecasts for up to 50 staff."
- **Pro — R1,849/mo** — "Full payroll exports, safety ops, 30-day AI forecasts and 4-hour support for up to 100 staff."
- **Enterprise — Let's talk** — "Unlimited staff and sites, SSO, a dedicated success manager and 2-hour SLA."

Footnote: "Prices include VAT. Extra employees billed monthly at your plan's overage rate. Annual plans get 2 months free."
