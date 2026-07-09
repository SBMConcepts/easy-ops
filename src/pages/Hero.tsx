'use client'
import { CheckIcon, UserIcon, PlayCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import heroImage from '../../src/assets/hero-imageI-EO.jpg'
import heroCheckin from '../assets/hero-checkin.jpg'
import heroHR from '../assets/hero-hr-worker.jpg'
import heroManagement from '../assets/hero-management.jpg'
import heroSite from '../assets/hero-on-site.jpg'
import heroWorkers from '../assets/hero-workers.jpg'

import '../styles/hero.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../components/ui/button'
import { useCallback, useEffect, useState } from 'react'

const stats = [
  { icon: Clock, value: '99.9%', label: 'Attendance Accuracy' },
  { icon: UserIcon, value: '5K+', label: 'Employees Managed' },
  { icon: CheckIcon, value: 'BCEA', label: 'Fully Compliant' },
]

const slides = [
  {
    src: heroWorkers,
    alt: 'Diverse team collaborating in a modern South African workplace',
    caption:
      'Empowering South African businesses with a workforce management solution that works for everyone.',
  },
  {
    src: heroCheckin,
    alt: 'Employee scanning a QR code to check in for a shift',
    caption: 'Fast, concise and efficient check-ins on any device and location.',
  },
  {
    src: heroManagement,
    alt: 'Small business owner managing their workforce on the go',
    caption: 'Managers and owners stay in control, wherever they are.',
  },
  {
    src: heroHR,
    alt: 'Administrative professionals reviewing employee records while working remotely',
    caption: 'HR professionals streamline processes and ensure compliance.',
  },
  {
    src: heroSite,
    alt: 'Field workers collaborating on a construction site with mobile devices',
    caption: 'Field teams stay connected and productive on every site.',
  },
  {
    src: heroImage,
    alt: 'An illustration of a modern workforce management interface on a tablet device',
    caption: 'An interface designed to simplify workforce management on any device.',
  },
]

const SLIDE_INTERVAL = 5000

const Hero = () => {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const next = useCallback(() => {
    setDirection(1)
    setIndex((prev) => (prev + 1) % slides.length)
  }, [])

  const prev = useCallback(() => {
    setDirection(-1)
    setIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }, [])

  const goTo = (i: number) => {
    setDirection(i > index ? 1 : -1)
    setIndex(i)
  }

  useEffect(() => {
    const timer = setInterval(next, SLIDE_INTERVAL)
    return () => clearInterval(timer)
  }, [next])

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 60 : -60,
      opacity: 0,
      scale: 1.02,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -60 : 60,
      opacity: 0,
      scale: 0.98,
    }),
  }
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
                  Built for for Small, Medium and Large Workforces
                </span>
              </div>

              <h1 className="hero-heading">
                Every shift, every site and{' '}
                <span className="hero-heading__underline">
                  every workforce
                  <svg
                    className="hero-heading__svg"
                    viewBox="0 0 200 12"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 8C30 3 70 2 100 4C130 6 170 3 198 8"
                      stroke="#279e8a"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{' '}
                - managed with ease.
              </h1>

              <p className="hero-subheading">
                EasyOps gives small, medium and large teams a workforce platform their people
                actually enjoy using - attendance, scheduling, payroll and compliance, all in one
                place.
              </p>

              <div className="hero-cta-actions">
                <button
                  className="hero-cta-button hero-cta-button--primary"
                  onClick={() => (window.location.href = '/login')}
                >
                  <div className="hero-cta-button-text">Start Now</div>
                </button>
                <button
                  className="hero-cta-button hero-cta-button--outline"
                  onClick={() => (window.location.href = '/contact')}
                >
                  <div className="hero-cta-button-text">Contact Us</div>
                </button>
              </div>

              <div className="hero-stats-section">
                {stats.map((stat, index) => (
                  <div key={index} className="hero-stat-container">
                    <div className="hero-stat-icon-content">
                      <stat.icon className="hero-stat-icon" color="#279e8a" />
                    </div>
                    <div>
                      <div className="hero-stat-value">{stat.value}</div>
                      <div className="hero-stat-label">{stat.label}</div>
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
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hero-image-content"
          >
            <div className="hero-image-content">
              <div className="hero-image-wrapper">
                <div className="hero-image-glow" />
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                  <motion.div
                    key={index}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                    className="hero-image-motion-wrapper"
                  >
                    <img className="hero-image" alt={slides[index].alt} src={slides[index].src} />
                  </motion.div>
                </AnimatePresence>

                {/* Caption */}
                <div className="hero-image-caption">
                  <motion.p
                    key={`caption-${index}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="hero-image-caption-text"
                  >
                    {slides[index].caption}
                  </motion.p>
                </div>
                {/* Navigation arrows */}
                <div className="hero-image-navigation">
                  <button
                    onClick={prev}
                    aria-label="Previous image"
                    className="hero-image-navigation-btn"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={next}
                    aria-label="Next image"
                    className="hero-image-navigation-btn"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Progress dots */}
                <div className="hero-image-progress-dots">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className={`hero-image-progress-dot ${i === index ? 'active' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Hero
