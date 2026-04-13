// =============================================================
// @mera/supabase — database.types.ts
// Generated types matching production schema v2
// All 5 tables: crew, attendance, products, registrations, transactions
// =============================================================

// ── Crew ──────────────────────────────────────────────────────
export type CrewRole = 'Admin' | 'Crew' | 'Intern'
export type StatusGaji = 'PRO' | 'INTERN'

export interface Crew {
    id: string
    nama: string
    role: CrewRole
    status_gaji: StatusGaji
    pin_hash: string | null
    is_active: boolean
    created_at: string
}

// ── Attendance ────────────────────────────────────────────────
// NOTE: Isolated from customer tables — HR use only.
// DO NOT JOIN with registrations or transactions.
export type AttendanceStatus = 'ACTIVE' | 'COMPLETED'

export interface Attendance {
    id: string
    crew_id: string
    clock_in: string        // ISO timestamp — locked at clock-in
    clock_out: string | null
    shift_type: string      // 'Weekday Full Time' | 'Weekend Shift 1' | 'Weekend Shift 2' | 'Weekend Full Time'
    base_rate: number       // Locked at clock-in — won't change if admin updates crew
    late_minutes: number    // Auto-calculated vs scheduled shift start
    penalty_amount: number  // late_minutes / 10 * 5000 IDR (always 0 for INTERN)
    bonus_amount: number    // Calculated at clock-out. 0 for INTERN.
    photo_in_url: string | null  // Supabase Storage URL for clock-in photo
    photo_out_url: string | null // Supabase Storage URL for clock-out photo
    status: AttendanceStatus
    created_at: string
}

// ── Products ──────────────────────────────────────────────────
export type TipeHarga = 'normal' | 'bertingkat'

export interface Product {
    id: number               // SERIAL — integer, not UUID
    nama: string
    kategori: string
    tipe_harga: TipeHarga
    harga_dasar: number      // Used when tipe_harga = 'normal'
    tier_1: number | null    // Price for 1st person tier
    tier_2: number | null    // Price per person tier 2
    tier_3: number | null    // Price per person tier 3
    tier_lebih: number | null // Price per person beyond all tiers
    is_active: boolean
    max_orang: number        // Max participants per session (e.g. 2, 8)
    default_bw: boolean      // TRUE = BW by default; customer must add 'Edited + Colored'
    is_addon: boolean        // TRUE = this is a selectable add-on (not main package)
}

/**
 * Calculate total price for a bertingkat product
 * @param product Product with tiered pricing
 * @param jumlahOrang Number of people in the group
 */
export function hitungHargaBertingkat(product: Product, jumlahOrang: number): number {
    if (product.tipe_harga === 'normal') return product.harga_dasar
    if (jumlahOrang <= 0) return 0

    const tiers = [product.tier_1, product.tier_2, product.tier_3]
    const validTiers = tiers.filter((t): t is number => t !== null)

    // Each person gets the price of the tier corresponding to their position
    // If beyond all tiers, use tier_lebih
    let total = 0
    for (let i = 0; i < jumlahOrang; i++) {
        const tierPrice = validTiers[i] ?? product.tier_lebih ?? 0
        total += tierPrice
    }
    return total
}

// ── Booking Price Calculation (Shared) ───────────────────────
// This is the SINGLE source of truth for price calculation.
// Used by BOTH customer-portal (BookingFlow) and pos-dashboard (payment modal).
// Never duplicate this logic in individual apps.

/** Shape of the addons JSON column stored in registrations */
export interface BookingAddons {
    room?: string | null
    variant?: string | null
    selected_addons?: string[]
    pax?: number
    product_id?: number | null   // main product id — stored since v2.1, absent in older bookings
    computed_price?: number       // price snapshot at booking time
}

export interface BookingLineItem {
    label: string
    price: number
}

/** Internal helper — derive how many people the base package covers */
function getProductBaseCapacity(product: Product, room?: string | null): number {
    const n = product.nama.toLowerCase()
    if (n.includes('party')) return 8
    if (n.includes('pas photo package') || n.includes('thematic package')) return 2
    if ((room ?? '').toLowerCase().includes('basic')) return 2
    return 1
}

