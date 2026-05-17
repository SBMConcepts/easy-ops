import { motion } from 'framer-motion'
import { Check, ArrowRight, Link } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { cn } from '../lib/utils'

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
    <section id="pricing" className="py-20 md:py-32 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold tracking-wide uppercase rounded-full bg-primary/10 text-primary">
            Pricing
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6">
            Simple, transparent pricing that scales with you
          </h2>
          <p className="text-lg text-muted-foreground">
            Price = (Employees × Cost per Employee) + Package Base Price. No hidden fees, cancel
            anytime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Card
                className={cn(
                  'relative h-full flex flex-col p-6 rounded-2xl border transition-all',
                  plan.highlighted
                    ? 'border-primary shadow-hero bg-card scale-[1.02]'
                    : 'border-border hover:border-primary/40 hover:shadow-card'
                )}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full bg-accent-gradient text-accent-foreground shadow-md">
                    Most Popular
                  </span>
                )}

                <div className="mb-6">
                  <h3 className="font-display text-2xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-2 min-h-10">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-foreground">
                      {plan.monthly}
                    </span>
                    {plan.monthly !== 'POA' && (
                      <span className="text-sm text-muted-foreground">/mo</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plan.monthly !== 'POA' ? `${plan.yearly} billed yearly` : 'Custom quote'}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    'w-full rounded-full',
                    plan.highlighted
                      ? 'bg-accent-gradient text-accent-foreground hover:opacity-90'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  <Link to={`/get-started?plan=${encodeURIComponent(plan.name)}`}>
                    {plan.cta}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ROI strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <Card className="p-8 md:p-10 rounded-2xl border-border bg-card">
            <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                  Sample ROI — 200 employees
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manual admin saved (60 hrs × R150){' '}
                  <strong className="text-foreground">R9,000/mo</strong> · Payroll leakage recovered
                  (3% of R2m) <strong className="text-foreground">R60,000/mo</strong> · Platform
                  cost <strong className="text-foreground">R9,800/mo</strong>.
                </p>
              </div>
              <div className="text-center md:text-right">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Net monthly benefit
                </div>
                <div className="font-display text-3xl md:text-4xl font-bold text-primary">
                  ~R59,200
                </div>
                <div className="text-xs text-muted-foreground">
                  Payback in under one billing cycle
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}

export default PricingSection
