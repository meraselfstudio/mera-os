import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Banknote, ClipboardList, LockIcon, Receipt, Smartphone } from 'lucide-react'
import AttendanceBoard from './AttendanceBoard'
import FinanceDashboard from './FinanceDashboard'
import FinanceGateway from './FinanceGateway'
import type { UserRole } from '../types/userRole';

interface BackofficeIslandProps {
    role: UserRole;
    onLogout?: () => void;
}

export default function BackofficeIsland({ role, onLogout }: BackofficeIslandProps) {
        const [activeView, setActiveView] = useState<'attendance' | 'finance'>(role === 'owner' ? 'finance' : 'attendance');
        const [financeUnlocked, setFinanceUnlocked] = useState(false);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at top left, rgba(136,212,158,0.16), transparent 24%), radial-gradient(circle at bottom right, rgba(176,106,106,0.12), transparent 26%), #080b0c',
            color: 'var(--mera-text-primary)',
            display: 'grid',
            gridTemplateRows: 'auto minmax(0,1fr)'
        }}>
            <header style={{ padding: '18px 20px', borderBottom: '1px solid var(--mera-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: 8 }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--mera-text-secondary)' }}>
                        <ArrowLeft size={14} />
                        All Islands
                    </Link>
                    <div>
                        <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 6 }}>Attendance + Finance</h1>
                        <p style={{ fontSize: 13, color: 'var(--mera-text-secondary)' }}>Dedicated backoffice island for crew presence, payroll view, cashflow, and expenses.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Link to="/booking-management" style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid var(--mera-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--mera-text-primary)', fontSize: 12, fontWeight: 700 }}>
                        Booking Management
                    </Link>
                    <Link to="/kiosk" style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid var(--mera-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--mera-text-primary)', fontSize: 12, fontWeight: 700 }}>
                        Kiosk View
                    </Link>
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid var(--mera-error-border)', background: 'var(--mera-error-bg)', color: 'var(--mera-error)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                            Logout
                        </button>
                    )}
                </div>
            </header>

            <div className="gc-backoffice-layout">
                <aside style={{ display: 'grid', gap: 16, minHeight: 0 }}>
                    <section className="gc-panel-card" style={{ padding: '18px', display: 'grid', gap: 14 }}>
                        <div>
                            <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Backoffice Island</p>
                            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>Choose the working mode</h2>
                            <p style={{ fontSize: 13, color: 'var(--mera-text-secondary)', lineHeight: 1.6 }}>Attendance is crew-ops. Finance stays protected behind its PIN gateway.</p>
                        </div>

                        <button
                            onClick={() => setActiveView('attendance')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                padding: '14px 16px',
                                borderRadius: 18,
                                border: `1px solid ${activeView === 'attendance' ? 'var(--mera-border-strong)' : 'var(--mera-border)'}`,
                                background: activeView === 'attendance' ? 'var(--mera-surface-raised)' : 'rgba(255,255,255,0.03)',
                                color: 'var(--mera-text-primary)',
                                textAlign: 'left'
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                <ClipboardList size={18} />
                                <span>
                                    <strong style={{ display: 'block', fontSize: 14 }}>Attendance</strong>
                                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--mera-text-secondary)' }}>Clock in, clock out, crew status</span>
                                </span>
                            </span>
                            {activeView === 'attendance' && <Receipt size={16} />}
                        </button>

                        {role === 'owner' && (
                          <button
                              onClick={() => setActiveView('finance')}
                              style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  padding: '14px 16px',
                                  borderRadius: 18,
                                  border: `1px solid ${activeView === 'finance' ? 'var(--mera-border-strong)' : 'var(--mera-border)'}`,
                                  background: activeView === 'finance' ? 'var(--mera-surface-raised)' : 'rgba(255,255,255,0.03)',
                                  color: 'var(--mera-text-primary)',
                                  textAlign: 'left'
                              }}
                          >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                  <Banknote size={18} />
                                  <span>
                                      <strong style={{ display: 'block', fontSize: 14 }}>Finance</strong>
                                      <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--mera-text-secondary)' }}>Omzet, payroll, discount, expenses</span>
                                  </span>
                              </span>
                              {!financeUnlocked && <LockIcon size={16} />}
                          </button>
                        )}
                    </section>

                    <section className="gc-panel-card" style={{ padding: '18px', display: 'grid', gap: 12 }}>
                        <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Other Islands</p>
                        <Link to="/booking-management" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 16, border: '1px solid var(--mera-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--mera-text-primary)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                <Receipt size={16} />
                                Booking Management
                            </span>
                            <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                        </Link>
                        <Link to="/kiosk" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 16, border: '1px solid var(--mera-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--mera-text-primary)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                <Smartphone size={16} />
                                Kiosk View
                            </span>
                            <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                        </Link>
                    </section>
                </aside>

                <section className="gc-panel-card" style={{ overflow: 'hidden', minHeight: 0 }}>
                    {activeView === 'attendance' ? (
                        <AttendanceBoard />
                    ) : financeUnlocked ? (
                        <FinanceDashboard />
                    ) : (
                        <FinanceGateway onUnlocked={() => setFinanceUnlocked(true)} />
                    )}
                </section>
            </div>
        </div>
    )
}