/**
 * Derive the itemised price breakdown for a booking.
 *
 * Rules:
 *  - Prefers product_id when present (exact match, most accurate).
 *  - Falls back to room → kategori inference for bookings that predate v2.1
 *    (category comparison is always case-insensitive).
 *  - Add-on prices come from product.harga_dasar; falls back to 20 000 IDR
 *    only when no matching add-on product is found in the catalogue.
 *
 * @param products All active products from Supabase (addon + non-addon).
 * @param addons   The addons JSON field from the registration row.
 */
export function calcBookingLineItems(
    products: Product[],
    addons: BookingAddons | null | undefined,
): BookingLineItem[] {
    if (!addons) return []

    const items: BookingLineItem[] = []
    const room = addons.room
    const selectedAddons = addons.selected_addons ?? []
    const pax = addons.pax ?? 1

    // ── 1. Find main product ─────────────────────────────────────
    let mainProduct: Product | null = null

    if (addons.product_id != null) {
        // Exact match — most reliable path (v2.1+)
        mainProduct = products.find(p => p.id === addons.product_id && !p.is_addon) ?? null
    }

    if (!mainProduct) {
        // Fallback: infer from room label → kategori
        // Always compare lowercase so DB storage case doesn't matter.
        const roomLower = (room ?? '').toLowerCase()
        let kategori = ''
        if (roomLower === 'pas photo') kategori = 'pas photo'
        else if (roomLower === 'elevator studio' || roomLower === 'majestic studio') kategori = 'thematic'
        else if (roomLower === 'basic studio') kategori = 'basic studio'

        const candidates = products.filter(
            p => !p.is_addon && p.kategori.toLowerCase() === kategori,
        )
        mainProduct =
            candidates.length === 1
                ? candidates[0]
                : candidates.sort((a, b) => {
                      const fitA = a.max_orang >= pax ? a.max_orang : 999
                      const fitB = b.max_orang >= pax ? b.max_orang : 999
                      return fitA - fitB
                  })[0] ?? null
    }

    if (mainProduct) {
        const basePrice =
            mainProduct.tipe_harga === 'bertingkat'
                ? hitungHargaBertingkat(mainProduct, pax)
                : mainProduct.harga_dasar
        items.push({ label: mainProduct.nama, price: basePrice })

        const baseCapacity = getProductBaseCapacity(mainProduct, room)
        const extraPax = Math.max(0, pax - baseCapacity)
        if (extraPax > 0) {
            items.push({ label: `Add Person (${extraPax}×)`, price: extraPax * 25_000 })
        }
    }

    // ── 2. Selected add-ons ──────────────────────────────────────
    for (const addonName of selectedAddons) {
        const normalized = addonName.toLowerCase().replace(/[\s_]+/g, '')
        const addonProduct = products.find(
            p =>
                p.is_addon &&
                (p.nama.toLowerCase().replace(/[\s_]+/g, '') === normalized ||
                    (normalized === 'editedcolored' && p.nama.toLowerCase().includes('edit'))),
        )
        if (addonProduct) {
            items.push({ label: addonProduct.nama, price: addonProduct.harga_dasar })
        } else if (addonName === 'EDITED_COLORED') {
            items.push({ label: 'Edited & Colored Photo', price: 20_000 })
        } else {
            items.push({ label: addonName.replace(/_/g, ' '), price: 20_000 })
        }
    }

    // ── 3. Fallback ──────────────────────────────────────────────
    // Old booking with no matching product — show the snapshotted price as one line.
    if (items.length === 0 && addons.computed_price) {
        items.push({ label: room ?? 'Session', price: addons.computed_price })
    }

    return items
}

// ── Registrations ─────────────────────────────────────────────
export type BookingType = 'ONLINE_QRIS' | 'ONLINE_KEEPSLOT'
export type RegistrationStatus = 'PENDING' | 'VERIFIED' | 'PROCESSED' | 'EXPIRED'

