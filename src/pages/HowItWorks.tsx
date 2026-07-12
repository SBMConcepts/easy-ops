'use client'
import { Fingerprint, MessageCircle, Monitor, QrCode } from 'lucide-react'
import '../styles/howitworks.css'

export default function HowItWorksSection() {
  return (
    <div className="hiw-section" id="how-it-works">
      <div className="hiw-container">
        <div className="hiw-content">
          <div className="hiw-heading-wrapper">
            <div className="hiw-heading-and-subheading">
              <div className="hiw-subheading">HOW IT WORKS</div>
              <p className="hiw-heading">Multiple Ways to Check In</p>
              <p className="hiw-text-supporting">
                EasyOps supports flexible check-in methods that work for offices, factories,
                construction sites, retail, and field workers.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="hiw-container-2">
        <div className="hiw-content-2">
          {/* Step 1 */}
          <div className="hiw-feature-body">
            <div className="hiw-feature-icon-wrapper">
              <div className="hiw-feature-icon">
                <QrCode className="hiw-feature-icon-svg" />
              </div>
            </div>
            <div className="hiw-feature-heading">
              <div className="hiw-feature-title">QR Code Scan</div>
              <p className="hiw-feature-text-supporting">
                Employees scan a location-specific QR code to clock in and out instantly. This
                provides a fast, contactless, and fraud-proof attendance method tied directly to the
                workplace.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="hiw-feature-body">
            <div className="hiw-feature-icon-wrapper">
              <div className="hiw-feature-icon">
                <Fingerprint className="hiw-feature-icon-svg" />
              </div>
            </div>
            <div className="hiw-feature-heading">
              <div className="hiw-feature-title">Biometric Verification</div>
              <p className="hiw-feature-text-supporting">
                Advanced fingerprint or facial recognition guarantees absolute identity
                verification. This securely restricts access and completely eliminates
                buddy-clocking.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="hiw-feature-body">
            <div className="hiw-feature-icon-wrapper">
              <div className="hiw-feature-icon">
                <MessageCircle className="hiw-feature-icon-svg" />
              </div>
            </div>
            <div className="hiw-feature-heading">
              <div className="hiw-feature-title">WhatsApp Check-In</div>
              <p className="hiw-feature-text-supporting">
                Empower remote and field workers to check in via a simple WhatsApp message. Requires
                zero additional app downloads while securely capturing precise location data.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="hiw-feature-body">
            <div className="hiw-feature-icon-wrapper">
              <div className="hiw-feature-icon">
                <Monitor className="hiw-feature-icon-svg" />
              </div>
            </div>
            <div className="hiw-feature-heading">
              <div className="hiw-feature-title">Manager Dashboard</div>
              <p className="hiw-feature-text-supporting">
                Administrators monitor all workforce attendance in real time from a comprehensive
                web dashboard. Seamlessly view reports, manage shifts, and export payroll data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
