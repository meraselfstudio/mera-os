# CLAUDE.md — Méra OS Monorepo

This is the canonical AI development reference for this project.
Read it in full at the start of every session before touching any code.

---

## 1. Project Overview & Business Context

**Méra SelfStudio** is a self-photo studio in Mojokerto, Indonesia. Customers book sessions,
arrive at the studio, photograph themselves, and receive edited digital files via Instagram DM.

This monorepo (`mera-os`) is the v2 operating system powering three surfaces:
- **Customer Portal** — public website for booking and free online photobooth
- **POS Dashboard** — internal staff tool for booking management, POS, attendance, payroll, and finance
- **Kiosk** — in-studio hardware photobooth tablet connected to a local Capture Engine on the Mac Mini

Production domain: `meraselfstudio.com` | Instagram: `@mera.selfstudio`

### Business Flow
1. Customer books via customer portal → `registrations` row written to Supabase
2. Staff verifies booking via POS booking board → changes registration status
3. Customer arrives → staff creates `transactions` row, processes payment
4. Photo session runs on Mac Mini (Capture One) with files saved to a folder named after `session_id`
5. Google Drive Desktop Sync exports photos → staff shares download link via IG DM
6. Crew clocks in/out via POS attendance board (with webcam photo verification)
7. Owner reviews payroll via backoffice finance panel

---

## 2. Tech Stack & Dependencies

### Runtime & Build
| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | 9.15.4 | Package manager, workspace orchestration |
| Node | ≥ 18 | Runtime requirement |
| Turborepo | ^2.3.3 | Monorepo task pipeline |
| TypeScript | ^5.7.2 | Strict mode, all packages |

### Apps
| App | Framework | Default Port | Deployment |
|-----|-----------|-------------|------------|
| `customer-portal` | Next.js 15 + React 19 | 3000 | Vercel (auto-deploy `main`) |
| `pos-dashboard` | Vite 6 + React 19 | 5173 | Local studio iMac only |
| `kiosk` | Vite 6 + React 19 | 5174 | Local network (Android tablet) |

### Key Libraries Per App

**customer-portal**
- Next.js App Router (file-based routing)
- `react-qr-code` — QR code generation (check-in QR on `/admin/qr`)
- `html2canvas` — not present (used in POS for receipts)
- No state management library — local React state only

**pos-dashboard**
- `zustand` 4 — global state (`usePOSStore`)
- `lucide-react` — icon set
- `html2canvas` — generates receipt JPEG for printing
- `date-fns` — date arithmetic
- `react-router-dom` — declared dependency (partially unused; nav is view-state-based)
- `@supabase/supabase-js` v2

**kiosk**
- `zustand` 4 — global kiosk state (`useKioskStore`)
- `qrcode.react` — QR codes for photo retrieval
- Talks to a **local Capture Engine** backend server (not Supabase) for photo session management

### Shared Packages
| Package | Contents |
|---------|---------|
| `@mera/supabase` | Supabase singleton client + ALL canonical DB types + shared pricing functions |
| `@mera/ui` | Button, Card, Modal, Badge UI primitives (partially adopted) |
| `@mera/config` | TypeScript (`base.json`, `next.json`, `react.json`) + ESLint (`base.js`) configs |

### Backend
- **Supabase** (hosted, PostgreSQL 17): database, realtime, storage, RLS, edge functions
- **Supabase Storage buckets**: `attendance-photos` (private, crew photos), `phonebooth` (public)
- **Supabase Edge Function**: `calculate-payroll` (Deno runtime, service_role key, bypasses RLS)
- **Google Apps Script**: receives photobooth strip upload from `POST /api/upload-strip` proxy
- **Google Drive Desktop Sync**: runs on Mac Mini, syncs Capture One exports to Google Drive
- **Capture Engine**: local HTTP server at `http://192.168.1.100:3100` — Mac Mini-based backend for the hardware kiosk (photo sessions, frames, print, render)

---

## 3. Folder Structure

