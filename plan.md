# plan.md — UI/UX & i18n execution plan for `cupos-sitio-web`

Derived from the `automations-front` design/technology scan. This file is the
**execution contract**: phases run in order, each ends at a gate, and nothing
ships that breaks the static frame.

- **Status:** proposed, not started
- **Baseline commit:** `aab7385` (PROMPT-02 shipped; working tree clean)
- **Owner:** —
- **Mirror:** when Phase A starts, copy this into
  `prompts/PROMPT-03-UI-UX-ENHANCEMENTS.md` (repo convention) and mark it done on ship.

---

## 1. Goal

Four things, in this order:

1. **Adopt the patterns worth copying** from `automations-front` — its component
   organisation, its skeleton system, its code-splitting, its JSDoc convention.
   *Not* its styling layer (Bootstrap/Argon/token sprawl — a hard no).
2. **Add ES/EN i18n with `react-i18next`** and a language switch in the dashboard
   top bar.
3. **Ship the Tier 1 components** from the scan (KPI strip, field primitives,
   money input, search, sales toolbar, progress bar, toast, tel/copy, CSV export).
4. **Ship the Tier 2 components** (error state, first-run checklist, chart,
   sticky action bar, pagination, date range).

## 2. Non-goals

- **No visual redesign.** These are additive primitives that reuse existing
  tokens. `DESIGN.md` stays the source of truth; no new color, font, breakpoint,
  radius, shadow or spacing value.
- **No new route, no `/en` route variants, no middleware, no API route, no SSR.**
  Language is a client-side concern of the islands (see §11, tradeoff R2).
- **No new `PUBLIC_*` env var** (i18n needs none) and **no new backend work** —
  no schema change, no new query, no migration.
- **Not** Redux / RTK Query / React Query / Bootstrap / sweetalert2 / d3 /
  react-joyride — all explicitly rejected in the scan.
- **Not** moving the existing flat `src/components/*.tsx` into folders: pure
  churn across 8 importers. The convention applies to *new* code only (A1).

## 3. Hard constraints (from `AGENTS.md`)

Every phase must leave all of these true:

| Constraint | How this plan honours it |
| :-- | :-- |
| `npm run build` leaves `dist/` + `.vercel/output/static`, **no `.vercel/output/functions/`** | No route/output/middleware/API/auth-hook changes. New deps are client-only and land inside the existing islands. |
| Static only — no `output: 'server'`, no `prerender = false`, no `middleware.ts`, no Server Actions | Language + all new UI live in `client:*` React islands. |
| **No build-time network** | `i18next`/`react-i18next` are bundled from `node_modules`; locale files are local TS modules. Nothing is fetched from a CDN or from Supabase at build time. |
| Config through `PUBLIC_*` only | No new env var at all. |
| Tokens live in `theme.css`; layout in `dashboard.css`/`loginModal.css` | Every new CSS value composes from an existing `--token` (§10). |
| One accent family, one typeface, one gray family | New primitives use `--color-primary*`, `--color-surface*`, `--color-border*`, `--color-*-text` only. |
| Prefer pre-built assets over platform compute | No `astro:assets`, no image service; the one chart is hand-rolled SVG. |

**If a step ever needs to leave this frame, stop and get explicit agreement
before writing it** (then update `AGENTS.md` + `DOCUMENTATION.md` §11).

---

## 4. Verified baseline

Read before planning; these are the facts the plan is built on.

| Fact | Evidence |
| :-- | :-- |
| 35 source files; islands are `loginModal` (`client:load`, `/`) and `dashboardApp` (`client:only="react"`, `/dashboard`) | `src/pages/index.astro:9`, `src/pages/dashboard.astro:9` |
| 6 static pages/artifacts: `/`, `/dashboard`, `404.html` | `npm run build` output |
| Gates wired and green: `tsc --noEmit`, `astro check`, `vitest run` (5 files / 19 tests), `npm run build` | `package.json` scripts; PROMPT-02 |
| `dashboard.tsx` is the only component composing the top bar | `dashboard.tsx:260-274` (`.topBar`, `.topBarLogo`, `.userEmail`, `.btnGhost`) |
| All user-facing copy is hardcoded Spanish string literals | `dashboard.tsx`, `salesSection.tsx:37-99`, `loginModal.tsx`, `purchasesModal.tsx` |
| `EmptyState` / `ConfirmModal` already take copy as **props** (no literals inside) | `emptyState.tsx`, `confirmModal.tsx` |
| `formatCurrency` / `formatDate` hardcode `'es-CO'` | `src/helpers/currency.ts:9`, `src/helpers/date.ts:22` |
| Token set available: `--space-4…--space-64`, `--text-xs…--text-4xl`, `--radius-sm…--radius-full`, `--color-*`, `--duration-*`, `--ease-*`, `--z-sticky`/`--z-overlay`, `--measure`, `--content-width` | `theme.css:18-122` |
| Reusable primitives already exist: `.card`, `.collapsibleCard`, `.badge*`, `.banner*`, `.spinner`, `.statusMessage`, `.emptyState*`, `.input`, `.label`, `.fieldHint`, `.fieldError`, `.btn*` | `theme.css:210-742` |
| `.topBar` is already `position: sticky` at `--z-sticky` | `dashboard.css:25-36` |
| `salesSection` sorts pending-first in a `useMemo`, with no user control | `salesSection.tsx:26-32` |
| A `.purchaseProgress*` bar exists but is only used inside the purchases modal | `dashboard.css:306-330` |
| `Button` already supports `loading` (spinner + `aria-busy` + disabled) | `button.tsx:34-73` |

---

## Phase A — Adopt what is worth copying

Source: section 2 of the scan. Only the ✅ rows. Each task states the pattern,
the concrete change, and what we deliberately do *not* inherit.

### A1 — Component library convention (`components/ui/` + barrel)

**Pattern copied:** `automations-front` keeps reusable widgets in
`src/components/common/` with an `index.js` barrel, so a page imports
`{ Skeleton, FormInput }` from one path instead of reaching into nine files.

**Change:**
- Create `src/components/ui/` for **new** reusable primitives.
- Create `src/components/ui/index.ts` as the barrel; it re-exports every
  primitive by name **and** its prop types.
- Existing flat components stay put. Add one sentence to `DOCUMENTATION.md` §6
  naming `ui/` as *the* home for cross-screen primitives, and the leaf components
  as screen-specific.
- Rule: a primitive in `ui/` may not import from a screen component (no
  `ui/` → `dashboard.tsx` dependency); dependencies point one way only.

**Do not inherit:** their `FormSelect` / `FormSelect_v2` / `FormSelect_v3` and
`FormInputDate` / `_v2` duplication. One primitive, one file; a variant is a prop,
never a `_v2` filename.

**Done when:** `src/components/ui/index.ts` exists, `npx tsc --noEmit` is clean,
and the convention is documented in `DOCUMENTATION.md` §6.

### A2 — Skeleton loading system

**Pattern copied:** one shared shimmer plus the documented rule from
`SkeletonUsage.md` — *never re-flash a skeleton on refetch; keep the data on
screen and show a small inline indicator instead.*

