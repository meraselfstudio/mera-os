# 9. Current Project Context

This file explains what the repository contains today, how the monorepo is organized, and how the apps fit together as of March 2026.

## 9.1 Monorepo Shape

The repo is a pnpm workspace with two apps and three shared packages.

```text
mera-os/
  apps/
    customer-portal/
    pos-dashboard/
  packages/
    config/
    supabase/
    ui/
  docs/
  supabase/
  scripts/
```

At the root level:

- `package.json`
  - Shared workspace scripts like `dev`, `build`, `lint`, and `clean`
- `pnpm-workspace.yaml`
  - Includes `apps/*` and `packages/*`
- `turbo.json`
  - Defines workspace task orchestration
- `vercel.json`
  - Targets the customer portal build for deployment on Vercel

## 9.2 Apps

### `apps/customer-portal`

Purpose:

- Public customer-facing experience
- Brand and package discovery
- Booking creation
- Free photobooth experience
- Booking confirmation handoff via Instagram DM to @mera.selfstudio

Stack:

- Next.js 15
- React 19
- Shared Supabase package

Current routes:

- `/`
  - Landing page
- `/booking`
  - Booking flow
- `/photobooth`
  - Client-only free photobooth

Current booking behavior:

- `booking_type` is online-only: `ONLINE_KEEPSLOT` or `ONLINE_QRIS`
- confirmation CTA opens Instagram DM to `@mera.selfstudio`

Main files:

- `src/app/page.tsx`
- `src/app/booking/page.tsx`
- `src/app/photobooth/page.tsx`
- `src/components/LandingPage.tsx`
- `src/components/BookingFlow.tsx`
- `src/components/PhotoboothPage.tsx`

### `apps/pos-dashboard`

Purpose:

- Internal staff operations app
- Island launcher for internal tools
- Booking management and POS handling
- Backoffice attendance and finance
- Kiosk and TV support views

Stack:

- Vite 6
- React 19
- React Router 6
- Shared Supabase package

Current routes:

- `/`
  - Island hub
- `/booking-management`
  - Booking management and POS handling
- `/backoffice`
  - Attendance and finance island
- `/kiosk`
  - Tablet-friendly kiosk view
- `/tv`
  - TV dashboard
- `/os/dashboard`
  - Alternate POS layout route

Main files:

- `src/App.tsx`
- `src/components/IslandHub.tsx`
- `src/components/POSBoard.tsx`
- `src/components/BackofficeIsland.tsx`
- `src/components/KioskView.tsx`
- `src/components/AttendanceBoard.tsx`
- `src/components/FinanceDashboard.tsx`
- `src/components/POSGateway.tsx`
- `src/components/FinanceGateway.tsx`

## 9.3 Shared Packages

### `packages/supabase`

This is the most important shared package.

It provides:

- Supabase client creation that works in both Next and Vite
- Canonical database types
- Shared business enums and interfaces
- `hitungHargaBertingkat()` pricing helper

Main files:

- `src/client.ts`
- `src/index.ts`
- `src/types/database.types.ts`

### `packages/ui`

This package contains reusable UI primitives such as:

- `Button`
- `Card`
- `Modal`
- `Badge`

Current note:

- Much of the current app UI is still inline-style driven rather than fully standardized on this package.

### `packages/config`

This package holds shared config such as:

- TypeScript base configs
- ESLint base config

## 9.4 Backend and Data Layer

The project uses Supabase for shared backend functionality.

`supabase/` contains:

- `migrations/`
  - Schema evolution and seed files
- `functions/calculate-payroll/`
  - Edge function for payroll calculation
- `config.toml`
  - Supabase local config

The canonical runtime types live in `packages/supabase/src/types/database.types.ts`.

Important domain entities:

- `Crew`
- `Attendance`
- `Product`
- `Registration`
- `Transaction`
- `Expense`

## 9.5 Deployment Model

### Customer Portal

The current Vercel config is focused on the customer portal.

- Build command: `cd apps/customer-portal && pnpm run build`
- Output directory: `apps/customer-portal/.next`

### POS Dashboard

The internal dashboard is a Vite app and is built separately.

Common commands:

- `pnpm --filter pos-dashboard dev`
- `pnpm --filter pos-dashboard build`
- `pnpm --filter pos-dashboard type-check`

## 9.6 Current Architectural Direction

The repo is moving toward a clearer product split around islands:

1. Customer Portal
2. Booking Management
3. Backoffice
4. Kiosk

This is the current runtime mental model to use when editing or extending the project.

## 9.7 Important Documentation Note

Some older docs in this folder describe earlier assumptions such as:

- different frontend stack details
- a three-column POS mental model as the main entry point
- older UI philosophy notes that do not exactly match current implementation

Those docs still help explain business intent, but the current code and the new docs (`9` to `12`) should be treated as the active reference.