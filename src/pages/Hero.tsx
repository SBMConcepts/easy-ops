"use client";
import { CheckIcon, UserIcon, ArrowRight } from "lucide-react";
import heroImage from "../../src/assets/hero-imageI-EO.jpg";
import {} from "lucide";
import "../styles/hero.css";

export default function Hero() {
  return (
    <div className="hero-section" id="home">
      <div className="hero-container">
        <div className="hero-heading-and-subheading-content">
          <div className="hero-heading-content">
            <div className="hero-heading">
              Simplify Your Workforce Operations
            </div>
          </div>
          <div className="hero-subheading-content">
            <div className="hero-subheading">
              Attendance tracking, payroll integration, and BCEA compliance -
              all in one powerful platform designed for the South African
              workforce.
            </div>
          </div>
        </div>
        <div className="hero-image-content">
          <div className="hero-image-wrapper">
            <img className="hero-image" alt="Hero image" src={heroImage} />
          </div>
        </div>
      </div>

      <div className="hero-cta-actions">
        <button className="hero-cta-button">
          <div className="hero-cta-button-text">Start Free Trial</div>
          <div className="hero-icon-container">
            <ArrowRight className="hero-cta-icon" />
          </div>
        </button>
      </div>

      <div className="hero-stats-section">
        <div className="hero-stat-container">
          <div className="hero-stat-icon-content">
            <ArrowRight className="hero-stat-icon" color="#29AEA0" />
          </div>

          <div className="stat-text">99.9%</div>
        </div>

        <div className="hero-stat-container">
          <div className="hero-stat-icon-content">
            <UserIcon className="hero-stat-icon" color="#29AEA0" />
          </div>

          <div className="stat-text">10K+</div>
        </div>

        <div className="hero-stat-container">
          <div className="hero-stat-icon-content">
            <CheckIcon className="hero-stat-icon" color="#29AEA0" />
          </div>

          <div className="stat-text">BCEA</div>
        </div>
      </div>
    </div>
  );
}