**Change:**
- `theme.css`: add `.skeleton`, `.skeletonLine`, `.skeletonBlock` built from
  `--color-surface-sunken` / `--color-border`, `--radius-sm|md`, a
  `--duration-*`-scaled shimmer. Wrap the animation in
  `@media (prefers-reduced-motion: reduce)` → static fill. Decorative only.
- `src/components/ui/skeleton.tsx`: `SkeletonText({ lines })`,
  `SkeletonCard()`, `SkeletonRow()`, `SkeletonList({ rows })`. Each takes
  `className`; all render `aria-hidden="true"`, and the **container** owns the
  `role="status"` / `aria-live` / visually-hidden label so screen readers get one
  "Cargando…" rather than ten nodes.
- Apply the rule where a spinner currently replaces everything:
  - `dashboard.tsx:319-323` — product grid → `SkeletonCard` ×3 on first load.
  - `salesSection.tsx:48-55` — sales list → `SkeletonRow` ×4 on first load.
  - Refetch paths keep the real rows — the existing `loading && length === 0`
    guard already models this; the skeleton replaces the spinner, not the guard.

**Done when:** both first loads show a layout-shaped skeleton; a refresh
(`handleRefresh`) keeps rows on screen; reduced-motion renders a flat placeholder.

### A3 — Code-splitting the heavy dialogs

**Pattern copied:** `config/lazyComponents.js` + `React.lazy`.

**Change:** the dashboard island is one entry chunk, but three dialogs are only
needed after a tap and are the largest components (`purchasesModal.tsx` 333
lines, `addPurchaseModal.tsx` 162, `productDetailModal.tsx` 120):
- `React.lazy(() => import('./purchasesModal'))`, same for
  `productDetailModal` and `addPurchaseModal`.
- Wrap each in `<Suspense fallback={<SkeletonCard />}>`. Because `usePresent()`
  gates mounting and dialogs animate in, the fallback is effectively never seen —
  but it must exist.
- **Verify the build still emits only static assets:** Vite/Rollup turns each
  dynamic import into an extra chunk under `/_astro/`, fetched at runtime. That is
  still static hosting — confirm no new `functions/` directory appears.

**Do not inherit:** their 1200-line `routesConfig.js` with per-route metadata.
You have two routes; a registry would be ceremony.

**Done when:** `npm run build` reports the dialogs as separate chunks, the build
still emits no `.vercel/output/functions/`, and opening a product card still works.

### A4 — JSDoc / prop-doc convention (formalise, do not rewrite)

**Pattern copied:** every automations-front component opens with a JSDoc block
explaining **why it exists**, not what it renders.

**Change:** keep it and make it explicit in `DESIGN.md` §4 — one sentence stating
that a new `ui/` primitive ships with a JSDoc header naming its purpose and its
a11y contract. Existing components already do this well (`button.tsx:38-45`);
no retrofit pass.

**Do not inherit:** runtime PropTypes checks — the repo is `strict` TypeScript.

### A5 — Environment banner — **optional, opt-in only**

**Pattern copied:** their `DeploymentEnvironmentBanner`.

**Change:** only if requested. It requires a new `PUBLIC_ENV_LABEL` variable
inlined at build time, which per `AGENTS.md` means it must be added to the Vercel
project (Production **and** Preview) and documented in `DOCUMENTATION.md` §4/§11
*in the same change*, and the code must fail loudly when it is missing. Real cost
for a cosmetic chip on a single-operator tool.

**Default: skipped.** Revisit only if a staging environment is ever created.

### A6 — Route guard — **already done**

`authGuard.tsx` + `authContext.tsx` already implement the protected-route pattern.
No work. Recorded so the plan is complete against the scan.

### Phase A gate

```sh
npx tsc --noEmit && npm run check && npm test && npm run build
test ! -d .vercel/output/functions && echo "static OK"
```

---

## Phase B — ES / EN with `react-i18next` + header language switch

**Runs before Phase C and D.** Every string in Phase C/D is born translated; doing
i18n afterwards means writing each label twice.

### B0 — Decisions taken (and why)

| Decision | Choice | Rationale |
| :-- | :-- | :-- |
| Library | `i18next` + `react-i18next` | Requested. Client-side only, bundled from `node_modules` — no build-time network, no server. |
| Default language | **`es`** | The static HTML must be meaningful before JS runs (`Layout.astro` ships `lang="es"`). |
| Resolution order | `localStorage['cupos.lang']` → `navigator.language` (`en*` → en, else `es`) → `es` | Persisted choice wins; the browser only nudges the first visit. |
| Storage key | `cupos.lang` | Namespaced like the rest of the app's keys. |
| Scope | **All copy inside the React islands** + the three Astro-owned strings (skip link, `<title>`, `<meta description>`) | See B6 — the shell gets a ~12-line inline script, still fully static. |
| Route variants (`/en/…`) | **Out of scope** | Would double static pages and every link for zero benefit: `/dashboard` is behind auth and `client:only`. Recorded as limitation R2. |
| Locale formatting | `Intl` stays the engine; i18next `language` drives the locale tag | `formatCurrency`/`formatDate` take an explicit `locale` (B7). |
| New env var | **None** | Nothing to add to Vercel, nothing to document in §4. |

### B1 — Install

```sh
npm install i18next react-i18next
```

Both go in **`dependencies`** (runtime, inlined into the island bundle by Vite).
Bundle cost is measured in B10 and must not exceed the budget there.

### B2 — `src/i18n/index.ts` (the singleton)

- `i18next.use(initReactI18next).init({ ... })`, export the instance.
- `resources: { es: { translation: es }, en: { translation: en } }`
- `lng: resolveLanguage(readRawStoredLanguage(), navigator.language)`,
  `fallbackLng: 'es'`, `supportedLngs: ['es','en']`.
  **Corrected after shipping:** the original spec said `lng: readStoredLanguage()`,
  which defaults "nothing stored" to `es` — that hides the browser hint, so the
  documented resolution order was never actually applied. `readRawStoredLanguage()`
  returns `null` when unset and `resolveLanguage()` owns the fallback chain.
  `src/i18n/index.test.ts` pins it (remove the hint and two cases fail).
- `interpolation: { escapeValue: false }` — React already escapes.
- `returnNull: false` — a missing key renders its key, never an empty node.
- **Idempotent init:** guard with a module-level flag. Two Astro islands
  (`loginModal`, `dashboardApp`) import this same module; two React roots must not
  each call `init()` twice.
- Dev-only: log missing keys via `i18n.on('missingKey')` when `import.meta.env.DEV`,
  so English gaps surface immediately. Stripped from prod.

### B3 — Locale resources

- `src/i18n/locales/es.ts` and `src/i18n/locales/en.ts`, both
  `export default { … } as const`, organised as `common.*`, `auth.*`, `nav.*`,
  `products.*`, `purchases.*`, `payments.*`, `sales.*`, `summary.*`,
  `validation.*`, `errors.*`, `meta.*`.
