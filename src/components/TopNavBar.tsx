'use client'
import { useState, useEffect, useRef } from 'react'
import '../styles/topnavbar.css'
import { useNavigate, useLocation } from 'react-router-dom'
import BrandLogo from '../assets/EasyOps Logo.png'

const NAV_ITEMS = [
  { label: 'Home', id: 'home' },
  { label: 'Features', id: 'features' },
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'Benefits', id: 'benefits' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'Demo', id: 'cta' },
] as const

type NavId = ['id'] | ['to']

/** Marketing-site top navigation bar: scroll-spy section links, mobile drawer, and the demo-request modal trigger. */
export default function TopNavBar() {
  const [activeItem, setActiveItem] = useState<NavId | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const isClickScrolling = useRef(false)

  // Close drawer on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 641) setDrawerOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Close drawer on outside click
  useEffect(() => {
    if (!drawerOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      const insideHeader = navRef.current?.contains(target)
      const insideDrawer = drawerRef.current?.contains(target)
      const insideHamburger = hamburgerRef.current?.contains(target)
      if (!insideHeader && !insideDrawer && !insideHamburger) {
        setDrawerOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [drawerOpen])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveItem(['id'])
          }
        })
      },
      {
        rootMargin: '-80px 0px -40% 0px',
        threshold: 0,
      }
    )

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const scrollToSection = (id: NavId) => {
    const section = document.getElementById(id?.toString() ?? '')
    if (!section) return

    const navbarHeight = navRef.current?.offsetHeight ?? 0
    const sectionTop = section.getBoundingClientRect().top + window.scrollY
    const scrollTarget = sectionTop - navbarHeight

    isClickScrolling.current = true
    window.scrollTo({ top: scrollTarget, behavior: 'smooth' })

    setTimeout(() => {
      isClickScrolling.current = false
    }, 800)
  }

  const handleNavClick = (id: NavId, fromDrawer = false) => {
    setActiveItem(id)
    setDrawerOpen(false)

    // Nav sections only exist on the home page. When on another route,
    // navigate home first and let Index scroll to the target section.
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } })
      return
    }

    if (fromDrawer) {
      window.setTimeout(() => {
        scrollToSection(id)
      }, 250)
      return
    }

    scrollToSection(id)
  }

  return (
    <>
      <div className="top-navbar-header" ref={navRef}>
        <div className="top-navbar-container">
          {/* ── Logo ── */}
          <div className="top-navbar-logo">
            <button
              type="button"
              className="top-navbar-logo-wrap"
              onClick={() => handleNavClick('home' as unknown as NavId)}
              aria-label="Home"
            >
              <img className="top-navbar-logo-image" src={BrandLogo} alt="EasyOps" />
            </button>
          </div>

          {/* ── Desktop nav (hidden on mobile via CSS) ── */}
          <div className="top-navbar-content">
            <nav className="top-navbar-navigation" aria-label="Primary">
              {NAV_ITEMS.map(({ label, id }) => (
                <div key={id} className="top-navbar-nav-item">
                  <button
                    type="button"
                    className={[
                      'top-navbar-text',
                      activeItem === (id as unknown as NavId) ? 'top-navbar-text--active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-current={activeItem === (id as unknown as NavId) ? 'page' : undefined}
                    onClick={() => handleNavClick(id as unknown as NavId)}
                  >
                    {label}
                  </button>
                </div>
              ))}
            </nav>
          </div>

          {/* ── Desktop CTA (hidden on mobile via CSS) ── */}
          <div className="top-navbar-navigation-actions">
            <button
              className="top-navbar-button"
              aria-label="Login"
              onClick={() => navigate('/login')}
            >
              <div className="top-navbar-button-text">Open App</div>
            </button>
          </div>

          {/* ── Hamburger (visible on mobile only via CSS) ── */}
          <button
            ref={hamburgerRef}
            className="top-navbar-hamburger"
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            onClick={() => setDrawerOpen((prev) => !prev)}
          >
            <span className="top-navbar-hamburger-bar" />
            <span className="top-navbar-hamburger-bar" />
            <span className="top-navbar-hamburger-bar" />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer (outside sticky header so it overlays content) ── */}
      <div
        ref={drawerRef}
        id="mobile-drawer"
        className={['top-navbar-drawer', drawerOpen ? 'top-navbar-drawer--open' : '']
          .filter(Boolean)
          .join(' ')}
        aria-hidden={!drawerOpen}
      >
        <nav className="top-navbar-drawer-nav" aria-label="Mobile">
          {NAV_ITEMS.map(({ label, id }) => (
            <div key={id} className="top-navbar-drawer-item">
              <button
                type="button"
                className={[
                  'top-navbar-drawer-text',
                  activeItem === (id as unknown as NavId) ? 'top-navbar-drawer-text--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={activeItem === (id as unknown as NavId) ? 'page' : undefined}
                onClick={() => handleNavClick(id as unknown as NavId, true)}
              >
                {label}
              </button>
            </div>
          ))}
        </nav>

        <div className="top-navbar-drawer-cta">
          <button
            type="button"
            className="top-navbar-drawer-button"
            aria-label="Login"
            onClick={() => {
              setDrawerOpen(false)
              navigate('/login')
            }}
          >
            <span className="top-navbar-drawer-button-text">Open App</span>
          </button>
        </div>
      </div>
    </>
  )
}
