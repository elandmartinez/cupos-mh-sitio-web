# PROMPT 01: Init Project

> **Status: DONE (baseline).** This project was built before the prompt chain existed. This file records the baseline so later prompts have a fixed starting point. Do not re-run it.

## Goal

First working version of **cupos-sitio-web**: an internal admin web app for managing "cupos" (order slots) for a small reseller business, branded with a Monster High theme. A signed-in operator manages products, client purchases and payments. All user-facing copy is in Spanish.

## Stack

- Astro 7 (static output) with React 19 islands
- TypeScript (strict)
- Supabase (Auth, Postgres, Storage)
- Plain CSS with design tokens in `src/styles/theme.css`
- Deploy: Vercel, static only

## What was built in this pass

1. Astro skeleton with `/` (login) and `/dashboard` routes
2. Supabase email/password auth with a client-side guard
3. Product CRUD with image upload to the `products-images` bucket
4. Client purchases and payments per product
5. Read-only sales ledger ("Mis ventas") and the UXonFly design system

## Constraints

- Follow the architecture in `AGENTS.md` and `DOCUMENTATION.md`
- Static output only, no server compute, hermetic build
- Only `src/repositories/` talks to Supabase

## Done when

- `npm run dev` starts cleanly
- `npm run build` passes and leaves no `.vercel/output/functions/`
- A signed-in user can create a product, add a purchase and log a payment

## Out of scope for this pass

- Tests and linting (PROMPT-02)
- Row Level Security audit and `.env` untracking (PROMPT-02)
- Actionable sales rows and payment editing (later prompts)

## Next steps after this pass

See `PROMPT-02-FIX-KNOWN-ISSUES.md`. Further candidates live in `DOCUMENTATION.md` section 16.