- `es.ts` is the **reference file**: the union of every string that exists today,
  harvested from `dashboard.tsx`, `salesSection.tsx`, `loginModal.tsx`,
  `purchasesModal.tsx`, `addPurchaseModal.tsx`, `productDetailModal.tsx`,
  `confirmModal.tsx` call sites, `emptyState` call sites, `authGuard.tsx` and
  `lib/supabase.ts`.
- Plurals use i18next suffixes, not hand-rolled ternaries — replace
  `` `${n} producto${n === 1 ? '' : 's'}` `` (`dashboard.tsx:121-123`),
  `` `${pending.length} pendiente${…}` `` (`:118`), and the compra/compras +
  pendiente/pendientes cases in `dashboard.tsx` / `salesSection.tsx`.
- `src/i18n/types.ts`: augment i18next's `CustomTypeOptions` with
  `resources: { translation: typeof es }`, so `t('sales.pending', { count })` is
  **type-checked** — a typo becomes a `tsc` error. In a repo with no linter yet,
  that is the gate you want.
- **Key parity is enforced by a test** (B9), not by discipline.

### B4 — `src/hooks/useLanguage.ts`

- Returns `{ language, setLanguage }`.
- `setLanguage(next)`: `i18n.changeLanguage(next)` → write `localStorage` → set
  `document.documentElement.lang` → set `document.title` from `meta.title`.
- `language` is normalised to `'es' | 'en'` (never `'es-CO'`), so the switch's
  comparisons are exact.
- Called once at the top of each island root (`dashboardApp.tsx`,
  `loginModal.tsx`) so `<html lang>` / title sync even if the user never touches
  the switch (e.g. they chose a language previously).

### B5 — `src/components/ui/languageSwitch.tsx`

- A compact **segmented control**: `<div role="group" aria-label={t('common.language')}>`
  holding two `<button type="button" aria-pressed={…}>` — `ES` and `EN`.
- Reuses `btnGhost` + `btnSm`; the pressed option takes a `--color-primary-subtle`
  fill with `--color-primary` ink (an existing token pair — no new colour); the
  other stays muted.
- Labels are the two-letter codes at `--text-xs` with `--tracking-label`, matching
  the badge/label rule in `DESIGN.md` §3 — never a full word ("Español"/"English"
  is too wide in a phone top bar). Full names go in each button's `aria-label`
  (`"Cambiar a inglés"`).
- **Placement: `dashboard.tsx` top bar**, between `.userEmail` and the sign-out
  `.btnGhost` (`dashboard.tsx:260-274`). `.topBar` is a flex row, so add
  `flex-shrink: 0` beside `.btnGhost` in `dashboard.css:56-58`.
- **Also on the login screen** (`loginModal.tsx`) so the language can be picked
  before authenticating. Same component.
- `aria-pressed`, **not** `role="tab"`/`radiogroup`: these are two independent
  toggles over a preference, and `aria-pressed` states that without promising the
  arrow-key contract a tablist would then owe.

### B6 — The Astro shell (three strings, one inline script)

`Layout.astro` owns exactly three pieces of copy: the skip link (`:35`), the
`<title>` (`:19`) and `<meta name="description">` (`:20`). They are baked at build
time, so i18next cannot reach them without SSR — which is off the table.

**Change:** a `<script is:inline>` in `Layout.astro` (~12 lines, zero deps, zero
network):

```js
const lang = localStorage.getItem('cupos.lang') === 'en' ? 'en' : 'es';
document.documentElement.lang = lang;
document.documentElement.dataset.lang = lang;
// when lang === 'en', swap the skip-link text and rewrite <title>/<meta description>
// from a tiny inline map keyed by the Spanish title that Layout received.
```

- Spanish stays the **static** default in the markup, so a JS-less or pre-hydration
  render is coherent and `lang="es"` is correct for it.
- The `<title>` is per-page (`Layout` receives `title`), so the inline map carries
  the three known titles keyed by their Spanish form. A title not in the map is
  left untouched — no half-translated titles.
- `data-lang` exists so a future CSS hook is possible, but **no CSS may branch on
  it** in this phase: copy differences belong in the resource files.

### B7 — Locale-aware formatters

- Add a `locale` parameter to `formatCurrency(value, locale = 'es-CO')` and
  `formatDate(value, locale = 'es-CO')`; the current behaviour is the default, so
  existing callers are unaffected.
- `es` → `'es-CO'`, `en` → `'en-US'`, exported once from `src/i18n/index.ts` as
  `LOCALE_TAG: Record<AppLanguage, string>` so the mapping lives in one place.
- `src/hooks/useFormatters.ts` returns `{ formatCurrency, formatDate }` bound to
  the active language; components use the hook, and the pure helpers stay testable.
- **`formatDate` keeps its UTC-midnight fix** (`date.ts:17`) and both tests keep
  asserting a TZ-independent *day*, never a full ICU string.

### B8 — Replace the literals

Every hardcoded string in these files moves to `t(...)`:

`dashboard.tsx` (including the `salesMeta` / `productsMeta` strings),
`salesSection.tsx`, `loginModal.tsx`, `authGuard.tsx`, `purchasesModal.tsx`,
`addPurchaseModal.tsx`, `productDetailModal.tsx`, `productImage.tsx` (alt text),
`lib/supabase.ts`.

- **`lib/supabase.ts` caveat:** its banner can run *before* the i18n singleton is
  ready (it throws at module load — `DOCUMENTATION.md` §4). It imports `i18n`
  directly and calls `i18n.t('errors.configMissing', { name })`, falling back to
  the Spanish literal if `t` returns the raw key. The guard must stay loud in
  every language.
- The banner currently paints into `#main` (static Astro node) — keep that; do not
  move it into a React root.
- `EmptyState`, `ConfirmModal`, `Modal` and `Button` already take copy as props, so
  **they need no changes inside** — the payoff of the props-only design, worth
  recording in `DESIGN.md` §4.
- Rules: no string concatenation for sentences with interpolation — use `{{count}}`,
  `{{name}}`, `{{amount}}` so English word order is free. `aria-label` and `title=`
  are copy too and get keys. Any `useMemo` that builds a sentence must list
  `i18n.language` in its deps, or a language change leaves stale text — the live
  example is the `salesMeta` memo at `dashboard.tsx:106-119`.

### B9 — Tests

| Test | What it locks |
| :-- | :-- |
| `src/i18n/locales/parity.test.ts` | Flattened key sets of `es` and `en` are **identical** — a missing translation cannot merge. |
| `src/i18n/locales/interpolation.test.ts` | For each key, the `{{…}}` placeholders match between `es` and `en`. Catches `{{amount}}` vs `{{value}}`. |
| `src/helpers/currency.test.ts` (extend) | `formatCurrency(180000)` → `180.000`; `formatCurrency(180000, 'en-US')` → `180,000`; `null` → `0`. |
| `src/helpers/date.test.ts` (extend) | Day 4 + `oct` + `2026` for `es-CO`; `Oct` + `2026` for `en-US`; `null`/garbage → `null`. |
| `src/hooks/useLanguage.test.ts` | Resolution order (`localStorage` → `navigator.language` → `es`); `setLanguage` round-trips through storage; an unknown stored value falls back to `es`. |
| `src/i18n/index.test.ts` | The **init** itself: stub the globals, `resetModules()`, re-import the singleton and assert `i18n.language`. Covers browser hint on a first visit, stored choice winning, an unshipped stored value, and the no-`navigator` default. |

