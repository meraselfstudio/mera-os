# 11. Core Business Logic

This file explains the important runtime logic and lifecycle rules in the current codebase.

## 11.1 Canonical Domain Types

The source of truth is `packages/supabase/src/types/database.types.ts`.

### Core Entities

| Entity | Purpose | Main Status Values |
| --- | --- | --- |
| `Product` | Bookable package or add-on | `is_active`, `is_addon`, `tipe_harga` |
| `Registration` | Customer booking request | `PENDING`, `VERIFIED`, `PROCESSED`, `EXPIRED` |
| `Transaction` | POS billing session | `ACTIVE`, `PAID`, `REFUNDED`, `VOID` |
| `Attendance` | Crew clock-in / clock-out record | `ACTIVE`, `COMPLETED` |
| `Expense` | Finance outflow record | no workflow status |
| `Crew` | Staff identity and payroll type | `PRO`, `INTERN` via `status_gaji` |

### Booking Types

`Registration.booking_type` can be:

- `ONLINE_KEEPSLOT`
  - booking reserves a slot temporarily
- `ONLINE_QRIS`
  - online QRIS payment flow

### Payment Methods

`Transaction.payment_method` can be:

- `CASH`
- `TRANSFER`
- `QRIS`
- `ONLINE_QRIS`

## 11.2 Shared Pricing Logic

The shared pricing helper is:

- `hitungHargaBertingkat(product, jumlahOrang)`

Rules:

- `normal` pricing uses `harga_dasar`
- `bertingkat` pricing sums each person using tier positions
- if the group exceeds explicit tiers, `tier_lebih` is used

This helper is shared across surfaces and should remain the canonical pricing calculation.

## 11.3 Customer Booking Flow

The booking flow lives in:

- `apps/customer-portal/src/components/BookingFlow.tsx`

Main steps:

1. Customer selects room and package
2. Optional variant and add-ons are chosen
3. Pax count is set
4. Date and time are selected from weekday or weekend slot arrays
5. Customer enters name and Instagram handle
6. Booking type is selected (online-only)
7. A registration is inserted into Supabase

Important implementation details:

- `session_id` is generated before insert
- `addons` stores operational context such as room, variant, selected add-ons, pax, and computed price
- `ONLINE_KEEPSLOT` adds `expires_at = now + 6 hours`
- customer confirmation is routed through Instagram DM to `@mera.selfstudio`
- booking flow stores enough detail for POS to reconstruct the session later

## 11.4 Booking Management Logic

Booking management currently lives in:

- `apps/pos-dashboard/src/components/POSBoard.tsx`

### What it does

- loads registrations from Supabase
- auto-expires stale keep-slot bookings
- listens to realtime registration changes
- groups bookings by selected date
- maps bookings into studio columns
- opens transaction sessions from verified registrations

### Registration Lifecycle

Normal path:

1. `PENDING`
2. `VERIFIED`
3. `PROCESSED`

Exception path:

- keep-slot bookings can become `EXPIRED`

### Keep Slot Expiry

On load, the board checks for registrations where:

- `booking_type === ONLINE_KEEPSLOT`
- `status === PENDING`
- `expires_at < now`

Those records are updated to `EXPIRED`.

### Studio Mapping

Studio mapping is derived from registration data rather than a separate rigid field.

`POSBoard.tsx` normalizes studio from values such as:

- `addons.room`
- `addons.studio`
- `addons.studio_type`
- `addons.selected_studio`
- fallback `studio_type`

Current studio buckets:

- `BASIC`
- `MAJESTIC`
- `ELEVATOR`

### Scheduling Model

The board uses:

- mini-month date selection
- weekday and weekend slot arrays
- one large per-studio schedule for the selected date
- a separate floating queue for bookings without a clear slot or studio assignment

### Realtime

The board subscribes to the `registrations` table through Supabase Realtime.

Effects:

- inserts show up immediately
- updates replace cards in place
- deletes remove cards from the board

## 11.5 Transaction Handling Logic

