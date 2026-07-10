'use client'
import DemoModal from '../components/DemoModal'
import { useState } from 'react'
import { motion } from 'framer-motion'
import '../styles/ctasection.css'

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
              <h3 className="cta-heading">Ready to Transform Your Workforce Management?</h3>

              <p className="cta-supporting-text">
                Join businesses across South Africa that trust EasyOps to streamline operations,
                ensure compliance, and keep your workforce engaged and productive.
              </p>
            </div>

            <div className="cta-actions">
              <button
                className="cta-gst-button"
                onClick={() => (window.location.href = '/register')}
              >
                Get Started Today
              </button>

              <button
                className="cta-request-demo-button"
                aria-label="Request A Demo"
                onClick={() => setModalOpen(true)}
              >
                Request A Demo
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