All six are pure functions over modules — no DOM, no network, no env — matching
the hermetic bar PROMPT-02 set. `useLanguage`'s storage/`document` access is
factored into pure `readStoredLanguage` / `writeStoredLanguage` helpers so the
test needs no jsdom.

### B10 — Bundle budget

Measure before/after with `npm run build`; record the island chunk sizes in
`CHANGELOG.md`.

**Ceiling: the dashboard island's JS stays under 250 KB uncompressed.** If
`i18next` + `react-i18next` push past it, the documented fallback is to drop
`react-i18next` and drive `i18next`'s own `t()` through a
`useSyncExternalStore` over `i18n.on('languageChanged')` — same resource files,
same tests, ~10 KB saved. Decide with the real number, not in advance.

**Measured (done):** eagerly-preloaded `/dashboard` JS went **223 KB / 67 KB →
203 KB / 63 KB** (raw / gzip) — *down* 20 KB, because A3's `lazy()` chunks paid for
the +60 KB that i18next added to the shared vendor chunk (212 → 272 KB). Whole-island
payload 443/125 KB → 510/150 KB. **203 KB is under the 250 KB ceiling, so R1's
fallback was not needed.** Full table in `CHANGELOG.md` and `DOCUMENTATION.md` §11
*Bundle budget*.

### Phase B gate

```sh
npx tsc --noEmit && npm run check && npm test && npm run build
test ! -d .vercel/output/functions && echo "static OK"
```

Plus a manual pass against the **running dev server** (`astro dev --background`):
toggle ES↔EN on `/`, log in, toggle again on `/dashboard`, reload, and confirm the
choice persisted and `<html lang>` followed. Verification is the persisted
`localStorage` value, the `lang` attribute and the rendered strings — not
screenshots.

**Status:** the four commands above pass as of 2026-10-10 (`tsc` clean, `check`
0/0 over 57 files, `npm test` 43/43, `npm run build` 3 static pages, no
`.vercel/output/functions/`). The manual toggle pass has **not** been run yet —
there is no browser in this environment — so Gate B is green on everything that can
be checked from source and still owes that click-through.

---

## Phase C — Tier 1 components

All of these live in `src/components/ui/` (A1), take their copy from `t(...)`
(Phase B), and use only existing tokens. Each bullet lists the **file**, the
**reason it exists**, the **contract**, and its **test**.

### C1 — `summaryStrip.tsx` — the "Resumen" KPI row  *(highest impact)*

- **Why:** today the only aggregate is a text string built in
  `dashboard.tsx:106-123` ("3 pendientes · $12.500 por cobrar"). The operator opens
  the app to answer *"how much is owed to me?"*, and currently has to read it out of
  a collapsed-section subtitle.
- **What:** three or four `.card` tiles above `Mis productos` inside `.mainContent`:
  **Por cobrar**, **Cobrado**, **Ventas pendientes**, **Productos**.
- **Contract:** `SummaryStrip({ items: SummaryItem[] })` where
  `SummaryItem = { label, value, tone?: 'default' | 'danger' | 'success' }`.
  Values render with `.tabular` numerals at `--text-2xl`; labels at `--text-xs`
  uppercase-tracked (`--tracking-label`), matching the badge/label rule.
  `--color-danger-text` only when something is actually overdue — colour never
  carries meaning alone, the label does.
- **Derivation:** a pure `summarisePurchases(purchases)` helper in
  `src/helpers/summary.ts` (owed, collected, pending count) so the maths is
  testable without React and duplicated zero times.
- **Grid:** 2×2 on phones (`grid-template-columns: repeat(2, minmax(0,1fr))`), 4-up
  from `640px` — the existing breakpoint in `dashboard.css:784`, no new one.
- **Tests:** `src/helpers/summary.test.ts` — empty list, all paid, mixed, an
  over-paid purchase (never negative owed) → uses the same
  `Math.max(0, agreed - paid)` guard as `dashboard.tsx:114`.

### C2 — Skeletons wired in

Per A2. Replace the two full-area spinners (`dashboard.tsx:319-323`,
`salesSection.tsx:48-55`) with `SkeletonCard` ×3 / `SkeletonRow` ×4, keeping the
`loading && length === 0` guard exactly as it is. The product grid skeleton must
use the **real** grid classes so the placeholders occupy the same boxes.

### C3 — `field.tsx` — `TextField` / `TextArea` / `SelectField`

- **Why:** every field in `dashboard.tsx:353-379` and `addPurchaseModal.tsx`
  hand-assembles `<label className="label" htmlFor>` + `<input className="input">`
  + `.fieldHint` + `.fieldError`. `DESIGN.md` §4 defines all four parts but nothing
  enforces them together — so `aria-invalid` / `aria-describedby` are easy to forget
  and impossible to notice. (`automations-front`'s `FormInput` gets exactly this
  wrong: label-click-focuses-input instead of `htmlFor`, no `aria-invalid`.)
- **Contract:** one `FieldShell` owning `id`, `label`, `hint`, `error`; then
  `TextField`, `TextArea`, `SelectField` built on it. The shell renders the label
  with `htmlFor={id}`, and wires `aria-describedby` to the hint **and** error ids
  (both present, so validating never shifts layout — the existing rule at
  `DESIGN.md` §4). `error` implies `aria-invalid="true"`.
- **Required demo case:** the hint/error slot share one line so the form does not
  jump; assert it by construction (one `.fieldHint` **or** `.fieldError` node, never
  both).
- **Tests:** `src/components/ui/field.test.ts` cannot run in node without a DOM, so
  this is covered by a **pure** helper instead: `src/helpers/fieldIds.ts`
  (`fieldIds(id)` → `{ inputId, hintId, errorId }`) tested for stability and
  uniqueness, with the JSX wiring reviewed by the `ui-verifier` subagent.

### C4 — `currencyInput.tsx`

- **Why:** money is rendered with `formatCurrency` everywhere but *captured* with a
  raw `<input type="number">` (`dashboard.tsx:386-391` and the fee/payment fields).
  `type="number"` shows no separators, accepts `e`/`+`/`-`, and on some mobile
  keyboards offers a spinner.
- **Contract:** `value: number | null`, `onValueChange(n | null)`, renders
  `inputMode="numeric"`, `autoComplete="off"`, formats on blur
  (`180000` → `180.000`), strips non-digits while typing, empty → `null` (never
  `NaN`, never a silent `0`).
- **Helper:** `src/helpers/parseCurrencyInput.ts` (`'$ 180.000'` → `180000`,
  `''` → `null`, `'abc'` → `null`), consumed by the component.
- **Tests:** `src/helpers/parseCurrencyInput.test.ts` — the cases above plus a
  round-trip through `formatCurrency` for 0 / 1 / 999 / 1_000_000.

