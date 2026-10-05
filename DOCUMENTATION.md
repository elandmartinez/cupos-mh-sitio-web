# Cupos Sitio Web — Project Documentation

> **Status:** work in progress · **Last documented:** 2026-10-04 · **Covers commit:** `b698b2b` + uncommitted design-system pass & deploy audit
>
> This document describes the project as it exists today: what it does, how it is
> wired together, and what is still rough. Keep it updated as the app grows.

---

## 1. What this project is

An **internal admin web app for managing "cupos"** (order slots/reservations) for a
small reseller business, branded with a *Monster High* theme. It is **not** a public
storefront — everything sits behind a Supabase email/password login.

The app lets a signed-in operator manage three related things:

| Concept | Spanish UI label | Meaning |
| :-- | :-- | :-- |
| **Product** | Producto | A catalog item / "cupo" being sold (name, description, value, release date, image). |
| **Client purchase** | Compra | A client reserving one product, with an agreed fee and a running paid total. |
| **Payment** | Pago | Money received against a purchase (can be flagged as an extra fee). |

All user-facing copy is in **Spanish**.

## 2. Tech stack

| Layer | Choice | Notes |
| :-- | :-- | :-- |
| Framework | **Astro 7** | Static-first, file-based routing. |
| UI islands | **React 19** | via `@astrojs/react` (JSX runtime `react-jsx`). |
| Language | **TypeScript** | `astro/tsconfigs/strict`. |
| Backend / BaaS | **Supabase** | Auth, Postgres (data + trigger logic), Storage (product images). |
| Deploy target | **Vercel** | via `@astrojs/vercel` adapter (`.vercel/` present). |
| Styling | **Plain CSS** | Hand-written CSS files + CSS custom properties (no Tailwind). The design system is documented in `DESIGN.md`. |
| Typography | **Outfit** (Google Fonts) | One family for the whole app, loaded in `Layout.astro` with `display=swap` plus a system fallback stack (degrades gracefully offline). |
| Runtime | **Node ≥ 22.12.0** | enforced by `engines` in `package.json`. |

> `package.json` still carries the starter name `"smoggy-shell"` — a leftover from
> `npm create astro`. It does not affect anything at runtime.

## 3. Requirements

