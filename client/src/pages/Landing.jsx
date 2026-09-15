import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
    FaCalendarCheck,
    FaMoneyBillWave,
    FaStore,
    FaBoxes,
    FaUsers,
    FaShieldAlt,
    FaComments,
    FaClipboardCheck,
    FaLinkedin,
    FaArrowRight,
    FaChevronDown,
    FaBars,
    FaTimes,
} from "react-icons/fa";

import "./landing.css";

// =================================================================
// MIARCUS — LANDING PAGE
// =================================================================
//
// The first thing anybody sees when they open the site. It does
// not touch authentication at all — every "Sign In" / "Login"
// button on this page simply routes to /login, where the existing
// Login page (unchanged) takes over.
//
// Structure: loading intro -> navbar -> hero -> what's inside ->
// who we are -> team -> final call-to-action -> footer.
// =================================================================

const FEATURES = [
    {
        icon: <FaCalendarCheck />,
        title: "Attendance & Location",
        text: "Live attendance, shift tracking and field location for every store employee, in real time.",
    },
    {
        icon: <FaMoneyBillWave />,
        title: "Billing & Collections",
        text: "Daily billing entries, collection reports and audit trails, reconciled store by store.",
    },
    {
        icon: <FaStore />,
        title: "New Store Openings",
        text: "Track every new store from possession to launch, with rules, timelines and approvals built in.",
    },
    {
        icon: <FaBoxes />,
        title: "Inventory Planning",
        text: "Plan stock, upload ERP data and track SKUs across the entire retail network.",
    },
    {
        icon: <FaUsers />,
        title: "Teams & Departments",
        text: "Users, departments, designations and reporting hierarchy, managed from one screen.",
    },
    {
        icon: <FaShieldAlt />,
        title: "Role-Based Access",
        text: "Every employee sees exactly what their role allows — nothing more, nothing less.",
    },
    {
        icon: <FaComments />,
        title: "Team Chat & Announcements",
        text: "Keep every store and department in sync with built-in chat and company announcements.",
    },
    {
        icon: <FaClipboardCheck />,
        title: "Checklists & Training",
        text: "Store checklists, quizzes and training reports that keep standards consistent everywhere.",
    },
];

const TEAM = [
    {
        photo: "/team-developer.jpg",
        name: "Satyajit Nayak",
        title: "Lead Developer",
        bio: "Designs and builds the Miarcus portal end-to-end — every module, screen and integration in this system.",
        linkedin: "https://www.linkedin.com/in/satyajit-nayak-981185247/",
    },
    {
        photo: "/team-owner.jpg",
        name: "Gian Singh",
        title: "Owner & Co-Founder",
        bio: "Co-founder of MiArcus, setting the direction for Mi Arcus Baby Products and the tools that run it.",
        linkedin: "https://www.linkedin.com/in/gian-singh-14a2aa112/",
    },
];

// =================================================================
// SCROLL-REVEAL HOOK
// Small, dependency-free "fade up when it enters the viewport"
// helper used across the page's sections.
// =================================================================

