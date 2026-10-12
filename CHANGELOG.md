# Changelog

What changed, and **why**. `DOCUMENTATION.md` is the reference for how the app works
today and `DESIGN.md` for how it looks; this file records the reasoning behind the changes
that produced them. Newest entry first.

---
## 2026-10-10 — ES/EN i18n, `ui/` primitives and lazily-loaded dialogs

**Why:** two problems with the same root. Every user-facing string was a literal in
a component, so the copy could not exist in a second language and a typo was
invisible to every gate; and every dialog was statically imported, so
`dashboardApp` (and the login page) paid for product-detail, purchases, add-purchase
and confirm before the user could possibly need them. This pass moved the copy into
resource files behind a typed `t()` and the dialogs behind `lazy()`, without adding
a server, a route or an env var.

**Code**

| Change | Detail |
| :-- | :-- |
| **New** `src/i18n/` | `index.ts` (the singleton: `createInstance` + `initReactI18next`, both locales inlined, `escapeValue: false`, `returnNull: false`, a dev-only `missingKey` warn), `languages.ts` (pure rules: `AppLanguage`, `localStorage['cupos.lang']`, resolution **stored → browser → `es`**, `LOCALE_TAG`), `types.ts` (`CustomTypeOptions` so `t()` keys are compile-checked, plus the `window.__cuposApplyLang` contract), `locales/es.ts` (**reference locale**) and `locales/en.ts`. |
| **Fixed while documenting** | The resolution order was implemented (`resolveLanguage`) and tested but **never called** — `init()` used the defaulted `readStoredLanguage()`, so a first visit from an English browser stayed Spanish and the Layout comment's "the browser guess lives in the bundle" was untrue. `init({ lng })` now applies `resolveLanguage(readRawStoredLanguage(), navigator.language)` (new `readRawStoredLanguage()` keeps the defaulting from hiding the hint), with `src/i18n/index.test.ts` pinning it — verified by mutation (removing the hint fails 2 of its 5 cases). |
| **New** `src/hooks/useLanguage.ts` · `useFormatters.ts` | The language + setter, and the pure `formatCurrency`/`formatDate` bound to the active locale. `setLanguage` funnels through the one `applyLanguage()` path (change → persist → sync the document) so nothing can drift from the switch. |
| **New** `src/components/ui/languageSwitch.tsx` | The ES/EN control, on **both** screens. `role="group"` + `aria-pressed` buttons (not a tablist: these are two toggles over a stored preference and a tablist would owe an arrow-key contract), two-letter visible labels with the full name in `aria-label`. |
| `Layout.astro` | Renders the Spanish `<title>`/`<meta description>`/skip link — the build-time truth — and carries the English counterparts from the same `en.ts` as `data-*` attributes, read by a small `is:inline` script that publishes `window.__cuposApplyLang`. No hand-kept translation map, no SSR. |
| Every component / page / `lib/supabase.ts` | Literals replaced with `t(...)`; the env guard's message is now `errors.configMissing` interpolated with the missing variable names. A repository/hook that throws nothing and returns `RepoResult<T>` was already the shape that made this mechanical. |
| `src/components/ui/` (Phase A) | Barrel + JSDoc convention, `Skeleton*` placeholders replacing the spinner-only first loads, and `LanguageSwitch`. Screen components stay flat; a `ui/` primitive may never import a screen. |
| Lazy dialogs | `productDetailModal`, `purchasesModal`, `addPurchaseModal`, `modal` and the shared `button` are separate chunks now. The island's **eagerly-preloaded JS went down 20 KB**, which is what paid for the language switch. |
| `package.json` | `dependencies` (runtime, bundled into the island by Vite — not devDeps): `i18next@^26.4.3`, `react-i18next@^17.0.16`. |

