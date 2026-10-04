# Cupos Sitio Web — Project Documentation

> **Status:** work in progress · **Last documented:** 2026-10-03 · **Covers commit:** `b698b2b`
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
| Styling | **Plain CSS** | Hand-written CSS files + CSS custom properties (no Tailwind). |
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
    │   ├── confirmModal.tsx # generic confirm dialog
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
    │   ├── theme.css        # design tokens (colors, radii, shadows)
    │   ├── dashboard.css    # dashboard + shared modal/card classes
    │   └── loginModal.css   # login screen styles
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
| `LoginModal` | `loginModal.tsx` | Email/password form calling `supabase.auth.signInWithPassword()`; shows the error message on failure; on success redirects to `/dashboard`. Renders the Monster High logo + "Gestión de cupos" header. Loaded with `client:load`. |
| `DashboardApp` | `dashboardApp.tsx` | Thin composition: `<AuthProvider><AuthGuard><Dashboard/></AuthGuard></AuthProvider>`. Loaded with `client:only="react"`. |
| `AuthGuard` | `authGuard.tsx` | Reads `{ user, loading }` from `useAuth()`. Shows "Verificando sesión..." while loading, redirects to `/` when there is no user, otherwise renders children. Contains a leftover `console.log`. |
| `Dashboard` | `dashboard.tsx` | The main screen. Top bar (logo, `user.email`, "Cerrar sesión"), product grid with refresh + "Nuevo producto", a modal product form (name / description / value / release date / image with live preview), and it orchestrates `ConfirmModal` for deletions and `PurchasesModal` for purchases. Renames the stored image when a product's name changes and bumps `imageVersion` after any image change to defeat browser caching. |
| `PurchasesModal` | `purchasesModal.tsx` | Everything about one product's clients: list with a paid/agreed progress bar and a "Pagado"/"Pendiente" badge, create/edit purchase form, and an expandable payments section (add payment with optional "Cargo extra", delete payment). Uses `usePurchasePayments` and pushes trigger-refreshed totals back up via `applyPurchaseUpdate`. |
| `ProductImage` | `productImage.tsx` | Fetches a signed URL for a product and renders `<img>`; renders nothing while loading and calls `onMissing` when there is no image. Re-fetches only when `product.id`, `product.name` or `imageVersion` change. |
| `ConfirmModal` | `confirmModal.tsx` | Generic confirmation dialog (`title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`). Used for product deletion. |
| `Welcome` | `Welcome.astro` | **Unused.** Astro starter-kit landing page; not imported by any route. Its only `<style>` block is scoped to itself. |

### 10.3 Helpers

- **`formatCurrency(value)` — `src/helpers/currency.ts`.** Formats whole-peso
  amounts the Colombian way (`.` thousands separator, no decimals) using
  `Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })`. `null`/`undefined`
  render as `"0"`. Example: `formatCurrency(180000) === "180.000"`.

### 10.4 Styling

| File | Purpose |
| :-- | :-- |
| `src/styles/theme.css` | Design tokens as CSS custom properties (colors such as `--color-bone`, radii, shadows). Imported once by `Layout.astro` so every page inherits them. |
| `src/styles/dashboard.css` | Dashboard layout + the shared class names used across modals/cards: `pageContainer`, `topBar`, `modalOverlay`, `formCard`, `btnPrimary`/`btnSecondary`/`btnDanger`/`btnEdit`/`btnDelete`, `statusMessage`, `imagePreview*`, `payments*`, etc. Imported by `dashboard.astro`. |
| `src/styles/loginModal.css` | Login screen (`auth-wrapper`, `auth-card`, `form-*`, `submit-btn`). Imported by `index.astro`. |

There is no CSS framework and no `@apply`/utility layer — components reference the
shared class names above.

## 11. Build & deployment

```sh
npm run build      # → dist/  (verified working: 2 static pages, ~1.3 s)
npm run preview    # preview the built output
```

