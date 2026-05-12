# EazyOps — Workforce Management Platform

> Simplifying attendance tracking, payroll integration, and BCEA compliance for businesses across South Africa.

---

## Table of Contents

- [EazyOps — Workforce Management Platform](#eazyops--workforce-management-platform)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Components](#components)
    - [`TopNavBar`](#topnavbar)
    - [`Hero`](#hero)
    - [`HowItWorksSection`](#howitworkssection)
    - [`BenefitsSections`](#benefitssections)
    - [`CTASection`](#ctasection)
    - [`Footer`](#footer)
    - [`DemoModal`](#demomodal)
  - [Responsive Design](#responsive-design)
  - [Styling Conventions](#styling-conventions)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Development](#development)
    - [Build](#build)
  - [CSS Custom Properties](#css-custom-properties)

---

## Overview

EasyOps is a marketing and lead-generation website for a South African workforce operations SaaS platform. It presents the product's core features, check-in methods, benefits, pricing summary, and a demo request flow — all in a single-page layout with smooth scroll navigation.

Key product highlights communicated on the site:

- Multiple check-in methods: QR code, biometric, WhatsApp, and manager dashboard
- BCEA & IRA labour law compliance
- Real-time attendance dashboards for multiple branches
- 99.9% uptime, cloud-based infrastructure
- Scales from SME to enterprise

---

## Tech Stack

| Layer     | Technology                                                       |
| --------- | ---------------------------------------------------------------- |
| Framework | Next.js (App Router, `"use client"`)                             |
| Language  | TypeScript                                                       |
| Styling   | Plain CSS (component-scoped stylesheets)                         |
| Icons     | [Lucide React](https://lucide.dev)                               |
| Font      | [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) |

---

## Project Structure

```bash
src/
├── app/
│   └── page.tsx                  # Root page — assembles all sections
├── components/
│   ├── TopNavBar.tsx             # Sticky navigation with scroll-spy
│   ├── Hero.tsx                  # Hero section with CTA and stats
│   ├── HowItWorksSection.tsx     # 4-feature check-in methods grid
│   ├── BenefitsSections.tsx      # Benefits checklist + Investment Summary
│   ├── CTASection.tsx            # Bottom call-to-action band
│   ├── Footer.tsx                # Footer with nav links and copyright
│   └── DemoModal.tsx             # Animated demo request modal/form
├── styles/
│   ├── topnavbar.css
│   ├── hero.css
│   ├── howitworks.css
│   ├── benefits.css
│   ├── ctasection.css
│   ├── footer.css
│   └── demomodal.css
└── assets/
    └── hero-imageI-EO.jpg        # Hero section image
```

---

## Components

### `TopNavBar`

Sticky top navigation bar with:

- **Scroll-spy** via `IntersectionObserver` — automatically highlights the active section as the user scrolls.
- **Smooth scroll** on nav link click, with offset compensation for the navbar height.
- **Hamburger menu** on mobile — animates into an ✕ and opens a slide-down drawer containing all nav links and the CTA button.
- "Get Started" button that opens the `DemoModal`.

### `Hero`

Full-width hero section containing:

- Headline and subheading copy
- Hero image with teal drop shadow
- "Start Free Trial" CTA button
- Three stat badges (99.9% uptime, 10K+ users, BCEA compliant)

### `HowItWorksSection`

Explains the four check-in methods with icon, title, and supporting text:

1. QR Code Scan
2. Biometric Verification
3. WhatsApp Check-In
4. Manager Dashboard

### `BenefitsSections`

Two-panel layout:

- **Left panel** — eight benefit checkboxes split across two columns
- **Right panel** — Investment Summary table (Total Project Cost, Payment Structure, Project Duration, Support)

### `CTASection`

Centred call-to-action band with:

- "Get Started Today" primary button
- "Request A Demo" secondary button (opens `DemoModal`)

### `Footer`

Dark-themed footer (`#0f2340`) with:

- EazyOps logo
- Tagline
- Two navigation columns: Product and Company
- Copyright bar with South African flag emoji

### `DemoModal`

Animated modal form with:

- Overlay with blur backdrop
- **Bottom-sheet** behaviour on mobile, **centred dialog** on tablet/desktop
- Fields: Full Name, Work Email, Company Name, Company Size (select), optional message
- Loading spinner on submission
- Success confirmation state with personalised message
- Closes on overlay click, close button, or `Escape` key

---

## Responsive Design

All components are built **mobile-first** using plain CSS with three breakpoints:

| Breakpoint | Range            | Behaviour                                                                            |
| ---------- | ---------------- | ------------------------------------------------------------------------------------ |
| Mobile     | `< 768px`        | Single-column stacked layouts, full-width buttons, hamburger nav, bottom-sheet modal |
| Tablet     | `768px – 1023px` | Two-column grids, inline nav links, centred modal dialog                             |
| Desktop    | `≥ 1024px`       | Original multi-column layouts fully restored                                         |

CSS breakpoints follow a `min-width` mobile-first pattern:

```css
/* Mobile — base styles (no media query) */

@media (min-width: 768px) {
  /* Tablet */
}
@media (min-width: 1024px) {
  /* Desktop */
}
```

---

## Styling Conventions

- **Component-scoped CSS files** — each component imports its own `.css` file; no CSS Modules or utility frameworks are used.
- **CSS custom properties** — design tokens for colour, typography, and shadow are referenced via `var(--token-name)
- **Font**: Space Grotesk is used throughout. Import it via Google Fonts in the root layout or `_document`.
- **Icons**: All icons are sourced from `lucide-react` and sized/coloured via props or CSS classes.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/your-org/eazyops-website.git
cd eazyops-website
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

---

## CSS Custom Properties

Define the following tokens in your global CSS (e.g. `globals.css`) for the component styles to resolve correctly:

```css
:root {
  --secondary: #29aea0;
  --foreground: #141d29;
  --background: #f9fafb;
  --border: #e0e5eb;
  --gray-600: #475467;
  --gray-900: #101828;
  --shadow-xs: 0 1px 2px 0 rgba(16, 24, 40, 0.05);

  --text-md-regular-font-family: 'Space Grotesk', sans-serif;
  --text-md-regular-font-size: 16px;
  --text-md-regular-font-style: normal;
  --text-md-regular-font-weight: 400;
  --text-md-regular-letter-spacing: normal;
  --text-md-regular-line-height: 24px;

  --text-md-semibold-font-family: 'Space Grotesk', sans-serif;
  --text-md-semibold-font-size: 16px;
  --text-md-semibold-font-style: normal;
  --text-md-semibold-font-weight: 600;
  --text-md-semibold-letter-spacing: normal;
  --text-md-semibold-line-height: 24px;
}
```

---

Built for South Africa 🇿🇦