**Tests:** 22 new (43 total, 9 files). `parity.test.ts` walks both locale trees and
fails on a missing/extra key, an incomplete plural pair or an empty string —
**bidirectionally**, which is what actually keeps `en.ts` honest.
`interpolation.test.ts` asserts both languages use the same placeholders, that a
plural resolves per language without a hand-rolled suffix, and that a missing key
renders its key. `useLanguage.test.ts` covers resolution order, the storage
round-trip and a `localStorage` that throws (private mode), and `index.test.ts`
re-imports the singleton per case to prove the *init* applies the order. All
hermetic: node environment, no jsdom, no network.

**Measured** (`npm run build` at `aab7385` vs now, `_astro/*.js`, raw / gzip):

| | Baseline | Now |
| :-- | :-- | :-- |
| Eagerly preloaded by `/dashboard` | 223 KB / 67 KB | **203 KB / 63 KB** |
| Whole island payload | 443 KB / 125 KB | 510 KB / 150 KB |
| Shared vendor chunk (Supabase; + i18next) | 212 KB / 55 KB | 272 KB / 74 KB |

The 250 KB ceiling is on the eager figure, so it passes with room: i18next costs
~60 KB raw / ~19 KB gzip and the plan's `useSyncExternalStore` fallback was not
needed. `npm run check` is 0 errors / 0 warnings over 57 files (5 hints), `tsc` is
clean, `npm test` is 43/43, and `.vercel/output/functions/` is still absent.

**Docs:** `DOCUMENTATION.md` §1/§2/§4/§6/§7/§8 (new *Internationalization* section
incl. the Astro-owned-copy tradeoff)/§10.2/§10.3/§10.4/§10.5/§11 (new *Bundle
budget*)/§13/§14/§15/§16 + the "Last documented" line; `DESIGN.md` §3/§4/§7.

---
## 2026-10-10 — Hardening pass: env guard, untracked artifacts, a real 404, first quality gates

**Why:** `DOCUMENTATION.md` §14 recorded a cluster of safety and hygiene items that
all had the same shape — the repo worked, but only because of state that lived on one
machine or in one person's head: `.env` was committed (so the Vercel build only worked
*by accident*), `.astro/` churn was tracked, the 404 route pointed at a file that did
not exist, and nothing (`tsc`, tests, `astro check`) was wired up as a gate. This pass
closes those without adding a feature or changing the deploy shape.

**Code**

| Change | Detail |
| :-- | :-- |
| **New** `src/pages/404.astro` | A static "No encontramos esta página" card that reuses the existing `.emptyState` primitive (heading + body + exactly one CTA back to `/`). No island, no React — it emits `404.html`, so the adapter's `{"dest":"/404.html","status":404}` route now lands somewhere intentional. |
| **New** `vitest.config.ts` + 5 `src/**/*.test.ts` files | 19 unit tests over the pure code: `formatCurrency`, `formatDate` (asserting the TZ-independent day, not the ICU wording), `sanitizeSegment`/`getPath`, `getProductImagePath`, and the `RepoResult` helpers (`repoSuccess`, `repoFailure`, `toErrorMessage`, `nowIso`). Repository/hook tests `vi.mock('../lib/supabase')`, so the suite is hermetic: node env, no env vars, no network. |
| `src/lib/supabase.ts` | The env guard now **names the missing `PUBLIC_*` variable** and fails in two places: it writes a readable Spanish `role="alert"` banner into `#main` when a document exists (no more blank page on a misconfigured bundle), then throws at module load so the build fails too — the same message either way. |
| `src/helpers/date.ts` | Docstring corrected to the actual output (`4 de oct de 2026`); the exact connector wording is ICU-provided. No behaviour change. |
| `.gitignore` | Added `dist/` and `.env` (`.vercel`, `node_modules`, `.astro/`, `.env.local` were already listed). Untracked with `git rm --cached .env` and `git rm -r --cached .astro dist`. |
| `package.json` | `"name"` is now `cupos-sitio-web` with a `description`; added `check` (`astro check`) and `test` / `test:watch` (`vitest`) scripts; devDeps `@astrojs/check`, `typescript`, `vitest`. |

