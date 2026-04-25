"use client"
import { CheckIcon, UserIcon, PlayCircle, Clock } from "lucide-react"
import heroImage from "../../src/assets/hero-imageI-EO.jpg"
import "../styles/hero.css"

export default function Hero() {
	return (
		<section className="hero-section" id="home">
			{/* Background */}
			<div className="hero-bg" />
			<div className="hero-bg-fade" />

			<div className="hero-container">
				<div className="hero-grid">
					{/* Left content */}
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
									fill="none">
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
							Attendance tracking, payroll integration, and BCEA compliance —
							all in one powerful platform designed for the South African
							workforce.
						</p>

						<div className="hero-cta-actions">
							<button className="hero-cta-button hero-cta-button--primary">
								<div className="hero-cta-button-text">Demo</div>
								<div className="hero-icon-container">
									<PlayCircle className="hero-cta-icon" />
								</div>
							</button>
							<button className="hero-cta-button hero-cta-button--outline">
								<div className="hero-cta-button-text">Learn More</div>
							</button>
						</div>

						<div className="hero-stats-section">
							<div className="hero-stat-container">
								<div className="hero-stat-icon-content">
									<Clock className="hero-stat-icon" color="#279e8a" />
								</div>
								<div>
									<div className="hero-stat-value">99.9%</div>
									<div className="hero-stat-label">Uptime</div>
								</div>
							</div>
							<div className="hero-stat-container">
								<div className="hero-stat-icon-content">
									<UserIcon className="hero-stat-icon" color="#279e8a" />
								</div>
								<div>
									<div className="hero-stat-value">5K+</div>
									<div className="hero-stat-label">Active Users</div>
								</div>
							</div>
							<div className="hero-stat-container">
								<div className="hero-stat-icon-content">
									<CheckIcon className="hero-stat-icon" color="#279e8a" />
								</div>
								<div>
									<div className="hero-stat-value">BCEA</div>
									<div className="hero-stat-label">Compliant</div>
								</div>
							</div>
						</div>
					</div>

					{/* Right image */}
					<div className="hero-image-content">
						<div className="hero-image-wrapper">
							<div className="hero-image-glow" />
							<img className="hero-image" alt="Hero image" src={heroImage} />
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