```
mera-os/
├── apps/
│   ├── customer-portal/            # Next.js 15 — public website
│   │   ├── vercel.json             # Vercel deployment config
│   │   └── src/
│   │       ├── app/                # Next.js App Router
│   │       │   ├── page.tsx        # Landing page (/)
│   │       │   ├── booking/page.tsx          # Multi-step booking flow (/booking)
│   │       │   ├── photobooth/page.tsx        # Free online photobooth (/photobooth)
│   │       │   ├── checkin/page.tsx           # Customer self check-in (/checkin?sid=...)
│   │       │   ├── pricelist/page.tsx         # Static price list — HARDCODED, not from DB
│   │       │   ├── cara-booking/page.tsx      # How-to-book guide (static)
│   │       │   ├── admin/qr/page.tsx          # Staff QR code printer (/admin/qr)
│   │       │   └── api/
│   │       │       └── upload-strip/route.ts  # Proxy → Google Apps Script
│   │       ├── components/
│   │       │   ├── LandingPage.tsx            # Homepage (hero, sections, CTA)
│   │       │   ├── BookingFlow.tsx            # Multi-step booking state machine
│   │       │   ├── PhotoboothPage.tsx         # Client-side photobooth (zero network)
│   │       │   ├── CheckinPage.tsx            # Self check-in form
│   │       │   └── PhotoStrip.tsx             # Photobooth strip renderer/compositor
│   │       └── lib/
│   │           └── sanitize.ts               # CRITICAL: session_id sanitizer
│   │
│   ├── pos-dashboard/              # Vite React — internal staff tool
│   │   ├── index.html
│   │   └── src/
│   │       ├── index.css           # CSS design tokens + animations + layout utilities
│   │       ├── App.tsx             # ALL routing logic, auth PIN gate, all views
│   │       └── components/
│   │           └── AttendanceBoard.tsx  # Clock-in/out, webcam photo, dual upload
│   │
│   └── kiosk/                      # Vite React — hardware photobooth kiosk
│       └── src/
│           ├── App.tsx                         # Screen routing, inactivity timeout
│           ├── lib/
│           │   └── api.ts                      # Capture Engine API client
│           ├── screens/
│           │   ├── IdleScreen.tsx              # Attract/idle screen
│           │   ├── GalleryScreen.tsx           # Photo gallery viewer
│           │   ├── EditorScreen.tsx            # Filter/sticker editor
│           │   ├── PrintScreen.tsx             # Print confirmation
│           │   └── FrameGalleryScreen.tsx      # ⚠️ IN PROGRESS / DEAD CODE — not wired up
│           └── store/
│               └── useKioskStore.ts            # Session, screen, editor state
│
├── packages/
│   ├── supabase/                   # Shared Supabase client + canonical DB types
│   │   └── src/
│   │       ├── client.ts           # Singleton createClient() (works in Next.js + Vite)
│   │       ├── index.ts            # Public exports
│   │       └── types/
│   │           └── database.types.ts   # THE source of truth for ALL types + pricing logic
│   ├── ui/                         # Shared UI primitives
│   │   └── src/
│   │       └── components/         # Button, Card, Modal, Badge
│   └── config/
│       ├── typescript/             # base.json, next.json, react.json
│       └── eslint/                 # base.js
│
├── supabase/
│   ├── config.toml
│   ├── migrations/                 # 001_initial.sql → 010_*.sql
│   └── functions/
│       └── calculate-payroll/      # Deno edge function
│           └── index.ts
│
├── docs/                           # Architecture docs (start with docs 9–12)
├── scripts/                        # e2e test .mjs files, migration runner
├── deploy.sh                       # Two-step deploy: POS direct, portal via isolation
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 4. Existing Features

### Customer Portal (`customer-portal`)
- **Landing page** (`/`) — hero, about, gallery, pricing CTA, link to booking
- **Booking flow** (`/booking`) — multi-step wizard: room selection → package → pax → addons → date/time → submit. Writes to `registrations`. Supports ONLINE_QRIS and ONLINE_KEEPSLOT (6-hour hold). Fetches live product data from Supabase.
- **Free photobooth** (`/photobooth`) — 100% client-side, no uploads during session; browser camera → strips composited on canvas → local download. Google Apps Script upload is post-session optional opt-in.
- **Self check-in** (`/checkin?sid=...`) — customer scans QR at studio; sets `checked_in_at` on their registration
- **Price list** (`/pricelist`) — **STATIC, HARDCODED** page; NOT synced with `products` table. Known divergence.
- **How-to-book guide** (`/cara-booking`) — static informational page
- **QR code printer** (`/admin/qr`) — staff-facing utility to print the self-check-in QR pointing to `meraselfstudio.com/checkin`
- **Strip upload proxy** (`/api/upload-strip`) — proxies photobooth strip POSTs to Google Apps Script

### POS Dashboard (`pos-dashboard`)
All features live in `App.tsx` or sub-components. Navigation is view-key state switching.

- **PIN authentication** — Owner PIN: `1609`, Admin PIN: per-crew `pin_hash`. Client-side only; no Supabase Auth.
- **Booking Management Board** (`/booking-management`) — live Supabase Realtime subscriptions on `registrations`. Shows PENDING/VERIFIED/PROCESSED/EXPIRED statuses. Handles KEEPSLOT expiry auto-check on load.
- **POS / Payment Modal** — fetches latest `products` from Supabase → builds line items using shared `calcBookingLineItems()` → accepts CASH/TRANSFER/QRIS/ONLINE_QRIS → writes to `transactions`. Supports discount with required reason field.
- **Receipt Generation** — `html2canvas` renders receipt as JPEG for printing/WhatsApp sharing.
- **Attendance Board** — crew clock-in/out with webcam photo capture. Dual upload: Supabase Storage (`attendance-photos` bucket) + Google Drive via `/api/upload` proxy endpoint (this endpoint may be missing/planned — see Known Gotchas). Hardcoded shift rates (see Rule 11). Hardcoded bonus targets.
- **Finance / Backoffice** — reads PAID transactions, displays omzet. Reads attendance for payroll review. Expense logging.
- **Payroll** — calls `calculate-payroll` Supabase Edge Function. INTERN payroll bypasses all penalties/bonuses.
- **TV Display** (`/tv`) — passive display screen (bookings or promotional content)
- **Kiosk View** (`/kiosk`) — embedded kiosk management or deep-link launcher

### Kiosk (`kiosk`)
Hardware tablet app in-studio. Communicates with the **Capture Engine** local server on the Mac Mini at `http://192.168.1.100:3100`.

