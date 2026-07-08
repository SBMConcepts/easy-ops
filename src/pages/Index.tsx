import { useEffect } from 'react'
import { useLocation } from 'react-router'
import TopNavBar from '../components/TopNavBar'
import Hero from './Hero'
import Features from './Features'
import HowItWorks from './HowItWorks'
import Benefits from './Benefits'
import CTASection from './CTASection'
import Footer from '../components/Footer'
import PricingSection from '../components/PricingSection'

const Index = () => {
  const location = useLocation()

  // Scroll to the section requested by TopNavBar when arriving from another page.
  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo
    if (!scrollTo) return

    // Wait for sections to mount before scrolling.
    const timer = setTimeout(() => {
      const section = document.getElementById(scrollTo)
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' })
      }
      // Clear the state so refreshes don't re-trigger the scroll.
      window.history.replaceState({}, document.title)
    }, 100)

    return () => clearTimeout(timer)
  }, [location.state])

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
