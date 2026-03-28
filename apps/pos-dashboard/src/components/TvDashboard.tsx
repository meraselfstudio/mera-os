import React, { useEffect, useState } from 'react'
import { supabase } from '@mera/supabase/client'
import type { Registration, Transaction } from '@mera/supabase'

export default function TvDashboard() {
    const [queue, setQueue] = useState<Registration[]>([])
    const [activeSessions, setActiveSessions] = useState<Transaction[]>([])
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        // Clock timer
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)

        // Load data
        const loadData = async () => {
            const today = new Date().toISOString().split('T')[0]

            // Get today's queue
            const { data: regData } = await supabase
                .from('registrations')
                .select('*')
                .gte('created_at', `${today}T00:00:00Z`)
                .lte('created_at', `${today}T23:59:59Z`)
                .in('status', ['PENDING', 'VERIFIED'])
                .order('created_at', { ascending: true })

            if (regData) setQueue(regData)

            // Get active sessions
            const { data: txData } = await supabase
                .from('transactions')
                .select('*, registrations:registration_id (*)')
                .eq('status', 'ACTIVE')

            if (txData) setActiveSessions(txData as any[])
        }

        loadData()

        // Sync every 5 seconds (fallback or if realtime has issues, but we can also use realtime)
        const syncInterval = setInterval(loadData, 5000)

        return () => {
            clearInterval(timer)
            clearInterval(syncInterval)
        }
    }, [])

    return (
        <div style={{
            width: '100vw', height: '100vh', background: 'var(--mera-bg)', color: 'var(--mera-text-primary)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
            {/* Header */}
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '24px 48px', borderBottom: '1px solid var(--mera-border)', background: 'var(--mera-surface)'
            }}>
                <img src="/logo-mera-white.png" alt="MERA" style={{ height: 40 }} />
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--mera-accent)' }}>
                        {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '1.2rem', color: 'var(--mera-text-secondary)' }}>
                        {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div style={{ display: 'flex', flex: 1, padding: '48px', gap: '48px' }}>
                
                {/* Active Sessions */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '32px', color: 'var(--mera-success)' }}>
                        📸 Sedang Berfoto
                    </h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {activeSessions.length === 0 ? (
                            <div style={{ padding: '48px', textAlign: 'center', background: 'var(--mera-surface)', borderRadius: '24px', border: '2px dashed var(--mera-border)' }}>
                                <p style={{ fontSize: '2rem', color: 'var(--mera-text-tertiary)' }}>Studio Tersedia</p>
                            </div>
                        ) : (
                            activeSessions.map(tx => (
                                <div key={tx.id} style={{
                                    padding: '32px', background: 'var(--mera-surface-raised)', borderRadius: '24px',
                                    border: '2px solid var(--mera-success-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    boxShadow: '0 10px 30px rgba(48,209,88,0.1)'
                                }}>
                                    <div>
                                        <p style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px' }}>
                                            {(tx as any).registrations?.customer_name || 'Walk-in'}
                                        </p>
                                        <p style={{ fontSize: '1.5rem', color: 'var(--mera-text-secondary)', fontFamily: 'monospace' }}>
                                            Sesi: {tx.session_id}
                                        </p>
                                    </div>
                                    <div style={{ padding: '12px 24px', background: 'var(--mera-success-bg)', color: 'var(--mera-success)', borderRadius: '16px', fontWeight: 800, fontSize: '1.5rem' }}>
                                        ACTIVE
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Queue */}
                <div style={{ width: '450px', display: 'flex', flexDirection: 'column', background: 'var(--mera-surface)', borderRadius: '32px', padding: '32px', border: '1px solid var(--mera-border)' }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '24px', borderBottom: '1px solid var(--mera-border)', paddingBottom: '16px' }}>
                        📋 Antrean Selanjutnya
                    </h2>
                    
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {queue.length === 0 ? (
                            <p style={{ fontSize: '1.2rem', color: 'var(--mera-text-tertiary)', textAlign: 'center', marginTop: '48px' }}>
                                Belum ada antrean saat ini
                            </p>
                        ) : (
                            queue.map((reg, idx) => (
                                <div key={reg.id} style={{
                                    padding: '20px', background: 'var(--mera-bg)', borderRadius: '16px', border: '1px solid var(--mera-border)',
                                    display: 'flex', alignItems: 'center', gap: '20px'
                                }}>
                                    <div style={{ 
                                        width: '48px', height: '48px', borderRadius: '50%', background: 'var(--mera-surface-raised)', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'var(--mera-text-secondary)'
                                    }}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '1.4rem', fontWeight: 700 }}>{reg.customer_name}</p>
                                        <p style={{ fontSize: '1rem', color: 'var(--mera-text-tertiary)', marginTop: '4px' }}>
                                            {reg.booking_type === 'ONLINE_KEEPSLOT' ? 'Booking Online' : reg.booking_type === 'ONLINE_QRIS' ? 'Booking Lunas' : 'On The Spot'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
