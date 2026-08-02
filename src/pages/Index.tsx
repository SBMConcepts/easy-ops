import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TopNavBar from '../components/TopNavBar'
import Hero from './Hero'
import Features from './Features'
import HowItWorks from './HowItWorks'
import Benefits from './Benefits'
import CTASection from './CTASection'
import Footer from '../components/Footer'
import PricingSection from '../components/PricingSection'

const Index = () => {
  return (
    <>
      <BrowserRouter>
        <TopNavBar />
        <Routes>
          <Route path="/home" element={<Hero />} />
          <Route path="/features" element={<Features />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/benefits" element={<Benefits />} />
          <Route path="/pricing" element={<PricingSection />} />
          <Route path="/cta" element={<CTASection />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </>
  )
}

export default Index
