'use client'
import { Mail, Headset, TrendingUp, Info } from 'lucide-react'
import TopNavBar from '../components/TopNavBar'
import Footer from '../components/Footer'
import '../styles/onboarding.css'
import '../styles/companypages.css'

const SECTORS = [
  {
    icon: Info,
    title: 'General Enquiries',
    desc: 'Questions about EasyOps, media requests, or anything else on your mind.',
    email: 'info@easyops.co.za',
  },
  {
    icon: Headset,
    title: 'Customer Support',
    desc: 'Already using EasyOps? Our support team is here to help you resolve any issue.',
    email: 'support@easyops.co.za',
  },
  {
    icon: TrendingUp,
    title: 'Sales & Partnerships',
    desc: 'Interested in a demo, pricing, or a tailored plan for your business? Talk to sales.',
    email: 'sales@easyops.co.za',
  },
]

export default function ContactUs() {
  return (
    <div>
      <TopNavBar />
      <main className="company-page">
        <div className="company-container">
          <header className="company-header">
            <span className="company-eyebrow">Contact Us</span>
            <h1 className="company-title">We&apos;d love to hear from you</h1>
            <p className="company-subtitle">
              Reach out to the right team and we&apos;ll get back to you as soon as possible. Pick
              the sector that best matches your enquiry below.
            </p>
          </header>

          <div className="company-grid company-grid--3">
            {SECTORS.map(({ icon: Icon, title, desc, email }) => (
              <div key={email} className="company-card">
                <div className="company-card__icon">
                  <Icon aria-hidden="true" />
                </div>
                <h2 className="company-card__title">{title}</h2>
                <p className="company-card__desc">{desc}</p>
                <a className="company-card__link" href={`mailto:${email}`}>
                  <Mail
                    aria-hidden="true"
                    style={{
                      width: '0.9rem',
                      height: '0.9rem',
                      display: 'inline',
                      verticalAlign: 'middle',
                      marginRight: '0.375rem',
                    }}
                  />
                  {email}
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
