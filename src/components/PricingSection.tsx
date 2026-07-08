import { motion } from 'framer-motion'
import { Check, ArrowRight, Link } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { cn } from '../lib/utils'
import '../styles/pricingsection.css'

const plans = [
  {
    name: 'Starter',
    monthly: 'R499',
    yearly: 'R5,988',
    description: 'Single-site businesses getting started with digital workforce management.',
    features: [
      'Up to 25 employees',
      'Single site, 3 departments',
      'Attendance tracking (clock-in / out)',
      'Basic payroll & payslip generation',
      'Simple reporting',
    ],
    cta: 'Start with Starter',
    highlighted: false,
  },
  {
    name: 'Growth',
    monthly: 'R699',
    yearly: 'R8,388',
    description: 'Scaling teams that need multi-site visibility and compliance.',
    features: [
      'Up to 50 employees',
      'Multi-site (up to 3), 6 departments',
      'Custom roles & permissions',
      'Payroll exports & real-time dashboards',
      'Performance tracker & compliance audits',
    ],
    cta: 'Choose Growth',
    highlighted: true,
  },
  {
    name: 'Pro',
    monthly: 'R849',
    yearly: 'R10,188',
    description: 'Established operations running full automation across branches.',
    features: [
      'Up to 100 employees',
      'Full automation workflows',
      'Advanced analytics',
      'Cost leak detection',
      'Multi-branch / site management',
    ],
    cta: 'Go Pro',
    highlighted: false,
  },
  {
    name: 'Enterprise',
    monthly: 'POA',
    yearly: 'POA',
    description: 'Custom deployments for large, complex, multi-region workforces.',
    features: [
      'Unlimited employees & sites',
      'Dedicated success manager',
      'Custom integrations & SSO',
      'SLA-backed support',
      'On-premise / private cloud options',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

const PricingSection = () => {
  return (
    <section id="pricing" className="pricing-section">
      <div className="pricing-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="pricing-header"
        >
          <span className="pricing-subtitle">Pricing</span>
          <h2 className="pricing-title">Simple, transparent pricing that scales with you</h2>
          <p className="pricing-description">
            Price = (Employees × Cost per Employee) + Package Base Price. No hidden fees, cancel
            anytime.
          </p>
        </motion.div>

        <div className="pricing-grid">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="pricing-card-wrapper"
            >
              <Card
                className={cn(
                  'pricing-card',
                  plan.highlighted ? 'pricqing-card-highlighted' : 'pricing-card-standard'
                )}
              >
                {plan.highlighted && <span className="pricing-badge">Most Popular</span>}

                <div className="pricing-card-header">
                  <h3 className="pricing-card-title">{plan.name}</h3>
                  <p className="pricing-card-description">{plan.description}</p>
                </div>

                <div className="pricing-card-pricing">
                  <div className="pricing-card-price-container">
                    <span className="pricing-card-price">{plan.monthly}</span>
                    {plan.monthly !== 'POA' && <span className="pricing-card-period">/mo</span>}
                  </div>
                  <p className="pricing-card-yearly">
                    {plan.monthly !== 'POA' ? `${plan.yearly} billed yearly` : 'Custom quote'}
                  </p>
                </div>

                <ul className="pricing-card-features">
                  {plan.features.map((f) => (
                    <li key={f} className="pricing-card-feature">
                      <Check className="pricing-card-feature-icon" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={cn(
                    'pricing-card-cta',
                    plan.highlighted ? 'pricing-card-cta-highlighted' : 'pricing-card-cta-standard'
                  )}
                >
                  <Link to={`/get-started?plan=${encodeURIComponent(plan.name)}`}>
                    {plan.cta}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </button>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ROI strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="pricing-roi-strip"
        >
          <Card className="pricing-roi-card">
            <CardContent className="pricing-roi-content">
              <CardHeader className="pricing-roi-text">
                <h3 className="pricing-roi-title">Sample ROI — 200 employees</h3>
                <p className="pricing-roi-description">
                  Manual admin saved (60 hrs × R150){' '}
                  <strong className="pricing-roi-amount">R9,000/mo</strong> · Payroll leakage
                  recovered (3% of R2m) <strong className="pricing-roi-amount">R60,000/mo</strong> ·
                  Platform cost <strong className="pricing-roi-amount">R9,800/mo</strong>.
                </p>
              </CardHeader>
              <CardContent className="pricing-roi-value">
                <div className="pricing-roi-label">Net monthly benefit</div>
                <div className="pricing-roi-amount">~R59,200</div>
                <div className="pricing-roi-description">Payback in under one billing cycle </div>
              </CardContent>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}

export default PricingSection