- **Idle screen** — attract loop, starts session on tap
- **Gallery screen** — shows photos from the current session (fetched from Capture Engine)
- **Editor screen** — apply filters/stickers to selected photo strip
- **Print screen** — confirm and trigger print job via Capture Engine
- **`FrameGalleryScreen.tsx`** — ⚠️ **INCOMPLETE / NOT WIRED UP** — uses dummy frame data, className-based styling (inconsistent with rest of app), `useState(null)` untyped. Not referenced in `App.tsx` routing. May be abandoned or pending.

### Shared Package: `@mera/supabase`
- Supabase client singleton
- All canonical DB type definitions
- `hitungHargaBertingkat(product, jumlahOrang)` — tiered pricing calculator
- `calcBookingLineItems(products, addons)` — **canonical shared pricing function** used by BOTH customer portal BookingFlow AND POS payment modal. Single source of truth for line-item breakdown.
- `BookingAddons`, `BookingLineItem` interfaces

---

## 5. Database Schema

All TypeScript types live in `packages/supabase/src/types/database.types.ts`.

### `crew`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| nama | string | |
| role | `'Admin' \| 'Crew' \| 'Intern'` | |
| status_gaji | `'PRO' \| 'INTERN'` | Controls payroll penalty/bonus logic |
| pin_hash | string \| null | SHA-256 of 4-digit PIN |
| is_active | boolean | |
| created_at | timestamp | |

