import type { Metadata } from 'next'
import PhotoboothPage from '@/components/PhotoboothPage'

export const metadata: Metadata = {
    title: 'Méra PhoneBooth',
    description: 'Free PhoneBooth — Space to be Real You!',
    robots: { index: true },
}

export default function Photobooth() {
    return <PhotoboothPage />
}
