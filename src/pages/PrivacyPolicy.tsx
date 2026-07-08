'use client'
import { useState } from 'react'
import { History } from 'lucide-react'
import TopNavBar from '../components/TopNavBar'
import Footer from '../components/Footer'
import '../styles/onboarding.css'
import '../styles/companypages.css'

interface PolicySection {
  heading: string
  body: string
}

interface PolicyVersion {
  version: string
  label: string
  effectiveDate: string
  sections: PolicySection[]
}

const VERSIONS: PolicyVersion[] = [
  {
    version: 'v2.0',
    label: 'v2.0',
    effectiveDate: '1 May 2026',
    sections: [
      {
        heading: '1. Introduction',
        body: 'EasyOps (Pty) Ltd ("EasyOps", "we", "us") is committed to protecting the privacy of the businesses and employees who use our workforce management platform. This Privacy Policy explains what personal information we collect, how we use it, and the choices you have.',
      },
      {
        heading: '2. Information We Collect',
        body: 'We collect account details, organisation information, attendance records, technical data (IP address, device, browser), and usage data. Where you use biometric or QR-based check-in, the associated verification data is processed solely to record attendance.',
      },
      {
        heading: '3. How We Use Your Information',
        body: 'Your information is used to provide attendance tracking, payroll exports, and compliance reporting, to secure your account, and to improve the platform. We do not sell your personal information to third parties.',
      },
      {
        heading: '4. Data Protection & POPIA',
        body: 'We process personal information in accordance with the Protection of Personal Information Act, 2013 (POPIA). We apply technical and organisational safeguards, including encryption in transit and role-based access controls.',
      },
      {
        heading: '5. Your Rights',
        body: 'You may request access to, correction of, or deletion of your personal information, subject to legal retention obligations. Contact us at info@easyops.co.za to exercise these rights.',
      },
    ],
  },
  {
    version: 'v1.0',
    label: 'v1.0',
    effectiveDate: '1 January 2026',
    sections: [
      {
        heading: '1. Introduction',
        body: 'This is the initial Privacy Policy for the EasyOps platform, describing our approach to handling the personal information of our customers and their employees.',
      },
      {
        heading: '2. Information We Collect',
        body: 'We collect account details, organisation information, and attendance records required to operate the service.',
      },
      {
        heading: '3. How We Use Your Information',
        body: 'Information is used to deliver core attendance and reporting features and to maintain the security of your account.',
      },
      {
        heading: '4. Contact',
        body: 'Questions about this policy can be directed to info@easyops.co.za.',
      },
    ],
  },
]

export default function PrivacyPolicy() {
  const [selected, setSelected] = useState(VERSIONS[0].version)
  const active = VERSIONS.find((v) => v.version === selected) ?? VERSIONS[0]

  return (
    <div>
      <TopNavBar />
      <main className="company-page">
        <div className="company-container">
          <header className="company-header">
            <span className="company-eyebrow">Legal</span>
            <h1 className="company-title">Privacy Policy</h1>
            <p className="company-subtitle">
              How EasyOps collects, uses, and protects your information. Select a version below to
              review the current or previous policies.
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
