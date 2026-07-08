'use client'
import { useState } from 'react'
import { History } from 'lucide-react'
import TopNavBar from '../components/TopNavBar'
import Footer from '../components/Footer'
import '../styles/onboarding.css'
import '../styles/companypages.css'

interface TermsSection {
  heading: string
  body: string
}

interface TermsVersion {
  version: string
  label: string
  effectiveDate: string
  sections: TermsSection[]
}

const VERSIONS: TermsVersion[] = [
  {
    version: 'v2.0',
    label: 'v2.0',
    effectiveDate: '1 May 2026',
    sections: [
      {
        heading: '1. Agreement to Terms',
        body: 'By accessing or using the EasyOps platform you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of an organisation, you represent that you have authority to bind that organisation.',
      },
      {
        heading: '2. Use of the Service',
        body: 'EasyOps grants you a non-exclusive, non-transferable right to use the platform for your internal workforce management. You are responsible for the accuracy of attendance data and for the actions of users within your organisation.',
      },
      {
        heading: '3. Subscriptions & Billing',
        body: 'Paid plans are billed in advance on a recurring basis. Fees are non-refundable except as required by law. We may change pricing with reasonable prior notice ahead of your next billing cycle.',
      },
      {
        heading: '4. Acceptable Use',
        body: 'You may not misuse the service, attempt to gain unauthorised access, reverse engineer the platform, or use it to violate any applicable law, including the Protection of Personal Information Act, 2013 (POPIA).',
      },
      {
        heading: '5. Limitation of Liability',
        body: 'To the maximum extent permitted by law, EasyOps shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform. The service is provided on an "as is" basis.',
      },
      {
        heading: '6. Termination',
        body: 'You may cancel your subscription at any time. We may suspend or terminate access for breach of these Terms. Upon termination, your right to use the service ceases immediately.',
      },
    ],
  },
  {
    version: 'v1.0',
    label: 'v1.0',
    effectiveDate: '1 January 2026',
    sections: [
      {
        heading: '1. Agreement to Terms',
        body: 'These are the initial Terms of Service governing use of the EasyOps platform by customers and their authorised users.',
      },
      {
        heading: '2. Use of the Service',
        body: 'EasyOps grants you a limited right to use the platform for your internal workforce management purposes.',
      },
      {
        heading: '3. Subscriptions & Billing',
        body: 'Paid plans are billed in advance on a recurring basis and are non-refundable except as required by law.',
      },
      {
        heading: '4. Termination',
        body: 'Either party may terminate the agreement in accordance with the cancellation options available in your account.',
      },
    ],
  },
]

export default function TermsOfService() {
  const [selected, setSelected] = useState(VERSIONS[0].version)
  const active = VERSIONS.find((v) => v.version === selected) ?? VERSIONS[0]

  return (
    <div>
      <TopNavBar />
      <main className="company-page">
        <div className="company-container">
          <header className="company-header">
            <span className="company-eyebrow">Legal</span>
            <h1 className="company-title">Terms of Service</h1>
            <p className="company-subtitle">
              The terms that govern your use of the EasyOps platform. Select a version below to
              review the current or previous terms.
            </p>
          </header>

          <div className="company-version">
            <span className="company-version__label">
              <History
                aria-hidden="true"
                style={{
                  width: '0.9rem',
                  height: '0.9rem',
                  display: 'inline',
                  verticalAlign: 'middle',
                  marginRight: '0.375rem',
                }}
              />
              Version
            </span>
            <div className="company-version__options">
              {VERSIONS.map((v, index) => (
                <button
                  key={v.version}
                  type="button"
                  className={[
                    'company-version__btn',
                    v.version === selected ? 'company-version__btn--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelected(v.version)}
                  aria-pressed={v.version === selected}
                >
                  {v.label}
                  {index === 0 && <span className="company-version__badge">Latest</span>}
                </button>
              ))}
            </div>
          </div>

          <article className="company-doc">
            <p className="company-doc__meta">
              {active.label} · Effective {active.effectiveDate}
            </p>
            {active.sections.map((section) => (
              <div key={section.heading} className="company-doc__section">
                <h2 className="company-doc__heading">{section.heading}</h2>
                <p className="company-doc__text">{section.body}</p>
              </div>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}