### C5 — `searchInput.tsx` + `useDebouncedValue`

- **Why:** there is **no search anywhere**. Filtering products by name and sales by
  client/phone is the first thing an operator wants past ~10 rows.
- **Contract:** `<input type="search">` with a leading magnifier (`aria-hidden`), a
  clear button (`aria-label`), `aria-label={t('common.search')}`, and a visually
  hidden live region announcing the match count while typing.
- **Helper:** `src/hooks/useDebouncedValue.ts` — `useDebouncedValue(value, 200)`,
  built from `setTimeout` + cleanup. No lodash.
- **Tests:** the filtering itself is pure and gets the coverage:
  `src/helpers/filterPurchases.ts` and `filterProducts.ts` (case-insensitive,
  accent-insensitive via `String.prototype.normalize('NFD')`, phone matched on
  digits only). The hook is exercised separately with `vi.useFakeTimers()` in
  `src/hooks/useDebouncedValue.test.ts` — still node-only, no DOM.
- **Empty result is not an error:** a search with no matches shows `EmptyState`
  (`art="products"` / `"sales"`) with a "sin resultados" variant, never a banner —
  `DESIGN.md` §4: empty ≠ failure.

### C6 — `salesToolbar.tsx` — sort + filter for "Mis ventas"

- **Why:** `salesSection.tsx:26-32` sorts pending-first with no user control, and
  there is no way to look at only the paid ones.
- **What:** a toolbar above the list: a **tri-state status filter**
  (Todas / Pendientes / Pagadas) + a sort `<select>` (Más reciente · Cliente ·
  Monto pendiente) + a result count.
- **Contract:** `SalesToolbar({ status, onStatusChange, sort, onSortChange, count })`
  — it holds **no state itself** (the section does), so the filter and the list can
  never disagree.
- **Tri-state control:** three `<button aria-pressed>` inside a `role="group"`, the
  same pattern as `languageSwitch` (B5), so both segmented controls read the same.
  Tokens: `--color-primary-subtle`, `--color-surface`, `--color-border`.
- **Default:** the filter defaults to `todas`, and the existing pending-first *sort*
  stays the default order. Defaulting the filter to `pendientes` would hide rows the
  user already had on screen — a regression dressed as a feature.
- **Tests:** extend `src/helpers/filterPurchases.ts` with
  `sortPurchases(rows, key)` — null-safe (`agreed_fees` / `amount_paid_so_far` are
  nullable in the type) and stability-preserving, so equal keys keep the newest-first
  order the query returned.

### C7 — `paymentProgress.tsx`

- **Why:** `.purchaseProgress*` already exists (`dashboard.css:306-330`) but is only
  rendered inside `purchasesModal`. The cross-product "Mis ventas" rows
  (`salesSection.tsx:89-100`) show money and a badge, but not how *close* a client is
  to paid.
- **Contract:** `PaymentProgress({ paid, total })` → `role="progressbar"` with
  `aria-valuenow` / `aria-valuemin` / `aria-valuemax` / `aria-valuetext`, the text
  being the `"$paid de $agreed"` sentence `DESIGN.md` already requires alongside the
  fill so colour never carries payment status alone.
- **Guards:** `total <= 0` renders 0 % (never `NaN`, never a 1px sliver); an
  over-payment caps the **fill** at 100 % while the label keeps naming the real
  numbers.
- **Extraction:** move the block out of `purchasesModal.tsx` and have the modal
  consume the component — one implementation, two call sites.
- **Tests:** a pure `paymentRatio(paid, total)` helper clamped to 0…1, with cases for
  0, null, over-paid and negative.

### C8 — `toast.tsx` + `useToast`

- **Why:** successes currently have **no** feedback — the only signal is the dialog
  vanishing. `DESIGN.md` §4 (`theme.css:655`) says critical **errors** are banners,
  never toasts; this is the complement for confirmations ("Producto guardado",
  "Pago registrado").
- **Contract:** one `<ToastRegion>` at the island root; `useToast()` exposes
  `show({ message, tone })`. The region is `role="status" aria-live="polite"` —
  non-critical only, since an assertive region would interrupt a screen reader
  mid-sentence. Auto-dismiss at roughly 4 s, dismissible by a real button, and the
  timer pauses on `:hover` / `:focus-within`.
- **Rules:** at most 3 stacked, identical messages collapse, **never** used for a
  failed mutation (that stays a banner). `prefers-reduced-motion` → fade only.
- **Tokens:** `--color-surface`, `--radius-md`, `--shadow-elevated`, `--z-overlay`,
  `--color-success-text` / `--color-danger-text` for the leading rule. Bottom-centre
  above the safe area on phones; bottom-right from `640px`.
- **Tests:** `src/helpers/toastQueue.ts` — a pure reducer over add / auto-expire /
  collapse / cap-at-3. The component stays thin.

### C9 — `copyablePhone.tsx`

- **Why:** `client_phone_number` is inert text joined into a meta line
  (`salesSection.tsx:78`). On a phone, one tap to call or copy is a direct workflow
  win in the one place the number matters.
- **Contract:** an `<a href="tel:…">` (digits normalised, a leading `+` preserved)
  **plus** a small `btnIcon` copy button with an `aria-label`, which uses
  `navigator.clipboard.writeText` and confirms through C8's toast. If the Clipboard
  API is unavailable the button renders **nothing** — it must not throw and must not
  fail silently behind a live-looking control.
- **Tests:** `src/helpers/phone.ts` — `toTelHref(raw)` and `formatPhone(raw)` handle
  spaces, `+`, dashes and parentheses, and `null` → no link.

### C10 — `exportCsv` + an "Exportar" button in the sales toolbar

- **Why:** "Mis ventas" is exactly the list an operator reconciles against WhatsApp
  and bank transfers. Highest-value export, zero backend.
- **Contract:** `src/helpers/exportCsv.ts` exposing `toCsv(rows, columns): string`
  and `downloadCsv(filename, csv)`. Sales columns: cliente, teléfono, producto,
  fecha, acordado, pagado, pendiente, estado.
- **Rules:**
  - **Raw numbers**, not `formatCurrency` output — the sheet must be arithmetic, not
    decorated.
  - RFC-4180 quoting: wrap in `"` and double any internal `"` when a field contains
    a comma, quote or newline.
  - A UTF-8 BOM is prepended so Excel opens accented names correctly.
  - `Blob` + `URL.createObjectURL`, revoked after the click. No dependency.
  - Filename `ventas-YYYY-MM-DD.csv`; the **header row is translated** via `t(...)`
    so the file matches the UI language.
- **Tests:** `src/helpers/exportCsv.test.ts` — quoting, embedded newline and quote,
  header row, the BOM byte, and a `null` amount becoming an empty cell rather than
  `0`.

### Phase C gate

```sh
npx tsc --noEmit && npm run check && npm test && npm run build
test ! -d .vercel/output/functions && echo "static OK"
```