### `attendance`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| crew_id | UUID FK → crew | |
| clock_in | timestamp | Locked at clock-in |
| clock_out | timestamp \| null | |
| shift_type | string | `'Weekday Full Time' \| 'Weekend Shift 1' \| 'Weekend Shift 2' \| 'Weekend Full Time'` |
| base_rate | number | **Locked at clock-in** — never retroactively updated |
| late_minutes | number | Auto-calculated vs scheduled shift start |
| penalty_amount | number | `late_minutes / 10 * 5000 IDR` — always 0 for INTERN |
| bonus_amount | number | Calculated at clock-out — always 0 for INTERN |
| photo_in_url | string \| null | Supabase Storage URL |
| photo_out_url | string \| null | Supabase Storage URL |
| status | `'ACTIVE' \| 'COMPLETED'` | |
| created_at | timestamp | |

**CRITICAL: DO NOT JOIN attendance with registrations or transactions. HR-only table.**

### `products`
| Column | Type | Notes |
|--------|------|-------|
| id | integer PK (SERIAL) | **NOT UUID** |
| nama | string | |
| kategori | string | |
| tipe_harga | `'normal' \| 'bertingkat'` | |
| harga_dasar | number | Used when `tipe_harga = 'normal'`; also add-on price |
| tier_1 | number \| null | Price for 1st person |
| tier_2 | number \| null | Price for 2nd person |
| tier_3 | number \| null | Price for 3rd person |
| tier_lebih | number \| null | Price per person beyond all tiers |
| is_active | boolean | |
| max_orang | number | Max participants per session |
| default_bw | boolean | TRUE = B&W by default |
| is_addon | boolean | TRUE = selectable add-on, not main package |

### `registrations`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| customer_name | string | |
| instagram_handle | string | `@username` format — used for file delivery via IG DM |
| booking_type | `'ONLINE_QRIS' \| 'ONLINE_KEEPSLOT'` | |
| status | `'PENDING' \| 'VERIFIED' \| 'PROCESSED' \| 'EXPIRED'` | |
| session_id | string \| null | **DD-SANITIZEDNAME-CODE**, macOS folder-safe |
| preferred_date | string \| null | YYYY-MM-DD |
| preferred_time | string \| null | HH:MM |
| addons | JSON \| null | See `BookingAddons` interface below |
| expires_at | string \| null | KEEPSLOT only: `created_at + 6h` |
| checked_in_at | string \| null | Set via self check-in QR scan at studio |
| created_at | timestamp | |

**`addons` JSON shape (`BookingAddons` interface):**
```typescript
{
  room?: string | null           // e.g. 'Basic Studio', 'Elevator Studio'
  variant?: string | null        // unused/future
  selected_addons?: string[]     // e.g. ['EDITED_COLORED']
  pax?: number                   // number of people
  product_id?: number | null     // main product id — stored since v2.1; absent in older bookings
  computed_price?: number        // price snapshot at booking time (fallback for old records)
}
```

### `transactions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| session_id | string | DD-NAME-CODE format — same as macOS Capture One folder |
| registration_id | UUID FK \| null | Links to registrations |
| processed_by | UUID \| null | crew.id (cashier audit trail) |
| selection_start_time | string \| null | 5-minute photo selection timer start |
| total_amount | number | |
| discount_amount | number | Default 0 |
| discount_reason | string \| null | **REQUIRED if discount_amount > 0** |
| payment_method | `'CASH' \| 'TRANSFER' \| 'QRIS' \| 'ONLINE_QRIS'` \| null | |
| status | `'ACTIVE' \| 'PAID' \| 'REFUNDED' \| 'VOID'` | |
| created_at | timestamp | |

### `expenses`
| Column | Type |
|--------|------|
| id | UUID PK |
| tanggal | string (YYYY-MM-DD) |
| keterangan | string |
| kategori | string |
| jumlah | number (IDR) |
| created_at | timestamp |

### `phonebooth_photos`
| Column | Type |
|--------|------|
| id | UUID PK |
| strip_url | string |
| filter | string |
| photo_count | number |
| promo_consent | boolean |
| created_at | timestamp |

### RLS Posture
- **Anon client** (no Supabase Auth): broad SELECT + INSERT on most tables; UPDATE on `registrations`, `transactions`, `attendance`
- **`crew` writes**: `service_role` key only — never writable by anon client
- POS dashboard runs as **anon**. PIN auth is client-side only. Supabase Auth is NOT used.

