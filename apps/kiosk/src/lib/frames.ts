// Fetch frame products from Supabase (products WHERE kategori='frame')
// Frame overlay images + thumbnails live in metadata JSON column
// Pricing supports both flat (normal) and tiered (bertingkat) via hitungHargaFrame()

import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const getClient = () => createClient(supabaseUrl, supabaseKey)

export interface FrameProduct {
  id: number            // products.id — SERIAL integer, not UUID
  nama: string
  tipe_harga: 'normal' | 'bertingkat'
  harga_dasar: number   // IDR; 0 = included in package (Basic Frame)
  tier_1: number | null
  tier_2: number | null
  tier_3: number | null
  tier_lebih: number | null
  frame_url: string | null      // metadata.frame_url — PNG overlay for canvas
  thumbnail_url: string | null  // metadata.thumbnail_url — carousel preview
  meta_type: 'single' | 'multi' | 'passport'
  meta_slots: number            // 1 for single, 3–6 for multi
  meta_bg_color: string | null  // for passport mode
}

/**
 * Calculate the price of one frame for a given number of people.
 * Mirrors hitungHargaBertingkat from @mera/supabase but operates on FrameProduct.
 */
export function hitungHargaFrame(fp: FrameProduct, pax: number): number {
  if (fp.tipe_harga === 'normal') return fp.harga_dasar
  if (pax <= 0) return 0
  const tiers = [fp.tier_1, fp.tier_2, fp.tier_3]
  const valid = tiers.filter((t): t is number => t !== null)
  let total = 0
  for (let i = 0; i < pax; i++) {
    total += valid[i] ?? fp.tier_lebih ?? 0
  }
  return total
}

export async function fetchFrameProducts(): Promise<FrameProduct[]> {
  const supabase = getClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('products')
    .select('id, nama, tipe_harga, harga_dasar, tier_1, tier_2, tier_3, tier_lebih, metadata')
    .eq('kategori', 'frame')
    .eq('is_active', true)
    .order('harga_dasar', { ascending: true })

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) || []).map((p) => {
    const meta = (p.metadata as Record<string, unknown>) || {}
    return {
      id: p.id as number,
      nama: p.nama as string,
      tipe_harga: (p.tipe_harga as 'normal' | 'bertingkat') || 'normal',
      harga_dasar: p.harga_dasar as number,
      tier_1: (p.tier_1 as number | null) ?? null,
      tier_2: (p.tier_2 as number | null) ?? null,
      tier_3: (p.tier_3 as number | null) ?? null,
      tier_lebih: (p.tier_lebih as number | null) ?? null,
      frame_url: (meta.frame_url as string) || null,
      thumbnail_url: (meta.thumbnail_url as string) || null,
      meta_type: (meta.type as 'single' | 'multi' | 'passport') || 'single',
      meta_slots: (meta.slots as number) || 1,
      meta_bg_color: (meta.background_color as string) || null,
    }
  })
}
