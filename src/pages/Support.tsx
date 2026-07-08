'use client'
import { useState } from 'react'
import { ChevronDown, Mail } from 'lucide-react'
import TopNavBar from '../components/TopNavBar'
import Footer from '../components/Footer'
import '../styles/onboarding.css'
import '../styles/companypages.css'

interface Faq {
  question: string
  answer: string
}

const FAQS: Faq[] = [
  {
    question: 'What is EasyOps?',
    answer:
      'EasyOps is a workforce management platform built for South African businesses. It handles time and attendance, live attendance monitoring, compliance reporting, and payroll exports from a single dashboard.',
  },
  {
    question: 'How do employees check in?',
    answer:
      'Employees can check in using QR codes, biometric verification, or WhatsApp-based check-ins. Every check-in is recorded in real time so you always know who is on-site, late, or absent.',
  },
  {
    question: 'Can I manage multiple sites and departments?',
    answer:
      'Yes. You can create multiple sites and departments, assign employees and managers to each, and view attendance and reports scoped to any level of your organisation.',
  },
  {
    question: 'Is EasyOps POPIA compliant?',
    answer:
      'EasyOps processes personal information in line with the Protection of Personal Information Act (POPIA), using encryption in transit and role-based access controls to protect your data.',
  },
  {
    question: 'How does billing work?',
    answer:
      'Paid plans are billed in advance on a recurring monthly basis. You can review your plan and update billing details at any time from your workspace billing settings.',
  },
  {
    question: 'How do I get help if something goes wrong?',
    answer:
      'Our support team is available at support@easyops.co.za. You can also browse this FAQ for quick answers to the most common questions about the platform.',
  },
  {
    question: 'Can I integrate EasyOps with my payroll system?',
    answer:
      'Yes. You can export payroll-ready reports (CSV / Excel) directly, and we offer integrations with common South African payroll providers on the Growth and Enterprise plans.',
  },
  {
    question: 'Is my biometric data secure?',
    answer:
      'Biometric templates are stored on the local device where possible, and any server-side templates are encrypted at rest. We do not share biometric data with third parties.',
  },
]

export default function Support() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index))
  }

  return (
    <div>
      <TopNavBar />
      <main className="company-page">
        <div className="company-container">
          <header className="company-header">
            <span className="company-eyebrow">Support</span>
            <h1 className="company-title">Frequently asked questions</h1>
            <p className="company-subtitle">
              Answers to the most common questions about the EasyOps platform. Can&apos;t find what
              you&apos;re looking for? Reach out to our support team.
            </p>
          </header>

          <div className="company-faq">
            {FAQS.map((faq, index) => {
              const isOpen = openIndex === index
              return (
                <div key={faq.question} className="company-faq__item">
                  <button
                    type="button"
                    className="company-faq__trigger"
                    onClick={() => toggle(index)}
                    aria-expanded={isOpen}
                  >
                    {faq.question}
                    <ChevronDown
                      aria-hidden="true"
                      className={[
                        'company-faq__chevron',
                        isOpen ? 'company-faq__chevron--open' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    />
                  </button>
                  {isOpen && <p className="company-faq__answer">{faq.answer}</p>}
                </div>
              )
            })}
          </div>

          <div className="company-cta">
            <h2 className="company-cta__title">Still need help?</h2>
            <p className="company-cta__text">
              Our support team is ready to assist you with anything the FAQ didn&apos;t cover.
            </p>
            <a className="company-btn company-btn--primary" href="mailto:support@easyops.co.za">
              <Mail aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
              support@easyops.co.za
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
