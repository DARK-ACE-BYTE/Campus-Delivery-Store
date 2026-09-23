# Campus Delivery Store

Responsive campus marketplace for browsing everyday products, saving orders, and handing checkout off to WhatsApp.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/campus-delivery` — React + Vite student storefront and admin workspace
- `artifacts/api-server/src/routes` — product, order, and dashboard API routes
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema` — PostgreSQL schema for products and orders
- `artifacts/campus-delivery/src/index.css` — shared visual theme

## Architecture decisions

- Student checkout creates the order in PostgreSQL before opening a prefilled WhatsApp message to the business number.
- Product imagery is stored as a lightweight product mark field so the owner can manage it without object storage.
- Admin pages use a temporary demo access gate until a managed auth provider is configured.
- The frontend consumes generated React Query hooks from the OpenAPI contract rather than hand-written API clients.

## Product

- Students can search a broad product catalog, filter by category, manage quantities, submit delivery details, and send their order to WhatsApp.
- Admins can view order totals and recent orders, mark orders delivered, and manage product names, categories, prices, availability, and descriptions.

## User preferences

- Mobile-first responsive experience.
- WhatsApp checkout instead of a payment gateway.

## Gotchas

- Run API and web workflows together; the storefront depends on `/api` routes.
- Run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI contract.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