function useReveal() {
    const ref = useRef(null);

    // Browsers without IntersectionObserver just show everything
    // immediately — no need to ever flip this via an effect.
    const [visible, setVisible] = useState(
        () => typeof IntersectionObserver === "undefined"
    );

    useEffect(() => {
        if (typeof IntersectionObserver === "undefined") return undefined;

        const node = ref.current;
        if (!node) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return [ref, visible];
}

function Reveal({ as: Tag = "div", className = "", children, ...rest }) {
    const [ref, visible] = useReveal();

    return (
        <Tag
            ref={ref}
            className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
            {...rest}
        >
            {children}
        </Tag>
    );
}

// =================================================================
// LOADING INTRO
// =================================================================

function LoadingIntro({ done }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const start = Date.now();
        const duration = 1400;

        const tick = () => {
            const elapsed = Date.now() - start;
            const pct = Math.min(99, Math.round((elapsed / duration) * 100));
            setProgress(pct);

            if (elapsed < duration) {
                requestAnimationFrame(tick);
            } else {
                setProgress(100);
            }
        };

        const frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    return (
        <div className={`landing-loader ${done ? "landing-loader-done" : ""}`}>
            <div className="landing-loader-corner corner-tl" />
            <div className="landing-loader-corner corner-br" />

            <div className="landing-loader-content">
                <img
                    src="/miarcus-brand-theme.png"
                    alt=""
                    className="landing-loader-mark"
                />

                <div className="landing-loader-title">MIARCUS</div>
                <div className="landing-loader-subtitle">
                    Retail operations, all in one place
                </div>

                <div className="landing-loader-bar-track">
                    <div
                        className="landing-loader-bar-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="landing-loader-status">
                    <span>INITIALISING</span>
                    <span>{progress}%</span>
                </div>
            </div>
        </div>
    );
}

// =================================================================
// PAGE
// =================================================================

function Landing() {
    const [loading, setLoading] = useState(true);
    const [loaderDone, setLoaderDone] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const finishTimer = setTimeout(() => setLoaderDone(true), 1450);
        const unmountTimer = setTimeout(() => setLoading(false), 1850);

        return () => {
            clearTimeout(finishTimer);
            clearTimeout(unmountTimer);
        };
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 12);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        document.body.style.overflow = loading ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [loading]);

    const scrollTo = (id) => (event) => {
        event.preventDefault();
        setMenuOpen(false);
        document
            .getElementById(id)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className="landing-page">
            {loading && <LoadingIntro done={loaderDone} />}

            {/* ============================================================
                NAVBAR
            ============================================================ */}

            <header className={`landing-nav ${scrolled ? "landing-nav-scrolled" : ""}`}>
                <div className="landing-nav-inner">
                    <a href="#top" className="landing-brand" onClick={scrollTo("top")}>
                        <img src="/miarcus.png" alt="Miarcus" />
                        <span>Miarcus Portal</span>
                    </a>

                    <nav className={`landing-nav-links ${menuOpen ? "open" : ""}`}>
                        <a href="#features" onClick={scrollTo("features")}>
                            What&apos;s Inside
                        </a>
                        <a href="#about" onClick={scrollTo("about")}>
                            About
                        </a>
                        <a href="#team" onClick={scrollTo("team")}>
                            Team
                        </a>
                        <Link
                            to="/login"
                            className="landing-nav-login"
                            onClick={() => setMenuOpen(false)}
                        >
                            Sign In
                        </Link>
                    </nav>

                    <button
                        type="button"
                        className="landing-nav-toggle"
                        onClick={() => setMenuOpen((prev) => !prev)}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                    >
                        {menuOpen ? <FaTimes /> : <FaBars />}
                    </button>
                </div>
            </header>

            {/* ============================================================
                HERO
            ============================================================ */}

            <main id="top">
                <section className="landing-hero">
                    <div className="landing-hero-glow glow-one" />
                    <div className="landing-hero-glow glow-two" />

                    <div className="landing-hero-inner">
                        <Reveal className="landing-hero-copy">
                            <span className="landing-eyebrow">
                                <span className="landing-eyebrow-dot" />
                                MIARCUS PORTAL
                            </span>

                            <h1>
                                Run every store, every shift,
                                <br />
                                every task — from one place.
                            </h1>

                            <p>
                                Miarcus is the internal operating system behind Mi Arcus
                                Baby Products — attendance, billing, inventory, new
                                store openings and your whole team, in one secure
                                portal.
                            </p>

                            <div className="landing-hero-actions">
                                <Link to="/login" className="landing-btn-primary">
                                    Sign In to Portal
                                    <FaArrowRight />
                                </Link>

                                <a
                                    href="#features"
                                    className="landing-btn-secondary"
                                    onClick={scrollTo("features")}
                                >
                                    See what&apos;s inside
                                    <FaChevronDown />
                                </a>
                            </div>
                        </Reveal>

                        <Reveal className="landing-hero-visual" as="div">
                            <div className="landing-mockup">
                                <div className="landing-mockup-bar">
                                    <span />
                                    <span />
                                    <span />
                                </div>

                                <div className="landing-mockup-body">
                                    <div className="landing-mockup-side">
                                        <div className="mockup-logo" />
                                        {Array.from({ length: 6 }).map((_, index) => (
                                            <div
                                                key={index}
                                                className={`mockup-row ${
                                                    index === 1 ? "mockup-row-active" : ""
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    <div className="landing-mockup-main">
                                        <div className="mockup-stat-row">
                                            <div className="mockup-stat" />
                                            <div className="mockup-stat" />
                                            <div className="mockup-stat" />
                                        </div>
                                        <div className="mockup-panel" />
                                        <div className="mockup-panel mockup-panel-short" />
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* ========================================================
                    FEATURES
                ======================================================== */}

                <section id="features" className="landing-section">
                    <Reveal as="div" className="landing-section-head">
                        <span className="landing-eyebrow landing-eyebrow-dark">
                            <span className="landing-eyebrow-dot" />
                            WHAT&apos;S INSIDE
                        </span>
                        <h2>Everything the operations team needs, built in.</h2>
                        <p>
                            No spreadsheets stitched together, no five different
                            logins. Just one portal that runs the business.
                        </p>
                    </Reveal>

                    <div className="landing-feature-grid">
                        {FEATURES.map((feature, index) => (
                            <Reveal
                                key={feature.title}
                                className="landing-feature-card"
                                style={{ transitionDelay: `${(index % 4) * 70}ms` }}
                            >
                                <div className="landing-feature-icon">
                                    {feature.icon}
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.text}</p>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* ========================================================
                    ABOUT / WHO WE ARE
                ======================================================== */}

                <section id="about" className="landing-about">
                    <Reveal as="div" className="landing-about-inner">
                        <div className="landing-about-copy">
                            <span className="landing-eyebrow">
                                <span className="landing-eyebrow-dot" />
                                WHO WE ARE
                            </span>

                            <h2>Built in-house, for how we actually work.</h2>

                            <p>
                                Miarcus is operated by{" "}
                                <strong>MiArcus Retails Private Limited</strong>, the
                                company behind Mi Arcus Baby Products. Instead of
                                relying on a patchwork of outside tools, we built this
                                portal ourselves — so every module fits the way our
                                stores, warehouses and teams actually run, and every
                                improvement ships the moment we need it.
                            </p>

                            <div className="landing-about-badges">
                                <span>Retail Operations</span>
                                <span>Built In-House</span>
                                <span>Role-Based Security</span>
                            </div>
                        </div>

                        <div className="landing-about-panel">
                            <img
                                src="/miarcus-brand-theme.png"
                                alt="Mi Arcus"
                                className="landing-about-mark"
                            />
                            <p className="landing-about-panel-text">
                                One portal, every store, one source of truth.
                            </p>
                        </div>
                    </Reveal>
                </section>

                {/* ========================================================
                    TEAM
                ======================================================== */}

                <section id="team" className="landing-team">
                    <Reveal as="div" className="landing-section-head">
                        <span className="landing-eyebrow landing-eyebrow-dark">
                            <span className="landing-eyebrow-dot" />
                            THE PEOPLE BEHIND IT
                        </span>
                        <h2>Small team, direct accountability.</h2>
                        <p>
                            No layers, no hand-offs — the person who builds Miarcus
                            and the person who owns the business are both reachable.
                        </p>
                    </Reveal>

                    <div className="landing-team-grid">
                        {TEAM.map((member) => (
                            <Reveal key={member.name} className="landing-team-card">
                                <div className="landing-team-photo">
                                    <img src={member.photo} alt={member.name} />
                                </div>

                                <h3>{member.name}</h3>
                                <span className="landing-team-title">
                                    {member.title}
                                </span>
                                <p>{member.bio}</p>

                                <a
                                    href={member.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="landing-team-linkedin"
                                >
                                    <FaLinkedin />
                                    LinkedIn
                                </a>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* ========================================================
                    FINAL CTA
                ======================================================== */}

                <section className="landing-cta">
                    <Reveal as="div" className="landing-cta-inner">
                        <div>
                            <span className="landing-eyebrow">
                                <span className="landing-eyebrow-dot" />
                                READY WHEN YOU ARE
                            </span>
                            <h2>Sign in to your Miarcus account</h2>
                            <p>
                                Your dashboard, your store data and your team are
                                waiting on the other side.
                            </p>
                        </div>

                        <Link to="/login" className="landing-btn-primary">
                            Sign In
                            <FaArrowRight />
                        </Link>
                    </Reveal>
                </section>
            </main>

            {/* ============================================================
                FOOTER
            ============================================================ */}

            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div className="landing-footer-brand">
                        <img src="/miarcus.png" alt="Miarcus" />
                        <span>Miarcus Portal</span>
                    </div>

                    <p>
                        © {new Date().getFullYear()} MiArcus Retails Private
                        Limited. All rights reserved.
                    </p>

                    <Link to="/login" className="landing-footer-login">
                        Sign In →
                    </Link>
                </div>
            </footer>
        </div>
    );
}

export default Landing;
