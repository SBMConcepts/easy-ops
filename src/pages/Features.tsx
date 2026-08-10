'use client'
import {
  Clock,
  CircleDollarSign,
  TrendingUp,
  Eye,
  QrCode,
  Scale,
  FileText,
  Cloud,
  Heart,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'
import '../styles/features.css'

interface FeatureItem {
  title: string
  description: string
  icon: LucideIcon
}

const featureItems: FeatureItem[] = [
  {
    title: 'Precision Time Tracking',
    description:
      'Eradicate manual registers and buddy-clocking. Capture exact shift timings securely using advanced biometric and location-based verification.',
    icon: Clock,
  },
  {
    title: 'Automated Payroll Sync',
    description:
      'Instantly convert tracked hours, overtime, and late arrivals into accurate, payroll-ready data, eliminating costly manual entry errors.',
    icon: CircleDollarSign,
  },
  {
    title: 'Workforce Productivity',
    description:
      'Drive site discipline with digital oversight. Instantly identify late arrivals, absenteeism, and resource misallocations to optimize output.',
    icon: TrendingUp,
  },
  {
    title: 'Live Dashboard Visibility',
    description:
      'Monitor multiple branches and remote teams in real time. Receive instant notifications for irregular attendance patterns as they happen.',
    icon: Eye,
  },
  {
    title: 'Omnichannel Check-Ins',
    description:
      'Deploy the right tool for the environment: QR codes for fixed sites, biometrics for high-security, and WhatsApp for field workers.',
    icon: QrCode,
  },
  {
    title: 'Strict Labour Compliance',
    description:
      'Automatically enforce BCEA and LRA regulations. Maintain immutable digital records of rest periods and maximum working hours for easy auditing.',
    icon: Scale,
  },
  {
    title: 'Comprehensive Reporting',
    description:
      'Generate exportable HR reports detailing absenteeism trends, overtime costs, and branch-level performance metrics with a single click.',
    icon: FileText,
  },
  {
    title: 'Cloud-Native Scalability',
    description:
      'A lightweight, secure cloud architecture that requires zero physical servers and scales effortlessly from fast-growing SMEs to national enterprises.',
    icon: Cloud,
  },
  {
    title: 'Frictionless Adoption',
    description:
      'Ensure high employee buy-in with an intuitive interface. Familiar platforms like WhatsApp remove the barrier of forcing new app downloads.',
    icon: Heart,
  },
  {
    title: 'Centralised Control Hub',
    description:
      'Consolidate all operational data into a single, accessible system. Drastically reduce the administrative burden on HR and site managers.',
    icon: LayoutDashboard,
  },
]

/** Marketing landing-page section showcasing EasyOps feature highlights. */
export default function Features() {
  return (
    <section className="features-section" id="features">
      <div className="features-container">
        <div className="features-content">
          <div className="features-heading-and-text-wrapper">
            <div className="features-heading-and-text">
              <div className="features-subheading">Features</div>
              <h2 className="features-heading">Everything You Need to Manage Your Workforce</h2>
            </div>

            <p className="features-supporting-text">
              From attendance tracking to payroll compliance, EasyOps gives South African businesses
              the tools to operate efficiently.
            </p>
          </div>
        </div>

        <div className="features-grid">
          {featureItems.map((item) => {
            const Icon = item.icon

            return (
              <article className="feature-card" key={item.title}>
                <div className="featured-icon">
                  <Icon className="feature-icon-svg" aria-hidden="true" />
                </div>

                <div className="features-text-and-supporting">
                  <h3 className="features-text">{item.title}</h3>
                  <p className="features-text-wrapper">{item.description}</p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