Then run the `ui-verifier` subagent (it reads the source against `DESIGN.md`
§4/§10) on every new `ui/` primitive before moving to Phase D.

---

## Phase D — Tier 2 components

Same rules as Phase C. These are lower priority and each is independently
shippable — stop after any of them without leaving the app half-changed.

### D1 — `errorState.tsx`

- **Why:** `EmptyState` exists; there is no matching *error* surface, so
  `.banner--danger` is re-assembled by hand in `salesSection.tsx:37-43`,
  `dashboard.tsx:308-315` and `lib/supabase.ts`. Three copies of one pattern.
- **Contract:** `ErrorState({ title, body, onRetry })` rendered inside a
  `.banner banner--danger` with `role="alert"` and a real Retry button. It keeps
  the existing rule: a blocking failure is a **persistent banner with a way out**,
  never a toast.
- **Result:** the three call sites converge; `lib/supabase.ts` keeps its own
  minimal version because it runs before React exists (documented as the one
  intentional duplicate).

### D2 — `firstRunChecklist.tsx`

- **Why:** a three-entity tool has exactly three things to learn: create a product →
  register a purchase → register a payment. A checklist beats a tour.
- **Contract:** a `.card` above the KPI strip listing the three steps, each linking
  to the existing action, with completion derived from **live data**
  (`products.length > 0`, `allPurchases.length > 0`, any payment recorded) — derived,
  never stored, so it can never disagree with reality.
- **Dismissal:** one `localStorage['cupos.checklistDismissed'] = '1'` flag, with a
  real "Ocultar" `btnGhost`; the card renders nothing once every step is complete,
  so dismissal is only for the "I already know this" case.
- **Not** `react-joyride`: an overlay tour fights the phone form factor and needs
  positional recalculation on resize.
- **Why not a toast instead:** an onboarding nudge that disappears after 4 seconds
  cannot be completed at the reader's pace.

### D3 — `barChart.tsx` (hand-rolled SVG)

- **Why:** after C1 the KPI strip shows totals; a "cobrado por mes" bar chart is the
  one visual that adds information rather than decoration.
- **Contract:** `BarChart({ data: { label, value }[], ariaLabel })` — an inline
  `<svg viewBox="0 0 100 40" preserveAspectRatio="none">` with `role="img"` and an
  `aria-label` carrying the numbers (an SVG chart is decorative without that).
  Bars fill with `currentColor` and the component sets `color: var(--color-primary)`
  — the same technique `emptyState.tsx:21-41` already uses for its illustration, so
  there is one SVG idiom in the codebase.
- **Not** `d3` / `recharts`: ~250 KB for one chart, and a second styling vocabulary.
- **Evidence:** the `aria-label` must read as a sentence with the real values, since
  the visual is `aria-hidden`.
- **Tests:** `src/helpers/monthlyTotals.ts` — pure bucketing of payments/purchases by
  `YYYY-MM`, ordered, gap-filled with zero months, timezone-safe (reuse the
  `YYYY-MM-DD` → local-midnight rule from `date.ts:17`).

### D4 — sticky header + mobile action bar

- **Why:** `DESIGN.md` §1 says the app is used one-handed on a phone. `.topBar` is
  already sticky (`dashboard.css:25-36`), but the page's primary action
  ("Nuevo producto", `dashboard.tsx:283-302`) scrolls away with the header.
- **Contract:** a bottom action bar that appears only once the page header's CTA has
  scrolled out of view, holding the **same** action. Implemented with one
  `IntersectionObserver` on the header CTA (no scroll listener, no rAF loop).
- **Rules:** `position: fixed` at `--z-sticky`, `env(safe-area-inset-bottom)`
  padding, hidden while any modal is open (the modal already locks background
  scroll), and `hidden` at rest so it is out of the a11y tree — the same `hidden`
  contract `collapsibleBody` uses (`dashboard.css:688`).
- **Never two primaries:** the bar renders only when the header CTA is off screen,
  so the "one primary action per screen" rule holds at every scroll position.

### D5 — `usePagination` / "Ver más" for "Mis ventas"

- **Why:** the list grows forever; today it renders every purchase at once.
- **Contract:** `usePagination(items, { pageSize: 20 })` → `{ visible, hasMore,
  loadMore, remaining }`. A `btnSecondary` "Ver más (N restantes)" button — no
  virtual scroller, no dependency.
- **Why not `@tanstack/react-virtual`:** a phone screen shows ~8 rows; windowing
  buys nothing at 20 and costs a dependency, a measurement pass and a scroll
  container that fights the sticky action bar from D4.
- **Reset:** the page resets to 1 whenever the filter, sort or search changes —
  otherwise "Ver más" reappears on a list the user just narrowed.
- **Tests:** `src/helpers/usePagination` logic factored into a pure
  `paginate(items, page)` helper; `pageSize 20`, last partial page, empty input.

### D6 — `dateRangeFilter`

- **Why:** the operator thinks in periods ("this month", "since the 15th").
- **Contract:** two native `<input type="date">` fields (Desde / Hasta) in the sales
  toolbar, filtering client-side over the already-fetched rows. Native inputs match
  the phone-first rule and need no `react-datepicker`.
- **Validation:** `hasta < desde` shows a `.fieldError` and does not filter, rather
  than silently returning nothing.
- **Tests:** extend `filterPurchases.ts` with `withinRange(rows, from, to)` —
  inclusive bounds, `null` on either side means unbounded, and the same
  local-midnight comparison rule so a `date` column never slips a day.

---

## Phase E — Docs, gates, commit

`AGENTS.md` requires `DOCUMENTATION.md` to be updated **in the same change** as
anything that alters architecture, routes, the data model, hooks or known issues —
and its "Last documented" line bumped.

> **Scope note (2026-10-10):** Phases **A** and **B** have shipped, so only the
> A/B rows of the E2 roster below are real today. The `FieldShell` / `CurrencyInput`
> / `SummaryStrip` / `Toast` / `PaymentProgress` / `BarChart` rows and the
> `useToast` / `usePagination` / `useDebouncedValue` / `summary` / `filterProducts`
> rows describe **Phase C/D**, which are not built; `DOCUMENTATION.md` must not
> claim them until they are. The `Skeleton*`, `LanguageSwitch` and `useLanguage` /
> `useFormatters` entries under §10.2/§10.3/§10.5 *are* documented because they
> exist.

### E1 — `DESIGN.md`

- §4: one entry per new primitive, each stating its contract and its a11y promise.
  At minimum: `FieldShell`/`TextField` (label wiring, hint/error shared slot),
  `CurrencyInput` (numeric keyboard, blur formatting), `SummaryStrip` (tone never
  carries meaning alone), `Skeleton*` (decorative, container owns the live region),
  `Toast` (polite, for confirmations only — the banner rule is unchanged),
  `PaymentProgress` (`role="progressbar"` + the `$paid de $agreed` sentence),
  `LanguageSwitch`/segmented control (`aria-pressed`, `role="group"`),
  `BarChart` (`role="img"` + a numeric label), the sticky action bar's `hidden`
  contract.
