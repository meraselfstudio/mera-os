import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Banknote, Camera, ClipboardList, ExternalLink, Monitor, Receipt, Smartphone } from 'lucide-react'

function getCustomerPortalBase() {
    const configured = import.meta.env.VITE_CUSTOMER_PORTAL_URL
    if (configured) return configured.replace(/\/$/, '')
    if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        return 'http://localhost:3000'
    }
    return 'https://meraselfstudio.com'
}

function SectionPill({ children }: { children: React.ReactNode }) {
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.8)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
        }}>
            {children}
        </span>
    )
}

export default function IslandHub() {
    const customerPortalBase = getCustomerPortalBase()

    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at top left, rgba(228,195,137,0.18), transparent 26%), radial-gradient(circle at bottom right, rgba(106,154,176,0.16), transparent 28%), linear-gradient(180deg, #07131a 0%, #0b0f12 48%, #130d08 100%)',
            color: '#f5f1e8',
            overflowY: 'auto'
        }}>
            <div style={{ maxWidth: 1360, margin: '0 auto', padding: '32px 20px 40px' }}>
                <header style={{ marginBottom: 28, display: 'grid', gap: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <SectionPill>Mera OS</SectionPill>
                        <SectionPill>Product Islands</SectionPill>
                        <SectionPill>4 Clear Entry Points</SectionPill>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: 18, alignItems: 'end' }}>
                        <div>
                            <h1 style={{ fontSize: 'clamp(38px, 6vw, 76px)', lineHeight: 0.96, letterSpacing: '-0.05em', fontWeight: 900, marginBottom: 14 }}>
                                Four islands.
                                <br />
                                One calmer system.
                            </h1>
                            <p style={{ maxWidth: 760, fontSize: 16, lineHeight: 1.7, color: 'rgba(245,241,232,0.72)' }}>
                                Customer-facing flow stays separate from studio operations. Booking management, backoffice, and kiosk each get their own space instead of fighting inside one crowded dashboard.
                            </p>
                        </div>
                        <div style={{
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 28,
                            padding: '18px 18px 20px',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                            backdropFilter: 'blur(18px)',
                            boxShadow: '0 20px 80px rgba(0,0,0,0.22)'
                        }}>
                            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(245,241,232,0.6)', fontWeight: 800, marginBottom: 8 }}>
                                Flow
                            </p>
                            <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10 }}>
                                Portal to Booking to Backoffice to Kiosk.
                            </p>
                            <p style={{ fontSize: 13, color: 'rgba(245,241,232,0.68)', lineHeight: 1.6 }}>
                                This hub is the app-switching layer. Each island below now has a direct route or launch target.
                            </p>
                        </div>
                    </div>
                </header>

                <section className="gc-island-grid">
                    <article style={{
                        borderRadius: 34,
                        padding: '24px',
                        border: '1px solid rgba(228,195,137,0.28)',
                        background: 'linear-gradient(180deg, rgba(228,195,137,0.18) 0%, rgba(31,24,16,0.86) 100%)',
                        display: 'grid',
                        gap: 18,
                        boxShadow: '0 24px 80px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ width: 48, height: 48, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,241,232,0.14)' }}>
                                <Monitor size={22} />
                            </span>
                            <SectionPill>External</SectionPill>
                        </div>
                        <div>
                            <p style={{ fontSize: 11, color: 'rgba(245,241,232,0.6)', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 800, marginBottom: 8 }}>Island 01</p>
                            <h2 style={{ fontSize: 32, letterSpacing: '-0.04em', fontWeight: 900, marginBottom: 10 }}>Customer Portal</h2>
                            <p style={{ fontSize: 14, color: 'rgba(245,241,232,0.74)', lineHeight: 1.7 }}>
                                Public-facing experience for discovery, booking, and the photobooth experience.
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <SectionPill>Landing Page</SectionPill>
                            <SectionPill>Booking Flow</SectionPill>
                            <SectionPill>Photobooth</SectionPill>
                        </div>
                        <div style={{ display: 'grid', gap: 10 }}>
                            <a href={`${customerPortalBase}/`} target="_blank" rel="noopener noreferrer" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                padding: '14px 16px',
                                borderRadius: 18,
                                border: '1px solid rgba(255,255,255,0.12)',
                                background: 'rgba(255,255,255,0.05)'
                            }}>
                                <span>
                                    <strong style={{ display: 'block', fontSize: 15 }}>Landing Page</strong>
                                    <span style={{ display: 'block', marginTop: 4, color: 'rgba(245,241,232,0.64)', fontSize: 12 }}>Brand, packages, first impression</span>
                                </span>
                                <ExternalLink size={16} />
                            </a>
                            <a href={`${customerPortalBase}/booking`} target="_blank" rel="noopener noreferrer" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                padding: '14px 16px',
                                borderRadius: 18,
                                border: '1px solid rgba(255,255,255,0.12)',
                                background: 'rgba(255,255,255,0.05)'
                            }}>
                                <span>
                                    <strong style={{ display: 'block', fontSize: 15 }}>Booking Flow</strong>
                                    <span style={{ display: 'block', marginTop: 4, color: 'rgba(245,241,232,0.64)', fontSize: 12 }}>Date, time, customer info, payment mode</span>
                                </span>
                                <ExternalLink size={16} />
                            </a>
                            <a href={`${customerPortalBase}/photobooth`} target="_blank" rel="noopener noreferrer" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                padding: '14px 16px',
                                borderRadius: 18,
                                border: '1px solid rgba(255,255,255,0.12)',
                                background: 'rgba(255,255,255,0.05)'
                            }}>
                                <span>
                                    <strong style={{ display: 'block', fontSize: 15 }}>Photobooth</strong>
                                    <span style={{ display: 'block', marginTop: 4, color: 'rgba(245,241,232,0.64)', fontSize: 12 }}>Current route exists, can stay labeled as soon/beta</span>
                                </span>
                                <ExternalLink size={16} />
                            </a>
                        </div>
                    </article>

                    <article style={{
                        borderRadius: 34,
                        padding: '24px',
                        border: '1px solid rgba(106,154,176,0.26)',
                        background: 'linear-gradient(180deg, rgba(106,154,176,0.16) 0%, rgba(15,22,27,0.90) 100%)',
                        display: 'grid',
                        gap: 18,
                        boxShadow: '0 24px 80px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ width: 48, height: 48, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.12)' }}>
                                <Receipt size={22} />
                            </span>
                            <SectionPill>Internal</SectionPill>
                        </div>
                        <div>
                            <p style={{ fontSize: 11, color: 'rgba(245,241,232,0.6)', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 800, marginBottom: 8 }}>Island 02</p>
                            <h2 style={{ fontSize: 32, letterSpacing: '-0.04em', fontWeight: 900, marginBottom: 10 }}>POS Dashboard</h2>
                            <p style={{ fontSize: 14, color: 'rgba(245,241,232,0.74)', lineHeight: 1.7 }}>
                                Booking management focused on the selected day: monthly mini-month, large studio schedule, and POS session handling.
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <SectionPill>Monthly Mini Month</SectionPill>
                            <SectionPill>Per Studio Schedule</SectionPill>
                            <SectionPill>Session Handling</SectionPill>
                        </div>
                        <Link to="/booking-management" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '16px 18px',
                            borderRadius: 18,
                            background: '#f5f1e8',
                            color: '#091119',
                            fontWeight: 800,
                            letterSpacing: '-0.02em'
                        }}>
                            <span>
                                Open Booking Management
                                <span style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 600, color: 'rgba(9,17,25,0.72)' }}>
                                    Today canvas, booking cards, transactions
                                </span>
                            </span>
                            <ArrowRight size={18} />
                        </Link>
                    </article>

                    <article style={{
                        borderRadius: 34,
                        padding: '24px',
                        border: '1px solid rgba(136,212,158,0.24)',
                        background: 'linear-gradient(180deg, rgba(136,212,158,0.14) 0%, rgba(12,20,16,0.90) 100%)',
                        display: 'grid',
                        gap: 18,
                        boxShadow: '0 24px 80px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ width: 48, height: 48, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.12)' }}>
                                <Banknote size={22} />
                            </span>
                            <SectionPill>Internal</SectionPill>
                        </div>
                        <div>
                            <p style={{ fontSize: 11, color: 'rgba(245,241,232,0.6)', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 800, marginBottom: 8 }}>Island 03</p>
                            <h2 style={{ fontSize: 32, letterSpacing: '-0.04em', fontWeight: 900, marginBottom: 10 }}>Attendance + Finance</h2>
                            <p style={{ fontSize: 14, color: 'rgba(245,241,232,0.74)', lineHeight: 1.7 }}>
                                One backoffice island for crew attendance, payroll preview, transactions, and expense tracking.
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <SectionPill>Crew Attendance</SectionPill>
                            <SectionPill>Payroll</SectionPill>
                            <SectionPill>Expenses</SectionPill>
                        </div>
                        <Link to="/backoffice" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '16px 18px',
                            borderRadius: 18,
                            background: '#f5f1e8',
                            color: '#0f1812',
                            fontWeight: 800,
                            letterSpacing: '-0.02em'
                        }}>
                            <span>
                                Open Backoffice Island
                                <span style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 600, color: 'rgba(15,24,18,0.72)' }}>
                                    Toggle attendance and finance in one place
                                </span>
                            </span>
                            <ArrowRight size={18} />
                        </Link>
                    </article>

                    <article style={{
                        borderRadius: 34,
                        padding: '24px',
                        border: '1px solid rgba(176,106,106,0.24)',
                        background: 'linear-gradient(180deg, rgba(176,106,106,0.16) 0%, rgba(24,15,15,0.92) 100%)',
                        display: 'grid',
                        gap: 18,
                        boxShadow: '0 24px 80px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ width: 48, height: 48, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.12)' }}>
                                <Smartphone size={22} />
                            </span>
                            <SectionPill>Tablet</SectionPill>
                        </div>
                        <div>
                            <p style={{ fontSize: 11, color: 'rgba(245,241,232,0.6)', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 800, marginBottom: 8 }}>Island 04</p>
                            <h2 style={{ fontSize: 32, letterSpacing: '-0.04em', fontWeight: 900, marginBottom: 10 }}>Kiosk View</h2>
                            <p style={{ fontSize: 14, color: 'rgba(245,241,232,0.74)', lineHeight: 1.7 }}>
                                Large-touch interface for customer and crew usage on studio Android tablets.
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <SectionPill>Tablet UI</SectionPill>
                            <SectionPill>Customer Entry</SectionPill>
                            <SectionPill>Crew Assisted</SectionPill>
                        </div>
                        <Link to="/kiosk" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '16px 18px',
                            borderRadius: 18,
                            background: '#f5f1e8',
                            color: '#1b1111',
                            fontWeight: 800,
                            letterSpacing: '-0.02em'
                        }}>
                            <span>
                                Open Kiosk View
                                <span style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 600, color: 'rgba(27,17,17,0.72)' }}>
                                    Package picker and booking handoff for tablets
                                </span>
                            </span>
                            <ArrowRight size={18} />
                        </Link>
                    </article>
                </section>

                <footer style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 13, color: 'rgba(245,241,232,0.56)' }}>
                        Customer portal links use VITE_CUSTOMER_PORTAL_URL when set. Dev fallback is localhost:3000.
                    </p>
                    <Link to="/tv" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#f5f1e8', fontWeight: 700 }}>
                        <Camera size={16} />
                        TV Dashboard
                    </Link>
                </footer>
            </div>
        </div>
    )
}