**Docs:** `DOCUMENTATION.md` §2/§4/§5/§6/§7/§11/§13/§14/§16 + the "Last documented"
line; `prompts/PROMPT-02-FIX-KNOWN-ISSUES.md` marked done.

**No deploy-shape change:** no route, no `output: 'server'`, no middleware/API route,
no build-time network call. `npx tsc --noEmit` clean, `npm run check` → 0 errors,
`npm test` → 19 passing, and `npm run build` emits `dist/` + `.vercel/output/static`
(3 static pages) with **no** `.vercel/output/functions/`. Deploy precondition
documented loudly: `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY` must be set on the
Vercel project (Production + Preview) **before** the first deploy, since `PUBLIC_*`
values are inlined at build time.


## 2026-10-05 — Product cards become one tap target; a product dialog replaces their buttons

**Why:** every product card carried three buttons ("Editar", "Eliminar",
"Compras") plus a description, a release date and a duplicate of its own ID. On a
phone that is a wall of chrome before you can even read the catalogue, and it read
as a panel of controls rather than a grid of things. The card's job is to be
scan-able and tappable; the actions belong in a surface that has room to explain
them.

**Code**

| Change | Detail |
| :-- | :-- |
| **New** `src/components/productDetailModal.tsx` | What a card opens: the image, a `<dl>` label/value ledger (ID badge, description, release date, value, purchase count), then "Compras (N)" full-width over a row holding "Editar" and "Eliminar". Presentational and action-only — the parent passes the product, the count, `imageVersion`/`getSignedUrl`, the `closing` flag and the three callbacks. |
| `dashboard.tsx` | The card is now a `<button className="card productCard">` — no controls inside, so its children are spans (a `<button>` may not contain a `<div>`/`<h3>`/another control) and the image drops to `alt=""` (decorative: the name is right beside it). It shows image, name, ID badge, value and purchase count; tapping it opens the detail dialog. Added `detailDialog` via `usePresent<Product>` plus `handleOpenDetails` / `handleCloseDetails`, and rendered the dialog *before* the form, purchases and confirm dialogs so the ones it opens sit later in the document and therefore win Escape/Tab. The dialog resolves its product from the live `products` array (falling back to the held snapshot) so an edit saved from the form is visible behind it; `handleConfirmDeleteProduct` now also closes the detail dialog, which would otherwise be left showing a deleted product. |
| `dashboard.css` | `.card.productCard` (compound, so it beats `.card` regardless of load order — the same trick as `.card.purchaseCard`) is now the button surface: `align-items: stretch`, `--space-12` padding/gap, `width: 100%`, left-aligned `--text-sm`, and explicit element resets (`font`, `color`, `cursor`) since the class is on a button. Its `:active` deepens the border instead of shifting the grid cell with a `translateY`. The image bleed was recalculated to that tighter padding. New `productCardMeta`/`productValue`/`productPurchases` and the `productDetail*` set (image, ledger, stacked description row, actions, full-width primary + button row). **Deleted** the now-dead card action CSS: `.productDescription`, `.productFooter`, `.metaRelease`, `.metaValue`, `.actionRow`, `.btnCardAction`, `.btnPurchases`. |

