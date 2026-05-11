'use client'
import { ArrowRight, Phone } from 'lucide-react'
import '../styles/ctasection.css'
import DemoModal from '../components/DemoModal'
import { useState } from 'react'
import { motion } from 'framer-motion'

const CTASection = () => {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="cta-section" id="contact">
      <div className="cta-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="cta-content">
            <div className="cta-heading-and-supporting-text">
              <p className="cta-heading">Ready to Transform Your Workforce Management?</p>

              <p className="cta-supporting-text">
                Join businesses across South Africa that trust EazyOps to streamline operations,
                ensure compliance, and keep their teams happy.
              </p>
            </div>

            <div className="cta-actions">
              <button className="cta-gst-button" onClick={() => (window.location.href = '/login')}>
                <div className="cta-gst-button-text">Get Started Today</div>

                <ArrowRight className="cta-arrow-right" />
              </button>

              <button
                className="cta-request-demo-button"
                aria-label="Request A Demo"
                onClick={() => setModalOpen(true)}
              >
                <div className="cta-request-demo-text">Request A Demo</div>
                <Phone className="cta-request-demo-icon" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      {/* Demo Modal */}
      {modalOpen && <DemoModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />}
    </div>
  )
}

export default CTASection
