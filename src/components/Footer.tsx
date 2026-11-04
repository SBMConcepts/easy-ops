'use client'
import { Link } from 'react-router-dom'
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

/** Marketing-site footer with brand, link columns, and legal links. */
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
                  href="https://www.instagram.com/easyopssa"
                  className="footer__nav-link"
                  aria-label="EasyOps on Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/easyopssa"
                  className="footer__nav-link"
                  aria-label="EasyOps on LinkedIn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <Link to="/partner" className="footer__nav-link">
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
