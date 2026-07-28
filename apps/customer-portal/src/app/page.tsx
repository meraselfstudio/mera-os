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

    let targetDir: string | null = null
    for (const base of publicCandidates) {
        const candidate = path.join(base, 'Website photo Reference (4 x 5.1 inci)')
        try {
            await fs.access(candidate)
            targetDir = candidate
            break
        } catch {
            continue
        }
    }

    if (!targetDir) return []

    const entries = await fs.readdir(targetDir, { withFileTypes: true })
    const photos = entries
        .filter((e) => e.isFile() && /\.(png|jpe?g|webp)$/i.test(e.name))
        .map((e) => ({
            src: `/Website photo Reference (4 x 5.1 inci)/${encodeURIComponent(e.name)}`,
            alt: e.name.replace(/\.\w+$/, ''),
        }))

    return shufflePhotos(photos)
}

export default async function HomePage() {
    const photos = await getLandingPhotos()
    return <LandingPage photos={photos} fontClassName={montserrat.className} />
}
