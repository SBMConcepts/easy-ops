export const SITE_URL = 'https://www.easyops.co.za'

export interface RouteSeo {
  title: string
  description: string
  /** Defaults to true; set false for auth, invite and app routes. */
  index?: boolean
  /** Canonical path when it differs from the requested path (aliases). */
  canonical?: string
}

export const DEFAULT_SEO: RouteSeo = {
  title: 'EasyOps | Workforce Management & BCEA Compliance Software',
  description:
    'EasyOps helps South African businesses manage attendance, shifts, leave and payroll exports while staying compliant with the BCEA.',
}

// Keep titles under ~60 characters and descriptions under ~160.
export const ROUTE_SEO: Record<string, RouteSeo> = {
  '/': DEFAULT_SEO,
  '/home': { ...DEFAULT_SEO, canonical: '/' },
  '/get-started': {
    title: 'Get Started | EasyOps',
    description:
      'Set up your EasyOps workspace and start tracking attendance, rosters and leave for your South African workforce.',
  },
  '/contact': {
    title: 'Contact Us | EasyOps',
    description:
      'Talk to the EasyOps team about workforce management, attendance tracking, payroll exports or BCEA compliance for your business.',
  },
  '/support': {
    title: 'Support | EasyOps',
    description:
      'Get help with EasyOps: guides, answers to common questions and ways to reach our support team.',
  },
  '/partner': {
    title: 'Become a Partner | EasyOps',
    description:
      'Partner with EasyOps to bring workforce management and BCEA compliance tools to South African businesses.',
  },
  '/careers': {
    title: 'Careers | EasyOps',
    description:
      'Join EasyOps and help build workforce management software for South African businesses.',
  },
  '/privacy': {
    title: 'Privacy Policy | EasyOps',
    description:
      'How EasyOps collects, uses and protects your personal information, including Google sign-in data, under POPIA.',
  },
  '/terms': {
    title: 'Terms of Service | EasyOps',
    description: 'The terms that govern your use of the EasyOps platform and services.',
  },
  '/terms-and-conditions': {
    title: 'Terms & Conditions | EasyOps',
    description: 'The terms and conditions that govern your use of the EasyOps platform.',
  },
  '/terms-of-use': {
    title: 'Terms of Use | EasyOps',
    description: 'Acceptable use rules and conditions for accessing the EasyOps website and app.',
  },
  '/disclaimer': {
    title: 'Disclaimer | EasyOps',
    description:
      'Important disclaimers about the information and compliance tools provided by EasyOps.',
  },
}

/** Path prefixes that must never be indexed (private or transient screens). */
export const NOINDEX_PREFIXES = [
  '/app',
  '/login',
  '/register',
  '/reset-password',
  '/accept-invite',
  '/invite',
]

export const NOT_FOUND_SEO: RouteSeo = {
  title: 'Page not found | EasyOps',
  description: DEFAULT_SEO.description,
  index: false,
}

export const resolveSeo = (pathname: string): RouteSeo & { path: string } => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  if (NOINDEX_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return { ...DEFAULT_SEO, index: false, path }
  }

  const match = ROUTE_SEO[path]
  return match ? { ...match, path } : { ...NOT_FOUND_SEO, path }
}
