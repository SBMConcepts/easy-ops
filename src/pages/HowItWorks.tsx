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

              <p
                className="hiw-heading"
                style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10294C' }}
              >
                Multiple Ways to Check In
              </p>
            </div>

            <p className="hiw-text-supporting" style={{ maxWidth: '600px', margin: '0 auto' }}>
              EasyOps supports flexible check-in methods that work for offices, factories,
              construction sites, retail, and field workers.
            </p>
          </div>
        </div>
      </div>

      <div className="hiw-container-2" style={{ position: 'relative', marginTop: '2rem' }}>
        {/* Desktop Connector Line (Hidden on mobile via CSS flex wrapping, visually acts as a connector) */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '10%',
            right: '10%',
            height: '1px',
            backgroundColor: '#e2e8f0',
            zIndex: 0,
          }}
          className="hidden lg:block"
        />

        <div className="hiw-content-2" style={{ position: 'relative', zIndex: 1 }}>
          {/* Step 1 */}
          <div className="hiw-feature-text" style={{ flex: 1, position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div style={{ backgroundColor: '#e8f4f3', padding: '24px', borderRadius: '20px' }}>
                <QrCode size={36} color="#29aea0" />
              </div>
              <div
                style={{
                  backgroundColor: '#29aea0',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                1
              </div>
            </div>
            <div className="hiw-text-and-supporting" style={{ marginTop: '8px' }}>
              <div className="hiw-text">QR Code Scan</div>
              <p className="hiw-text-supporting">
                Employees scan a location-specific QR code to clock in and out instantly. This
                provides a fast, contactless, and fraud-proof attendance method tied directly to the
                workplace.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="hiw-feature-text" style={{ flex: 1, position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div style={{ backgroundColor: '#eef2f6', padding: '24px', borderRadius: '20px' }}>
                <Fingerprint size={36} color="#10294C" />
              </div>
              <div
                style={{
                  backgroundColor: '#29aea0',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                2
              </div>
            </div>
            <div className="hiw-text-and-supporting" style={{ marginTop: '8px' }}>
              <div className="hiw-text">Biometric Verification</div>
              <p className="hiw-text-supporting">
                Advanced fingerprint or facial recognition guarantees absolute identity
                verification. This securely restricts access and completely eliminates
                buddy-clocking.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="hiw-feature-text" style={{ flex: 1, position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div style={{ backgroundColor: '#fdf6e7', padding: '24px', borderRadius: '20px' }}>
                <MessageCircle size={36} color="#d97706" />
              </div>
              <div
                style={{
                  backgroundColor: '#29aea0',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                3
              </div>
            </div>
            <div className="hiw-text-and-supporting" style={{ marginTop: '8px' }}>
              <div className="hiw-text">WhatsApp Check-In</div>
              <p className="hiw-text-supporting">
                Empower remote and field workers to check in via a simple WhatsApp message. Requires
                zero additional app downloads while securely capturing precise location data.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="hiw-feature-text" style={{ flex: 1, position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div style={{ backgroundColor: '#e8f4f3', padding: '24px', borderRadius: '20px' }}>
                <Monitor size={36} color="#29aea0" />
              </div>
              <div
                style={{
                  backgroundColor: '#29aea0',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                4
              </div>
            </div>
            <div className="hiw-text-and-supporting" style={{ marginTop: '8px' }}>
              <div className="hiw-text">Manager Dashboard</div>
              <p className="hiw-text-supporting">
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
