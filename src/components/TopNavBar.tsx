"use client"
import { useState, useEffect, useRef } from "react"
import "../styles/topnavbar.css"
import DemoModal from "./DemoModal"

const NAV_ITEMS = [
	{ label: "Home", id: "home" },
	{ label: "Features", id: "features" },
	{ label: "How It Works", id: "how-it-works" },
	{ label: "Benefits", id: "benefits" },
	{ label: "Contact", id: "contact" },
] as const

type NavId = (typeof NAV_ITEMS)[number]["id"]

export default function TopNavBar() {
	const [activeItem, setActiveItem] = useState<NavId | null>(null)
	const [drawerOpen, setDrawerOpen] = useState(false)
	const navRef = useRef<HTMLDivElement>(null)
	const isClickScrolling = useRef(false)
	const [modalOpen, setModalOpen] = useState(false)

	// Close drawer on resize to desktop
	useEffect(() => {
		const onResize = () => {
			if (window.innerWidth >= 768) setDrawerOpen(false)
		}
		window.addEventListener("resize", onResize)
		return () => window.removeEventListener("resize", onResize)
	}, [])

	// Close drawer on outside click
	useEffect(() => {
		if (!drawerOpen) return
		const onPointerDown = (e: PointerEvent) => {
			if (navRef.current && !navRef.current.contains(e.target as Node)) {
				setDrawerOpen(false)
			}
		}
		document.addEventListener("pointerdown", onPointerDown)
		return () => document.removeEventListener("pointerdown", onPointerDown)
	}, [drawerOpen])

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (isClickScrolling.current) return
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setActiveItem(entry.target.id as NavId)
					}
				})
			},
			{
				rootMargin: "-80px 0px -40% 0px",
				threshold: 0,
			},
		)

		NAV_ITEMS.forEach(({ id }) => {
			const el = document.getElementById(id)
			if (el) observer.observe(el)
		})

		return () => observer.disconnect()
	}, [])

	const handleNavClick = (id: NavId) => {
		setActiveItem(id)
		setDrawerOpen(false)

		const section = document.getElementById(id)
		if (!section) return

		const navbarHeight = navRef.current?.offsetHeight ?? 0
		const sectionTop = section.getBoundingClientRect().top + window.scrollY
		const scrollTarget = sectionTop - navbarHeight

		isClickScrolling.current = true
		window.scrollTo({ top: scrollTarget, behavior: "smooth" })

		setTimeout(() => {
			isClickScrolling.current = false
		}, 800)
	}

	return (
		<>
			<div className="top-navbar-header" ref={navRef}>
				<div className="top-navbar-container">
					{/* ── Logo ── */}
					<div className="top-navbar-logo">
						<div className="top-navbar-logo-wrap">
							<div className="top-navbar-brand-name">
								<div className="top-navbar-brand-Easy">Easy</div>
								<div className="top-navbar-brand-Ops">Ops</div>
							</div>
						</div>
					</div>

					{/* ── Desktop nav (hidden on mobile via CSS) ── */}
					<div className="top-navbar-content">
						<nav className="top-navbar-navigation" aria-label="Primary">
							{NAV_ITEMS.map(({ label, id }) => (
								<div key={id} className="top-navbar-nav-item">
									<button
										type="button"
										className={[
											"top-navbar-text",
											activeItem === id ? "top-navbar-text--active" : "",
										]
											.filter(Boolean)
											.join(" ")}
										aria-current={activeItem === id ? "page" : undefined}
										onClick={() => handleNavClick(id)}>
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
							aria-label="Get Started"
							onClick={() => setModalOpen(true)}>
							<div className="top-navbar-button-text">Get Started</div>
						</button>
					</div>

					{/* ── Hamburger (visible on mobile only via CSS) ── */}
					<button
						className="top-navbar-hamburger"
						aria-label={drawerOpen ? "Close menu" : "Open menu"}
						aria-expanded={drawerOpen}
						aria-controls="mobile-drawer"
						onClick={() => setDrawerOpen((prev) => !prev)}>
						<span className="top-navbar-hamburger-bar" />
						<span className="top-navbar-hamburger-bar" />
						<span className="top-navbar-hamburger-bar" />
					</button>
				</div>
			</div>

			{/* ── Mobile drawer (outside sticky header so it overlays content) ── */}
			<div
				id="mobile-drawer"
				className={[
					"top-navbar-drawer",
					drawerOpen ? "top-navbar-drawer--open" : "",
				]
					.filter(Boolean)
					.join(" ")}
				aria-hidden={!drawerOpen}>
				<nav className="top-navbar-drawer-nav" aria-label="Mobile">
					{NAV_ITEMS.map(({ label, id }) => (
						<div key={id} className="top-navbar-drawer-item">
							<button
								type="button"
								className={[
									"top-navbar-drawer-text",
									activeItem === id ? "top-navbar-drawer-text--active" : "",
								]
									.filter(Boolean)
									.join(" ")}
								aria-current={activeItem === id ? "page" : undefined}
								onClick={() => handleNavClick(id)}>
								{label}
							</button>
						</div>
					))}
				</nav>

				<div className="top-navbar-drawer-cta">
					<button
						className="top-navbar-drawer-button"
						aria-label="Get Started"
						onClick={() => {
							setDrawerOpen(false)
							setModalOpen(true)
						}}>
						<span className="top-navbar-drawer-button-text">Get Started</span>
					</button>
				</div>
			</div>

			{/* Demo Modal */}
			{modalOpen && (
				<DemoModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
			)}
		</>
	)
}