Transaction handling also lives inside `POSBoard.tsx`.

### Opening a Session

When a verified registration is processed:

1. a transaction is inserted into `transactions`
2. the transaction starts as `ACTIVE`
3. total amount is seeded from the registration's computed package price
4. the registration is moved to `PROCESSED`

### Active Transaction Operations

An active transaction can:

- add POS add-ons
- update total amount
- choose payment method
- apply discount
- store discount reason

### Paid Transaction Follow-up

Once paid, the transaction detail panel supports:

- receipt preview
- receipt JPG generation using `html2canvas`
- Instagram DM message templating
- customer follow-up handoff

Important finance rule:

- finance summary counts only `PAID` transactions as realized omzet

## 11.6 POS and Finance Gates

There are two hardcoded PIN gateways right now:

- `POSGateway.tsx`
- `FinanceGateway.tsx`

Current behavior:

- POS access is locked behind a PIN screen
- finance access is also locked behind a PIN screen

Current code note:

- the PIN is hardcoded as `1609` in both gateway components
- this is a clear candidate for future hardening

## 11.7 Attendance Logic

Attendance logic lives in:

- `apps/pos-dashboard/src/components/AttendanceBoard.tsx`

### Shift Model

Current shift definitions include:

- Weekday Full Time
- Weekend Shift 1
- Weekend Shift 2
- Weekend Full Time

### Attendance Behavior

Attendance records contain:

- clock in / clock out timestamps
- locked base rate
- late minutes
- penalty amount
- photo URLs

### Late Penalty Rules

Rules currently encoded in the UI and payroll function:

- 10-minute grace period
- penalty is charged per 10-minute late block
- `INTERN` bypasses penalty logic

### Photo Handling

Clock-in and clock-out use webcam capture.

Photos are uploaded to Supabase Storage in the `attendance-photos` bucket path flow.

## 11.8 Finance Logic

Finance logic lives in:

- `apps/pos-dashboard/src/components/FinanceDashboard.tsx`
- `supabase/functions/calculate-payroll/index.ts`

### Finance Summary

Finance dashboard calculates:

- total paid revenue
- total discounts
- cash total
- QRIS / transfer total
- target progress
- payroll preview
- expenses total

### Date Ranges

Current range presets:

- today
- week
- month

### Payroll Logic

Payroll preview is built from attendance rows.

The edge function `calculate-payroll`:

- loads crew
- short-circuits for `INTERN`
- aggregates attendance rows
- returns base rate, penalty, and net pay

## 11.9 Kiosk Logic

Kiosk logic lives in:

- `apps/pos-dashboard/src/components/KioskView.tsx`

Current behavior:

- fetches active products
- lets the user tap a package card
- generates a booking URL into the customer portal
- does not directly write bookings to Supabase

That means kiosk is a handoff surface, not a second booking engine.

## 11.10 Photobooth Logic

Photobooth logic lives in:

- `apps/customer-portal/src/components/PhotoboothPage.tsx`

This is intentionally isolated from the rest of the booking and POS stack.

Important guarantees in the current implementation:

- camera access uses `getUserMedia()`
- all processing stays client-side
- no Supabase calls
- no uploads
- no network requests during capture flow
- output is downloaded directly to the user's device

This privacy rule should be preserved unless product requirements explicitly change.

## 11.11 Key Cross-System Dependencies

There are several important coupling points to know about.

### Time Slot Coupling

Weekday and weekend slot arrays exist in multiple places, especially:

- booking flow
- booking management board

If slot definitions change, both surfaces need to stay aligned.

### Pricing Coupling

The registration stores computed price in `addons.computed_price`, and transactions use that as the starting total.

If pricing rules change:

1. shared helper must stay correct
2. booking insert payload must stay correct
3. POS session opening must stay consistent

### Instagram Handoff

Instagram is part of the operational flow, not just profile data.

It is used for:

- booking confirmation context
- post-payment follow-up
- delivery of receipt and asset links