export interface Registration {
    id: string
    customer_name: string
    instagram_handle: string   // For follow-up via IG DM, e.g. "@ayubudi"
    booking_type: BookingType
    status: RegistrationStatus
    session_id: string | null  // DD-SANITIZEDNAME-CODE format
    preferred_date: string | null
    preferred_time: string | null
    addons: {
        room: string | null
        variant: string | null
        selected_addons: string[] // e.g. ['EDITED_COLORED']
    } | null
    expires_at: string | null  // Non-null only for ONLINE_KEEPSLOT (now + 6h)
    checked_in_at: string | null  // Set when customer self-check-in via QR at studio
    created_at: string
}

// ── Transactions ──────────────────────────────────────────────
// session_id format: DD-NAME-CODE (e.g. "27-AYU-MR")
// macOS-safe: only alphanumerics and hyphens
export type TransactionStatus = 'ACTIVE' | 'PAID' | 'REFUNDED' | 'VOID'
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS' | 'ONLINE_QRIS'

export interface Transaction {
    id: string
    session_id: string            // DD-NAME-CODE format, macOS folder-safe
    registration_id: string | null
    processed_by: string | null   // crew.id — cashier audit trail
    selection_start_time: string | null  // 5-minute selection timer start
    total_amount: number
    discount_amount: number
    discount_reason: string | null  // REQUIRED if discount_amount > 0 (Owner audit)
    payment_method: PaymentMethod | null
    status: TransactionStatus
    created_at: string
}

// ── Joined / View Types ───────────────────────────────────────
export interface TransactionWithCrew extends Transaction {
    crew: Pick<Crew, 'id' | 'nama' | 'role'> | null
}

export interface TransactionWithRegistration extends Transaction {
    registrations: Registration | null
}

// ── Payroll Result (from Edge Function) ──────────────────────
export interface PayrollResult {
    crew_id: string
    nama: string
    status_gaji: StatusGaji
    shift_type: string
    base_rate: number
    late_minutes: number
    penalty_amount: number // = late_minutes / 10 * 5000 (always 0 for INTERN)
    net_pay: number        // base_rate - penalty_amount
    note?: string          // 'INTERN: penalty bypassed'
}

// ── Expenses (New) ────────────────────────────────────────────
export interface Expense {
    id: string
    tanggal: string
    keterangan: string
    kategori: string
    jumlah: number
    created_at: string
}

// ── PhoneBooth Photos ─────────────────────────────────────────
export interface PhoneBoothPhoto {
    id: string
    strip_url: string
    filter: string
    photo_count: number
    promo_consent: boolean
    created_at: string
}

// ── Supabase Database helper type ─────────────────────────────
export interface Database {
    public: {
        Tables: {
            crew: {
                Row: Crew
                Insert: Omit<Crew, 'id' | 'created_at'>
                Update: Partial<Omit<Crew, 'id' | 'created_at'>>
            }
            attendance: {
                Row: Attendance
                Insert: Omit<Attendance, 'id' | 'created_at'>
                Update: Partial<Omit<Attendance, 'id' | 'created_at'>>
            }
            products: {
                Row: Product
                Insert: Omit<Product, 'id'>
                Update: Partial<Omit<Product, 'id'>>
            }
            registrations: {
                Row: Registration
                Insert: Omit<Registration, 'id' | 'created_at'>
                Update: Partial<Omit<Registration, 'id' | 'created_at'>>
            }
            transactions: {
                Row: Transaction
                Insert: Omit<Transaction, 'id' | 'created_at'>
                Update: Partial<Omit<Transaction, 'id' | 'created_at'>>
            }
            expenses: {
                Row: Expense
                Insert: Omit<Expense, 'id' | 'created_at'>
                Update: Partial<Omit<Expense, 'id' | 'created_at'>>
            }
            phonebooth_photos: {
                Row: PhoneBoothPhoto
                Insert: Omit<PhoneBoothPhoto, 'id' | 'created_at'>
                Update: Partial<Omit<PhoneBoothPhoto, 'id' | 'created_at'>>
            }
        }
    }
}

