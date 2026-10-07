import '../styles/pricingsection.css'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type PlanId = 'trial' | 'starter' | 'growth' | 'pro' | 'enterprise'

interface Plan {
  id: PlanId
  name: string
  monthly: string
  yearly: string
  formula: string
  description: string
  features: string[]
  cta: string
  highlighted: boolean
}

interface PricingSectionProps {
  selectedPlan?: PlanId | null
  onSelectPlan?: (plan: PlanId) => void
  onConfirmPlan?: (plan: PlanId) => void
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 'R249',
    yearly: 'R2,490',
    formula: '(25 × R8) + R49',
    description: 'Single-site businesses getting started with digital workforce management.',
    features: [
      'Up to 25 employees',
      'Single site, 3 departments',
      'Attendance tracking (clock-in / out)',
      'QR, manual & WhatsApp check-in (500/mo)',
      'Basic reports & payslips',
      '12-month data retention · 24h support',
    ],
    cta: 'Start with Starter',
    highlighted: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    monthly: 'R699',
    yearly: 'R6,990',
    formula: '(50 × R13) + R49',
    description: 'Scaling teams that need multi-site visibility and compliance.',
    features: [
      'Up to 50 employees',
      'Multi-site (up to 3), 6 departments',
      'Custom roles & permissions',
      'Smart Shift Scheduling & biometric check-in',
      '7-day labour forecasting & BCEA audits',
      'Payroll CSV export · 12h support',
    ],
    cta: 'Choose Growth',
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 'R1,849',
    yearly: 'R18,490',
    formula: '(100 × R18) + R49',
    description: 'Established operations running full automation across branches.',
    features: [
      'Up to 100 employees',
      'Up to 10 sites, 25 departments',
      '30-day AI forecasting & accuracy tracking',
      'Payroll Export Pro (Sage, Xero, PaySpace, EMP201)',
      'Safety Ops, automation & advanced analytics',
      'Premium support (4h response)',
    ],
    cta: 'Go Pro',
    highlighted: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: 'POA',
    yearly: 'POA',
    formula: 'Tailored to your workforce',
    description: 'Custom deployments for large, complex, multi-region workforces.',
    features: [
      'Unlimited employees & sites',
      'Dedicated success manager',
      '90-day forecasting, SSO & custom integrations',
      '2h SLA, 24/7 for urgent issues',
      'On-premise / private cloud options',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

const PricingSection = ({ onConfirmPlan, onSelectPlan, selectedPlan }: PricingSectionProps) => {
  const [locallySelectedPlan, setLocallySelectedPlan] = useState<PlanId | null>(null)
  const activePlan = selectedPlan ?? locallySelectedPlan

  const handleSelectPlan = (plan: PlanId) => {
    setLocallySelectedPlan(plan)
    onSelectPlan?.(plan)
  }

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
          <h2 className="pricing-title">
            Select a plan that will empower your organization's growth
          </h2>
          <p className="pricing-description">
            Price = (Employees × Cost per Employee) + Package Base Price. No hidden fees, cancel
            anytime.
          </p>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className="pricing-grid">
          {plans.map((plan, i) => {
            const isHighlighted = plan.highlighted
            const isSelected = activePlan === plan.id
            const showCta = isSelected

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="pricing-card-wrapper"
              >
                <Card
                  onClick={() => handleSelectPlan(plan.id)}
                  className={cn(
                    'pricing-card',
                    'cursor-pointer',
                    isHighlighted ? 'pricing-card-highlighted ' : 'pricing-card-standard'
                  )}
                >
                  {isHighlighted && <span className="pricing-badge">{'Most Popular'}</span>}

                  <div className="pricing-card-header">
                    <h3 className="pricing-card-title">{plan.name}</h3>
                    <p className="pricing-card-description">{plan.description}</p>
                  </div>

                  <div className="pricing-card-pricing">
                    <div className="pricing-card-price-container">
                      <span className="pricing-card-price">{plan.monthly}</span>
                      {plan.monthly !== 'POA' && <span className="pricing-card-period">/mo</span>}
                    </div>
                  </div>

                  <ul className="pricing-card-features">
                    {plan.features.map((f) => (
                      <li key={f} className="pricing-card-feature">
                        <Check className="pricing-card-feature-icon" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {showCta && (
                    <button
                      type="button"
                      onClick={() => onConfirmPlan?.(plan.id)}
                      className="pricing-card-cta-btn"
                    >
                      {plan.cta}
                    </button>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Not ready to buy? Try every Growth & Pro feature free for 14 days — no card required.
          </p>
          <button type="button" className="rounded-full" onClick={() => onConfirmPlan?.('trial')}>
            Start free trial or book a demo
          </button>
        </div>
      </div>
    </section>
  )
}

export default PricingSection
