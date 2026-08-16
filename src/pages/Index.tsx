import TopNavBar from '../components/TopNavBar'
import Hero from './Hero'
import Features from './Features'
import HowItWorks from './HowItWorks'
import Benefits from './Benefits'
import CTASection from './CTASection'
import Footer from '../components/Footer'
import PricingSection from '../components/PricingSection'
import { useNavigate } from 'react-router-dom'

const Index = () => {
  const navigate = useNavigate()

  return (
    <>
      <TopNavBar />
      <Hero />
      <Features />
      <HowItWorks />
      <Benefits />
      <PricingSection onConfirmPlan={(plan) => navigate(`/register?plan=${plan}`)} />
      <CTASection />
      <Footer />
    </>
  )
}

export default Index
