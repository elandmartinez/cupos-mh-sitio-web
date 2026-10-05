# Changelog

What changed, and **why**. `DOCUMENTATION.md` is the reference for how the app works
today and `DESIGN.md` for how it looks; this file records the reasoning behind the changes
that produced them. Newest entry first.

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
| `ui-verifier` | Headless-Chrome screenshots plus real DOM geometry at 390/1280 px against `DESIGN.md` (44 px targets, focus ring, token contrast, disclosure ARIA, reduced motion). |
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
- **`dist/` is untracked but not gitignored** (§14.3), so it shows up as `git status` noise.
  Never `git add -A` in this repo — stage explicit paths.
- **`/dashboard` needs real Supabase credentials** to render; re-measuring the authed UI
  means rebuilding a harness (the old one was deleted on purpose).
- **`.astro/*` is tracked** and regenerated: `astro build` rewrites `.astro/types.d.ts`, and
  `astro dev stop` deletes `.astro/dev.json`.
