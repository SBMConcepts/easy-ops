"use client"
import { CheckIcon, UserIcon, PlayCircle, Clock } from "lucide-react"
import heroImage from "../../src/assets/hero-imageI-EO.jpg"
import "../styles/hero.css"
import { motion } from "framer-motion"
import { Button } from "../components/ui/button"

const stats = [
    { icon: Clock, value: "99.9%", label: "Attendance Accuracy" },
    { icon: UserIcon, value: "10K+", label: "Employees Managed" },
    { icon: CheckIcon, value: "BCEA", label: "Fully Compliant" },
]

const Hero = () => {
    return (
        <section className="hero-section" id="home">
            {/* Background */}
            <div className="hero-bg" />
            <div className="hero-bg-fade" />

            <div className="hero-container">
                <div className="hero-grid">
                    {/* Left content */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                    >
                        <div className="hero-left-content">
                            <div className="hero-heading-badge">
                                <span className="hero-heading-badge__dot" />
                                <span className="hero-heading-badge__text">
                                    Built for All Businesses Workforces
                                </span>
                            </div>

                            <h1 className="hero-heading">
                                Simplify Your{" "}
                                <span className="hero-heading__underline">
                                    Workforce
                                    <svg
                                        className="hero-heading__svg"
                                        viewBox="0 0 200 12"
                                        fill="none"
                                    >
                                        <path
                                            d="M2 8C30 3 70 2 100 4C130 6 170 3 198 8"
                                            stroke="#279e8a"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </span>{" "}
                                Operations
                            </h1>

                            <p className="hero-subheading">
                                Attendance tracking, payroll integration, and
                                BCEA compliance — all in one powerful platform
                                designed for the South African workforce.
                            </p>

                            <div className="hero-cta-actions">
                                <Button
                                    className="hero-cta-button hero-cta-button--primary"
                                    onClick={() =>
                                        (window.location.href = "/login")
                                    }
                                >
                                    <div className="hero-cta-button-text">
                                        Start Now
                                    </div>
                                    <div className="hero-icon-container">
                                        <PlayCircle className="hero-cta-icon" />
                                    </div>
                                </Button>
                                <Button className="hero-cta-button hero-cta-button--outline">
                                    <div className="hero-cta-button-text">
                                        Learn More
                                    </div>
                                </Button>
                            </div>

                            <div className="hero-stats-section">
                                {stats.map((stat, index) => (
                                    <div
                                        key={index}
                                        className="hero-stat-container"
                                    >
                                        <div className="hero-stat-icon-content">
                                            <stat.icon
                                                className="hero-stat-icon"
                                                color="#279e8a"
                                            />
                                        </div>
                                        <div>
                                            <div className="hero-stat-value">
                                                {stat.value}
                                            </div>
                                            <div className="hero-stat-label">
                                                {stat.label}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Right image */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        className="hidden lg:block"
                    >
                        <div className="hero-image-content">
                            <div className="hero-image-wrapper">
                                <div className="hero-image-glow" />
                                <img
                                    className="hero-image"
                                    alt="Hero image"
                                    src={heroImage}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

export default Hero