---

## 6. API Integrations

### Supabase (Primary backend)
- All DB reads/writes via `@mera/supabase/client` singleton
- **Realtime**: `registrations` table (POS booking board live updates)
- **Storage buckets**:
  - `attendance-photos` — crew clock-in/out webcam captures (private)
  - `phonebooth` — customer photobooth strips (public, no auth needed)
- **Edge function**: `calculate-payroll` — Deno, uses `SUPABASE_SERVICE_ROLE_KEY`

### Capture Engine (Kiosk hardware backend)
- Base URL: `VITE_API_BASE` env var, defaults to `http://192.168.1.100:3100`
- Runs on the Mac Mini in the studio (local network only)
- Endpoints (from `apps/kiosk/src/lib/api.ts`):
  - `POST /api/sessions` — start a new photo session
  - `GET /api/sessions/:id/photos` — fetch captured photos
  - `GET /api/frames` — list available frame overlays
  - `POST /api/print` — trigger print job
  - `POST /api/render` — trigger render job (strip compositing)

### Google Apps Script
- Receives photobooth strip image uploads from the customer portal
- Called via `POST /api/upload-strip` proxy in customer-portal (avoids CORS)
- URL configured via `NEXT_PUBLIC_APPS_SCRIPT_URL`
- POST body: `multipart/form-data` with image + metadata

### Google Drive
- Mac Mini runs Google Drive Desktop Sync in background
- Capture One exports go into macOS folders named by `session_id` → auto-synced to Google Drive
- Download links shared to customers via Instagram DM
- Crew attendance photos also stored via Google Drive (referenced in AttendanceBoard dual-upload)

### `/api/upload` Proxy (Attendance Photo Dual Upload)
- Referenced in `AttendanceBoard.tsx` for Google Drive upload of crew photos
- **Status: possibly missing/planned** — not found as a Next.js route file in the repo
- May be served by a separate local Node server or is a planned feature
- Without this endpoint, only the Supabase Storage upload path functions

### Instagram (Operational, not technical)
- No API integration — IG DM is part of the manual operational workflow
- Booking confirmations, payment receipts, and file delivery are done via IG DM

---

## 7. Coding Conventions & Patterns

### Styling
- **Inline style objects are the dominant pattern** — Tailwind is NOT used
- Visual changes live directly in component files, not in separate CSS/class files
- `apps/pos-dashboard/src/index.css` defines a comprehensive CSS design token system:
  - CSS custom properties: `--color-bg-primary`, `--color-accent`, `--color-text-primary`, etc.
  - System font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif`
  - Apple HIG-inspired design language: off-white `#F5F5F7`, dark text, minimal chrome
  - Animations: `realtime-pulse` (booking live update dot), `slide-in-left`, `pin-shake`, `pin-dot-pop`
  - Layout utilities: `.app-container`, `.main-content`, `.sidebar`, etc.
- Customer portal background: `#000000` (black) with white/light text
- `@mera/ui` primitives (Button, Card, Modal, Badge) are available but adoption is partial

### TypeScript
- `strict: true` in all packages
- `skipLibCheck: true` to avoid issues with Supabase TS
- `// eslint-disable-next-line @typescript-eslint/no-explicit-any` is acceptable for direct Supabase client calls that need type casting

### State Management
- **Zustand** in pos-dashboard (`usePOSStore`) and kiosk (`useKioskStore`)
- **Local React state** in customer-portal — no Zustand
- POS: most state is in `App.tsx` with `useState` calls; Zustand for cross-component state

### Navigation / Routing
- **customer-portal**: Next.js App Router file-based routing
- **pos-dashboard**: View-key state switching inside `App.tsx` — `const [view, setView] = useState('booking-management')`. React Router is declared as a dependency but navigation is state-based.
- **kiosk**: Screen-key state switching inside `App.tsx` — similar pattern to POS

