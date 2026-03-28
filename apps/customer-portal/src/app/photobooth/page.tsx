import type { Metadata } from 'next'
import PhotoboothPage from '@/components/PhotoboothPage'

export const metadata: Metadata = {
    title: 'Free Photobooth',
    description: 'Space to be Real You!',
    robots: { index: true },
}

export default function Photobooth() {
    return <PhotoboothPage />
}
