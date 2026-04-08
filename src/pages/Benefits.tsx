"use client";
import { CheckIcon } from "lucide-react";
import "../styles/benefits.css";

export default function BenefitsSections() {
  return (
    <div className="benefits-sections" id="benefits">
      <div className="benefits-heading-wrapper">
        <div className="benefits-subtitle">Why EazyOps</div>
        <div className="benefits-title">
          The Leading Platform for Workforce Operations in South Africa.
        </div>

        
      </div>

      <div className="benefits-content-wrapper">
        <div className="benefits-content">
          <div className="benefits-text-and-supporting">
            

            <p className="benefits-text-supporting">
              Our vision is to help businesses operate efficiently while
              protecting employee rights through full compliance with BCEA and
              IRA regulations.
            </p>
          </div>

          <div className="benefits-check-items-wrap">
            <div className="benefits-check-items">
              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Eliminate time fraud and buddy-clocking
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Real-time dashboards for multiple branches
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Exportable HR and attendance reports
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <div className="benefits-text-2">
                    Cloud-based with 99.9% uptime
                  </div>
                </div>
              </div>
            </div>

            <div className="benefits-check-items">
              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Automatic overtime and late arrival tracking
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    BCEA &amp; IRA labour law compliance
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    WhatsApp integration — no extra apps
                  </p>
                </div>
              </div>

              <div className="benefits-check-item-text">
                <CheckIcon className="benefits-check-icon" />
                <div className="benefits-text-wrap">
                  <p className="benefits-text-2">
                    Scales from SME to enterprise
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="investment-summary-content">
          <div className="investment-summary-heading-and-supporting">
            <div className="investment-summary-heading">Investment Summary</div>
          </div>

          <div className="investment-summary-check-items-wrap">
            <div className="investment-summary-check-items">
              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-1">Total Project Cost</div>
                </div>
              </div>

              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-1">Payment Structure</div>
                </div>
              </div>

              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-1">Project Duration</div>
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
                  <div className="investment-summary-feature-2">Custom Quote</div>
                </div>
              </div>

              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-2">Milestone-Based</div>
                </div>
              </div>

              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-2">Tailored Timeline</div>
                </div>
              </div>

              <div className="investment-summary-check-item-text">
                <div className="investment-summary-text-wrap">
                  <div className="investment-summary-feature-2">Dedicated Account Manager</div>
                </div>
              </div>
            </div>
          </div>

          <p className="investment-summary-supporting-text">
            We bring partners of experience delivering similar projects,
            combining technical excellence with deep understanding of South
            African technology requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