### Time (Indonesian Time, WIB UTC+7)
- **ALWAYS use WIB (UTC+7)** for all date/time logic
- Pattern: `new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)` for today's date key
- Shift start times computed as WIB — late penalty is calculated vs scheduled shift start in WIB

### Indonesian Language
- UI text, some variable names, and all DB column names mix Indonesian and English
- `nama` = name, `tanggal` = date, `jumlah` = amount, `keterangan` = description, `bertingkat` = tiered
- Currency: IDR, formatted as `Rp ${n.toLocaleString('id-ID')}` or via a `formatIDR()` helper

### Shared Pricing (Critical Pattern)
- **Never duplicate pricing logic in app code**
- Always use `calcBookingLineItems(products, addons)` from `@mera/supabase`
- Always fetch fresh `products` from Supabase before any price display — never use hardcoded prices in POS or booking flow
- `products.id` is an integer (SERIAL), not UUID

---

## 8. Environment Variables

### `customer-portal` — `apps/customer-portal/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APPS_SCRIPT_URL=        # Google Apps Script web app URL for strip upload
```

### `pos-dashboard` — `apps/pos-dashboard/.env.local`
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CUSTOMER_PORTAL_URL=           # Customer portal origin (fallback: http://localhost:3000)
VITE_PORTAL_URL=                    # KioskView deep-link base (fallback: https://meraselfstudio.com)
```

### `kiosk` — `apps/kiosk/.env.local`
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE=                      # Capture Engine base URL (default: http://192.168.1.100:3100)
```

### Supabase Edge Functions (auto-injected by Supabase runtime)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=          # Used by calculate-payroll to bypass RLS
```

---

## 9. Features In Development or Planned

These are incomplete features found via code inspection — confirmed by code status, not assumed.

| Feature | Location | Status | Evidence |
|---------|---------|--------|---------|
| Frame Gallery (Kiosk) | `apps/kiosk/src/screens/FrameGalleryScreen.tsx` | Dead / in-progress — not wired to router | Hardcoded dummy data, className-based styles (inconsistent), `useState(null)` untyped, no route in `App.tsx` |
| `/api/upload` proxy for Google Drive | Referenced in `AttendanceBoard.tsx` | Missing or planned | Not found as a Next.js API route; may be served elsewhere |
| Static pricelist → DB-driven | `apps/customer-portal/src/app/pricelist/page.tsx` | Known divergence | All prices hardcoded; no Supabase fetch |
| `product_id` in addons (v2.1) | `packages/supabase/src/types/database.types.ts` | Shipped; older bookings lack this field | `addons.product_id` marked as optional; fallback inference logic in `calcBookingLineItems` handles absence |

---

## 10. Critical Rules — Do NOT Change Without Confirmation

### Rule 1: Session ID Sanitization
**File:** `apps/customer-portal/src/lib/sanitize.ts`

Session IDs are **macOS folder names** used in Capture One on the Mac Mini.
Any unsupported character crashes the filesystem or creates a mismatched folder.
**Always** call `sanitizeSessionId()` before writing `session_id` to Supabase.

Format: `DD-SANITIZEDNAME-CODE` (e.g. `27-AYU-MR`). Only `[a-zA-Z0-9-]` characters.

### Rule 2: Shared Pricing — Never Diverge
**File:** `packages/supabase/src/types/database.types.ts`

`calcBookingLineItems(products, addons)` is the single source of truth for price calculation.
It must be used in BOTH customer-portal `BookingFlow.tsx` AND pos-dashboard payment processing.
`hitungHargaBertingkat(product, pax)` is the tiered pricing calculator — also lives here.

**Never hardcode prices or duplicate pricing math in component files.**

### Rule 3: Finance Counts PAID Transactions Only
Omzet/revenue counts only `transactions.status === 'PAID'`.
Do not change the transaction state machine without reviewing finance aggregations.

### Rule 4: INTERN Payroll Bypass
In `supabase/functions/calculate-payroll/index.ts`:
When `status_gaji === 'INTERN'`: `penalty_amount = 0`, `bonus_amount = 0`, `net_pay = 0`.
This is intentional — INTERN status is for operational logging only, not pay processing.

