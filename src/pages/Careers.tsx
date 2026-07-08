'use client'
import { MapPin, Clock, Building2 } from 'lucide-react'
import TopNavBar from '../components/TopNavBar'
import Footer from '../components/Footer'
import '../styles/onboarding.css'
import '../styles/companypages.css'

interface Job {
  title: string
  department: string
  location: string
  type: string
}

const JOBS: Job[] = [
  {
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Johannesburg (Hybrid)',
    type: 'Full-time',
  },
  {
    title: 'Backend Engineer',
    department: 'Engineering',
    location: 'Remote (South Africa)',
    type: 'Full-time',
  },
  {
    title: 'Product Designer',
    department: 'Design',
    location: 'Cape Town (Hybrid)',
    type: 'Full-time',
  },
  {
    title: 'Customer Success Specialist',
    department: 'Customer Success',
    location: 'Durban (On-site)',
    type: 'Full-time',
  },
  {
    title: 'Sales Development Representative',
    department: 'Sales',
    location: 'Remote (South Africa)',
    type: 'Full-time',
  },
  {
    title: 'People & Culture Intern',
    department: 'Operations',
    location: 'Johannesburg (On-site)',
    type: 'Internship',
  },
]

export default function Careers() {
  return (
    <div>
      <TopNavBar />
      <main className="company-page">
        <div className="company-container">
          <header className="company-header">
            <span className="company-eyebrow">Careers</span>
            <h1 className="company-title">Build the future of work in Africa</h1>
            <p className="company-subtitle">
              We&apos;re on a mission to simplify workforce management for businesses across South
              Africa. Explore our open roles and grow your career with EasyOps.
            </p>
          </header>

          <div className="company-jobs">
            {JOBS.map((job) => (
              <article key={job.title} className="company-job">
                <div className="company-job__info">
                  <h2 className="company-job__title">{job.title}</h2>
                  <div className="company-job__meta">
                    <span className="company-tag">
                      <Building2
                        aria-hidden="true"
                        style={{ width: '0.85rem', height: '0.85rem' }}
                      />
                      {job.department}
                    </span>
                    <span className="company-tag">
                      <MapPin aria-hidden="true" style={{ width: '0.85rem', height: '0.85rem' }} />
                      {job.location}
                    </span>
                    <span className="company-tag">
                      <Clock aria-hidden="true" style={{ width: '0.85rem', height: '0.85rem' }} />
                      {job.type}
                    </span>
                  </div>
                </div>
                <a
                  href="#"
                  className="company-btn company-btn--primary"
                  aria-label={`Apply for ${job.title}`}
                >
                  Apply now
                </a>
              </article>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
