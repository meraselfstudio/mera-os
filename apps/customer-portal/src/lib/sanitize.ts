/**
 * CRITICAL RULE 1 — Session ID Sanitization
 *
 * This utility MUST be used before saving any session_id to Supabase.
 * The sanitized ID is used as a folder name on macOS / Capture One Mac Mini.
 * Unsafe chars in folder names cause filesystem errors.
 *
 * Rules:
 *  - Keep letters (a-z, A-Z), digits (0-9), and hyphens
 *  - Replace spaces with hyphens
 *  - Collapse multiple or leading/trailing hyphens
 *  - Uppercase for readability
 *
 * Examples:
 *  "Ayu & Budi!"   → "Ayu-Budi"
 *  "Rini (3 org)"  → "Rini-3-org"
 *  "  Alex   "     → "Alex"
 */
export function sanitizeSessionId(raw: string): string {
    return raw
        .trim()
        .replace(/[^a-zA-Z0-9\s-]/g, '')   // 1. Remove all special chars except spaces and hyphens
        .replace(/\s+/g, '-')               // 2. Replace any run of whitespace with single hyphen
        .replace(/-+/g, '-')                // 3. Collapse multiple hyphens
        .replace(/^-|-$/g, '')              // 4. Trim leading/trailing hyphens
}

/**
 * Generate a full session ID combining customer name + date + random suffix
 * Result is always macOS-safe
 *
 * Example: "Ayu-Budi-2026-03-02-A3K7"
 */
export function generateSessionId(customerName: string, date: Date = new Date()): string {
    const namePart = sanitizeSessionId(customerName)
    const datePart = date.toISOString().split('T')[0] // YYYY-MM-DD
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `${namePart}-${datePart}-${rand}`
}
