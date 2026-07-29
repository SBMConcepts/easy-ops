'use client'
import { Link } from 'react-router-dom'
import { Handshake } from 'lucide-react'
import '../styles/footer.css'
import BrandLogo from '../assets/EasyOps Logo.png'
import BrandName from '../assets/EasyOps Name.png'

const COMPANY_LINKS = [
  { label: 'Contact Us', to: '/contact' },
  { label: 'Careers', to: '/careers' },
  { label: 'Support', to: '/support' },
] as const

const LEGAL_LINKS = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms & Conditions', to: '/terms-and-conditions' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Terms of Use', to: '/terms-of-use' },
  { label: 'Disclaimer', to: '/disclaimer' },
] as const

function InstagramIcon() {
  return (
    <svg
      className="footer__nav-link-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg
      className="footer__nav-link-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__main">
        <div className="footer__brand">
          <div className="footer__logo">
            <img className="footer__logo-image" src={BrandLogo} alt="EasyOps" />
            <img className="footer__logo-name" src={BrandName} alt="EasyOps" />
          </div>
          <p className="footer__tagline">
            Simplifying workforce management, attendance tracking, payroll, and compliance for
            businesses across South Africa.
          </p>
        </div>

        <nav className="footer__nav">
          <div className="footer__nav-group">
            <h3 className="footer__nav-heading">Company</h3>
            <ul className="footer__nav-list">
              {COMPANY_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className="footer__nav-link">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__nav-group">
            <h3 className="footer__nav-heading">Legal</h3>
            <ul className="footer__nav-list">
              {LEGAL_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className="footer__nav-link">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__nav-group">
            <h3 className="footer__nav-heading">Socials</h3>
            <ul className="footer__nav-list">
              <li>
                <a
                  href="#"
                  className="footer__nav-link"
                  aria-label="EasyOps on Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InstagramIcon />
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="footer__nav-link"
                  aria-label="EasyOps on LinkedIn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkedInIcon />
                  LinkedIn
                </a>
              </li>
              <li>
                <Link to="/partner" className="footer__nav-link">
                  <Handshake className="footer__nav-link-icon" aria-hidden="true" />
                  Become a Partner
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="footer__bottom">
        <p className="footer__copyright">
          © 2026 EasyOps. All rights reserved. Built for South Africa 🇿🇦
        </p>
      </div>
    </footer>
  )
}
