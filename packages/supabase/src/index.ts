// @mera/supabase — Public API (v2)
export { createClient, supabase } from './client'

// Re-export all types from the canonical database.types file
export type {
    Database,
    Crew,
    CrewRole,
    Attendance,
    AttendanceStatus,
    Product,
    TipeHarga,
    Registration,
    BookingType,
    RegistrationStatus,
    Transaction,
    TransactionStatus,
    PaymentMethod,
    TransactionWithCrew,
    TransactionWithRegistration,
    PayrollResult,
    StatusGaji,
    Expense,
    // Booking price calculation
    BookingAddons,
    BookingLineItem,
} from './types/database.types'

// Tiered pricing calculator (pure util)
export { hitungHargaBertingkat } from './types/database.types'

// Canonical booking line-item calculator — use this in BOTH customer portal and POS
export { calcBookingLineItems } from './types/database.types'