- §4 preamble: the A4 JSDoc sentence, and the note that components which take copy
  as props (`EmptyState`, `ConfirmModal`, `Modal`, `Button`) are i18n-agnostic by
  design.
- §3 or §8: how language affects formatting — `es` → `es-CO`, `en` → `en-US` — and
  that the segmented control uses two-letter codes, never words.
- §7: add don'ts — no `aria-pressed` tablist misuse, no toast for a failed mutation,
  no chart dependency.
- **No token changes**, so §2/§5/§6 should need no edits. If a new token is ever
  genuinely required, it must be justified here first.

### E2 — `DOCUMENTATION.md`

| Section | Change |
| :-- | :-- |
| §2 Stack | Add `i18next` + `react-i18next` (client-side, ES/EN, `localStorage['cupos.lang']`). |
| §4 Env vars | **No change** — explicitly note that i18n added no `PUBLIC_*` variable. |
| §6 Structure | Add `src/i18n/`, `src/components/ui/`, and the new helpers/hooks. |
| §7 Routes | **No change** (no route variants). State that explicitly so a future reader knows it was a decision. |
| §8 Architecture | The i18n singleton, the two React roots sharing it, the `Layout.astro` inline script, and the Astro-owned-copy tradeoff (R2). |
| §10.2 Hooks | `useLanguage`, `useFormatters`, `useDebouncedValue`, `usePagination`, `useToast`. |
| §10.3 Components | One row per new component. |
| §10.4 Helpers | `summary`, `parseCurrencyInput`, `filterPurchases`, `filterProducts`, `paymentRatio`, `toastQueue`, `phone`, `exportCsv`, `monthlyTotals`, `fieldIds`; and the `locale` parameter on `currency`/`date`. |
| §10.5 Styling | New `.skeleton*`, `.segmentedControl`, `.toast*`, `.summaryStrip`, `.actionBar` live in `theme.css` (primitives) / `dashboard.css` (layout) per the split. |
| §11 Build | Bundle-size note for the island; deploy shape **unchanged** — no functions dir. |
| §13 Status | New gate results. |
| §14 Tech debt | Close whatever this retires (the hand-rolled spinner-only loading states, the triplicated banner); add anything new (e.g. `harnessTmp.tsx` if it is still a leftover). |
| §15 Git history | One row for the commit. |
| §16 Next steps | Remove shipped items, re-rank the remainder. |
| Header | Bump "Last documented". |

### E3 — `CHANGELOG.md`

One entry: adopted patterns, ES/EN, the component list, and the **measured**
bundle-size delta from B10.

### E4 — `prompts/PROMPT-03-UI-UX-ENHANCEMENTS.md`

Mirror this file with the Goal / Stack / What to build / Constraints / Done when /
Out of scope headings `PROMPT-01` and `PROMPT-02` use, and mark it done on ship.

**Status:** not created. Only Phases A/B have shipped, so mirroring this plan now
would open a prompt file that is half history and half unbuilt C/D work. The shipped
half is recorded in `CHANGELOG.md`; the remaining half should become `PROMPT-03`
when Phase C starts, so it can be marked done exactly once, on ship.

### E5 — Full gate run

```sh
npx tsc --noEmit
npm run check
npm test
npm run build
test ! -d .vercel/output/functions && echo "static OK"
git --no-pager diff --stat
```

Then the two read-only subagents, in parallel:
- **`gate-verifier`** — re-runs the gates on the current tree and returns PASS/FAIL
  with raw evidence.
- **`ui-verifier`** — audits every touched component/style against `DESIGN.md`.

Finish with **`docs-sync`** to catch drift this plan did not anticipate.

### E6 — Commit

Delegate to **`commit-steward`** with explicit paths (never `git add -A`), one
Conventional Commit. Suggested subject:
`feat: add ES/EN i18n, design-system primitives and dashboard UX improvements`.

Do **not** commit `plan.md`'s scratch state, `dist/`, `.astro/`, `.vercel/` — all
already git-ignored (PROMPT-02).

---

## Execution order

Phases run in sequence; steps inside a phase may be batched, but each phase ends at
its gate with a **green build and an unchanged deploy shape**.

```
A1 ──► A2 ──► A3 ──► A4 ──── gate A ────┐
                                        │
                     B1 ──► B2 ──► B3 ──┴──► B4 ──► B5 ──► B6 ──► B7 ──► B8 ──► B9 ──► B10 ──► gate B
                                                                                                │
                                     C1 ──► C2 ──► C3 ──► C4 ──► C5 ──► C6 ──► C7 ──┐            │
                                     C8 ──► C9 ──► C10 ───────────────────────────────┴─► gate C ─┘
                                                                                                │
                                     D1 … D6 (any order, each independently shippable) ──► gate D
                                                                                                │
                                     E1 ──► E2 ──► E3 ──► E4 ──► E5 ──► E6 ──────────────► done
```

**Ordering rationale, one line each:**

- **B before C/D** — every label in Phase C/D is born translated; retrofitting means
  writing each string twice.
- **A2 before C2** — the skeleton primitives must exist before they are wired in.
- **B5 before C6** — the segmented control is one pattern; build it once in B and
  reuse it in the toolbar instead of inventing a second.
- **C1 before D2/D3** — the KPI strip, the checklist and the chart all read the same
  derived totals, so `summarisePurchases` and its tests come first.
- **A3 last within A** — code-splitting changes the build output; that diff is easier
  to read once the primitives have landed.
- **E last** — docs describe what actually shipped, not what was intended.

## Verification matrix

Run after **every** phase, not just at the end.

| Gate | Command | Pass condition |
| :-- | :-- | :-- |
| Types | `npx tsc --noEmit` | clean, including the typed `t()` keys from B3 |
| Astro | `npm run check` | clean |
| Unit | `npm test` | green; covers everything listed in B9 and C1/C4/C5/C6/C7/C8/C9/C10/D3/D5/D6 |
| Build | `npm run build` | succeeds |
| **Static shape** | `test ! -d .vercel/output/functions` | **must be true** — a functions dir is a regression, not a warning |
| Hermetic | `npm run build` with no Supabase creds / no network | still succeeds (no build-time fetch added) |
| Bundles | the `npm run build` chunk table | dashboard island < 250 KB uncompressed (B10) |
| i18n parity | `npm test -- parity` | `es` and `en` key sets identical |
| Design | `ui-verifier` subagent | no magic numbers, no raw hex, no `!important`, no bare `outline: none`; every new colour traces to a token |
| Docs | `docs-sync` subagent | `DOCUMENTATION.md` / `DESIGN.md` / `CHANGELOG.md` match the code; date stamp bumped |

### Forbidden in the diff — grep before committing

```sh
git --no-pager diff -U0 | grep -E '^\+' \
  | grep -nE '!important|#[0-9a-fA-F]{3,8}\b|output: .server.|prerender = false|middleware|pages/api'
```

Any hit is a design-contract or static-frame violation: fix it, do not justify it.

---

## Risks & open decisions