### Rule 5: Attendance Isolation
**Never JOIN `attendance` with `registrations` or `transactions`.**
Attendance is HR-only data. The `base_rate` on an attendance record is locked at clock-in
and must never be retroactively updated, even if the crew's salary data changes.

### Rule 6: Photobooth is 100% Client-Side
**File:** `apps/customer-portal/src/components/PhotoboothPage.tsx`

During capture: **zero network calls** — no Supabase, no uploads, no external APIs.
Output is a local browser download only. The Google Apps Script upload is a post-session, opt-in action.
Do not add network calls to `PhotoboothPage.tsx` without an explicit product decision.

### Rule 7: Time Slot Arrays Must Stay in Sync
Booking time slot arrays exist in BOTH:
- `apps/customer-portal/src/components/BookingFlow.tsx`
- `apps/pos-dashboard/src/App.tsx`

If you add, remove, or change time slots: **update both files.**

### Rule 8: Discount Reason Required
`discount_reason` must be non-null when `discount_amount > 0` on a transaction.
This is a hard owner audit requirement.

### Rule 9: KEEPSLOT Expiry is 6 Hours
`ONLINE_KEEPSLOT` registrations expire exactly 6 hours after `created_at`.
The POS board auto-expires on load. The booking flow sets `expires_at = now + 6h`.
Do not change this without a product/business decision.

### Rule 10: Owner PIN is Hardcoded
`OWNER_PIN = '1609'` is hardcoded in `apps/pos-dashboard/src/App.tsx`.
Acceptable for current internal use. Do not move to `.env` without adding proper secret management.
Do not log or expose it in errors or console output.

### Rule 11: Hardcoded Shift Rates and Bonus Targets (Known Constants)
In `apps/pos-dashboard/src/components/AttendanceBoard.tsx`:
- Weekday Full Time rate: **75,000 IDR**
- Weekend Shift 1 / Shift 2 rate: **35,000 IDR**
- Weekend Full Time rate: **100,000 IDR**
- Weekday bonus target: **1,000,000 IDR** omzet
- Weekend bonus target: **1,500,000 IDR** omzet

These are business constants. Do not change without explicit owner instruction.

### Rule 12: `products.id` is an Integer, Not a UUID
The `products` table uses a SERIAL integer primary key. Never treat `Product.id` as a UUID.
When storing `product_id` in `addons` JSON, it is a `number`.

### Rule 13: RLS Is Wide Open for Anon — No Secret Data in Anon-Accessible Tables
The anon Supabase client can SELECT all public tables. Do not store sensitive data
(PINs, private contact info, payment credentials) in tables readable by anon.
Crew PIN hashes are stored — ensure they remain hashed (never plaintext).

---

## 11. Key Commands

```bash
# Install
pnpm install

# Dev (all apps)
pnpm dev

# Per-app dev
pnpm --filter customer-portal dev      # localhost:3000
pnpm --filter pos-dashboard dev        # localhost:5173
pnpm --filter kiosk dev               # localhost:5174

# Build
pnpm build
pnpm --filter customer-portal build

# Type check — ALWAYS run after touching shared types in @mera/supabase
pnpm --filter customer-portal type-check
pnpm --filter pos-dashboard type-check
pnpm --filter kiosk type-check

# Lint
pnpm lint

# Clean
pnpm clean
```

---

## 12. Deployment

### Customer Portal → Vercel
- Auto-deploys from `main` branch
- Config: `apps/customer-portal/vercel.json`
- **Two-step deploy via `deploy.sh`**: customer portal uses `pnpm deploy --filter customer-portal` to a `.deploy-portal/` temp dir to avoid monorepo symlink issues with Vercel
- Next.js config (`next.config.ts`) transpiles `@mera/ui` and `@mera/supabase` workspace packages

### POS Dashboard — Local Only
- Runs locally on the studio iMac (27-inch)
- `pnpm --filter pos-dashboard build` → serve the static `dist/` output via any local server
- `deploy.sh` handles the POS dashboard deploy separately (direct build)

