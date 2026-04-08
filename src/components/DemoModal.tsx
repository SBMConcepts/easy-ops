"use client";
import { useState, useEffect, useRef } from "react";
import "../styles/demomodal.css";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "500+"];

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    size: "",
    message: "",
  });

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      // Reset after close animation finishes
      setTimeout(() => {
        setSubmitted(false);
        setForm({ name: "", email: "", company: "", size: "", message: "" });
      }, 300);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate async submission
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  const isValid = form.name && form.email && form.company && form.size;

  return (
    <div
      ref={overlayRef}
      className={`demo-modal__overlay ${isOpen ? "demo-modal__overlay--open" : ""}`}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label="Request a Demo"
    >
      <div
        className={`demo-modal__panel ${isOpen ? "demo-modal__panel--open" : ""}`}
      >
        {/* Close button */}
        <button
          className="demo-modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M1 1l16 16M17 1L1 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {submitted ? (
          /* ── Success state ── */
          <div className="demo-modal__success">
            <div className="demo-modal__success-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle
                  cx="20"
                  cy="20"
                  r="20"
                  fill="#2ec4b6"
                  fillOpacity="0.15"
                />
                <path
                  d="M12 20l6 6 10-12"
                  stroke="#2ec4b6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="demo-modal__success-title">You're on the list!</h2>
            <p className="demo-modal__success-body">
              Thanks, <strong>{form.name.split(" ")[0]}</strong>. Our team will
              reach out to <strong>{form.email}</strong> within one business day
              to schedule your demo.
            </p>
            <button className="demo-modal__submit" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <div className="demo-modal__header">
              <div className="demo-modal__eyebrow">
                <div className="demo-modal__eyebrow-Easy">Easy</div>
                <div className="demo-modal__eyebrow-Ops">Ops</div>
              </div>
              <h2 className="demo-modal__title">Request a Demo</h2>
              <p className="demo-modal__subtitle">
                See how EazyOps simplifies workforce management for your
                business. Fill in your details and we'll be in touch.
              </p>
            </div>

            <div className="demo-modal__form">
              <div className="demo-modal__row">
                <div className="demo-modal__field">
                  <label className="demo-modal__label" htmlFor="demo-name">
                    Full Name <span className="demo-modal__required">*</span>
                  </label>
                  <input
                    ref={firstInputRef}
                    id="demo-name"
                    name="name"
                    type="text"
                    className="demo-modal__input"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={handleChange}
                    autoComplete="name"
                  />
                </div>

                <div className="demo-modal__field">
                  <label className="demo-modal__label" htmlFor="demo-email">
                    Work Email <span className="demo-modal__required">*</span>
                  </label>
                  <input
                    id="demo-email"
                    name="email"
                    type="email"
                    className="demo-modal__input"
                    placeholder="jane@company.co.za"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="demo-modal__row">
                <div className="demo-modal__field">
                  <label className="demo-modal__label" htmlFor="demo-company">
                    Company Name <span className="demo-modal__required">*</span>
                  </label>
                  <input
                    id="demo-company"
                    name="company"
                    type="text"
                    className="demo-modal__input"
                    placeholder="Acme (Pty) Ltd"
                    value={form.company}
                    onChange={handleChange}
                    autoComplete="organization"
                  />
                </div>

                <div className="demo-modal__field">
                  <label className="demo-modal__label" htmlFor="demo-size">
                    Company Size <span className="demo-modal__required">*</span>
                  </label>
                  <select
                    id="demo-size"
                    name="size"
                    className="demo-modal__input demo-modal__select"
                    value={form.size}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select employees…
                    </option>
                    {COMPANY_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s} employees
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="demo-modal__field demo-modal__field--full">
                <label className="demo-modal__label" htmlFor="demo-message">
                  Anything you'd like us to know?
                </label>
                <textarea
                  id="demo-message"
                  name="message"
                  className="demo-modal__input demo-modal__textarea"
                  placeholder="Tell us about your current pain points, team size, or specific features you're interested in…"
                  value={form.message}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <button
                className={`demo-modal__submit ${loading ? "demo-modal__submit--loading" : ""}`}
                onClick={handleSubmit}
                disabled={!isValid || loading}
              >
                {loading ? (
                  <span className="demo-modal__spinner" />
                ) : (
                  "Request My Demo →"
                )}
              </button>

              <p className="demo-modal__disclaimer">
                No credit card required. We'll never share your details with
                third parties.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
