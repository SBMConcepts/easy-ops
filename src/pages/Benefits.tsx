'use client'
import { CheckIcon } from 'lucide-react'
import '../styles/benefits.css'

export default function BenefitsSections() {
  return (
    <div className="benefits-sections" id="benefits">
      <div className="benefits-header">
        <div className="benefits-subtitle">Why EasyOps</div>
        <div className="benefits-title">
          The Leading Platform for Workforce Operations in South Africa.
        </div>
      </div>

      <div className="benefits-content-wrapper">
        <div className="benefits-content">
          <div className="benefits-text-and-supporting">
            <p className="benefits-text-supporting">
              Maximize productivity and protect your business. EasyOps eliminates operational blind
              spots with seamless attendance tracking, automated compliance, and real-time oversight
              designed specifically for the South African market.
            </p>
          </div>

          <div className="benefits-check-items-wrap">
            <div className="benefits-check-items">
              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Eliminate time fraud and buddy-clocking instantly
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Monitor multiple branches via real-time dashboards
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Generate payroll-ready HR and attendance reports
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <div className="benefits-text-2">
                    Ensure 99.9% uptime with secure cloud infrastructure
                  </div>
                </div>
              </div>
            </div>

            <div className="benefits-check-items">
              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Automate overtime, short-time, and late arrival tracking
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Guarantee strict BCEA & IRA labour law compliance
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Frictionless WhatsApp integration — no extra apps needed
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Scales effortlessly from growing SMEs to enterprise level
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="investment-summary-content">
          <div className="investment-summary-heading-and-supporting">
            <div className="investment-summary-heading">The EasyOps Advantage</div>
          </div>

          <div className="investment-summary-check-items-wrap">
            <div className="investment-summary-check-items">
              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-1">Time to Value</div>
                </div>
              </div>

              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-1">User Adoption</div>
                </div>
              </div>

              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-1">Compliance Risk</div>
                </div>
              </div>

              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-1">Support</div>
                </div>
              </div>
            </div>

            <div className="investment-summary-check-items">
              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-2">Instant Setup</div>
                </div>
              </div>

              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-2">Frictionless (via WhatsApp)</div>
                </div>
              </div>

              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-2">Fully Mitigated</div>
                </div>
              </div>

              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-2">Dedicated Local Team</div>
                </div>
              </div>
            </div>
          </div>

          <p className="investment-summary-supporting-text">
            We combine technical excellence with a deep understanding of South African business
            requirements, delivering an operational tool that pays for itself from day one through
            immediate efficiency gains.
          </p>
        </div>
      </div>
    </div>
  )
}
