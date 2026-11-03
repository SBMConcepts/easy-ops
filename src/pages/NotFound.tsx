import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarClock,
  Compass,
  Home,
  LogIn,
  Mail,
  MapPin,
  ScanLine,
  Users,
} from 'lucide-react'
import TopNavBar from '../components/TopNavBar'
import Footer from '../components/Footer'
import '../styles/notfound.css'

const NAV_ITEMS = [
  { label: 'Home', to: '/', icon: Compass },
  { label: 'Features', to: '/features', icon: CalendarClock },
  { label: 'How it Works', to: '/how-it-works', icon: Mail },
  { label: 'Benefits', to: '/benefits', icon: Users },
  { label: 'Pricing', to: '/pricing', icon: MapPin },
  { label: 'Contact Us', to: '/contact', icon: LogIn },
  { label: 'Open the App', to: '/login', icon: LogIn },
]

const NotFound = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [clock, setClock] = useState('')

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  useEffect(() => {
    const update = () => {
      setClock(
        new Date().toLocaleTimeString('en-ZA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      )
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="notfound-page">
      <TopNavBar />

      <main className="notfound-section">
        <div className="notfound-overlay" aria-hidden />

        {/* Ambient glows */}
        <motion.div
          aria-hidden
          className="notfound-ambient-1"
          animate={{ y: [0, 40, 0], x: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="notfound-ambient-2"
          animate={{ y: [0, -50, 0], x: [0, -25, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="notfound-main">
          <div className="notfound-main__grid">
            {/* Left: message */}
            <div className="notfound-main-grid-content">
              <span className="notfound-eyebrow">
                <CalendarClock className="notfound-eyebrow__icon" />
                <span className="notfound-eyebrow__time">{clock || '--:--:--'}</span>
                <span className="notfound-eyebrow__zone">SAST</span>
              </span>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="notfound-main-grid-content__code"
              >
                4<span className="notfound-main-grid-content__code-accent">0</span>4
              </motion.h1>

              <motion.h2
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="notfound-main-grid-content__title"
              >
                This page has clocked out.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="notfound-main-grid-content__text"
              >
                We scanned the roster but couldn't find a shift at this address. It may have been
                moved, reassigned, or never existed at all.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="notfound-path"
              >
                <span className="notfound-path__label">404:</span>
                <span className="notfound-path__value">{location.pathname}</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="notfound-actions"
              >
                <Link to="/" className="notfound-btn notfound-btn--primary">
                  <Home className="notfound-btn__icon" />
                  Back to Home
                </Link>
                <Link to="/login" className="notfound-btn notfound-btn--outline">
                  <LogIn className="notfound-btn__icon" />
                  Open the App
                </Link>
                <Link to="/support" className="notfound-btn notfound-btn--ghost">
                  <ArrowLeft className="notfound-btn__icon notfound-btn__icon--flip" />
                  Get Support
                </Link>
              </motion.div>
            </div>

            {/* Right: playful status-card illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="notfound-main-grid-sidebar"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="notfound-card"
              >
                <div className="notfound-main-grid-sidebar__header">
                  <span className="notfound-main-grid-sidebar__heading">Attendance record</span>
                  <span className="notfound-badge notfound-badge--danger">Missing</span>
                </div>

                <div className="notfound-record-list">
                  {[
                    { label: 'Employee', value: 'Unknown visitor' },
                    { label: 'Location', value: 'Nowhere on the map' },
                    { label: 'Shift', value: 'Not on the roster' },
                    { label: 'Clock-in', value: '-- : -- : --' },
                  ].map((row, i) => (
                    <motion.div
                      key={row.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.6 + i * 0.15 }}
                      className="notfound-record-row"
                    >
                      <span className="notfound-record-row__label">{row.label}</span>
                      <span className="notfound-record-row__value">{row.value}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Scanning QR */}
                <div className="notfound-scanner">
                  <div className="notfound-scanner__grid" aria-hidden>
                    {Array.from({ length: 36 }).map((_, i) => (
                      <motion.span
                        key={i}
                        className={
                          (i * 7 + (i % 5) * 3) % 4 < 2
                            ? 'notfound-scanner__cell notfound-scanner__cell--filled'
                            : 'notfound-scanner__cell'
                        }
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 2.4,
                          repeat: Infinity,
                          delay: (i % 6) * 0.18,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                  </div>
                  <motion.div
                    className="notfound-scanner__line"
                    animate={{ top: ['15%', '85%', '15%'] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>

                <p className="notfound-main-grid-sidebar__paragraph">
                  Even our QR codes can't check in here.
                </p>
              </motion.div>
            </motion.div>
          </div>

          <nav className="notfound-quicklinks" aria-label="Where to next?">
            <span className="notfound-quicklinks__label">Where to next?</span>
            <ul className="notfound-quicklinks__list">
              {NAV_ITEMS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="notfound-quicklinks__link">
                    <link.icon className="notfound-quicklinks__link-icon" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default NotFound
