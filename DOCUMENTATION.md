# Cupos Sitio Web — Project Documentation

> **Status:** work in progress · **Last documented:** 2026-10-10 · **Covers commit:** `f36b6a1` + the repository-layer, dashboard-sections, UXonFly design-system, reusable-primitives (`Button`, `CollapsibleCard`, `AddPurchaseModal`), motion (presence + fold hooks), product-card / product-detail-dialog passes and the `PROMPT-02` hardening pass (env guard, untracked artifacts, `404.astro`, `check`/`test` scripts) committed on top of it
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

> Quality gates are wired: `npx tsc --noEmit`, `npm run check` (`astro check`) and
> `npm test` (Vitest) all pass — see [§13](#13-current-status--validation).

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

If either is missing, `src/lib/supabase.ts` **names the missing variable** and fails
loudly in two places: it writes a readable Spanish `role="alert"` banner into `#main`
when a document exists (so a misconfigured bundle shows a sentence a human can act on
instead of a blank page), then throws at module load so the build fails too.

> [!IMPORTANT]
> **`.env` is untracked and must stay that way** (`git rm --cached .env` has been
> run; it is in `.gitignore`). The file still exists on local disk. Only the
> *publishable/anon* key belongs in it — **never the Supabase `service_role` key.**
> Because `PUBLIC_*` values are inlined at **build time**, `PUBLIC_SUPABASE_URL` and
> `PUBLIC_SUPABASE_KEY` must be set on the **Vercel project** (Production *and*
> Preview) **before the first deploy**, or the build fails with the guard message
> above. `.env.template` lists the two names with no values.

## 5. Getting started

```sh
npm install          # install dependencies
npm run dev          # Astro dev server at http://localhost:4321
npm run build        # production build into ./dist (+ .vercel/output)
npm run preview      # serve the built output locally
npm run check        # astro check (type/diagnostic gate)
npm test             # vitest run (unit tests)
npm run test:watch   # vitest in watch mode
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

A clean `npm run build` currently succeeds and emits three static pages
(`/index.html`, `/dashboard/index.html` and `404.html`).

Unit tests live next to the code as `src/**/*.test.ts` and run with `npm test`;
`vitest.config.ts` at the repo root sets the `node` environment and the include glob.

## 6. Project structure

```text
cupos-sitio-web/
├── astro.config.mjs        # React integration + Vercel adapter + devToolbar disabled
├── tsconfig.json           # extends astro/tsconfigs/strict, jsx: react-jsx
├── .env                    # PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_KEY (⚠ tracked)
├── .env.template           # names of the two PUBLIC_SUPABASE_* vars, no values
├── vitest.config.ts         # Vitest config: node env, src/**/*.test.ts
├── AGENTS.md               # agent/contributor instructions (CLAUDE.md symlinks to it)
├── DESIGN.md               # design system: tokens, components, states, a11y (see §10.5)
├── prompts/                # prompt chain: PROMPT-NN-NAME.md (01 = baseline, 02 = known issues)
├── kill-criteria.md        # blank business-facing scaffold, to be filled in
├── .cline/.clinerules      # short Cline rules that defer to AGENTS.md
├── public/                 # served as-is at the site root
│   ├── monster-high-logo.png        # used by loginModal.tsx
│   ├── monster-high-logo-color.png  # used by dashboard.tsx
│   ├── favicon.ico / favicon.svg
└── src/
    ├── pages/              # routes (Astro)
    │   ├── index.astro         # "/"          → LoginModal
    │   ├── dashboard.astro     # "/dashboard" → DashboardApp
    │   └── 404.astro           # unknown URLs → static "No encontramos esta página"
    ├── layouts/
    │   └── Layout.astro     # <html> shell, imports theme.css
    ├── components/          # React islands (all default exports)
    │   ├── loginModal.tsx   # email/password sign-in form
    │   ├── dashboardApp.tsx # composes AuthProvider → AuthGuard → Dashboard
    │   ├── authGuard.tsx    # client-side redirect gate
    │   ├── dashboard.tsx    # top bar + both collapsible sections + product CRUD/modals
    │   ├── productDetailModal.tsx # what tapping a product card opens: read view + Compras/Editar/Eliminar
    │   ├── button.tsx       # general button: variant/size/icon/loading over theme.css classes
    │   ├── collapsibleCard.tsx # general foldable card (controlled or uncontrolled)
    │   ├── collapsibleSection.tsx # page-level disclosure: heading button + kept-mounted panel
    │   ├── salesSection.tsx # read-only "Mis ventas": every purchase, product joined
    │   ├── purchasesModal.tsx  # per-product purchases (collapsible cards) + payments UI
    │   ├── addPurchaseModal.tsx # add/edit a purchase — wired to useClientPurchases
    │   ├── emptyState.tsx   # illustration + heading + body + one CTA
    │   ├── productImage.tsx # renders a product image via a signed URL
    │   ├── confirmModal.tsx # destructive-action confirm dialog (built on modal.tsx)
    │   └── modal.tsx        # shared dialog shell: role=dialog, Escape, focus trap, scroll lock
    ├── context/
    │   └── authContext.tsx  # AuthProvider + useAuth() (Supabase session)
    ├── repositories/        # the ONLY layer that talks to Supabase (see §10.1)
    │   ├── types.ts                    # RepoResult<T> contract + repoSuccess/repoFailure/nowIso
    │   ├── productsRepository.ts       # table `products` (+ the `Product` type)
    │   ├── clientsPurchasesRepository.ts  # table `clients_purchases` (+ product embed)
    │   ├── purchasesPaymentsRepository.ts # table `purchases_payments`
    │   ├── productImagesRepository.ts  # bucket `products-images`: paths, upload, signed URL
    │   └── authRepository.ts           # supabase.auth (session, sign-in, sign-out)
    ├── hooks/               # thin React state over the repositories
    │   ├── useProducts.ts          # products CRUD
    │   ├── useProductImages.ts     # storage upload/rename/delete/signed-url
    │   ├── useClientPurchases.ts   # purchases CRUD + per-product & all-sales caches
    │   ├── usePurchasePayments.ts  # payments CRUD + parent re-read
    │   ├── usePresent.ts           # presence window: holds a surface mounted through its exit
    │   └── useCollapsiblePanel.ts  # WAAPI fold for disclosure panels (rests `hidden`)
    ├── helpers/
    │   ├── currency.ts      # formatCurrency() — es-CO, no decimals
    │   └── date.ts          # formatDate() — short es-CO label, local-midnight safe
    ├── lib/
    │   └── supabase.ts      # canonical supabase client (env-guarded)
    ├── styles/
    │   ├── theme.css        # design tokens + globals + shared components
    │   ├── dashboard.css    # dashboard layout + interaction states
    │   └── loginModal.css   # login layout only (tokens come from theme.css)
    └── **/*.test.ts         # colocated Vitest unit tests (helpers + repositories)
```

## 7. Routes

| Route | File | Rendering | Renders |
| :-- | :-- | :-- | :-- |
| `/` | `src/pages/index.astro` | static shell + `client:load` island | `LoginModal` (sign-in form). |
| `/dashboard` | `src/pages/dashboard.astro` | static shell + `client:only="react"` island | `DashboardApp`. |
| `404` (any unknown path) | `src/pages/404.astro` | static, no island | A short Spanish "not found" card reusing the `.emptyState` primitive, with one link back to `/`. Vercel's `config.json` routes unmatched paths here with `status: 404`. |

Both pages are wrapped in `Layout.astro`, which sets `<title>`, viewport, favicons
and the shared background color token. Each route supplies its own title —
`Iniciar sesión · Gestión de cupos` for `/`, `Panel de gestión · Cupos` for
`/dashboard`. The Astro dev toolbar is disabled in `astro.config.mjs`.

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
                                     ├─ CollapsibleSection "Mis productos" → product grid
                                     ├─ CollapsibleSection "Mis ventas"    → SalesSection
                                     │    (read-only rows built from `allPurchases`)
                                     └─ PurchasesModal
                                          └─ usePurchasePayments() → table `purchases_payments`

  every hook above ──► src/repositories/*Repository (RepoResult<T>) ──► supabase-js
```

Key characteristics:

- **One door to Supabase.** `src/lib/supabase.ts` creates the *only* client
  instance, and the only files that import it are the ones in
  `src/repositories/` — no hook, context or component builds a client of its own.
  (This replaced an earlier setup where `useProducts.ts` created a second
  `GoTrueClient` and `authContext.tsx` imported it from there.)
- **Repository per table, hook per cache.** Each table (plus the storage bucket
  and `supabase.auth`) has one repository in `src/repositories/` that owns the
  Supabase calls and answers with a `RepoResult<T>` — it never throws. Above it
  sits one hook in `src/hooks/` that owns the React state (local merges after a
  write) plus the `loading`/`error` flags.
- **Two shapes of the same purchases.** `useClientPurchases` holds both
  `purchasesByProduct` (per-product, for the Compras modal) and `allPurchases`
  (every purchase with its product embedded, for "Mis ventas"), the latter read
  with `clientsPurchasesRepository.findManyWithProduct()`.
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

### 10.1 Repositories (data access) — `src/repositories/`

`src/repositories/` is the **only** layer that talks to Supabase, and every
function in it resolves to a `RepoResult<T>` and **never throws**:

| Shape | Meaning |
| :-- | :-- |
| `{ ok: true, data: T, error: null }` | Success — `data` is non-null and shaped like the table row. |
| `{ ok: false, data: null, error: string }` | Failure — `error` is a message that is safe to render. |

`types.ts` owns that contract plus its helpers: `repoSuccess(data)`,
`repoFailure(error, fallbackMessage)` (the message is extracted through
`toErrorMessage()`) and `nowIso()` — `updated_at` is client-maintained, so every
write stamps it explicitly.

| Repository | Surface | API |
| :-- | :-- | :-- |
| `productsRepository` | table `products` | `Product`, `Create/Update/PatchProductInput`, `find`, `findMany`, `create`, `update`, `updatePartial`, `updateMany`, `delete`, `deleteMany`. |
| `clientsPurchasesRepository` | table `clients_purchases` | `ClientPurchase`, `ClientPurchaseWithProduct`, `Create/Update/PatchClientPurchaseInput`, the same verb set, plus `findWithProduct` / `findManyWithProduct`. |
| `purchasesPaymentsRepository` | table `purchases_payments` | `PurchasePayment`, `Create/Update/PatchPurchasePaymentInput`, plus the same verb set. |
| `productImagesRepository` | bucket `products-images` | `PRODUCT_IMAGES_BUCKET`, `SIGNED_URL_EXPIRY_SECONDS` (1 h), `sanitizeSegment`, `getPath`, `upload`, `move`, `remove`, `getSignedUrl`. |
| `authRepository` | `supabase.auth` | `getSession`, `signInWithPassword`, `signOut`, `onAuthStateChange(cb)` → an unsubscribe function. |

Conventions worth knowing:

- `delete` / `deleteMany` are keys bound to internal `remove*` functions, because
  `delete` is a reserved word and cannot name a declaration.
- `findMany(options)` accepts `{ productIds?, orderBy? }` and defaults to newest
  first (`created_at desc`) — the order both dashboard lists render in.
- `findManyWithProduct()` selects `*, product:products(*)`, letting PostgREST
  resolve the `clients_purchases.product_id → products.id` foreign key inside a
  single request. That embed is what "Mis ventas" renders; an insert carries no
  joined product, so the hook re-reads the list (`fetchAllPurchases`) instead.
- `create()` seeds `amount_paid_so_far: 0` / `is_fully_paid: false`. From then on
  those columns belong to a Postgres trigger, and no repository writes them.

### 10.2 Hooks (React state)

All hooks live in `src/hooks/`, run in the browser, and are thin React-state
wrappers over the repositories in §10.1 — the Supabase calls, and the error
strings they surface, all come from there.

They return `{ data, error }` (or `{ error }`) instead of throwing, while also
keeping an `error` string in state for the UI to render.

Two of them — `usePresent()` and `useCollapsiblePanel()` — are **UI-only**: they
wrap no repository and exist purely to drive motion (presence windows and the
disclosure fold), so they are documented here alongside the data hooks rather
than in §10.1.

#### `useProducts()` — `src/hooks/useProducts.ts`

Re-exports the `Product` type plus `CreateProductInput` / `UpdateProductInput`
(both defined in `productsRepository.ts`) so components keep importing types from
the hook that owns the data. **It no longer creates or exports a Supabase
client** — that used to be a second `GoTrueClient` (§14.2).

| Returns | Description |
| :-- | :-- |
| `products` | `Product[]`, sorted `id desc`. |
| `loading` | `true` during the initial fetch. |
| `error` | Last error message, or `null`. |
| `fetchProducts()` | `productsRepository.findMany()` — re-fetch the full list. Wired to the dashboard refresh button. |
| `addProduct(input)` | `create()` then prepends to state. |
| `updateProduct(id, updates)` | `updatePartial()` — stamps `updated_at`; replaces the row in state. |
| `deleteProduct(id)` | `delete(id)` — removes it from state. |

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

Exports `ClientPurchase`, `ClientPurchaseWithProduct`, `CreateClientPurchaseInput`
and `UpdateClientPurchaseInput`. It keeps **two** caches: `purchasesByProduct`
(keyed by `product_id`, for the Compras modal) and `allPurchases`
(`ClientPurchaseWithProduct[]`, for "Mis ventas").

| Returns | Description |
| :-- | :-- |
| `purchasesByProduct` | `Record<productId, ClientPurchase[]>` — the per-product UI. |
| `allPurchases` | Every purchase with its product embedded, newest first. |
| `loading` / `error` | Shared by both fetches; `SalesSection` only shows a spinner when it has no rows yet, so a refresh never blanks the list. |
| `fetchPurchasesForProducts(ids)` | One `.in('product_id', ids)` query (`findMany`), re-buckets rows per product. |
| `fetchAllPurchases()` | `findManyWithProduct()` — the whole "Mis ventas" list with each product joined. |
| `addPurchase(input)` | `create()` (totals seeded at `0` / `false`); prepends to `allPurchases` with `product: null`, so `SalesSection` falls back to `Producto #id` until the list is re-read. |
| `updatePurchase(purchase, updates)` | Client/fee fields only (never the derived totals). |
| `deletePurchase(purchase)` | Deletes; payments cascade via FK. |
| `applyPurchaseUpdate(purchase)` | Merge/replace one purchase in **both** caches (keeping the joined product in `allPurchases`) — used after payment mutations refresh the trigger-maintained totals. |

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

#### `usePresent()` — `src/hooks/usePresent.ts`

UI-only (touches no repository). A **presence window**, so a surface can animate
*out*: React unmounts the instant a `{show && <Modal/>}` flag flips, leaving
nothing to animate, so this hook owns the flag instead. `open(value?)` shows the
surface, `close()` starts the exit, and the payload is only dropped once
`EXIT_MS` (180ms — the JS twin of `--duration-base`) has passed. Renders on
`isPresent`, forwards `isClosing` as the surface's `closing` prop.

| Returns | Description |
| :-- | :-- |
| `value` | The value passed to `open`, still readable for the **whole** exit — a closing dialog never has to cope with its data vanishing (no title flipping "Editar compra" → "Agregar compra" on the way out). |
| `isPresent` | Is there a surface to render at all? Stays `true` through the exit. |
| `isClosing` | `true` only while the exit plays. |
| `open(value?)` | Show the surface. The payload is optional, and `undefined`/`null` is a legitimate value (create mode). |
| `close()` | Begin the exit. |

`prefersReducedMotion()` short-circuits the timer to `0`, and the post-exit
unmount is what rebuilds per-open state (form fields, lazily loaded payments) —
see `useClientPurchases`' caches for why that matters.

#### `useCollapsiblePanel()` — `src/hooks/useCollapsiblePanel.ts`

UI-only. Drives a disclosure panel's fold for `CollapsibleSection` /
`CollapsibleCard`. Returns `{ ref, hidden }`: attach `ref` to the panel and
spread `hidden` onto it.

A collapsed panel *rests* `hidden` — so assistive tech and `aria-controls` see a
normal hidden region — and the hook lifts the attribute only long enough
(`EXPAND_MS` 200 / `COLLAPSE_MS` 160) to play the fold through the Web
Animations API, because `height: auto` cannot be transitioned. Padding lives on
an inner wrapper (`.collapsibleBodyInner` / `.collapsibleCardBodyInner`) so the
panel height animates to a true `0`. `prefers-reduced-motion` skips straight to the end state.

#### `AuthProvider` / `useAuth()` — `src/context/authContext.tsx`

React context exposing `{ session, user, loading, signOut }`. On mount it restores
the session with `getSession()`, then keeps it fresh via `onAuthStateChange()`.
`signOut()` calls `supabase.auth.signOut()` then hard-redirects to `/`.

### 10.3 Components

| Component | File | Responsibility |
| :-- | :-- | :-- |
| `LoginModal` | `loginModal.tsx` | Email/password form calling `supabase.auth.signInWithPassword()`; shows the error in a `role="alert"` region on failure; on success redirects to `/dashboard`. Renders the Monster High logo, a `h1` wordmark ("Gestión de cupos") and labelled, correctly-typed fields (`type="email"`, `autoComplete="username"`, `spellCheck={false}`). Submits through the accent `.submitBtn` with an inline `.spinner` while pending. Loaded with `client:load`. |
| `DashboardApp` | `dashboardApp.tsx` | Thin composition: `<AuthProvider><AuthGuard><Dashboard/></AuthGuard></AuthProvider>`. Loaded with `client:only="react"`. |
| `AuthGuard` | `authGuard.tsx` | Reads `{ user, loading }` from `useAuth()`. Shows an `aria-live="polite"` spinner + "Verificando sesión…" while loading, redirects to `/` when there is no user, otherwise renders children. |
| `Dashboard` | `dashboard.tsx` | The main screen. Top bar (logo, `user.email`, "Cerrar sesión"), then two collapsible sections: **"Mis productos"** (a grid of product cards, refresh + "Nuevo producto", a modal product form for name / description / value / release date / image with live preview rendered through `Modal`, and `ConfirmModal` for deletions) and **"Mis ventas"** (`SalesSection`). **Each product card is a single `<button>`** — image, name, ID badge, value and purchase count, no controls — and opens `ProductDetailModal`, which is where "Compras", "Editar" and "Eliminar" live; the dialog resolves its product out of the live list so an edit saved from the form shows up behind it, and deleting a product closes it. It also orchestrates `PurchasesModal`. Refreshing re-reads the products *and* every purchase, because a deleted product's purchases cascade away in the database rather than through the hook. Renames the stored image when a product's name changes and bumps `imageVersion` after any image change to defeat browser caching. Section headers carry a one-line summary (`N producto(s)`, `N pendientes · $X por cobrar`, `Todo pagado`). Loading/empty/error states are explicit; the empty state offers the primary action. Every dialog it holds (the product form, the delete confirmation, the detail view) goes through `usePresent`, so they animate out instead of unmounting mid-exit. |
| `CollapsibleSection` | `collapsibleSection.tsx` | The reusable disclosure both dashboard sections are built on. A heading-styled `<button>` (`aria-expanded` + `aria-controls`, stable `useId` ids) toggles the panel; the panel **stays mounted** and *rests* `hidden` (so `aria-controls` always resolves and in-flight state is never thrown away), and `useCollapsiblePanel` lifts the attribute only long enough to fold the height to `0`. Optional `meta` string is right-aligned next to the title, with a `▲`/`▼` chevron as the visual affordance. Deliberately **not** a card — the header is a hairline-ruled row on the page background, so the content it wraps stays the only surface on screen. `defaultOpen` is `true`. |
| `CollapsibleCard` | `collapsibleCard.tsx` | The **card** counterpart to `CollapsibleSection`, and the general foldable surface. Renders a `.card` whose header row is the toggle (`aria-expanded` + `aria-controls`, stable `useId`; the body **stays mounted**, rests `hidden`, and folds through `useCollapsiblePanel`). Takes `title`, optional `meta`/`actions`, and works uncontrolled (`defaultOpen`) or controlled (`open` + `onToggle`) — the latter when the parent must react to opening (the purchases list lazily fetches payments on expand). Optional `className` adds a layout modifier (e.g. `purchaseCard`). |
| `Button` | `button.tsx` | The general-purpose button: a native `<button>` (never an anchor) carrying the design-system classes. `variant` → `primary` / `secondary` / `ghost` / `ghost-danger` / `danger` / `icon`; `size` → `sm` / `md` / `lg`; plus `icon` (decorative, `aria-hidden`) and `loading` (swaps in `.spinner`, disables, sets `aria-busy`). Every other `<button>` prop passes straight through. |
| `SalesSection` | `salesSection.tsx` | Read-only "Mis ventas": every purchase across every product, as hairline-separated rows rather than cards. Each row is client name over `producto · teléfono · fecha`, with `pagado de acordado` (tabular figures) and a `Pagado` / `Pendiente` badge. Pending rows sort first — the reason to open the list — and the sort is stable, so within each group the newest-first query order survives. Purely presentational: it receives `purchases` / `loading` / `error` and shows a spinner only when it has no rows yet, so a refresh never blanks the list. Editing a sale still happens in its product's Compras modal, where its payments live. |
| `PurchasesModal` | `purchasesModal.tsx` | Everything about one product's clients: each purchase is a `CollapsibleCard` (client name over phone, a paid/agreed progress bar, a "Pagado"/"Pendiente" badge) whose body reveals the payments — an add-payment form with optional "Cargo extra" and the list of payments — fetched lazily on expand via `usePurchasePayments`. Adding or editing a purchase goes through `AddPurchaseModal` (a single entry point; the old inline form is gone), and both purchase **and** payment deletion are confirmed through `ConfirmModal`. Uses `applyPurchaseUpdate` to push trigger-refreshed totals back up. Every dialog it raises (add/edit purchase, delete purchase, delete payment) is held through `usePresent` and gets its `closing` flag. |
| `AddPurchaseModal` | `addPurchaseModal.tsx` | The one way to add or edit a client purchase. Owns only its form state (`client_name`, `client_phone_number`, `agreed_fees`) and calls the `addPurchase` / `updatePurchase` functions from `useClientPurchases` that the parent passes in (create when `purchase` is omitted, edit when it is set), so the caller's list stays in sync without this component knowing about it. Errors render in a `role="alert"` banner; the submit button shows the shared `.spinner` while saving. Takes the `closing` flag so it can animate out. |
| `ProductImage` | `productImage.tsx` | Fetches a signed URL for a product and renders `<img>` with explicit `width`/`height` (avoids layout shift) plus `loading="lazy"`; renders nothing while loading and calls `onMissing` when there is no image. Re-fetches only when `product.id`, `product.name` or `imageVersion` change. |
| `ProductDetailModal` | `productDetailModal.tsx` | What tapping a product card opens. Built on `Modal`: the image, then a `<dl>` label/value ledger (ID badge, description, release date, value, purchase count) and the three actions — a full-width "Compras (N)" over a row holding "Editar" and "Eliminar". Purely presentational and action-only: it takes the `product`, the `purchaseCount`, the `imageVersion`/`getSignedUrl` pair for `ProductImage`, the `closing` flag, and `onEdit` / `onDelete` / `onOpenPurchases` callbacks. Each callback opens a **further** dialog on top of this one rather than replacing it, so cancelling lands back on the product (the same nesting `PurchasesModal` uses). |
| `Modal` | `modal.tsx` | The shared dialog shell. `role="dialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby`, Escape to close, backdrop click to close, focus moved in on open and restored to the trigger on close, Tab trapped (only the topmost dialog reacts, so nested confirms work), and a background scroll lock. Takes a `closing` prop from `usePresent`: it adds `.modalOverlay--closing` and stops answering Escape/Tab while the exit plays, so the dialog fades and slides out instead of snapping away. |
| `ConfirmModal` | `confirmModal.tsx` | Destructive-action confirmation built on `Modal` (`title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`, and the `closing` flag passed straight through). Cancel is rendered first so the safe choice sits under the thumb, and the consequence sentence is wired up via `aria-describedby`. |

### 10.4 Helpers

- **`formatCurrency(value)` — `src/helpers/currency.ts`.** Formats whole-peso
  amounts the Colombian way (`.` thousands separator, no decimals) using
  `Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })`. `null`/`undefined`
  render as `"0"`. Example: `formatCurrency(180000) === "180.000"`.
- **`formatDate(value)` — `src/helpers/date.ts`.** Short Spanish label via
  `Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })`
  → `"4 oct 2026"`. Accepts both shapes Supabase returns: a `date` column
  (`"2026-10-04"`) and a `timestamptz`. A bare `YYYY-MM-DD` is parsed as *UTC*
  midnight by `Date`, which would render as the previous day anywhere west of
  Greenwich (Colombia is UTC-5), so a 10-character value gets an explicit
  `T00:00:00` appended and is read as local midnight. Returns `null` for missing
  or unparseable input so callers can drop the line instead of printing
  `Invalid Date` (used by `SalesSection`).

### 10.5 Styling

| File | Purpose |
| :-- | :-- |
| `src/styles/theme.css` | **Single source of truth** for the design system, imported once by `Layout.astro`. Holds the tokens (color, type scale, spacing, elevation, motion), the globals (`box-sizing`, `body` typography, `:focus-visible`, `prefers-reduced-motion`, `.skipLink`, `.spinner`, `.tabular`, `.textMuted`) **and the shared components**: the form primitives (`.fieldGroup`, `.label`, `.input`, `.textarea`, `.fieldHint`, `.fieldError`), the button set (`.btnPrimary`/`.btnSecondary`/`.btnGhost`/`.btnDanger`/`.btnIcon`/`.btnGhost--danger` plus the `.btnSm`/`.btnLg` size modifiers), `.card` and the foldable `.collapsibleCard*` (header, trigger, title, meta, chevron, actions, body), `.badge` + its six modifiers, `.banner`, `.emptyState*` and `.statusMessage`. It also owns **motion**: the `--duration-*` / `--ease-*` tokens, the `riseIn` entrance utility, and the `prefers-reduced-motion` override that collapses every duration to nothing. Token rationale lives in `DESIGN.md`. |
| `src/styles/dashboard.css` | Dashboard **layout** + dashboard-only classes: `pageContainer`, `topBar`/`topBarLogo`/`userEmail`, `mainContent`, `pageHeader*` (`.pageHeaderText .title` steps 24px → 32px at `640px`; `.pageHeaderActions` centres the refresh/close buttons against the taller CTA), `dashboardBanner` (a `.banner` from theme.css), `productsGrid` with the `product*` card parts (`.card.productCard` is the button surface itself — tighter `--space-12` padding, `productHeader`, `productName`, `productCardMeta`, `productValue`, `productPurchases`, and the bleeding `productImage`), the `productDetail*` internals of the product dialog (image, label/value ledger, stacked description row, full-width primary action + button row), the `purchases*` / `payments*` / `payment*` modal internals (`.purchaseCard` is now only a surface modifier on the shared `.collapsibleCard`; `.purchaseTitleBlock` stacks the client name over the phone in the card header), `modalOverlay`, `formCard`/`formCardHeader`/`form`/`confirmMessage`/`confirmCard`/`buttonGroup`, `fileInput`/`imagePreview*`/`imageRemoveBtn`, `dashboardSections`, `collapsible*` (heading, trigger, title, meta, chevron, body, and the `.collapsibleBodyInner` padder that lets the fold reach a true `0`), the dialog animations (`fadeIn` / `slideUp` on open at `--duration-slow`, `fadeOut` / `slideDown` under `.modalOverlay--closing`, held with `forwards` until React unmounts), and `salesList` with its `sale*` rows (`saleRow`, `saleMain`, `saleClientName`, `saleMeta`, `saleSide`, `saleMoney`, `saleMoneyTotal`). Layout-only modifiers on the shared buttons (`btnRefresh`, `btnClose`, `purchasesNewBtn`, `paymentSubmitBtn`, `rowRemoveBtn`, `productDetailPrimary`, `productDetailButtonRow`) also live here. Each interaction state (hover/active/focus) sits next to the class it belongs to. Imported by `dashboard.astro`. |
| `src/styles/loginModal.css` | Login screen layout only: `authShell`, `authHero`, `authLogo`, `authEyebrow`, `authWordmark`, `authCard`, `authHeader`, `authTitle`, `authSubtitle`, `authForm`, `submitBtn`. It defines **no palette of its own** — colors and type come from `theme.css`. Imported by `index.astro`. |

There is no CSS framework and no `@apply`/utility layer — components reference the
shared class names above. Tokens live in `theme.css`; page stylesheets own layout.

## 11. Build & deployment

```sh
npm run build      # → dist/  (verified: 3 static pages, ~0.9 s)
npm run preview    # preview the built output
```

The target is a **Vercel static deployment**: static files on the CDN, no functions,
no server. A build at the last documented commit produced `.vercel/output/` using the
**Build Output API v3**:

| Path | Contents |
| :-- | :-- |
| `.vercel/output/static/` | `index.html`, `dashboard/index.html`, `404.html`, `favicon.*`, both logos, and hashed `_astro/*` CSS/JS bundles. |
| `.vercel/output/config.json` | `handle: filesystem` → immutable `cache-control` for `/_astro/*` → a `404` fallback. No route targets a function. |
| `.vercel/output/functions/` | **Does not exist.** This is the proof that no Serverless/Edge function is created. |
| `.vercel/output/server/` | Empty directory emitted by the adapter; nothing is shipped from it. |

`@astrojs/vercel` is configured but **unnecessary for static output** — a plain
`astro build` would deploy identically. It is kept so that adding SSR later does not
require re-plumbing, and it is the thing that makes `.vercel/output` (not `dist/`) the
artifact Vercel consumes. `.vercel/`, `dist/` and `.astro/` are git-ignored and untracked.

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

The repo carries configuration for several AI coding assistants, most of it committed in
`b698b2b "created set up files for external AI tools"` — the subagent set described below
was added later:

| Path | What it is |
| :-- | :-- |
| `AGENTS.md` | Contributing/agent guidance: project reference, the non-negotiable **shipping constraint** (static-only frame, see above), design system, dev server in background mode, how UI changes are verified, Astro doc links. `CLAUDE.md` is a **symlink** to it. |
| `prompts/` | The prompt chain for planned agent work, named `PROMPT-NN-UPPERCASE-NAME.md`. `PROMPT-01` records the baseline (done); `PROMPT-02` covers the §14 fixes. Scaffolded with the `cc-project-scaffold` skill. |
| `.cline/.clinerules` | Cline rules, kept deliberately short: they point at `AGENTS.md`, `DOCUMENTATION.md` and `DESIGN.md` and restate only the stack and verification rules. `.cline/skills/cc-project-scaffold` is the scaffold skill (its own git repo). |
| `DESIGN.md` | The design contract for this repo: tokens, type scale, component stylings, states, layout, do's/don'ts and a pre-flight checklist. |
| `.agents/skills/` | Vendored agent skills — Supabase (`supabase`, `supabase-postgres-best-practices`) plus design (`web-design-guidelines` from `vercel-labs/agent-skills`, `redesign-existing-projects` from `Leonxlnx/taste-skill`), mirrored under `.claude/skills/`. |
| `skills-lock.json` | Lockfile for the above (sources + content hashes; see §14 for the two entries without a hash). |
| `.cursor/rules/codegraph.mdc` | Cursor rule describing when/how to use the CodeGraph MCP tools (`alwaysApply: true`). |
| `.cursor/agents/` | Project **subagents** — one `.md` per agent (YAML `name`/`description` + system prompt). See *Subagents* below. Project-level, so they take priority over any same-named user agent in `~/.cursor/agents/`. |
| `.codegraph/` | CodeGraph index for this repo (`config.json` + `.gitignore` are committed). |
| `.vscode/extensions.json` | Recommends `saoudrizwan.claude-dev` (Cline). |
| `.claude/`, `.agents/` | Skill files consumed by Claude-based agents. |

### Subagents

Five project subagents live in `.cursor/agents/`. They exist so independent work runs **in
parallel** in isolated contexts instead of serially inside one conversation: the main agent
can edit while `ui-verifier` checks the layout against `DESIGN.md` and `docs-sync` checks the prose, and none
of those three need the others' context. Delegating also keeps large command output (build
logs, DOM dumps) out of the main context.

| Agent | Delegate to it when | Writes files? |
| :-- | :-- | :-- |
| `gate-verifier` | After any code, config, dependency or style change, and before every commit. Runs `npx tsc --noEmit`, `npm run build`, the static-artifact shape check (no `functions/`, no function route in `config.json`) and the static-only source checks, then reports PASS/FAIL with raw evidence. | No — read-only. |
| `ui-verifier` | After touching `src/components/*.tsx`, `src/styles/*.css`, `src/pages/*.astro` or `src/layouts/*`. Reviews the change against `DESIGN.md` by **reading the source — it never renders or simulates a browser**: targets ≥ 44 px, visible focus ring, contrast via tokens, disclosure ARIA + resting `hidden`, reduced motion, durations/easings traced to tokens. | No — read-only. |
| `docs-sync` | After any change to components, hooks, repositories, routes, styles or tech debt, and after every commit. Audits `DOCUMENTATION.md` / `DESIGN.md` / `CHANGELOG.md` against the code and fixes the drift: stale routes, data model, hook rows, §14 items, §15 history, the date stamp. | Yes, docs only. |
| `data-layer-reviewer` | After touching any repository, hook, query or type. Reviews against the vendored Supabase skills: single client, `RepoResult<T>` never throwing, loading/error states, N+1, cascade assumptions, RLS. | No by default. |
| `commit-steward` | Once changes are verified. Stages **explicit paths** (never `git add -A`, so `dist/` stays out of history) and writes the Conventional-Commits message, including the git-pager and heredoc workarounds this terminal needs. | Commits; does not author code. |

A subagent's `description` field is what drives delegation, so each one is phrased as *when*
to use it and includes "use proactively". Keep them focused on one job each — an agent that
does two things is picked for neither.

### Design tooling

Of the five resources in the shared "Claude Code plugins" set, three were adopted for
the design-system pass and two were deliberately not:

| Resource | Status |
| :-- | :-- |
| Taste Skill → `redesign-skill` | ✅ Vendored as `.agents/skills/redesign-existing-projects`. Supplied the audit-first protocol: scan → diagnose → fix, in a fixed priority order. |
| Vercel Web Design Guidelines | ✅ Vendored as `.agents/skills/web-design-guidelines`. It fetches the canonical rule list at review time and reports findings as `file:line`. |
| Awesome DESIGN.md | ✅ Adopted as a *convention*: `DESIGN.md` (how it should look) sits alongside `AGENTS.md` (how to build). |
| Playwright CLI | ➖ Not installed, and not wanted: UI is verified from the source, not by rendering it. |
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
| `npm run build` | ✅ passes — 3 static pages (`/index.html`, `/dashboard/index.html`, `404.html`), ~0.9 s. |
| Dev server | `npm run dev` → `http://localhost:4321` (or `astro dev --background`). |
| Types | ✅ `npx tsc --noEmit` clean, `npm run check` (`astro check`) → **0 errors** (43 files; 5 hints, all pre-existing deprecations/unused-import). |
| Tests | ✅ `npm test` (`vitest run`) → **19 passing** across 5 files (`formatCurrency`, `formatDate`, `sanitizeSegment`/`getPath`, `getProductImagePath`, `RepoResult` helpers). Node environment, Supabase mocked, hermetic. |
| Lint / format | ❌ no ESLint/Prettier config yet (see [§14](#14-known-issues--tech-debt)). |
| CodeGraph index | ✅ built (`.codegraph/`), MCP handshake verified. |
| Visual check | ✅ By reading the source: values traced to `theme.css` tokens, layout rules read from the stylesheets. No browser is simulated. |
| Motion check | ✅ By reading the source: durations/easings come from the `--duration-*` / `--ease-*` tokens with `EXIT_MS` in `usePresent.ts` kept in sync with `--duration-base`, and both JS drivers branch on `prefers-reduced-motion`. |
| Static output | ✅ `.vercel/output/static/` written, `.vercel/output/functions/` absent. |
| Design system | Tokens in `src/styles/theme.css`, contract in `DESIGN.md`. |

## 14. Known issues & tech debt

Ordered roughly by how much they matter:

1. ✅ **`.env` untracked; guarded env.** `git rm --cached .env` has been run and
   `.env` is in `.gitignore` (the file stays on local disk). It only ever held
   `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_KEY` — a *publishable* key, not a
   `service_role`/secret key (verified: no secret key anywhere in the repo). Since
   `PUBLIC_*` values are inlined into the client bundle regardless, this is not a
   leak; but it means **RLS is the only thing protecting the data**. The guard in
   `src/lib/supabase.ts` is now loud *and* legible: it names the missing variable,
   paints a Spanish `role="alert"` banner into `#main` when a document exists, then
   throws so the build fails too. **Remaining precondition:** set both vars on the
   Vercel project (Production + Preview) before the first deploy.
2. **"Mis ventas" reads the whole table.** `fetchAllPurchases()` pulls every row
   of `clients_purchases` with its product embedded — on mount and on every
   refresh (`handleRefresh` re-reads it alongside the products). There is no
   `limit`, no range and no pagination, and the list renders one row per purchase.
   Fine at this scale, not forever: add a limit or paginate before the table gets
   real. (The old duplicate-`GoTrueClient` issue is gone — `src/lib/supabase.ts`
   is now the only client instance.)
3. ✅ **Generated artifacts are ignored/untracked.** `.gitignore` now lists
   `.vercel`, `node_modules`, `.astro/`, `dist/`, `.env` and `.env.local`;
   `git rm -r --cached .astro dist` and `git rm --cached .env` have been run, so the
   tree no longer churns with build/dev output or carries the env file.
4. **Auth is client-side only.** No `src/middleware.ts`, so the `/dashboard` HTML
   shell is publicly served and the redirect happens in the browser. The real
   security boundary is **Row Level Security** — make sure RLS is enabled and
   correct on `products`, `clients_purchases` and `purchases_payments` (and on the
   `products-images` bucket).
5. **"Mis ventas" is read-only.** The list is where the outstanding work is
   visible, but none of it is actionable: to fix a client name, change a fee or
   register a payment you have to find that product in "Mis productos" and open
   its Compras modal. A row action (or a link that opens the right modal) would
   remove the hunt.
6. **Payment edit is unreachable.** `usePurchasePayments().updatePayment` exists but
   no UI calls it; payments can only be added or deleted.
7. **Delete confirmation is consistent for data, not for images.** Purchases and
   payments now go through `ConfirmModal` (like products). The image-remove button
   in the product modal still deletes immediately — the image is re-uploadable, so
   this is low-severity, but an undo would be better.
8. ✅ **Dead code removed.** The Astro starter leftovers (`Welcome.astro` plus its
   `astro.svg`/`background.svg`) and the stray `arroyo_heydi_-_mileage.pdf` have
   been deleted, and the leftover `console.log` in `authGuard.tsx` is gone. Keeping
   the tree free of unrouted files is now a review habit rather than an open item.
9. **Errors are only partly surfaced.** Each hook stores an `error` string, and the
   dashboard now renders both the product error and the purchases error (in its
   own section). Image and payment failures are still silent — `PurchasesModal`
   never receives an `error`, even though every mutation returns one.
10. ✅ **Quality gates started.** `npm run check` (`astro check`) and `npm test`
    (Vitest, 19 tests over the pure helpers and the `RepoResult` contract) exist and
    pass, alongside `npx tsc --noEmit`. **Still open:** no ESLint/Prettier, and
    nothing wires these gates into CI yet.
11. ✅ **Package metadata fixed.** `package.json` now says `"name": "cupos-sitio-web"`
    with a `description` (still no `license` field).
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
15. ✅ **The 404 route points at a real file.** `src/pages/404.astro` emits
    `404.html`, so the adapter's
    `{"src":"^/.*$","dest":"/404.html","status":404}` route now lands on an
    intentional Spanish "not found" page instead of Vercel's generic error.
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
| `b698b2b` | created set up files for external AI tools |
| `f36b6a1` | feat: overhaul design system and guidelines |
| `66f2031` | feat: add collapsible dashboard sections and read-only Mis ventas |
| `2f2d731` | docs: bring the git history table up to date |
| `09026ff` | chore: add project subagents for parallel verification |
| `21231c0` | Refactor code structure for improved readability and maintainability |
| `390fccf` | Add UXonFly design system documentation for consistent UI guidelines and updated the project to follow them. |
| `9ea91d7` | feat: add collapsible panel and presence hooks for UI components |

Rows list feature and scaffold commits; documentation-only commits are not tracked
here.

So the app was built in this order: **Astro scaffold → auth + login → data hooks →
UI polish (confirm modal, images, currency) → repo hygiene (`node_modules`) → AI
tooling → design system → dashboard sections + repository layer → reusable
primitives (`Button`, `CollapsibleCard`, `AddPurchaseModal`) → motion (a presence
hook for dialogs, an animated fold for disclosures).** The domain model
(products → purchases → payments) and the storage layer have existed since `2e0b0c6`.

`9ea91d7` is a single commit that carries **two** passes — the reusable
primitives (documented in `CHANGELOG.md` under "General UI components") and the
motion work on top of them. Prefer splitting them in future; one commit that
changes both the component API and the animation contract is harder to review
and, worse, to revert.

## 16. Suggested next steps

Roughly in priority order:

1. **Security pass:** ✅ `.env` untracked. Still to do: enable/verify **RLS** on all
   three tables and the storage bucket, set the Supabase env vars on the Vercel
   project, and decide whether `/dashboard` needs server-side protection
   (middleware) instead of a client redirect.
2. ✅ **Consolidated.** `src/lib/supabase.ts` is now the only client instance and
   nothing but `src/repositories/` imports it. The next step along that line is
   generated database types (`supabase gen types`) so the row interfaces in §10.1
   stop being hand-written.
3. ✅ **Artifact churn stopped:** `.astro/`, `dist/` and `.env` are ignored and
   untracked.
4. **Quality gates:** ✅ `astro check` via `npm run check` and a Vitest setup
   (`npm test`, 19 tests) now cover the pure helpers (`formatCurrency`, `formatDate`,
   `sanitizeSegment`, `getProductImagePath`) and the `RepoResult` contract.
   Still open: **ESLint + Prettier**, and running the gates in CI (a GitHub Action
   that runs `check` + `test` + `build`).
5. **UX consistency:** ✅ purchase/payment deletion now confirms through
   `ConfirmModal`, and both dashboard sections render their own `errorAlert`.
   Still open: image and payment failures are swallowed, `updatePayment` is
   unwired, and the sales list has no actions of its own.
6. **Cleanup:** ✅ the debug `console.log` and the stray `localStorage` write are
   gone, and the unused Astro starter page (`Welcome.astro`) with its
   `astro.svg`/`background.svg` assets and the stray PDF have been deleted.
   Still open: fix `package.json` metadata (§14.11).
7. **Extend the docs:** record the actual Supabase schema (SQL migrations) so this
   file stays the single source of truth.
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