**Docs:** `DESIGN.md` §4 (the product card as a button, how the dialogs stack and
which one owns the keyboard, the product dialog as a read view with an action
list, and the dashboard's layout-only button-class list); `DOCUMENTATION.md` §6
tree, §10.3 / §10.5.

**No deploy-shape change:** no dependency, no route and no build-time work was
added — the dialog is client-side inside the island that already exists. `npx tsc
--noEmit` is clean and `npm run build` still emits `dist/` + `.vercel/output/static`
with **no** `.vercel/output/functions/`. Verified by reading the source against the
`theme.css` tokens (no browser simulation) and by inspecting the built CSS to
confirm the compound selector lands as intended.


## 2026-10-05 — Motion: dialogs animate out, disclosures fold

**Commit:** `9ea91d7` (the code landed together with the components pass below)

**Why:** two things surfaced while reviewing the dashboard. A stray global
`* { padding: 1rem }` rule in `dashboard.css` was padding *every* element in the
app, which is why cards and rows looked either cramped or oddly airy depending on
how deep they sat — the fix was to delete the rule, not to patch each symptom.
And nothing on screen could animate *out*: React unmounts a dialog the instant its
flag flips, so every modal and every collapse snapped shut, while everything else
had crept towards a house style of timed transitions. Both are now expressed as
one motion contract.

**Code**

| Change | Detail |
| :-- | :-- |
| `theme.css` | **Removed the stray global spacing hack** from `dashboard.css` (the `*` rule). Added `--duration-slow` (280ms) and `--ease-exit` (`cubic-bezier(0.4,0,1,1)`) so arriving and leaving can differ: enters decelerate, exits accelerate. Button press feedback, `.card { overflow: hidden }` (so a rounded card clips its own children), the `riseIn` entrance utility applied to banners / empty states / status messages, and a padded, rounded `.collapsibleTrigger`. |
| `dashboard.css` | `fadeOut` / `slideDown` keyframes + `.modalOverlay--closing`, held with `forwards` so nothing flashes back in the gap before React unmounts. Split `.collapsibleBody` into the panel + `.collapsibleBodyInner`, so the fold can reach a true `height: 0` without leaving the padding behind. `riseIn` on payment rows and image previews. |
| **New** `src/hooks/usePresent.ts` | The presence window that makes exits possible: `open(value?)` / `close()` plus `isPresent` / `isClosing` / `value`. The payload is held for the **whole** exit, so a closing dialog never re-renders with different content (the "Editar compra" → "Agregar compra" flash). `EXIT_MS` 180ms matches `--duration-base` by hand — nothing can read a custom property from JS. Reduced motion skips the timer. |
| **New** `src/hooks/useCollapsiblePanel.ts` | The disclosure fold. A collapsed panel *rests* `hidden` (so `aria-controls` resolves and screen readers see a normal hidden region); the hook lifts the attribute only long enough to animate the measured height to `0` through the Web Animations API, because `height: auto` cannot be transitioned. 200ms in / 160ms out. |
| `modal.tsx`, `confirmModal.tsx`, `addPurchaseModal.tsx`, `purchasesModal.tsx`, `dashboard.tsx` | A `closing` prop threaded from the hooks down through all six dialogs; the overlay carries `.modalOverlay--closing` and stops answering Escape/Tab while it animates out. |
| `collapsibleCard.tsx`, `collapsibleSection.tsx` | Both disclosures now fold via `useCollapsiblePanel` instead of flipping `hidden` immediately. |

**Docs:** `DESIGN.md` §4 (modal enter/exit, the fold) and §6 (renamed to "Depth,
elevation & motion", with the duration/easing token table); `DOCUMENTATION.md`
§6 tree, §10.2 (the two UI-only hooks), §10.3 / §10.5, and §13.

**No deploy-shape change:** no dependency was added, the build stays static
(`.vercel/output/functions/` absent), and the motion is pure client-side
CSS + Web Animations inside already-hydrated islands. `npx tsc --noEmit` is clean.
Verified over the Chrome DevTools Protocol against a temporary fixture: a dialog
reaches full opacity by ~280ms on open and is still mid-fade (`opacity 0.80`) at
90ms on close, unmounting after ~180ms; a collapsed section settles at
`height: 0` with `hidden: true`. The throwaway preview harness those checks ran
against is **not** part of the change — it is deleted again after use, and a
leftover one was removed from the tree as well.

---
## 2026-10-05 — General UI components: `Button`, `CollapsibleCard`, and an "Agregar compra" modal

**Commit:** *(pending)*

**Why:** a client purchase could only be created through a small inline form bolted onto
the top of the Compras modal, and every purchase card re-implemented its own expand/collapse
and its own button classes by hand. Two reusable primitives (`Button`, `CollapsibleCard`)
give the dashboard something to build on, and moving "add a purchase" into one modal retires
that second, ad-hoc form.

**Code**

| Change | Detail |
| :-- | :-- |
| **New** `src/components/button.tsx` | General `Button`: `variant` (`primary`/`secondary`/`ghost`/`ghost-danger`/`danger`/`icon`), `size` (`sm`/`md`/`lg`), a decorative `icon`, and `loading` (spinner + `aria-busy` + disabled). Renders a native `<button>` (never an anchor) and passes every other prop through. |
| **New** `src/components/collapsibleCard.tsx` | General foldable **card** — the card counterpart to `CollapsibleSection`. `aria-expanded`/`aria-controls`, body kept mounted and hidden with `hidden`; controlled (`open` + `onToggle`) or uncontrolled (`defaultOpen`). |
| **New** `src/components/addPurchaseModal.tsx` | The single "add / edit client purchase" dialog, wired to `useClientPurchases` (`addPurchase` / `updatePurchase` passed in as props). |
| `purchasesModal.tsx` | The inline purchase form and its "Nueva compra" CTA are **gone**; adding or editing a purchase opens `AddPurchaseModal`. Each purchase now renders as a `CollapsibleCard` (name over phone + badge in the header; progress, actions and payments in the body). |
| `theme.css` | Added `.btnSm` / `.btnLg` and the `.collapsibleCard*` component set. |
| `dashboard.css` | `.purchaseCard` is now only a surface modifier on `.collapsibleCard`; added `.purchaseTitleBlock`; removed the now-dead `.purchaseHeader` / `.purchaseExpandBtn` / `.purchaseForm` rules. |

**Docs:** `DESIGN.md` §4 (button sizes, collapsible card); `DOCUMENTATION.md` §6 tree and
§10.3 / §10.5 component + stylesheet tables.

**No deploy-shape change:** the build stays static (`output: "static"`, no
`.vercel/output/functions/`), `tsc --noEmit` is clean, and no dependency was added.
Verified with headless screenshots at desktop and mobile widths.

---



## 2026-10-05 — Design-system migration: prune dead CSS, fix the heading, reconcile the docs

**Commit:** *(pending)* — closes out the UXonFly migration the previous entries started.

**Why:** the code had moved to `src/styles/theme.css`, but the *documents* had not.
`DESIGN.md` still described the pre-migration look (warm cream/"bone" surfaces, a
fuchsia accent, `--gradient-brand`, `--text-2xs`), and `DOCUMENTATION.md` §8 still
credited `dashboard.css` with classes that no longer exist (`btnNew`, `btnEdit`,
`btnDelete`, `badgePaid*`, `.statusMessage`, `.errorMessage`). Because `theme.css` is
the source of truth and the docs are how the next person learns the rules, the drift
was worth fixing in the same pass as the last code cleanups.

**Code**

| Change | Detail |
| :-- | :-- |
| `dashboard.tsx` | The page `<h1>` had lost its class during the refactor, so the 24px → 32px step at `640px` never applied. Restored `className="title"`. |
| `dashboard.css` | Removed two dead rules (`.pageHeaderText .subtitle`, `.btnNew`) — neither class is rendered anywhere. |
| Deleted | `src/components/Welcome.astro` and its only two consumers, `src/assets/astro.svg` + `src/assets/background.svg`. Unrouted Astro starter leftovers — and the last place the old palette (raw hex, gradients) survived. |

**Docs**

| File | Change |
| :-- | :-- |
| `DESIGN.md` | Rewritten against `theme.css`: §1 atmosphere, §2 palette (accent + slate neutrals + status, no gradient and no second hue), §3 type scale, §4 components (the real button set, 40px/16px inputs, border-first cards, the badge matrix), §5 spacing scale, §6 elevation (`--shadow-elevated`), §7 do's/don'ts, §9 quick-reference. |
| `DOCUMENTATION.md` | §6 tree, §8 stylesheet table, §10.3 component table, §14.8, §16.6 and the date stamp updated; `.errorMessage` → `.fieldError`; "brand-gradient `.submitBtn`" → accent. |
| `CHANGELOG.md` | This entry. |

**No product change beyond the heading fix:** the build stays static (`output: "static"`,
no `.vercel/output/functions/`), `tsc --noEmit` is clean, and no dependency was added.

---


## 2026-10-03 — Project subagents for parallel verification

**Commit:** `chore: add project subagents for parallel verification` — the same commit as this
entry.

**Why:** every verification step around the refactor below was done serially in one
conversation — type-check, build, doc checks, screenshots, the commit dance — and each step's
output (build logs, DOM measurements, `git diff`) crowded out the context the next step
needed. Five project subagents in `.cursor/agents/` split that up, so independent checks can
run in parallel, each in its own context.

| Agent | Job |
| :-- | :-- |
| `gate-verifier` | `npx tsc --noEmit` + `npm run build` + the static-artifact shape check (no `functions/`, no function route in `config.json`) + the static-only source checks → PASS/FAIL with raw evidence. Read-only. |
| `ui-verifier` | Reviews components/styles/layouts against `DESIGN.md` by reading the source (44 px targets, focus ring, token contrast, disclosure ARIA, reduced motion). No browser simulation. |
| `docs-sync` | Audits `DOCUMENTATION.md` / `DESIGN.md` / `CHANGELOG.md` against the code and fixes the drift (routes, data model, hooks, §14 items, §15 history, date stamp). |
| `data-layer-reviewer` | Repositories/hooks/auth against the vendored Supabase skills: one client, `RepoResult<T>` never throws, loading/error states, N+1, cascades, RLS. |
| `commit-steward` | Stages explicit paths (never `git add -A`, so `dist/` stays out) and writes the Conventional Commit, carrying the `GIT_PAGER=cat` / `-F` workarounds this terminal needs. |

**No product change:** these are instructions for the assistants working in this repo. They
add no runtime dependency and no build step, nothing imports them, and `npm run build` and the
static frame are untouched. Documented in `AGENTS.md` and `DOCUMENTATION.md` §12.

**Deliberately not done:** no hooks or CI wiring — the subagents are advisory, and a
build-adjacent tool that could fail CI for reasons unrelated to the change would work against
the "shippable by default" rule. `PROGRESS.md` stays untracked; it is a throwaway note.

---

## 2026-10-03 — Dashboard sections + read-only "Mis ventas"

**Commits:** `66f2031` — *feat: add collapsible dashboard sections and read-only Mis
ventas* (22 files, +2070/−729) · `2f2d731` — *docs: bring the git history table up to date*

**Why:** the dashboard was one long page, and the app could not answer *"who still owes
me?"* without opening a Compras modal per product. Split the page into collapsible
sections and add a read-only sales ledger.

### Added

| File | Why it exists |
| :-- | :-- |
| `src/repositories/authRepository.ts`, `clientsPurchasesRepository.ts`, `productImagesRepository.ts`, `productsRepository.ts`, `purchasesPaymentsRepository.ts`, `types.ts` | One repository per table/bucket/`supabase.auth`, each answering with a `RepoResult<T>` that **never throws**. Reason: hooks were calling Supabase directly and `useProducts.ts` built its *own* client — a second `GoTrueClient`, which Supabase warns about — while `authContext.tsx` imported the client *from that hook*. Now `src/lib/supabase.ts` is the only client, repositories are the only callers, hooks keep just React state plus `loading`/`error`, and a failure becomes a value the UI can render. |
| `src/components/collapsibleSection.tsx` | A disclosure so a section can be shortened instead of burying the next one. Deliberately **not** a card — the trigger is a heading-styled button on the page background, so the product cards and sales rows stay the only surfaces (see *"Don't nest cards inside cards"* in `DESIGN.md`). `aria-expanded` + `aria-controls` on the button; the panel stays mounted and is hidden with `hidden`, so the `aria-controls` target always resolves. |
| `src/components/salesSection.tsx` | The missing overview: every client purchase in one list, pending first. Rows are hairline-separated, not cards. Pending-first is done with a stable sort over the query's newest-first order, so equal keys keep their order. Read-only on purpose (see *Deliberately not changed*). |
| `src/helpers/date.ts` | `formatDate()` renders `4 oct 2026` for sale rows. Needed because a bare `YYYY-MM-DD` (a `date` column) is parsed as **UTC midnight** by `Date`, which shows the *previous day* in Colombia (UTC-5); bare dates get an explicit local midnight. Returns `null` on missing/unparseable input so callers drop the line rather than print "Invalid Date". |

### Changed

| File | Why |
| :-- | :-- |
| `src/components/dashboard.tsx` | Wraps both lists in `CollapsibleSection`s inside a new `.dashboardSections` stack; adds header summaries (`"3 pendientes · $150.000 por cobrar"`, `"4 productos"`) so a collapsed section still says something; reads the full purchases list on mount because "Mis ventas" spans every product, and re-reads it from the refresh button too, since a deleted product's purchases cascade away *in the database* rather than through the hook. |
| `src/hooks/useProducts.ts`, `useProductImages.ts`, `useClientPurchases.ts`, `usePurchasePayments.ts` | Rewritten as thin state layers over the repositories: same public API to components, no direct Supabase import, no duplicated error handling. |
| `src/context/authContext.tsx`, `src/components/loginModal.tsx` | Sign-in/out and session reads go through `authRepository`; the context no longer imports a client from a hook. |
| `src/styles/dashboard.css` | +158 lines of **layout only**: `.dashboardSections`, the `.collapsible*` rules, `.salesList`/`.saleRow`/`.sale*` (12 px gutter), responsive tweaks. Reuses the existing `.badgePaid` / `.badgePaidDone` / `.badgePaidPending` classes — no new badge styles. |
| `src/styles/theme.css` | +4 lines total: `.pageHeaderActions { align-items: center }` (it only had `display: flex`), because the 44 px refresh button sat top-aligned against the ~46.5 px CTA; and `.saleMoney` + `.collapsibleMeta` joined the existing tabular-nums group so compared numbers line up. Tokens/typography stay in `theme.css`, layout in `dashboard.css`. |
| `DOCUMENTATION.md` | §8 flow diagram, §10 component/hook/helper rows, §13 validation re-measured, §14/§16 tech debt corrected, §15 history table (`2f2d731`). |
| `DESIGN.md` | "Sections/disclosure" and ledger-row visual language, extended responsive notes, `formatDate` + disclosure a11y checklist items. |
| `.astro/types.d.ts` | Regenerated by `astro build` (this repo tracks `.astro/`). |

### Removed

- `src/components/harnessTmp.tsx` and `src/pages/harnessTmp.astro` — a throwaway static
  harness used to render and measure the authed dashboard over CDP. Deleted so it cannot
  ship; it also added a third section trigger, which is why the measurements counted three.
- The leftover debug `console.log` in `authGuard.tsx` and a stray `localStorage` write
  (both were already ✅ items in `DOCUMENTATION.md` §16).

### Verified (measured, not assumed)

- `npx tsc --noEmit` → **exit 0** under `astro/tsconfigs/strict` (no tests, no linter here).
- `npm run build` → **exit 0**, 2 pages (`/index.html`, `/dashboard/index.html`) in ~850 ms,
  and stays hermetic (no build-time network).
- `.vercel/output/` = `config.json` + `static/` + an empty `server/`, with **no
  `functions/`** directory → the deploy is still a static site, no server compute. The
  routes in `config.json` are only `filesystem`, the `_astro` cache header and the 404
  fallback; no function route.
- Header centring was measured over CDP, not eyeballed: `.btnRefresh` (44 px) and `.btnNew`
  (46.5 px) share one midline — `cy=104.4` at 390 px and `cy=55.6` at 1280 px — with
  `align-items: center`.
- At 390 px and 1280 px: no horizontal overflow, the section triggers identical
  (358 × 44.5 / 960 × 44.5), 20 px header→sections gap, 12 px sale-row gutter.

### Changes made when this work was resumed, and why

- **Corrected `PROGRESS.md`.** It claimed *"§14 items 2/4/5/6 are closed"* — they are not:
  §14.2 (purchases pagination), §14.4 (client-side-only auth), §14.5 (read-only "Mis
  ventas") and §14.6 (unwired `updatePayment`) are all still open. It also attributed a
  "third demo/extra section" to the dashboard; the app ships exactly two sections, and the
  third trigger belonged to the deleted harness.
- **Reworded `DOCUMENTATION.md` line 3**, which read *"`f36b6a1` + uncommitted repository
  layer & dashboard sections refactor"* — true only until the work was committed. It is now
  SHA-agnostic about the refactor's own commit, so it cannot go stale again.
- **Fixed `DOCUMENTATION.md` §15 "Git history".** It stopped at `b698b2b`, missing both the
  design-system overhaul (`f36b6a1`) and this refactor. It now lists those two and states
  that it covers feature/scaffold commits only, so a docs-only commit cannot leave it stale.
  Committed separately as `2f2d731`, because a table cannot list the commit that edits it.
- **Committed the work** in the repo's Conventional Commits style, staging explicit paths:
  `dist/` and the working notes were deliberately excluded, so no build output was committed
  and no tracked file is left dirty.
- **This file.** Created to hold the reasoning that would otherwise live only in commit
  messages and a throwaway handoff note.

### Deliberately not changed

- **No mutating controls in "Mis ventas" (§14.5).** Editing stays in a product's Compras
  modal, where the payments live; making a row actionable means deciding how to open the
  right modal, which is its own change.
- **No pagination on `fetchAllPurchases` (§14.2).** Fine at this scale; flagged rather than
  fixed, so the sales list keeps matching what the docs describe.
- **No `.env` / `.gitignore` changes (§14.1, §14.3).** Untracking `.env` changes where the
  Vercel build gets its config, so the project's env vars must exist first; untracking
  `.astro/` + `dist/` is repo housekeeping, not part of a UI change.
- **No `Last documented` date bump.** `DOCUMENTATION.md` says `2026-10-04` while this
  environment's clock says `2026-10-03`. The stamp was set deliberately by the session that
  wrote the content, and changing it would trade one unverifiable date for another —
  reconcile only if it matters.
- **`PROGRESS.md` stays uncommitted.** It is the throwaway handoff note, not part of the
  product. This changelog was committed afterwards, together with the subagent tooling it
  now also records (next entry up).

### Notes for whoever runs this next

- **Git pagers:** use `GIT_PAGER=cat` / `git --no-pager`. An unpaged `git diff` in this
  terminal opens `less` and hangs the session. `--no-pager` is a *git-level* flag
  (`git --no-pager commit`), not a `commit` option (`git commit --no-pager` errors out).
- **`dist/` is now git-ignored** (PROMPT-02 added it to `.gitignore`, along with `.astro/`
  and `.env`). Stage explicit paths anyway — throwaway notes (`PROGRESS.md`) and draft plans
  are tracked and would ride along with `git add -A`.
- **`/dashboard` needs real Supabase credentials** to render; re-measuring the authed UI
  means rebuilding a harness (the old one was deleted on purpose).
- **`.astro/` is now git-ignored and untracked** (PROMPT-02). `astro build` still regenerates
  `.astro/types.d.ts` and `astro dev stop` deletes `.astro/dev.json`, but neither shows up in
  `git status`.
