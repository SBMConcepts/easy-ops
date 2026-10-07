import '../styles/pricingsection.css'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type PricingPlan = 'trial' | 'starter' | 'growth' | 'pro' | 'enterprise'

interface PricingSectionProps {
  onSelectPlan?: (plan: PricingPlan) => void
  onConfirmPlan?: (plan: PricingPlan) => void
  selectedPlan?: PricingPlan | null
  showCtaForSelectedPlan?: boolean
}

const plans = [
  {
    id: 'starter' as const,
    name: 'Starter',
    baseFee: 80,
    perMemberFee: 16,
    minMembers: 5,
    maxMembers: 25,
    description: 'Single-site businesses getting started with digital workforce management.',
    features: [
      'Up to 25 employees',
      'Single site, 3 departments',
      'Attendance tracking (clock-in / out)',
      'Basic payroll & payslip generation',
      'Simple reporting',
    ],
    cta: 'Start with Starter',
  },
  {
    id: 'growth' as const,
    name: 'Growth',
    baseFee: 150,
    perMemberFee: 12,
    minMembers: 26,
    maxMembers: 50,
    description: 'Scaling teams that need multi-site visibility and compliance.',
    features: [
      'Up to 50 employees',
      'Multi-site (up to 3), 6 departments',
      'Custom roles & permissions',
      'Payroll exports & real-time dashboards',
      'Performance tracker & compliance audits',
    ],
    cta: 'Choose Growth',
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    baseFee: 300,
    perMemberFee: 10,
    minMembers: 51,
    maxMembers: 100,
    description: 'Established operations running full automation across branches.',
    features: [
      'Up to 100 employees',
      'Full automation workflows',
      'Advanced analytics',
      'Cost leak detection',
      'Multi-branch / site management',
    ],
    cta: 'Go Pro',
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    baseFee: 450,
    perMemberFee: null,
    minMembers: 101,
    maxMembers: Infinity,
    description: 'Custom deployments for large, complex, multi-region workforces.',
    features: [
      'Unlimited employees & sites',
      'Dedicated success manager',
      'Custom integrations & SSO',
      'SLA-backed support',
      'On-premise / private cloud options',
    ],
    cta: 'Contact Sales',
  },
]

const PricingSection = ({
  onSelectPlan,
  onConfirmPlan,
  selectedPlan,
  showCtaForSelectedPlan = false,
}: PricingSectionProps) => {
  const [employees, setEmployees] = useState(30)
  const [isYearly, setIsYearly] = useState(false)

  // Calculate pricing dynamics based on slider and toggle
  const getPlanPricing = (
    plan:
      | {
          name: string
          baseFee: number
          perMemberFee: number
          minMembers: number
          maxMembers: number
          description: string
          features: string[]
          cta: string
        }
      | {
          name: string
          baseFee: number
          perMemberFee: null
          minMembers: number
          maxMembers: number
          description: string
          features: string[]
          cta: string
        }
  ) => {
    if (plan.name === 'Enterprise') {
      const isMatch = employees >= plan.minMembers
      return {
        monthly: 'POA',
        yearly: 'Custom quote',
        formula: 'Base R450 + custom tiering',
        isMatch,
      }
    }

    // Check if current headcount matches this plan range
    const isMatch = employees >= plan.minMembers && employees <= plan.maxMembers

    // Clamp employee count within plan capacity boundaries for previewing price
    const count = Math.min(Math.max(employees, plan.minMembers), plan.maxMembers)
    let monthlyTotal = plan.baseFee + (plan.perMemberFee ?? 0) * count

    // Apply 15% discount when billed yearly
    if (isYearly) {
      monthlyTotal = Math.round(monthlyTotal * 0.85)
    }

    const yearlyTotal = monthlyTotal * 12

    return {
      monthly: `R${monthlyTotal.toLocaleString()}`,
      yearly: `R${yearlyTotal.toLocaleString()} billed yearly`,
      formula: `R${plan.baseFee} base + R${plan.perMemberFee ?? 0}/member`,
      isMatch,
    }
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
            Each plan is designed to provide the right level of support and features for your
            business, ensuring you can manage your workforce effectively and efficiently.
          </p>

          {/* Headcount Slider & Toggle Controls */}
          <div className="pricing-controls">
            <div className="pricing-slider-wrapper">
              <label htmlFor="employee-slider" className="pricing-slider-label">
                How many employees do you have?{' '}
                <span className="pricing-slider-value">
                  {employees >= 101 ? '101+ (Enterprise)' : `${employees} Members`}
                </span>
              </label>
              <input
                id="employee-slider"
                type="range"
                min={5}
                max={101}
                step={1}
                value={employees}
                onChange={(e) => setEmployees(Number(e.target.value))}
                className="pricing-slider"
              />
              <div className="pricing-slider-ticks">
                <span className="pricing-slider-tick">5 Members</span>
                <span className="pricing-slider-tick">50 Members</span>
                <span className="pricing-slider-tick">100+ Members</span>
              </div>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="pricing-toggle-wrapper ">
              <span className={!isYearly ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                Monthly Billing
              </span>
              <button
                type="button"
                onClick={() => setIsYearly(!isYearly)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
                  isYearly ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    isYearly ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
              <span className={isYearly ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                Yearly Billing <span className="text-xs text-green-600 font-bold">(Save 15%)</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className="pricing-grid">
          {plans.map((plan, i) => {
            const pricing = getPlanPricing(plan)
            const isHighlighted = pricing.isMatch
            const isSelected = selectedPlan === plan.id
            const showCta = !showCtaForSelectedPlan || isSelected

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
                  onClick={() => onSelectPlan?.(plan.id)}
                  className={cn(
                    'pricing-card',
                    onSelectPlan && 'cursor-pointer',
                    isSelected || isHighlighted
                      ? 'pricing-card-highlighted '
                      : 'pricing-card-standard'
                  )}
                >
                  {(isSelected || isHighlighted) && (
                    <span className="pricing-badge">
                      {isSelected ? 'Selected' : employees >= 101 ? 'Recommended' : 'Best Match'}
                    </span>
                  )}

                  <div className="pricing-card-header">
                    <h3 className="pricing-card-title">{plan.name}</h3>
                    <p className="pricing-card-description">{plan.description}</p>
                  </div>

                  <div className="pricing-card-pricing">
                    <div className="pricing-card-price-container">
                      <span className="pricing-card-price">{pricing.monthly}</span>
                      {pricing.monthly !== 'POA' && (
                        <span className="pricing-card-period">/mo</span>
                      )}
                    </div>
                    <p className="pricing-card-yearly">{pricing.yearly}</p>
                    <p className="pricing-card-formula">{pricing.formula}</p>
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
                      onClick={(event) => {
                        event.stopPropagation()
                        onConfirmPlan?.(plan.id)
                      }}
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
      </div>
    </section>
  )
}

export default PricingSection
