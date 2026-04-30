import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"

import TopNavBar from "../components/TopNavBar"
import Hero from "./Hero"
import Features from "./Features"
import HowItWorks from "./HowItWorks"
import Benefits from "./Benefits"
import CTASection from "./CTASection"
import Footer from "../components/Footer"
import "../App.css"

function useReveal() {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    obs.disconnect()
                }
            },
            { threshold: 0.12 }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [])
    return { ref, visible }
}

export default function Index() {
    const navigate = useNavigate()
    return (
        <div>
            <TopNavBar />
            <section id="home">
                <Hero navigate={navigate} />
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
                <CTASection navigate={navigate} />
            </section>
            <Footer />
        </div>
    )
}