| # | Risk | Mitigation / decision |
| :-- | :-- | :-- |
| R1 | `i18next` + `react-i18next` bloat the island bundle | **Resolved.** B10 measured the real number: eager `/dashboard` JS went 223 KB → **203 KB** (ceiling 250 KB), because A3's `lazy()` chunks more than paid for i18next's +60 KB in the vendor chunk. The `useSyncExternalStore` fallback was not needed and should not be built unless the ceiling is breached later. |
| R2 | **Astro-baked copy is Spanish-only** until the inline script runs; `<title>`/meta on `/` and 404 are static | Accepted, and **narrower than feared**: in the built output all three pages ship `<html lang="es">` with `data-title-en` / `data-description-en` / `data-skip-en` and the `__cuposApplyLang` inline script, so only the *404 body copy* is English-less (R2 is now `DOCUMENTATION.md` §14.17). `/dashboard` is `client:only` behind auth, so any flash lands on an island already showing an auth/skeleton screen. If true per-language static HTML is ever needed, the answer is `/en/…` route variants generated at build time — static, but it doubles the pages and every link, hence out of scope here. |
| R3 | A language switch that does not re-render derived strings (the `salesMeta` memo) | B8 makes `i18n.language` a required dependency of any sentence-building memo; parity tests plus a manual ES↔EN toggle catch omissions. |
| R4 | Typed `t()` keys raise the cost of adding copy | Intentional: a typo becomes a `tsc` failure. With no linter yet, the type check *is* the safety net. |
| R5 | Skeleton flash-of-reflow when data lands | Skeletons reuse the real grid/row classes, so nothing moves when the data arrives. |
| R6 | A toast creeping in for errors — the exact thing `DESIGN.md` forbids | C8 states the rule in the component's JSDoc, and E1 adds it to `DESIGN.md` §7 as a don't. |
| R7 | `components/ui/` drifting into a second design vocabulary | A1's one-way dependency rule, plus `ui-verifier` at every gate. |
| R8 | Scope creep into Phase D before C is gated | D is explicitly sequenced after a green C gate. |

---

## Explicitly out of scope

Recorded so these are decisions, not omissions:

- Bulk row actions / multi-select, command palette, drag-to-reorder, dark mode.
- **Optimistic updates** — the DB trigger recomputes `amount_paid_so_far` and
  `is_fully_paid`, so an optimistic row would fight the server's own arithmetic.
  Keep the existing refetch-after-mutation flow.
- `@tanstack/react-query`, `react-dropzone`, `useInfiniteScroll` — revisit only if
  the app grows past two screens.
- i18n route variants, `Accept-Language` negotiation, RTL, a third language.
- Any change to the Supabase schema, RLS, the storage bucket or the trigger.

---

## Progress checklist

Tick as each lands. Keep this honest rather than optimistic — it is the tracker.
Last updated **2026-10-10** (Phase A + Phase B shipped; Phase B owes a manual
click-through; C/D not started).

- [x] **A1** `components/ui/` + barrel + documented convention
- [x] **A2** skeleton primitives in `theme.css` + `skeleton.tsx`
- [x] **A3** lazy dialogs; chunks verified; still no `functions/`
- [x] **A4** JSDoc convention recorded in `DESIGN.md`
- [x] **A5** environment banner — *skipped by default*
- [x] **A6** route guard — already done
- [x] **gate A** green, static shape unchanged
- [x] **B1** `i18next` + `react-i18next` installed
- [x] **B2** `src/i18n/index.ts` singleton (idempotent init)
- [x] **B3** `es.ts` / `en.ts` + typed keys, plurals via i18next
- [x] **B4** `useLanguage` (storage + `lang` + title sync)
- [x] **B5** `languageSwitch` in the dashboard top bar **and** on login
- [x] **B6** `Layout.astro` inline script for the three shell strings
- [x] **B7** locale-aware `formatCurrency` / `formatDate` + `useFormatters`
- [x] **B8** every literal replaced with `t(...)`, including `lib/supabase.ts`
       (swept 2026-10-10: the only literals left outside the locale files are
       repository error strings — `DOCUMENTATION.md` §14.18)
- [x] **B9** parity + interpolation + formatter + `useLanguage` tests
- [x] **B10** bundle measured and recorded
- [~] **gate B** commands green (see the note at the gate); ES↔EN toggled and
      persisted on `/` and `/dashboard` still owes a manual pass
- [ ] **C1** `summaryStrip` + `summarisePurchases`
- [ ] **C2** skeletons wired into both first loads
- [ ] **C3** `field.tsx` primitives
- [ ] **C4** `currencyInput` + `parseCurrencyInput`
- [ ] **C5** `searchInput` + `useDebouncedValue` + filters
- [ ] **C6** `salesToolbar` (status + sort + count)
- [ ] **C7** `paymentProgress` extracted and reused
- [ ] **C8** `toast` + `useToast` + `toastQueue`
- [ ] **C9** `copyablePhone` + `phone` helpers
- [ ] **C10** `exportCsv` + toolbar button
- [ ] **gate C** green + `ui-verifier` clean
- [ ] **D1** `errorState`
- [ ] **D2** `firstRunChecklist`
- [ ] **D3** `barChart` + `monthlyTotals`
- [ ] **D4** sticky header / mobile action bar
- [ ] **D5** `usePagination` / "Ver más"
- [ ] **D6** `dateRangeFilter`
- [ ] **gate D** green
- [x] **E1** `DESIGN.md` updated
- [x] **E2** `DOCUMENTATION.md` updated + date bumped
- [x] **E3** `CHANGELOG.md` entry with the measured bundle delta
- [ ] **E4** `prompts/PROMPT-03-UI-UX-ENHANCEMENTS.md` mirrored and marked done
      (deliberately deferred until Phase C starts — see E4 note)
- [ ] **E5** full gate run + `gate-verifier` + `ui-verifier` + `docs-sync`
      (the four commands pass; the subagent pass is still owed)
- [ ] **E6** committed via `commit-steward`

### Post-ship (owner action, not code)

- [ ] Confirm `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY` are set on the Vercel
  project for **Production and Preview** (unchanged by this work — i18n adds no
  variable).
- [ ] Verify the deployed build has no `/functions` output and that ES↔EN works on
  the real URL (the choice is per-browser via `localStorage`).

---

## What this plan deliberately does not copy from `automations-front`

For the record, so nobody re-litigates it:

- The Bootstrap 5.3 + Argon theme (~522 KB) and its parallel token set — it would
  sit beside `theme.css` as a competing source of truth.
- Magic-number spacing, raw hex values, `!important`, duplicated rules, and
  hand-rolled or removed focus states — the exact things `DESIGN.md` and
  `ui-verifier` exist to prevent.
- `FormInput`'s label / `aria-invalid` handling, `sweetalert2`, `react-joyride`,
  their *untyped* i18next setup, Redux/RTK, `d3`, `lodash`, `luxon`, `dompurify`,
  `crypto-js`, `js-cookie`, `jwt-decode`.
- `useInfiniteScroll` — Phase D's "Ver más" button is more predictable on a phone
  and does not fight the sticky action bar.
- Their route-metadata registry and `_v2` component filenames.