### Kiosk — Local Network
- Runs on Android tablet in studio on local WiFi
- `pnpm --filter kiosk build` → serve `dist/` on local network

### Supabase
- Edge functions: `supabase functions deploy calculate-payroll`
- Migrations: `supabase db push` or via `scripts/run-migrations.mjs`

---

## 13. File Map — Quick Reference

| What | Where |
|------|-------|
| All DB types + shared pricing | `packages/supabase/src/types/database.types.ts` |
| Supabase client singleton | `packages/supabase/src/client.ts` |
| Package public exports | `packages/supabase/src/index.ts` |
| Session ID sanitizer | `apps/customer-portal/src/lib/sanitize.ts` |
| Booking flow (customer) | `apps/customer-portal/src/components/BookingFlow.tsx` |
| Landing page | `apps/customer-portal/src/components/LandingPage.tsx` |
| Free photobooth | `apps/customer-portal/src/components/PhotoboothPage.tsx` |
| Self check-in | `apps/customer-portal/src/components/CheckinPage.tsx` |
| Strip upload proxy | `apps/customer-portal/src/app/api/upload-strip/route.ts` |
| Admin QR printer | `apps/customer-portal/src/app/admin/qr/page.tsx` |
| POS dashboard (all logic) | `apps/pos-dashboard/src/App.tsx` |
| Attendance board | `apps/pos-dashboard/src/components/AttendanceBoard.tsx` |
| POS CSS design tokens | `apps/pos-dashboard/src/index.css` |
| Kiosk app entry | `apps/kiosk/src/App.tsx` |
| Kiosk Capture Engine client | `apps/kiosk/src/lib/api.ts` |
| Kiosk state store | `apps/kiosk/src/store/useKioskStore.ts` |
| Payroll edge function | `supabase/functions/calculate-payroll/index.ts` |
| DB migrations | `supabase/migrations/` (001 → 010) |
| Deployment script | `deploy.sh` |
| Architecture docs (start here) | `docs/9-current-project-context.md` |

---

## 14. Known Gotchas

1. **Inline styles everywhere** — visual changes require editing component files directly; there is no Tailwind or global CSS class system.

2. **`App.tsx` in POS is monolithic** — most POS logic is in one large file. Navigation is `view` state switching (`useState('booking-management')`), not React Router, despite the router dependency.

3. **RLS is wide open for anon** — registrations, transactions, and attendance are all writable by anonymous clients. Security is enforced by client-side PIN gates and `service_role`-only writes to the `crew` table.

4. **`products.id` is a SERIAL integer** — not a UUID. Do not treat it as one.

5. **Pricelist page is static** — `apps/customer-portal/src/app/pricelist/page.tsx` has hardcoded prices that are NOT sourced from Supabase. If product prices change in the DB, the pricelist page must be manually updated.

6. **Older bookings lack `product_id`** — `addons.product_id` was added in v2.1. `calcBookingLineItems()` falls back to room-label → kategori inference for older records.

7. **Time slots duplicated** — weekday/weekend time slot arrays exist in both `BookingFlow.tsx` and `App.tsx`. Change one → change both.

8. **`/api/upload` may be missing** — `AttendanceBoard.tsx` references `/api/upload` for Google Drive upload of crew clock-in photos. This endpoint was not found as a Next.js route file. Only the Supabase Storage path is confirmed working.

9. **`FrameGalleryScreen.tsx` is dead code** — the kiosk screen is not wired to any route in `App.tsx`. Uses inconsistent styles and dummy data. Do not rely on it or extend it without first auditing its state.

10. **Legacy docs drift** — `docs/` files 1–8 reference older tech decisions and naming. Trust `docs/9-12` and the code. When docs and code disagree, the code is correct.

11. **Price is snapshotted at booking time** — `registration.addons.computed_price` captures the price at submission. Changing product prices in the DB does not retroactively update old bookings' computed prices.

12. **Kiosk is a hardware system** — the `kiosk` app does not write bookings or talk to the customer portal directly. It communicates with the local Capture Engine server on the Mac Mini (`http://192.168.1.100:3100`). Without that server running, the kiosk app has no backend.
