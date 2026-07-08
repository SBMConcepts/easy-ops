'use client'
import { Puzzle, Rocket, Share2, Users, Mail } from 'lucide-react'
import TopNavBar from '../components/TopNavBar'
import Footer from '../components/Footer'
import '../styles/onboarding.css'
import '../styles/companypages.css'

const PARTNER_TYPES = [
  {
    icon: Puzzle,
    title: 'Solution Partner',
    desc: 'Integrate EasyOps into your product suite or resell the platform to your own customers with dedicated partner support.',
  },
  {
    icon: Rocket,
    title: 'Start-up Partner',
    desc: 'Early-stage company? Access preferential pricing, co-marketing, and hands-on onboarding to grow alongside EasyOps.',
  },
  {
    icon: Share2,
    title: 'Affiliate Partner',
    desc: 'Refer businesses to EasyOps and earn commission for every organisation that signs up through your unique link.',
  },
  {
    icon: Users,
    title: 'Events & Community Collaborations',
    desc: 'Partner with us on events, workshops, and community programmes that champion better workforce management in South Africa.',
  },
]

export default function BecomePartner() {
  return (
    <div>
      <TopNavBar />
      <main className="company-page">
        <div className="company-container">
          <header className="company-header">
            <span className="company-eyebrow">Partnerships</span>
            <h1 className="company-title">Become an EasyOps partner</h1>
            <p className="company-subtitle">
              Grow with us. Whether you build software, refer customers, or bring communities
              together, there&apos;s a partnership path designed for you.
            </p>
          </header>

          <div className="company-grid">
            {PARTNER_TYPES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="company-card">
                <div className="company-card__icon">
                  <Icon aria-hidden="true" />
                </div>
                <h2 className="company-card__title">{title}</h2>
                <p className="company-card__desc">{desc}</p>
              </div>
            ))}
          </div>

          <div className="company-cta">
            <h2 className="company-cta__title">Ready to partner with us?</h2>
            <p className="company-cta__text">
              Tell us about your business and the partnership you have in mind. Our partnerships
              team will get back to you to explore how we can work together.
            </p>
            <a
              className="company-btn company-btn--primary"
              href="mailto:sales@easyops.co.za?subject=Partnership%20Enquiry"
            >
              <Mail aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
              Apply to become a partner
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
