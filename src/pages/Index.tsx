import TopNavBar from "../components/TopNavBar"
import Hero from "./Hero"
import Features from "./Features"
import HowItWorks from "./HowItWorks"
import Benefits from "./Benefits"
import CTASection from "./CTASection"
import Footer from "../components/Footer"

const Index = () => {
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
            <section id="cta">
                <CTASection />
            </section>
            <Footer />
        </div>
    )
}

export default Index
