"use client";
import "../styles/footer.css";
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__main">
        <div className="footer__brand">
          <div className="footer__logo">
            <span className="footer__logo-eazy">Eazy</span>
            <span className="footer__logo-ops">Ops</span>
          </div>
          <p className="footer__tagline">
            Simplifying workforce management, attendance tracking, payroll, and
            compliance for businesses across South Africa.
          </p>
        </div>

        <nav className="footer__nav">
          <div className="footer__nav-group">
            <h3 className="footer__nav-heading">Product</h3>
            <ul className="footer__nav-list">
              <li>
                <a href="#features" className="footer__nav-link">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="footer__nav-link">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#benefits" className="footer__nav-link">
                  Benefits
                </a>
              </li>
              <li>
                <a href="#pricing" className="footer__nav-link">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div className="footer__nav-group">
            <h3 className="footer__nav-heading">Company</h3>
            <ul className="footer__nav-list">
              <li>
                <a href="#about" className="footer__nav-link">
                  About us
                </a>
              </li>
              <li>
                <a href="#contact" className="footer__nav-link">
                  Contact
                </a>
              </li>
              <li>
                <a href="#privacy" className="footer__nav-link">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="footer__nav-link">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="footer__bottom">
        <p className="footer__copyright">
          © 2026 EazyOps. All rights reserved. Built for South Africa 🇿🇦
        </p>
      </div>
    </footer>
  );
}