- **Node.js ≥ 22.12.0** and npm (per `package.json#engines`).
- A **Supabase project** with the schema and storage bucket described in
  [§9 Data model](#9-data-model).
- A `.env` file (see below).

## 4. Environment variables

Astro exposes any variable prefixed with `PUBLIC_` to the browser. The app reads
exactly two (`src/lib/supabase.ts` and `src/hooks/useProducts.ts`):

```dotenv
# .env
PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
PUBLIC_SUPABASE_KEY=<publishable / anon key>
```

If either is missing, `src/lib/supabase.ts` throws at module load with a helpful
message, so a misconfigured build fails fast.

> [!WARNING]
> **`.env` is currently tracked by git** (it appears in `git ls-files` and in commit
> history). Only the *publishable/anon* key is in there today, which is safe by
> design to ship in a browser bundle — **but never put the Supabase `service_role`
> key here.** If this file ever held a real secret, rotate it and untrack it:
>
> ```sh
> git rm --cached .env
> printf '.env\n' >> .gitignore
> ```

## 5. Getting started

```sh
npm install          # install dependencies
npm run dev          # Astro dev server at http://localhost:4321
npm run build        # production build into ./dist
npm run preview      # serve the built output locally
npm run astro -- --help
```

This repo's `AGENTS.md` asks agents to run the dev server in the background instead
of blocking a terminal:

```sh
astro dev --background     # start detached
astro dev status           # is it up?
astro dev logs             # tail its output
astro dev stop             # stop it
```

A clean `npm run build` currently succeeds and emits two static pages
(`/index.html` and `/dashboard/index.html`).

There is **no `test` or `lint` script** — see [§14](#14-known-issues--tech-debt).

## 6. Project structure

```text
cupos-sitio-web/
├── astro.config.mjs        # React integration + Vercel adapter + devToolbar disabled
├── tsconfig.json           # extends astro/tsconfigs/strict, jsx: react-jsx
├── .env                    # PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_KEY (⚠ tracked)
├── AGENTS.md               # agent/contributor instructions (CLAUDE.md symlinks to it)
├── DESIGN.md               # design system: tokens, components, states, a11y (see §10.4)
├── public/                 # served as-is at the site root
│   ├── monster-high-logo.png        # used by loginModal.tsx
│   ├── monster-high-logo-color.png  # used by dashboard.tsx
│   ├── favicon.ico / favicon.svg
│   └── arroyo_heydi_-_mileage.pdf   # unrelated leftover, currently unreferenced
└── src/
    ├── pages/              # routes (Astro)
    │   ├── index.astro         # "/"          → LoginModal
    │   └── dashboard.astro     # "/dashboard" → DashboardApp
    ├── layouts/
    │   └── Layout.astro     # <html> shell, imports theme.css
    ├── components/          # React islands + one orphan Astro component
    │   ├── loginModal.tsx   # email/password sign-in form
    │   ├── dashboardApp.tsx # composes AuthProvider → AuthGuard → Dashboard
    │   ├── authGuard.tsx    # client-side redirect gate
    │   ├── dashboard.tsx    # product CRUD + modal orchestration (largest component)
    │   ├── purchasesModal.tsx  # per-product purchases + payments UI
    │   ├── productImage.tsx # renders a product image via a signed URL
    │   ├── confirmModal.tsx # destructive-action confirm dialog (built on modal.tsx)
    │   ├── modal.tsx        # shared dialog shell: role=dialog, Escape, focus trap, scroll lock
    │   └── Welcome.astro    # Astro starter leftover, not routed/imported anywhere
    ├── context/
    │   └── authContext.tsx  # AuthProvider + useAuth() (Supabase session)
    ├── hooks/               # data-access hooks (browser → supabase-js)
    │   ├── useProducts.ts          # products CRUD (+ exports a supabase client)
    │   ├── useProductImages.ts     # storage upload/rename/delete/signed-url
    │   ├── useClientPurchases.ts   # purchases CRUD + cache merge
    │   └── usePurchasePayments.ts  # payments CRUD + parent re-read
    ├── helpers/
    │   └── currency.ts      # formatCurrency() — es-CO, no decimals
    ├── lib/
    │   └── supabase.ts      # canonical supabase client (env-guarded)
    ├── styles/
    │   ├── theme.css        # design tokens + globals + shared form primitives
    │   ├── dashboard.css    # dashboard layout + interaction states
    │   └── loginModal.css   # login layout only (tokens come from theme.css)
    └── assets/
        ├── astro.svg        # only referenced by the unused Welcome.astro
        └── background.svg   # only referenced by the unused Welcome.astro
```

## 7. Routes

| Route | File | Rendering | Renders |
| :-- | :-- | :-- | :-- |
| `/` | `src/pages/index.astro` | static shell + `client:load` island | `LoginModal` (sign-in form). |
| `/dashboard` | `src/pages/dashboard.astro` | static shell + `client:only="react"` island | `DashboardApp`. |

Both pages are wrapped in `Layout.astro`, which sets `<title>`, viewport, favicons
and the shared background color token. The Astro dev toolbar is disabled in
`astro.config.mjs`.

Because there is no `src/middleware.ts`, **there is no server-side route
protection** — `/dashboard` returns the same static shell to everyone. Access
control is enforced client-side by `AuthGuard` *and*, more importantly, by Supabase
**Row Level Security** on the actual data (see [§8](#8-architecture)).

## 8. Architecture

**Astro provides the shell, React provides the app.** Astro ships static HTML plus
small JS islands; everything interactive (auth, CRUD, modals) is React running in
the browser and talking *directly* to Supabase with the anon key.

```
Browser
  │
  ├─ "/" ─────────────► LoginModal (React)
  │                        └─ supabase.auth.signInWithPassword()
  │                              └─ success → window.location = "/dashboard"
  │
  └─ "/dashboard" ───► DashboardApp (React, client-only)
                         AuthProvider (src/context/authContext.tsx)
                           │  • restores session via getSession()
                           │  • subscribes to onAuthStateChange()
                           └─ AuthGuard
                                │  • loading → "Verificando sesión..."
                                │  • no user → redirect to "/"
                                └─ Dashboard (src/components/dashboard.tsx)
                                     ├─ useProducts()          → table `products`
                                     ├─ useProductImages()     → bucket `products-images`
                                     ├─ useClientPurchases()   → table `clients_purchases`
                                     └─ PurchasesModal
                                          └─ usePurchasePayments() → table `purchases_payments`
```

Key characteristics:

- **Supabase client.** The canonical instance lives in `src/lib/supabase.ts`.
  `src/hooks/useProducts.ts` *also* creates its own client and re-exports it as
  `supabase`, and `src/context/authContext.tsx` imports its client from
  `../hooks/useProducts` (not from `lib/`). These are separate `GoTrueClient`
  instances pointing at the same project (see [§14](#14-known-issues--tech-debt)).
- **Hook-per-table.** Each table has one hook that owns fetching, caching in React
  state, and the create/update/delete calls, returning `{ data, error }` rather
  than throwing.
- **Derived totals live in the database.** `clients_purchases.amount_paid_so_far`
  and `is_fully_paid` are maintained by a **Postgres trigger** on
  `purchases_payments`. After every payment mutation the client re-reads the parent
  purchase and merges it into cache via `applyPurchaseUpdate` — the client never
  sets those two columns itself.
- **Images are private.** The `products-images` bucket is private, so reads go
  through `createSignedUrl()` (async, expiring, 1 h) rather than `getPublicUrl()`.
  `ProductImage` owns fetching/caching that URL, and `dashboard.tsx` bumps an
  `imageVersion` counter after any upload/rename/delete to defeat browser caching.

## 9. Data model

> There are **no SQL migrations or generated Supabase types in this repo**. The
> schema below is reconstructed from the TypeScript interfaces in the hooks, the
> `select('*')`/`insert` calls, and the code comments. The database itself is the
> source of truth.

### Table `products`

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | int PK | auto-increment; list sorted `id desc`. |
| `created_at` | timestamptz | set by DB. |
| `updated_at` | timestamptz \| null | set by the client on update. |
| `name` | text \| null | used to derive the image storage path. |
| `description` | text \| null | |
| `value` | int \| null | whole pesos (comment says `smallint`). |
| `release_date` | date \| null | |

Type: `Product` in `src/hooks/useProducts.ts`.

### Table `clients_purchases`

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | int PK | |
| `created_at` | timestamptz | set by DB. |
| `updated_at` | timestamptz \| null | client-set on update. |
| `client_name` | text \| null | |
| `client_phone_number` | text \| null | |
| `is_fully_paid` | boolean \| null | **DB-maintained** (trigger). |
| `agreed_fees` | int \| null | total the client agreed to pay. |
| `amount_paid_so_far` | int \| null | **DB-maintained** (trigger). |
| `product_id` | int \| null | FK → `products.id`. |

Type: `ClientPurchase` in `src/hooks/useClientPurchases.ts`. On insert the client
seeds `amount_paid_so_far: 0` and `is_fully_paid: false`; afterwards those two are
**never** written by the client (they are excluded from the update input type).

### Table `purchases_payments`

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | int PK | |
| `created_at` | timestamptz | set by DB. |
| `updated_at` | timestamptz \| null | client-set on update. |
| `client_purchase_id` | int \| null | FK → `clients_purchases.id`. |
| `amount` | int \| null | whole pesos. |
| `is_extra_fee` | boolean \| null | shown as "(extra)" in the UI. |

Type: `PurchasePayment` in `src/hooks/usePurchasePayments.ts`.

### Trigger (assumed)

Changing a `purchases_payments` row recomputes the parent
`clients_purchases.amount_paid_so_far` and `is_fully_paid`. Deleting a
`clients_purchases` row cascades to its payments via the FK, so the library never
deletes payments manually when a purchase is removed.

### Storage bucket `products-images`

- **Private** bucket. File path **is the identity**: `` `${sanitized-name}-${productId}` ``
  (see `getProductImagePath`). `sanitizeSegment` strips accents to ASCII, replaces
  non-alphanumeric runs with `-`, trims dashes and lowercases.
- Upload uses `upsert: true`, so re-uploading replaces the image in place.
- Renaming a product moves the file (`storage.move`) to the new path; a
  "not found" error is swallowed because a never-uploaded image is not a failure.
- Deletes use `storage.remove`.
- Read access is via `createSignedUrl(path, 3600)` (1-hour signed URLs).

## 10. Code reference

### 10.1 Hooks (data access)

All hooks live in `src/hooks/`, run in the browser, and each returns `{ data, error }`
(or `{ error }`) instead of throwing, while also keeping an `error` string in state
for the UI to render.

#### `useProducts()` — `src/hooks/useProducts.ts`

Exports the `Product` type, `CreateProductInput`, `UpdateProductInput`, **and a
`supabase` client**.

| Returns | Description |
| :-- | :-- |
| `products` | `Product[]`, sorted `id desc`. |
| `loading` | `true` during the initial fetch. |
| `error` | Last error message, or `null`. |
| `fetchProducts()` | Re-fetch the full list. Wired to the dashboard refresh button. |
| `addProduct(input)` | `insert` + `.select().single()`; prepends to state. |
| `updateProduct(id, updates)` | Stamps `updated_at`, replaces the row in state. |
| `deleteProduct(id)` | Deletes by id, removes from state. |

#### `useProductImages()` — `src/hooks/useProductImages.ts`

Storage-only hook for the `products-images` bucket. Also exports the standalone
helpers `getProductImagePath(product)` and `getProductImageSignedUrl(product, expiresIn = 3600)`.

| Returns | Description |
| :-- | :-- |
| `uploadProductImage(product, file)` | Upserts to the derived path, returns `{ path, url, error }`. |
| `renameProductImage(oldProduct, newProduct)` | Moves the stored file when the name changes; no-op if the path is unchanged; swallows "not found". |
| `deleteProductImage(product)` | Removes the stored file. |
| `getSignedUrl` | = `getProductImageSignedUrl`. |
| `getPath` | = `getProductImagePath`. |

#### `useClientPurchases()` — `src/hooks/useClientPurchases.ts`

Exports `ClientPurchase`, `CreateClientPurchaseInput`, `UpdateClientPurchaseInput`.
Purchases are cached **keyed by `product_id`** as `purchasesByProduct`.

| Returns | Description |
| :-- | :-- |
| `fetchPurchasesForProducts(ids)` | One `.in('product_id', ids)` query, re-buckets rows per product. |
| `addPurchase(input)` | Inserts with `amount_paid_so_far: 0`, `is_fully_paid: false`. |
| `updatePurchase(purchase, updates)` | Updates client/fee fields only (never the derived totals). |
| `deletePurchase(purchase)` | Deletes; payments cascade via FK. |
| `applyPurchaseUpdate(purchase)` | Merge/replace one purchase in cache — used after payment mutations refresh the trigger-maintained totals. |

#### `usePurchasePayments()` — `src/hooks/usePurchasePayments.ts`

Exports `PurchasePayment`, `CreatePurchasePaymentInput`, `UpdatePurchasePaymentInput`.
Payments are cached keyed by `client_purchase_id` as `paymentsByPurchase`.

| Returns | Description |
| :-- | :-- |
| `fetchPaymentsForPurchase(purchaseId)` | `.eq('client_purchase_id', id)`, newest first. |
| `addPayment(input)` | Inserts, caches, and returns `updatedPurchase` (re-read parent). |
| `updatePayment(payment, updates)` | Same shape; **not currently used by any component**. |
| `deletePayment(payment)` | Deletes, caches, returns `updatedPurchase`. |

The three mutations each re-read the parent purchase (`fetchParentPurchase`) so the
caller can sync the trigger-updated totals.

#### `AuthProvider` / `useAuth()` — `src/context/authContext.tsx`

React context exposing `{ session, user, loading, signOut }`. On mount it restores
the session with `getSession()`, then keeps it fresh via `onAuthStateChange()`.
`signOut()` calls `supabase.auth.signOut()` then hard-redirects to `/`.

### 10.2 Components

| Component | File | Responsibility |
| :-- | :-- | :-- |
| `LoginModal` | `loginModal.tsx` | Email/password form calling `supabase.auth.signInWithPassword()`; shows the error in a `role="alert"` region on failure; on success redirects to `/dashboard`. Renders the Monster High logo, a `h1` wordmark ("Gestión de cupos") and labelled, correctly-typed fields (`type="email"`, `autoComplete="username"`, `spellCheck={false}`). Submits through the brand-gradient `.submitBtn` with an inline `.spinner` while pending. Loaded with `client:load`. |
| `DashboardApp` | `dashboardApp.tsx` | Thin composition: `<AuthProvider><AuthGuard><Dashboard/></AuthGuard></AuthProvider>`. Loaded with `client:only="react"`. |
| `AuthGuard` | `authGuard.tsx` | Reads `{ user, loading }` from `useAuth()`. Shows an `aria-live="polite"` spinner + "Verificando sesión…" while loading, redirects to `/` when there is no user, otherwise renders children. |
| `Dashboard` | `dashboard.tsx` | The main screen. Top bar (logo, `user.email`, "Cerrar sesión"), product grid with refresh + "Nuevo producto", a modal product form (name / description / value / release date / image with live preview) rendered through `Modal`, and it orchestrates `ConfirmModal` for deletions and `PurchasesModal` for purchases. Renames the stored image when a product's name changes and bumps `imageVersion` after any image change to defeat browser caching. Loading/empty/error states are explicit; empty state offers the primary action. |
| `PurchasesModal` | `purchasesModal.tsx` | Everything about one product's clients: list with a paid/agreed progress bar and a "Pagado"/"Pendiente" badge, create/edit purchase form, and an expandable payments section (add payment with optional "Cargo extra", delete payment). Purchase **and** payment deletion are confirmed through `ConfirmModal`. Uses `usePurchasePayments` and pushes trigger-refreshed totals back up via `applyPurchaseUpdate`. |
| `ProductImage` | `productImage.tsx` | Fetches a signed URL for a product and renders `<img>` with explicit `width`/`height` (avoids layout shift) plus `loading="lazy"`; renders nothing while loading and calls `onMissing` when there is no image. Re-fetches only when `product.id`, `product.name` or `imageVersion` change. |
| `Modal` | `modal.tsx` | The shared dialog shell. `role="dialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby`, Escape to close, backdrop click to close, focus moved in on open and restored to the trigger on close, Tab trapped (only the topmost dialog reacts, so nested confirms work), and a background scroll lock. |
| `ConfirmModal` | `confirmModal.tsx` | Destructive-action confirmation built on `Modal` (`title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`). Cancel is rendered first so the safe choice sits under the thumb, and the consequence sentence is wired up via `aria-describedby`. |
| `Welcome` | `Welcome.astro` | **Unused.** Astro starter-kit landing page; not imported by any route. Its only `<style>` block is scoped to itself. |

### 10.3 Helpers

- **`formatCurrency(value)` — `src/helpers/currency.ts`.** Formats whole-peso
  amounts the Colombian way (`.` thousands separator, no decimals) using
  `Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })`. `null`/`undefined`
  render as `"0"`. Example: `formatCurrency(180000) === "180.000"`.

### 10.4 Styling

| File | Purpose |
| :-- | :-- |
| `src/styles/theme.css` | **Single source of truth** for the design system: color, type scale, spacing, elevation and motion tokens, plus global primitives (`box-sizing`, `body` typography, `:focus-visible`, `.skipLink`, `.spinner`, `prefers-reduced-motion`) and the **shared form primitives** (`.fieldGroup`, `.label`, `.input`, `.textarea`, `.fieldHint`, `.errorMessage`). Imported once by `Layout.astro`. Token rationale lives in `DESIGN.md`. |
| `src/styles/dashboard.css` | Dashboard **layout** + dashboard-only classes: `pageContainer`, `topBar`, `modalOverlay`, `formCard`, `btnNew`/`btnPrimary`/`btnSecondary`/`btnDanger`/`btnEdit`/`btnDelete`/`btnGhost`/`btnClose`, `statusMessage`, `emptyState*`, `imagePreview*`, `payments*`. Ends with a single "Interaction states" block (hover/active/focus) so states are not scattered per component. Imported by `dashboard.astro`. |
| `src/styles/loginModal.css` | Login screen layout only: `authShell`, `authHero`, `authLogo`, `authEyebrow`, `authWordmark`, `authCard`, `authHeader`, `authTitle`, `authSubtitle`, `authForm`, `submitBtn`. It defines **no palette of its own** — colors and type come from `theme.css`. Imported by `index.astro`. |

There is no CSS framework and no `@apply`/utility layer — components reference the
shared class names above. Tokens live in `theme.css`; page stylesheets own layout.

## 11. Build & deployment

```sh
npm run build      # → dist/  (verified: 2 static pages, ~1.2 s)
npm run preview    # preview the built output
```

The target is a **Vercel static deployment**: static files on the CDN, no functions,
no server. A build at the last documented commit produced `.vercel/output/` using the
**Build Output API v3**:

| Path | Contents |
| :-- | :-- |
| `.vercel/output/static/` | `index.html`, `dashboard/index.html`, `favicon.*`, both logos, the stray PDF, and hashed `_astro/*` CSS/JS bundles. |
| `.vercel/output/config.json` | `handle: filesystem` → immutable `cache-control` for `/_astro/*` → a `404` fallback. No route targets a function. |
| `.vercel/output/functions/` | **Does not exist.** This is the proof that no Serverless/Edge function is created. |
| `.vercel/output/server/` | Empty directory emitted by the adapter; nothing is shipped from it. |

`@astrojs/vercel` is configured but **unnecessary for static output** — a plain
`astro build` would deploy identically. It is kept so that adding SSR later does not
require re-plumbing, and it is the thing that makes `.vercel/output` (not `dist/`) the
artifact Vercel consumes. `.vercel/` is git-ignored; see
[§14](#14-known-issues--tech-debt) for the `dist/`/`.astro/` churn.

### What keeps it static

All of the following are true today. Any one of them breaking turns the deploy into
something that consumes compute:

- `output` is unset, so Astro's default `'static'` applies.
- Both routes are static; all interactivity is inside `client:*` islands, so nothing
  is rendered at request time.
- No `src/middleware.ts`, no `src/pages/api/*`, no `prerender = false`, no Server
  Actions.
- No `astro:assets` usage, so the adapter adds no image-optimization route.
- The build never calls Supabase (the app is a client-side SPA), so it is
  deterministic and can run offline.

### Deploying

No `vercel.json` is needed: Vercel's Astro preset runs `npm run build` and reads
`.vercel/output`. `engines.node` is `>=22.12.0`, satisfied by Vercel's Node 22 image
(local: v22.20.0). Checklist for a deploy:

- [ ] `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_KEY` set on the Vercel project for
      **Production and Preview**. `PUBLIC_*` values are inlined at build time, so
      they cannot be added after a build.
- [ ] `npm run build` green, and `.vercel/output/functions/` still absent.
- [ ] **RLS verified** on all three tables and the storage bucket — a static SPA has
      no server to enforce authorization ([§14](#14-known-issues--tech-debt)).

## 12. Developer & AI tooling

The repo carries configuration for several AI coding assistants, all committed in
`b698b2b "created set up files for external AI tools"`:

| Path | What it is |
| :-- | :-- |
| `AGENTS.md` | Contributing/agent guidance: project reference, the non-negotiable **shipping constraint** (static-only frame, see above), design system, dev server in background mode, screenshot workflow, Astro doc links. `CLAUDE.md` is a **symlink** to it. |
| `DESIGN.md` | The design contract for this repo: tokens, type scale, component stylings, states, layout, do's/don'ts and a pre-flight checklist. |
| `.agents/skills/` | Vendored agent skills — Supabase (`supabase`, `supabase-postgres-best-practices`) plus design (`web-design-guidelines` from `vercel-labs/agent-skills`, `redesign-existing-projects` from `Leonxlnx/taste-skill`), mirrored under `.claude/skills/`. |
| `skills-lock.json` | Lockfile for the above (sources + content hashes; see §14 for the two entries without a hash). |
| `.cursor/rules/codegraph.mdc` | Cursor rule describing when/how to use the CodeGraph MCP tools (`alwaysApply: true`). |
| `.codegraph/` | CodeGraph index for this repo (`config.json` + `.gitignore` are committed). |
| `.vscode/extensions.json` | Recommends `saoudrizwan.claude-dev` (Cline). |
| `.claude/`, `.agents/` | Skill files consumed by Claude-based agents. |

### Design tooling

Of the five resources in the shared "Claude Code plugins" set, three were adopted for
the design-system pass and two were deliberately not:

| Resource | Status |
| :-- | :-- |
| Taste Skill → `redesign-skill` | ✅ Vendored as `.agents/skills/redesign-existing-projects`. Supplied the audit-first protocol: scan → diagnose → fix, in a fixed priority order. |
| Vercel Web Design Guidelines | ✅ Vendored as `.agents/skills/web-design-guidelines`. It fetches the canonical rule list at review time and reports findings as `file:line`. |
| Awesome DESIGN.md | ✅ Adopted as a *convention*: `DESIGN.md` (how it should look) sits alongside `AGENTS.md` (how to build). |
| Playwright CLI | ➖ Not installed. Chrome is already present, so UI work is verified with headless screenshots instead (see `AGENTS.md`). |
| Image to Code | ➖ Not used. It requires generating design images first; there are no mockups for this app and no image-generation tool in this environment. |

The pass followed the redesign skill's priority order: font swap → color cleanup →
hover/active states → layout & spacing → loading/empty/error states → typography
polish.

### CodeGraph MCP

A CodeGraph MCP server (`codegraph_*` tools) is configured to give agents a
tree-sitter knowledge graph of the TypeScript code. Because CodeGraph only parses
**code** files, `.astro`, `.css` and `.svg` are **not** in the index — searches for
those still need normal text search.

The server is registered per-assistant, for example in Cline at
`~/.cline/data/settings/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "codegraph": {
      "command": "codegraph",
      "args": ["serve", "--mcp", "--path", "/home/eland/Documents/projects/cupos-sitio-web"],
      "type": "stdio",
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

To (re)build the index for this repo:

```sh
codegraph init -i        # parse + index, writes .codegraph/
codegraph serve --mcp --path "$PWD"
```

## 13. Current status & validation

| Check | Result |
| :-- | :-- |
| `npm run build` | ✅ passes — 2 static pages (`/index.html`, `/dashboard/index.html`), ~1 s. |
| Dev server | `npm run dev` → `http://localhost:4321` (or `astro dev --background`). |
| Types | No `astro check`/`tsc` script; strict mode is on but not wired into CI. |
| Tests | ❌ none. |
| Lint / format | ❌ no ESLint/Prettier config. |
| CodeGraph index | ✅ built (`.codegraph/`), MCP handshake verified. |
| Visual check | ✅ Screenshots taken with headless Chrome at 320 / 390 / 768 / 1280 px. Login verified directly; the dashboard's CSS was verified with a throwaway static harness (it needs Supabase credentials to render authed). Command in `AGENTS.md`. |
| Design system | Tokens in `src/styles/theme.css`, contract in `DESIGN.md`. |

## 14. Known issues & tech debt

Ordered roughly by how much they matter:

1. **`.env` is tracked by git** and holds `PUBLIC_SUPABASE_URL` +
   `PUBLIC_SUPABASE_KEY` — a *publishable* key, not a `service_role`/secret key
   (verified: no secret key anywhere in the repo). Since `PUBLIC_*` values are
   inlined into the client bundle regardless, this is not a leak; but it means
   **RLS is the only thing protecting the data**, and that the Vercel build
   currently only works *by accident*, because the file is committed. Untrack it and
   set the values on the Vercel project instead.
   A *missing* env var then fails silently: `src/lib/supabase.ts` throws, but
   `useProducts.ts` builds a client with `undefined` and the UI just breaks at
   runtime with a confusing error. Every env var needs a loud guard.
2. **Two Supabase client instances.**
   `src/lib/supabase.ts` creates the canonical client, but
   `src/hooks/useProducts.ts` creates another and re-exports it, and
   `src/context/authContext.tsx` imports *that* one from `../hooks/useProducts`.
   Multiple `GoTrueClient`s on the same storage key can produce
   "Multiple GoTrueClient instances" warnings and split session state.
   Consolidate everything onto `src/lib/supabase.ts`.
3. **Generated artifacts are not ignored.** `.gitignore` only lists `.vercel` and
   `node_modules`. `.astro/` is *tracked* and rewritten by every dev/build run
   (churn), and `dist/` is untracked. Suggested:
   ```sh
   git rm -r --cached .astro dist
   printf '.astro/\ndist/\n' >> .gitignore
   ```
4. **Auth is client-side only.** No `src/middleware.ts`, so the `/dashboard` HTML
   shell is publicly served and the redirect happens in the browser. The real
   security boundary is **Row Level Security** — make sure RLS is enabled and
   correct on `products`, `clients_purchases` and `purchases_payments` (and on the
   `products-images` bucket).
5. **Stale `localStorage` write on login.** `loginModal.tsx` does
   `localStorage.setItem('userData', JSON.stringify(data))`, but nothing reads it —
   the app relies on the Supabase session instead. Remove it (or use it), to avoid
   duplicating session data in `localStorage`.
6. **Payment edit is unreachable.** `usePurchasePayments().updatePayment` exists but
   no UI calls it; payments can only be added or deleted.
7. **Delete confirmation is consistent for data, not for images.** Purchases and
   payments now go through `ConfirmModal` (like products). The image-remove button
   in the product modal still deletes immediately — the image is re-uploadable, so
   this is low-severity, but an undo would be better.
8. **Dead code:** `src/components/Welcome.astro`, `src/assets/astro.svg`,
   `src/assets/background.svg` (starters) and `public/arroyo_heydi_-_mileage.pdf`
   are unused. (The leftover `console.log` in `authGuard.tsx` has been removed.)
9. **Errors often not surfaced.** Each hook stores an `error` string, but the UI
   mostly only renders `useProducts().error`; failures from images, purchases or
   payments are silent.
10. **No quality gates.** No tests, no linter/formatter, and no `astro check` script;
    strict TypeScript is on but `catch (err: any)` weakens it in the hooks.
11. **Housekeeping:** `package.json` still says `"name": "smoggy-shell"` with no
    `description`/`license`.
12. **Vendored design skills have no pinned hash.** `web-design-guidelines` and
    `redesign-existing-projects` were added to `skills-lock.json` with their source
    and skill path but **without** a `computedHash` — the algorithm behind the
    Supabase entries isn't reproducible from the file contents (it is not a plain
    `sha256` of `SKILL.md`), and inventing a value would be worse than omitting it.
    A skills CLI may therefore treat them as unpinned.
13. **The display font is remote.** `Layout.astro` loads Outfit from Google Fonts,
    which adds a third-party request and network dependency for the intended look;
    the system fallback stack is what renders offline.
14. **Two colour sources remain possible.** `loginModal.css` no longer defines its own
    palette, but nothing *enforces* that — a future edit could reintroduce local
    tokens. Worth a lint rule if the CSS grows.
15. **The 404 route points at a file that does not exist.** The adapter writes
    `{"src":"^/.*$","dest":"/404.html","status":404}` into `.vercel/output/config.json`,
    but there is no `src/pages/404.astro`, so no `/404.html` is emitted and unknown
    URLs land on Vercel's generic error page. One small file makes it intentional.
16. **`allowScripts` in `package.json` is inert here.** npm 10.9.3 (installed locally
    and bundled with Vercel's Node 22 image) does not read that field, so it is
    ignored on both sides; it does not affect the deploy either way.

## 15. Git history

| Commit | Subject |
| :-- | :-- |
| `dbcd8e2` | initalized Astro project *(sic)* |
| `fbd15ff` | created login module and started building dashboard page with Auth guard and Auth context to handle session |
| `2e0b0c6` | feat: add hooks for managing client purchases, product images, and purchase payments |
| `3e20ddc` | feat: add confirmation modal for product deletion |
| `7b72590` | feat: implement product image component and currency formatting helper |
| `d5f3cb0` | chore: stop tracking node_modules |
| `b698b2b` | created set up files for external AI tools *(HEAD, `master`)* |

So the app was built in this order: **Astro scaffold → auth + login → data hooks →
UI polish (confirm modal, images, currency) → repo hygiene (`node_modules`) → AI
tooling.** The domain model (products → purchases → payments) and the storage layer
have existed since `2e0b0c6`.

## 16. Suggested next steps

Roughly in priority order:

1. **Security pass:** untrack `.env`; enable/verify **RLS** on all three tables and
   the storage bucket; decide whether `/dashboard` needs server-side protection
   (middleware) instead of a client redirect.
2. **Consolidate the Supabase client** onto `src/lib/supabase.ts` and delete the
   duplicate export from `useProducts.ts` / the odd import in `authContext.tsx`.
3. **Stop artifact churn:** ignore `.astro/` and `dist/`, and untrack `.astro/`.
4. **Quality gates:** add `astro check` (e.g. an `npm run check` script), plus
   ESLint + Prettier, and a first test setup (`vitest` fits Astro/React well) —
   the pure `formatCurrency` and `getProductImagePath` helpers are easy wins.
5. **UX consistency:** ✅ purchase/payment deletion now confirms through
   `ConfirmModal`. Still open: surface hook `error` values beyond
   `useProducts().error`, and wire up (or delete) `updatePayment`.
6. **Cleanup:** ✅ the debug `console.log` is gone. Still open: delete
   `Welcome.astro` / starter assets / the stray PDF, drop the
   `localStorage` write in `loginModal.tsx`, and fix `package.json` metadata.
7. **Extend the docs:** record the actual Supabase schema (SQL migrations) and add a
   screenshot/GIF of the dashboard so this file stays the single source of truth.
8. **Design-system follow-through:** the login screen and the dashboard now share
   tokens, but their field markup is still written twice. Consider extracting the
   remaining duplicated form markup the same way `Modal` was extracted.
9. **Production readiness:** add `src/pages/404.astro` (§14.15), add loud guards for
   every env var the code reads (§14.1), and set the Supabase vars on the Vercel
   project before the first deploy — then run the [§11](#11-build--deployment)
   checklist.

---

*Generated by documenting the codebase at commit `b698b2b`, then extended with the
design-system pass (see `DESIGN.md`). If you change the architecture, update §6–§10
and bump the "Last documented" line at the top.*

