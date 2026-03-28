import type { Metadata } from 'next'
import { Suspense } from 'react'
import BookingFlow from '@/components/BookingFlow'

export const metadata: Metadata = {
    title: 'Booking Session',
    description: 'Space to be Real You!',
    robots: { index: false },
}

export default function BookingPage() {
    const SuspenseComp = Suspense as typeof Suspense
    return (
        <SuspenseComp fallback={<div style={{ minHeight: '100vh', background: 'var(--mera-bg)', padding: 40, color: 'var(--mera-text-secondary)', textAlign: 'center' }}>Memuat...</div>}>
            <BookingFlow />
        </SuspenseComp>
    )
}
