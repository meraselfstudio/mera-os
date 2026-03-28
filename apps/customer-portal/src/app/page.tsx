import type { Metadata } from 'next'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Montserrat } from 'next/font/google'
import LandingPage from '@/components/LandingPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Méra - Mojokerto Self Photo Studio',
    description: 'Space to be Real You!'
}

type LandingPhoto = {
    src: string
    alt: string
}

const montserrat = Montserrat({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
})

function shufflePhotos<T>(items: T[]): T[] {
    const shuffled = [...items]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

async function getLandingPhotos(): Promise<LandingPhoto[]> {
    const publicCandidates = [
        path.join(process.cwd(), 'public'),
        path.join(process.cwd(), 'apps/customer-portal/public'),
    ]

    let publicDir: string | null = null
    for (const candidate of publicCandidates) {
        try {
            await fs.access(candidate)
            publicDir = candidate
            break
        } catch {
            continue
        }
    }

    if (!publicDir) return []

    const entries = await fs.readdir(publicDir, { withFileTypes: true })
    const photos = entries
        .filter((e) => e.isFile() && /^photo-[\w-]+\.(png|jpe?g|webp)$/i.test(e.name))
        .map((e) => ({ src: `/${e.name}`, alt: e.name.replace(/^photo-|-\d+\.\w+$/g, ' ').trim() }))

    return shufflePhotos(photos)
}

export default async function HomePage() {
    const photos = await getLandingPhotos()
    return <LandingPage photos={photos} fontClassName={montserrat.className} />
}