- The build uses the **`@astrojs/vercel`** adapter. As of the last documented
  commit there are no dynamic/SSR routes, so the build reports
  `output: "static"` and emits plain HTML (`/index.html` and
  `/dashboard/index.html`) into `dist/`, then copies them to
  `.vercel/output/static`.
- `.vercel/` (local project link) is git-ignored.
- **`dist/` is not currently git-ignored** — add it to `.gitignore` if you do not
  want build output showing up as untracked (see [§14](#14-known-issues--tech-debt)).
- When deploying to Vercel, set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_KEY` as
  environment variables in the Vercel project (Environment Variables → Production/
  Preview/Development). They are `PUBLIC_` values and end up in the client bundle.

## 12. Developer & AI tooling

The repo carries configuration for several AI coding assistants, all committed in
`b698b2b "created set up files for external AI tools"`:

| Path | What it is |
| :-- | :-- |
| `AGENTS.md` | Contributing/agent guidance (dev server in background mode, Astro doc links). `CLAUDE.md` is a **symlink** to it. |
| `.agents/skills/` | Vendored agent "skills" for Supabase usage — `supabase` and `supabase-postgres-best-practices`, mirrored under `.claude/skills/`. |
| `skills-lock.json` | Lockfile for the above (source `supabase/agent-skills`, with content hashes). |
| `.cursor/rules/codegraph.mdc` | Cursor rule describing when/how to use the CodeGraph MCP tools (`alwaysApply: true`). |
| `.codegraph/` | CodeGraph index for this repo (`config.json` + `.gitignore` are committed). |
| `.vscode/extensions.json` | Recommends `saoudrizwan.claude-dev` (Cline). |
| `.claude/`, `.agents/` | Skill files consumed by Claude-based agents. |

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
| `npm run build` | ✅ passes — 2 static pages (`/index.html`, `/dashboard/index.html`), ~1.3 s. |
| Dev server | `npm run dev` → `http://localhost:4321` (or `astro dev --background`). |
| Types | No `astro check`/`tsc` script; strict mode is on but not wired into CI. |
| Tests | ❌ none. |
| Lint / format | ❌ no ESLint/Prettier config. |
| CodeGraph index | ✅ built (`.codegraph/`), MCP handshake verified. |

## 14. Known issues & tech debt

Ordered roughly by how much they matter:

1. **`.env` is tracked by git.** See [§4](#4-environment-variables) — untrack it and
   confirm only the *publishable* key is present.
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
7. **Inconsistent delete confirmation.** Only product deletion uses `ConfirmModal`;
   deleting a purchase or a payment happens immediately on click.
8. **Dead code:** `src/components/Welcome.astro`, `src/assets/astro.svg`,
   `src/assets/background.svg` (starters) and `public/arroyo_heydi_-_mileage.pdf`
   are unused. A leftover `console.log` remains in `authGuard.tsx`.
9. **Errors often not surfaced.** Each hook stores an `error` string, but the UI
   mostly only renders `useProducts().error`; failures from images, purchases or
   payments are silent.
10. **No quality gates.** No tests, no linter/formatter, and no `astro check` script;
    strict TypeScript is on but `catch (err: any)` weakens it in the hooks.
11. **Housekeeping:** `package.json` still says `"name": "smoggy-shell"` with no
    `description`/`license`.

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
5. **UX consistency:** reuse `ConfirmModal` for purchase/payment deletion; surface
   hook `error` values in the UI; wire up (or delete) `updatePayment`.
6. **Cleanup:** delete `Welcome.astro` / starter assets / the stray PDF, drop the
   debug `console.log` and the `localStorage` write in `loginModal.tsx`, and fix
   `package.json` metadata.
7. **Extend the docs:** record the actual Supabase schema (SQL migrations) and add a
   screenshot/GIF of the dashboard so this file stays the single source of truth.

---

*Generated by documenting the codebase at commit `b698b2b`. If you change the
architecture, update §6–§10 and bump the "Last documented" line at the top.*

