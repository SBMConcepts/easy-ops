# EasyOps — Workforce Management Platform

> Simplifying attendance tracking, shift scheduling, predictive labour forecasting, payroll integration, and BCEA compliance for businesses across South Africa.

---

## Table of Contents

- [EasyOps — Workforce Management Platform](#easyops--workforce-management-platform)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Tech Stack](#tech-stack)
  - [Architecture \& Key Highlights](#architecture--key-highlights)
  - [Platform Features](#platform-features)
    - [1. Multi-Method Attendance \& Time Tracking](#1-multi-method-attendance--time-tracking)
    - [2. Smart Shift Scheduling \& Rosters](#2-smart-shift-scheduling--rosters)
    - [3. Predictive Labour Forecasting \& Alerts](#3-predictive-labour-forecasting--alerts)
    - [4. BCEA Labour Law Compliance](#4-bcea-labour-law-compliance)
    - [5. Payroll Export Engine](#5-payroll-export-engine)
    - [6. Safety Ops (HSE)](#6-safety-ops-hse)
    - [7. Support Center \& Customer Success](#7-support-center--customer-success)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Development](#development)
    - [Building for Production](#building-for-production)
    - [Docker Development](#docker-development)
  - [API Route Tiers](#api-route-tiers)
    - [1. Public Endpoints (Pre-Auth / Intake)](#1-public-endpoints-pre-auth--intake)
    - [2. Identity Provider Webhook](#2-identity-provider-webhook)
    - [3. Authenticated Session Tier](#3-authenticated-session-tier)
    - [4. Operational Feature Routes](#4-operational-feature-routes)
    - [5. Privileged Administrative Routes](#5-privileged-administrative-routes)
  - [Multi-Tenant Data \& Security](#multi-tenant-data--security)
  - [Billing \& Plans](#billing--plans)
  - [South African Regulatory Compliance](#south-african-regulatory-compliance)

---

## Overview

EasyOps is a complete, enterprise-grade multi-tenant workforce operations platform built specifically for the South African market. It unifies digital time-and-attendance logging, automated shift rostering, predictive AI-assisted labour forecasting, health and safety checklists, payroll exports, and statutory BCEA/LRA compliance auditing into a single intuitive system.

The platform serves organizations scaling from single-site SMEs to large distributed enterprises with tens of thousands of workforce members.

---

## Tech Stack

| Layer                     | Technology                                                                           | Details                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **Frontend Framework**    | [React 19](https://react.dev) + [Vite 8](https://vitejs.dev)                         | High-performance SPA with client-side routing via React Router v7                        |
| **Language**              | [TypeScript 5/6](https://www.typescriptlang.org/)                                    | Strict type-safety across both frontend client and backend server                        |
| **Styling & UI**          | [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)      | Modern styling with `@tailwindcss/vite`, `tw-animate-css`, Radix/Base UI primitives      |
| **State & Data Fetching** | [TanStack React Query v5](https://tanstack.com/query)                                | Client-side cache synchronization, automatic refetching, and optimistic mutations        |
| **Icons & Animations**    | [Lucide React](https://lucide.dev) + [Framer Motion](https://www.framer.com/motion/) | Consistent iconography and smooth micro-interactions                                     |
| **Backend API**           | [Express 5](https://expressjs.com) on [Node.js 26](https://nodejs.org)               | Modular REST API with route-tier middleware and caching controls                         |
| **Authentication & IAM**  | [Auth0 by Okta](https://auth0.com)                                                   | Universal Login, OIDC session management, custom database scripts, and Auth0 Actions     |
| **Database & Tenancy**    | [Supabase](https://supabase.com) (PostgreSQL 15+)                                    | Row-Level Security (RLS), composite primary keys, triggers, and PostgREST access         |
| **Payments & Billing**    | [Paystack](https://paystack.com)                                                     | Recurring subscriptions in ZAR, hosted payment authorization, HMAC-SHA512 webhooks       |
| **Telephony & SMS**       | [Amazon SNS](https://aws.amazon.com/sns/)                                            | Dual integration: Auth0 Custom Phone Provider for MFA/signup OTP + app-level SMS invites |
| **Email Delivery**        | [Resend](https://resend.com)                                                         | Transactional notifications and sales demo request delivery                              |

---

## Architecture & Key Highlights

- **Multi-Tenant Logical Isolation:** Tenant boundary is strictly enforced at the database layer via `auth0_org_id` and composite primary keys `PRIMARY KEY (auth0_org_id, id)` across all tenant tables. Supabase Row-Level Security (RLS) filters queries based on the authenticated session's `auth0.current_org_id()` and `auth0.current_user_id()`.
- **Hybrid Auth & Token Minting:** Browser sessions use secure, HTTP-only rolling OIDC cookies (`express-openid-connect`). When the frontend requires direct scoped PostgREST access, `/api/supabase-token` mints a short-lived, cryptographically signed JWT containing the tenant claims.
- **Dual Identifier Authentication:** Supports both international E.164 phone numbers (`+27...`) and standard email addresses for login, verification OTPs, and team invitations.
- **Role-Based Portals:** Granular RBAC (`admin`, `manager`, `supervisor`, `employee`) driving tailored dashboard interfaces, navigational permissions, and backend middleware authorization.

---

## Platform Features

### 1. Multi-Method Attendance & Time Tracking

- **QR Code Scanning:** Dynamic, time-expiring site QR codes for rapid mobile clock-in/out.
- **Biometric Verification:** Facial/biometric verification vectors on supported kiosk/mobile devices.
- **WhatsApp Check-In:** Low-friction messaging bot clock-in for field workers.
- **Live Attendance Board:** Real-time visibility of clocked-in staff, active sites, tardiness, and overtime.
- **Geofenced Sites:** GPS radius verification ensuring workers clock in within authorized boundaries.

### 2. Smart Shift Scheduling & Rosters

- Reusable shift templates (`org_shifts`) with configurable grace periods and weekly hours.
- Scheduled dated assignments (`org_roster_shifts`) mapping workers to specific sites, dates, and times.
- Shift variance tracking comparing scheduled rosters directly against actual clock-in attendance records.

### 3. Predictive Labour Forecasting & Alerts

- AI-driven staffing demand prediction over 7-day, 30-day, and 90-day horizons.
- Automated anomaly detection flagging staffing shortages, understaffed shifts, and employee burnout risks.
- Department- and site-specific labour requirement modeling.

### 4. BCEA Labour Law Compliance

- Continuous compliance monitoring against South Africa’s **Basic Conditions of Employment Act (BCEA)**.
- Overtime caps enforcement (maximum 10 hours/week, 1.5× rate calculation).
- Mandatory statutory meal interval deductions.
- Statutory leave balance ledgers (Annual, Sick, Family Responsibility, Maternity, Study).
- Immutable system audit logs recording operational changes for Department of Employment audits.

### 5. Payroll Export Engine

- Automated payroll export runs calculating gross pay, PAYE tax brackets, and UIF statutory deductions.
- Export formats ready for direct ingestion into Sage Pastel, Xero, PaySpace, and SARS EMP201 reconciliation reports.

### 6. Safety Ops (HSE)

- Digital safety checklist templates with versioned inspection items.
- Digital sign-offs with recorded signatures and pass/fail thresholds.
- Incident report logging with severity levels and mandatory manager countersignatures.

### 7. Support Center & Customer Success

- Integrated support ticketing with priority routing, categorized queues, and internal notes.
- Dedicated Customer Success Manager (CSM) assignment for Enterprise tier organizations.

---

## Project Structure

```text
easy-ops/
├── api/
│   └── index.ts                 # Vercel serverless entry point exporting Express app
├── auth0/
│   ├── actions/                 # Auth0 Flow Actions
│   │   ├── custom-phone-provider.js   # Amazon SNS SMS OTP provider
│   │   ├── post-login.js              # Enriches token claims with org and profile
│   │   ├── post-user-registration.js  # Syncs new users to database
│   │   └── pre-user-registration.js   # Pre-registration hooks
│   └── database-scripts/        # Custom Database Connection scripts
│       ├── change-password.js
│       ├── create.js
│       ├── delete.js
│       ├── get-user.js
│       ├── login.js
│       └── verify.js
├── docs/                        # Technical architecture & compliance specifications
│   ├── data-flow-diagram.md     # Full sequence diagrams, ERDs, and API-to-DB join maps
│   ├── EasyOps_Billing_Plan_Model.md # Paystack billing formula, limits, and webhooks
│   ├── easyops_compliance_suite.md   # POPIA, BCEA, CPA, ECTA, and Cybercrimes legal suite
│   ├── sns-phone-integration.md # Amazon SNS setup for OTP and SMS invitations
│   └── auth0-metadata-checklist.txt
├── server/                      # Express 5 backend API
│   ├── app.ts                   # Express server definition, middleware, and route mounting
│   ├── index.ts                 # Local development and container entry point (Port 3000)
│   ├── lib/                     # Server-side business logic & client singletons
│   │   ├── auth-middleware.ts   # requireAuth, requireOrg, requireRole, requirePermission
│   │   ├── auth.ts              # Session and token utilities
│   │   ├── auth0-admin.ts       # Auth0 Management API client
│   │   ├── database.ts          # Postgres pool helper
│   │   ├── paystack.ts          # Paystack API client & webhook signature verification
│   │   ├── phone.ts             # E.164 phone validation
│   │   ├── rbac.ts              # Permission sets and role hierarchy
│   │   ├── sns.ts               # Amazon SNS SMS client
│   │   └── supabase-admin.ts    # Supabase service_role client
│   ├── routes/                  # Modular route controllers
│   │   ├── auth-sync.ts         # Identity sync webhook from Auth0
│   │   ├── billing.ts           # Paystack checkout, subscriptions, and webhooks
│   │   ├── compliance.ts        # BCEA compliance audit checks
│   │   ├── demo-request.ts      # Demo lead intake (Resend email delivery)
│   │   ├── invitations.ts       # Email & SMS team member invitations
│   │   ├── labour-forecasting.ts# Forecast generation, alerts, and acknowledge
│   │   ├── onboarding.ts        # Initial organization setup wizard
│   │   ├── org-attendance.ts    # Attendance clock-in/out records
│   │   ├── org-departments.ts   # Department hierarchy management
│   │   ├── org-leave.ts         # Leave balances and requests
│   │   ├── org-lookup.ts        # Slug and organization lookup
│   │   ├── org-members.ts       # Member directory, roles, and status
│   │   ├── org-roles.ts         # Custom job roles & base permission assignment
│   │   ├── org-roster-shifts.ts # Scheduled roster shift assignments
│   │   ├── org-shifts.ts        # Shift templates
│   │   ├── org-sites.ts         # Sites, locations, and geofence coordinates
│   │   ├── organizations.ts     # Org creation and metadata
│   │   ├── payroll-export.ts    # Payroll calculations and CSV export runs
│   │   ├── safety.ts            # Safety templates, responses, and incident reports
│   │   ├── session.ts           # Current authenticated OIDC session state
│   │   ├── subscriptions.ts     # Subscription metadata read
│   │   ├── supabase-token.ts    # Mints scoped Supabase PostgREST JWTs
│   │   ├── support.ts           # Support tickets, messages, and CSM assignment
│   │   ├── user-credentials.ts  # Account management
│   │   └── userinfo.ts          # Full profile and organization resolution
│   ├── scripts/                 # Utility scripts (SQL executor, type generator)
│   └── types/                   # Backend TypeScript declarations & Supabase DB types
├── src/                         # React 19 frontend application
│   ├── components/              # Shared UI components and layout blocks
│   │   ├── AppHeader.tsx        # Workspace header bar
│   │   ├── AppLayout.tsx        # Authenticated application shell
│   │   ├── AppSidebar.tsx       # Dynamic navigation sidebar with role gating
│   │   ├── DemoModal.tsx        # Interactive demo request dialog
│   │   ├── PricingSection.tsx   # Tiered pricing plans with monthly/annual switch
│   │   ├── ProtectedRoute.tsx   # Client-side authentication and role guard
│   │   ├── TopNavBar.tsx        # Public marketing navbar
│   │   ├── employees/           # Employee management modals and forms
│   │   ├── onboarding/          # Step-by-step company onboarding wizard
│   │   └── ui/                  # Reusable shadcn/ui components
│   ├── contexts/                # React context providers
│   │   ├── AuthContext.tsx      # Current user session, role, and logout
│   │   └── DatabaseContext.tsx  # Typed, RLS-scoped Supabase client
│   ├── hooks/                   # Custom business hooks (useOrgApi, useOrgData, etc.)
│   ├── pages/                   # Application views and public marketing pages
│   │   ├── Index.tsx            # Marketing landing page
│   │   ├── LoginPage.tsx        # Auth0 redirection trigger
│   │   ├── Register.tsx         # Organization registration & plan selection
│   │   ├── Onboarding.tsx       # Initial organization setup
│   │   ├── InviteAccept.tsx     # Resolves SMS/email invitation tokens
│   │   ├── CheckIn.tsx          # Standalone worker clock-in terminal
│   │   ├── dashboard/           # Role-specific dashboards (Admin, Manager, etc.)
│   │   ├── workspace/           # General settings, Members, and Paystack Billing
│   │   └── settings/            # User profile, attendance rules, and security
│   └── styles/                  # Custom CSS stylesheets
├── supabase/                    # Supabase database configurations & migrations
│   ├── config.toml              # Local Supabase configuration
│   └── migrations/              # Incremental SQL migrations
├── docker-compose.yml           # Multi-container local orchestration
├── Dockerfile                   # Multi-stage production container build (Node 26)
├── Dockerfile.dev               # Fast-reload development container build
├── package.json                 # Project dependencies and workspace scripts
└── vite.config.ts               # Vite build configuration with Tailwind CSS plugin
```

---

## Getting Started

### Prerequisites

- **Node.js 26+** (LTS or current)
- **npm 11+**
- **Docker & Docker Compose** (optional, for containerized development)
- An active **Auth0** tenant
- A **Supabase** project (local CLI or hosted PostgreSQL)
- **Paystack** test credentials (for billing workflows)
- **Amazon Web Services (AWS)** account with SNS access (for SMS verification and invites)

### Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/SBMConcepts/easy-ops.git
cd easy-ops
npm install
```

### Development

Run the frontend and backend concurrently in separate terminals or with the unified script:

```bash
# Option A: Run frontend and backend concurrently
npm run dev:full

# Option B: Run in separate terminals
# Terminal 1: Vite React SPA (http://localhost:5173)
npm run dev

# Terminal 2: Express API with live tsx watch (http://localhost:3000)
npm run server:dev
```

### Building for Production

Compile TypeScript and build the production bundles:

```bash
# Build frontend Vite application
npm run build

# Build backend Express server
npm run build:server

# Preview the built frontend locally
npm run preview
```

### Docker Development

You can run the entire platform within isolated Docker containers using Node 26:

```bash
# Start development container with hot-reloading
docker compose up dev

# Build and start the production image
docker compose up prod --build
```

---

## API Route Tiers

The Express backend organizes routes into strict, predictable security tiers in [server/app.ts](server/app.ts):

### 1. Public Endpoints (Pre-Auth / Intake)

- **Gate:** Open access (no authentication required).
- **Endpoints:** `POST /api/organizations`, `GET /api/org-lookup/:slug`, `POST /api/demo-request`, `GET /api/health`.

### 2. Identity Provider Webhook

- **Gate:** Secured via `x-api-key` shared secret header.
- **Endpoints:** `POST /api/auth/sync` (called by Auth0 Post-Login & Post-Registration Actions).

### 3. Authenticated Session Tier

- **Gate:** Valid rolling Auth0 OIDC session (`requireAuth`, `requireOrg`).
- **Endpoints:** `GET /api/session`, `GET /api/userinfo`, `GET /api/supabase-token`, `POST /api/onboarding`, `GET /api/subscriptions`, `/api/billing/*`, `/api/invitations`.

### 4. Operational Feature Routes

- **Gate:** `requireOperationalAccess` (active plan, free tier, or unexpired trial entitlement) + specific RBAC permissions.
- **Endpoints:** `/api/org-sites`, `/api/org-departments`, `/api/org-roles`, `/api/org-shifts`, `/api/org-roster-shifts`, `/api/org-attendance`, `/api/org-leave`, `/api/compliance`, `/api/labour-*`, `/api/payroll-export`, `/api/safety/*`, `/api/support/*`, `/api/user-credentials`.

### 5. Privileged Administrative Routes

- **Gate:** `requireAuth` + `requireRole('admin')`.
- **Endpoints:** `/api/org-members/*`, `DELETE /api/invitations/:id`.

---

## Multi-Tenant Data & Security

1. **Row-Level Security (RLS):** PostgREST and Supabase queries enforce tenancy via `auth0.current_org_id()` and `auth0.current_user_id()`.
2. **Composite Primary Keys:** All tenant tables are keyed as `PRIMARY KEY (auth0_org_id, id)` with standalone `UNIQUE (id)`. This physically prevents accidental cross-tenant data leakage.
3. **Database Identity Synchronization:** A dedicated PostgreSQL trigger `trg_sync_org_members_identity` automatically propagates full name, first name, last name, and email from `user_credentials` down to `org_members`.
4. **Cache Invalidation & ETag Controls:** The API enforces `Cache-Control: no-store` and disables ETags across JSON routes to guarantee zero cross-tenant browser caching issues on shared terminals.

---

## Billing & Plans

EasyOps operates on a transparent per-employee pricing formula in South African Rand (ZAR), billed via Paystack:

$$\text{Monthly Price} = (\text{Included Employees} \times \text{Per-Employee Rate}) + \text{R49 Base}$$

Annual billing includes **2 months free** (~17% discount).

| Plan           | Included Employees | Monthly (ZAR)    | Annual (ZAR) | Key Included Features                                                                   |
| -------------- | ------------------ | ---------------- | ------------ | --------------------------------------------------------------------------------------- |
| **Free Trial** | Up to 25           | R0               | —            | 14-day free access, QR/manual check-in, 1 site, 3 departments                           |
| **Starter**    | 25                 | **R249**         | R2,490       | 1 site, 3 departments, WhatsApp check-in (500/mo), 12m data retention                   |
| **Growth**     | 50                 | **R699**         | R6,990       | Up to 3 sites, 6 departments, Biometrics, Smart Rosters, 7-day AI forecasts, BCEA audit |
| **Pro**        | 100                | **R1,849**       | R18,490      | Up to 10 sites, 25 departments, 30-day AI forecasts, Payroll Export Pro, Safety Ops     |
| **Enterprise** | 250+               | **Custom (POA)** | Contracted   | Unlimited sites & staff, 90-day AI forecasts, SSO, Dedicated CSM, 2h SLA                |

_For complete billing specifications, overage structures, and webhook event lifecycles, see [docs/EasyOps_Billing_Plan_Model.md](docs/EasyOps_Billing_Plan_Model.md)._

---

## South African Regulatory Compliance

EasyOps is architected from the ground up to comply with South African legal frameworks:

- **POPIA (Protection of Personal Information Act 4 of 2013):** Clear separation between Customer (Responsible Party), Workforce (Data Subjects), and EasyOps (Operator). Full data sovereignty within South African borders.
- **BCEA (Basic Conditions of Employment Act 75 of 1997):** Automated calculation of statutory overtime thresholds, daily/weekly rest intervals, and mandatory meal deductions.
- **ECTA (Electronic Communications and Transactions Act 25 of 2002):** Full Section 43 statutory provider disclosures, electronic signatures for HSE checklists, and e-commerce compliance.
- **Cybercrimes Act 19 of 2020:** Security event logging, telemetry audits, and anti-tamper mechanisms protecting timesheets and employee data.

_For complete legal disclosures and statutory terms, consult [docs/easyops_compliance_suite.md](docs/easyops_compliance_suite.md)._

---

Built with ❤️ for South Africa 🇿🇦
