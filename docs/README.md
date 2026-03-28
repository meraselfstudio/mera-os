# Mera OS Documentation Map

This folder now has two layers of documentation:

1. Legacy and domain background docs (`1` to `8`)
2. Current implementation docs (`9` to `13`)

If you are new to the codebase, start with the current implementation docs first.

## Start Here

- [9-current-project-context.md](./9-current-project-context.md)
  - What this repo contains today, how the monorepo is organized, and which app owns which job.
- [10-island-architecture.md](./10-island-architecture.md)
  - The current four-island product model and how users move between them.
- [11-core-business-logic.md](./11-core-business-logic.md)
  - Booking, POS, transaction, attendance, finance, kiosk, and photobooth logic.
- [12-development-reference.md](./12-development-reference.md)
  - Key files, environment variables, validation commands, and current implementation gotchas.
- [13-visual-system-map.md](./13-visual-system-map.md)
  - Mermaid-based visual handoff maps for architecture, routes, flows, states, and data ownership.

## Current System Summary

Mera OS is currently a pnpm monorepo with two main apps:

- `apps/customer-portal`
  - Public customer-facing Next.js app
  - Owns landing page, booking flow, and photobooth experience
- `apps/pos-dashboard`
  - Internal React + Vite app
  - Owns the island hub, booking management, backoffice, kiosk, and supporting internal views

Both apps share:

- `packages/supabase`
  - Supabase client, generated types, and tiered pricing helper
- `packages/ui`
  - Shared UI primitives
- `packages/config`
  - Shared TS and lint config

The backend layer is in `supabase/` and contains migrations plus the `calculate-payroll` edge function.

## Current Product Islands

The current codebase is organized around four product islands:

1. Customer Portal
2. POS Dashboard / Booking Management
3. Attendance + Finance
4. Kiosk View

The internal POS app root route now acts as the island launcher.

## Legacy Docs Still Worth Reading

The older docs are still useful for domain background, but they are not always a perfect match for the current implementation.

- [1-architecture.md](./1-architecture.md)
  - Original system and ops architecture
- [2-database-schema.md](./2-database-schema.md)
  - Database thinking and schema background
- [3-data-flows.md](./3-data-flows.md)
  - Conceptual flows between booking, POS, and ops
- [4-payroll-and-crew.md](./4-payroll-and-crew.md)
  - Crew and payroll policy notes
- [5-frontend-architecture.md](./5-frontend-architecture.md)
  - Earlier frontend direction; useful as history, not exact code truth
- [7-api-adn-rpc.md](./7-api-adn-rpc.md)
  - API and RPC notes
- [8-deployment-and-ops.md](./8-deployment-and-ops.md)
  - Deployment and operational notes

## Source of Truth Rule

When documentation and code disagree:

1. Current code wins
2. Current implementation docs (`9` to `13`) come next
3. Legacy docs are historical context only