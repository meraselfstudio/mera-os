# 12. Development Reference

This file is the practical guide for editing, validating, and extending the current codebase.

## 12.1 Local Commands

From the repo root:

```bash
pnpm install
pnpm --filter customer-portal dev
pnpm --filter customer-portal build
pnpm --filter customer-portal type-check

pnpm --filter pos-dashboard dev
pnpm --filter pos-dashboard build
pnpm --filter pos-dashboard type-check
```

Workspace-level commands:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm clean
```

## 12.2 Environment Variables

### Shared Supabase

The shared client package supports both Next and Vite.

For Next.js surfaces:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

For Vite surfaces:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Customer Portal Links from Internal App

Used by the island hub:

- `VITE_CUSTOMER_PORTAL_URL`

Used by kiosk deep-linking:

- `VITE_PORTAL_URL`

Fallback behavior in current code:

- island hub falls back to `http://localhost:3000` in local dev and `https://meraselfstudio.com` otherwise
- kiosk falls back to `https://meraselfstudio.com`

### Hardcoded Production Metadata

The customer portal layout currently hardcodes production metadata URLs in:

- `apps/customer-portal/src/app/layout.tsx`

This includes:

- `metadataBase`
- OpenGraph URL
- site name and preview defaults

## 12.3 Key File Map

### Customer Portal

- `apps/customer-portal/src/app/layout.tsx`
  - global metadata and document shell
- `apps/customer-portal/src/app/page.tsx`
  - landing page route
- `apps/customer-portal/src/app/booking/page.tsx`
  - booking route
- `apps/customer-portal/src/app/photobooth/page.tsx`
  - photobooth route
- `apps/customer-portal/src/components/LandingPage.tsx`
  - homepage UX and room selection
- `apps/customer-portal/src/components/BookingFlow.tsx`
  - booking state machine and registration insert
- `apps/customer-portal/src/components/PhotoboothPage.tsx`
  - client-only capture and collage flow

### POS Dashboard

- `apps/pos-dashboard/src/App.tsx`
  - route map for the internal app
- `apps/pos-dashboard/src/components/IslandHub.tsx`
  - internal island launcher
- `apps/pos-dashboard/src/components/POSBoard.tsx`
  - booking management, schedule board, transaction detail flow
- `apps/pos-dashboard/src/components/BackofficeIsland.tsx`
  - attendance and finance wrapper route
- `apps/pos-dashboard/src/components/AttendanceBoard.tsx`
  - crew attendance logic
- `apps/pos-dashboard/src/components/FinanceDashboard.tsx`
  - summary, payroll, and expenses logic
- `apps/pos-dashboard/src/components/POSGateway.tsx`
  - POS lock screen
- `apps/pos-dashboard/src/components/FinanceGateway.tsx`
  - finance lock screen
- `apps/pos-dashboard/src/components/KioskView.tsx`
  - tablet kiosk handoff UI

### Shared Domain Logic

- `packages/supabase/src/client.ts`
  - shared Supabase client logic
- `packages/supabase/src/index.ts`
  - shared exports
- `packages/supabase/src/types/database.types.ts`
  - canonical domain types and pricing helper

### Backend and Infra

- `supabase/migrations/`
  - DB evolution and seed history
- `supabase/functions/calculate-payroll/index.ts`
  - payroll edge function
- `turbo.json`
  - workspace task graph
- `vercel.json`
  - customer portal deployment target

## 12.4 Editing Guidelines by Feature

### If You Change Booking Slots

Update both:

- `apps/customer-portal/src/components/BookingFlow.tsx`
- `apps/pos-dashboard/src/components/POSBoard.tsx`

Reason:

- both surfaces currently maintain their own weekday and weekend slot arrays

### If You Change Studio Names or Mapping

Check:

- `BookingFlow.tsx` room definitions
- `POSBoard.tsx` studio normalization and studio columns
- any product naming assumptions in kiosk and landing page

### If You Change Pricing

Check these together:

- `packages/supabase/src/types/database.types.ts`
- booking flow price calculation
- transaction opening logic in `POSBoard.tsx`
- finance assumptions on paid totals

### If You Change Follow-up Messaging

Check transaction detail behavior in:

- `apps/pos-dashboard/src/components/POSBoard.tsx`

That area handles:

- DM message template
- receipt generation
- Instagram handoff

### If You Change Photobooth

Protect these current constraints:

- no network requests during capture
- no uploads
- no Supabase calls
- output remains device-local download

## 12.5 Current Gotchas

### Gotcha 1: Legacy Docs Drift

Some older docs still reference:

- Tailwind-first architecture
- earlier POS layout assumptions
- older frontend decisions

Use current code and docs `9` to `12` as the live reference.

### Gotcha 2: Inline Styles Are Common

A large part of the UI is still composed using inline style objects.

That means:

- visual changes often live directly in component files
- shared styling is only partial today

### Gotcha 3: Hardcoded PINs

Current owner PIN values are hardcoded in:

- `POSGateway.tsx`
- `FinanceGateway.tsx`

This is acceptable for current local/internal behavior but should not be treated as a mature secret-management model.

### Gotcha 4: Price Snapshot in Registration

The booking flow stores `computed_price` under registration addons.

That is convenient operationally, but it means pricing logic is partially snapshotted at booking time.

Be careful when changing pricing rules or replaying old bookings.

### Gotcha 5: Finance Uses Paid Transactions Only

Omzet and totals are built from transactions where:

- `status === PAID`

If a workflow changes transaction states or payment timing, finance numbers will change with it.

## 12.6 Validation Checklist

After editing customer portal logic:

```bash
pnpm --filter customer-portal type-check
pnpm --filter customer-portal build
```

After editing internal POS logic:

```bash
pnpm --filter pos-dashboard type-check
pnpm --filter pos-dashboard build
```

After changing shared domain types or helpers:

```bash
pnpm --filter customer-portal type-check
pnpm --filter pos-dashboard type-check
```

## 12.7 Recommended Reading Order for New Contributors

1. `docs/README.md`
2. `docs/9-current-project-context.md`
3. `docs/10-island-architecture.md`
4. `docs/11-core-business-logic.md`
5. `docs/12-development-reference.md`
6. Then inspect the owning app and component files