import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom' // Ensure this matches your project's router package
import { getSubdomain } from '../utils/subdomain' // Import your subdomain utility

import TopNavBar from '../components/TopNavBar'
import Hero from './Hero'
import Features from './Features'
import HowItWorks from './HowItWorks'
import Benefits from './Benefits'
import CTASection from './CTASection'
import Footer from '../components/Footer'
import PricingSection from '../components/PricingSection'

const Index = () => {
  const navigate = useNavigate()
  const slug = getSubdomain() // Detects if e.g. "acme" is present in the host

  useEffect(() => {
    // If a custom tenant subdomain is detected, bypass the marketing page
    // and send the user straight to the tenant-aware login screen.
    if (slug) {
      navigate('/login', { replace: true })
    }
  }, [slug, navigate])

  // Prevent flash of marketing content while redirecting on a subdomain
  if (slug) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div>
      <TopNavBar />
      <section id="home">
        <Hero />
      </section>
      <section id="features">
        <Features />
      </section>
      <section id="how-it-works">
        <HowItWorks />
      </section>
      <section id="benefits">
        <Benefits />
      </section>
      <section id="pricing">
        <PricingSection />
      </section>
      <section id="cta">
        <CTASection />
      </section>
      <Footer />
    </div>
  )
}

export default Index
