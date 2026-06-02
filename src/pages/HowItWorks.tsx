'use client'
import { Fingerprint, MessagesSquare, Monitor, QrCode } from 'lucide-react'
import '../styles/howitworks.css'

export default function HowItWorksSection() {
  return (
    <div className="hiw-section" id="how-it-works">
      <div className="hiw-container">
        <div className="hiw-content">
          <div className="hiw-heading-wrapper">
            <div className="hiw-heading-and-subheading">
              <div className="hiw-subheading">How&nbsp;It Works</div>

              <p className="hiw-heading">Multiple Ways to Check In</p>
            </div>

            <p className="hiw-text-supporting">
              EasyOps supports flexible check-in methods that work for offices, factories,
              construction sites, retail, and field workers.
            </p>
          </div>
        </div>
      </div>

      <div className="hiw-container-2">
        <div className="hiw-content-2">
          <div className="hiw-feature-text">
            <QrCode className="hiw-icon-instance-node" color="#10294C" />
            <div className="hiw-text-and-supporting">
              <div className="hiw-text">QR Code Scan</div>

              <p className="hiw-text-supporting">
                Employees scan a unique QR code at their workplace to clock in and out. Fast,
                contactless, and fraud-proof.
              </p>
            </div>
          </div>

          <div className="hiw-feature-text">
            <Fingerprint className="hiw-icon-instance-node" color="#68778D" stroke="#10294C" />
            <div className="hiw-text-and-supporting">
              <div className="hiw-text">Biometric Verification</div>

              <p className="hiw-text-supporting">
                Fingerprint or facial recognition ensures only the actual employee can register
                attendance. No buddy-clocking.
              </p>
            </div>
          </div>

          <div className="hiw-feature-text">
            <MessagesSquare className="hiw-icon-instance-node" color="#10294C" />
            <div className="hiw-text-and-supporting">
              <div className="hiw-text">WhatsApp Check-In</div>

              <p className="hiw-text-supporting">
                Employees send a simple WhatsApp message to check in - perfect for remote or field
                workers with no extra apps needed.
              </p>
            </div>
          </div>

          <div className="hiw-feature-text">
            <Monitor className="hiw-icon-instance-node" color="#10294C" />

            <div className="hiw-text-and-supporting">
              <div className="hiw-text">Manager Dashboard</div>

              <p className="hiw-text-supporting">
                Managers monitor all attendance in real time from a web dashboard. View reports,
                manage teams, and export data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
