## CodeGraph — search structurally first

This repo has a CodeGraph MCP server (`codegraph_*` tools): a tree-sitter knowledge
graph of every symbol, call site and file. For **structural** questions, use CodeGraph
instead of grep:

- "Where is X defined?" → `codegraph_search`
- "What calls Y / what does Y call?" → `codegraph_callers` / `codegraph_callees`
- "What would break if I changed Z?" → `codegraph_impact`
- "Survey an unfamiliar module/area" → `codegraph_explore`

Use grep/read only for **literal text** (string contents, comments, log messages) or
after you already have a specific file open. Full tool table and rules of thumb:
`.agents/codegraph.md`.

## Project reference

`DOCUMENTATION.md` is the reference document for this repo — it describes what the
app does, the architecture, routes, data model, hooks/components, build &
deployment, developer tooling, and known issues/tech debt.

**Read it first** whenever you need context, or when you're unsure how something is
supposed to work, before searching or assuming. Prefer it over guesswork, but trust
the code over the doc when the two disagree.

Keep it current: if a change alters the architecture, routes, data model, hooks, or
known issues, update `DOCUMENTATION.md` in the same change and bump its
"Last documented" line.


## Roles & data ownership

The app serves **two roles** — `admin` (the current dashboard) and `customer` (a
read-only "my purchases" view). The frontend branches on `authContext.role`
(`'ADMIN'` / `'CUSTOMER'`); **RLS is the actual boundary**.

- `profiles`: `id uuid PK` = `auth.users.id` (1:1), plus `role text`
  (`'ADMIN'` / `'CUSTOMER'`; `DEFAULT 'CUSTOMER'`, no CHECK — `null` acts as
  customer). **No `username` column** — login stays Supabase email/password.
- `clients_purchases.profile_id uuid` links a purchase to its owner (`null` =
  walk-in customer). The ownership column is **`profile_id`, not `user_id`**, and it
  equals `auth.uid()` directly.
- **RLS is the security boundary.** Admin = `is_admin()` full access; customer =
  `select` own rows only (`profile_id = auth.uid()`, or via the parent purchase for
  payments/fees). Frontend role-branching is UX only. Never `select using (true)`.
- `is_admin()` (security-definer) reads the role; a `handle_new_user` trigger creates
  the profile on signup. These are auth infra — the "no triggers/functions" rule in
  `SCHEMA.md` §1 means *no business logic*; purchase totals are still app-computed.
- `custom_articles_orders` (off-website custom orders) and
  `articles_orders_payment_track` (their 1:1 payment state) back the admin's
  "Pedidos personalizados" section and the customer's read-only list.
- `purchases_payments` is now **polymorphic**: the parent is one of
  `client_purchase_id` **or** `article_order_payment_track_id` (two nullable FKs,
  enforce exactly-one with a CHECK).

`SCHEMA.md` and `DOCUMENTATION.md` §9 mirror the DB. The frontend is wired:
`authContext` exposes `role`, `dashboardApp` branches to a read-only
`CustomerDashboard`, and the admin has a "Pedidos personalizados" section backed by
`customArticlesOrdersRepository` / `articlesOrdersPaymentTrackRepository` and the
`useCustomArticlesOrders` hook.


## Shippable by default (non-negotiable)

This app deploys to **Vercel as a static site**, and every tool, dependency and
implementation choice must keep it that way. A change that makes shipping harder is
not finished. The same applies to any tooling you add in order to work on the repo:
it must not become something production depends on.

**The frame** — one command, one static artifact, no server compute:

- `npm run build` must pass and leave `dist/` + `.vercel/output/static` with **no
  `.vercel/output/functions/`**. If a functions directory appears, the deploy has
  silently changed shape — treat it as a regression.
- Static only. Never set `output: 'server'`, never add
  `export const prerender = false`, no `src/middleware.ts`, no `src/pages/api/*`,
  no Server Actions. Interactive code lives in `client:*` islands, which are not
  executed at build time — keep it that way.
- Prefer pre-built assets over platform compute. Do not reach for `astro:assets` /
  the adapter's image service (it adds an image-optimization route); optimize the
  file or use Supabase's transform endpoint instead.
- The build must stay hermetic: **no build-time network calls** to Supabase or
  anything else. A build that needs the network to succeed is a build that can fail
  in CI for reasons unrelated to your change.
- Config through `PUBLIC_*` env vars only — never a committed secret. Those values
  are inlined **at build time**, so a new one must be added to the Vercel project's
  environment variables *and* documented in `DOCUMENTATION.md` §4/§11 in the same
  change, and the code must fail loudly when it is missing rather than silently
  becoming `undefined`.
- Do not add a tool that needs a long-lived process, a database at build time, or a
  non-Vercel host. If you cannot explain how it ships, do not add it.

**Before calling a change done:** run `npm run build`, confirm the output is still
static, and update `DOCUMENTATION.md` §11 if deployment changed.

If a task genuinely needs to step outside this frame, **stop and get explicit
agreement first** — then record the new constraint here and in `DOCUMENTATION.md`.


## Design system

`DESIGN.md` describes how this project should **look and feel** — tokens, type
scale, components, states, spacing and accessibility. `DOCUMENTATION.md`
describes how it works. Read both before changing UI.

- Design tokens live in `src/styles/theme.css`: color, type, spacing, elevation,
  motion and the shared form primitives. Change tokens there, not in a
  component stylesheet.
- `src/styles/dashboard.css` and `src/styles/loginModal.css` own **layout only**.
- One accent family, one typeface, one gray family. New colors/fonts/breakpoints
  need a good reason and a `DESIGN.md` update.

Reusable skills in `.agents/skills/`:

- `web-design-guidelines` — audits UI code against Vercel's Web Interface
  Guidelines (accessibility, focus, forms, motion, typography). Use it to review.
- `redesign-existing-projects` — audit-first protocol for bigger visual overhauls.

Reusable subagents in `.agents/agents/` — **delegate; don't serialise.** They run in
isolated contexts, so independent checks fan out in parallel and their noisy output
(build logs, DOM dumps) stays out of the main conversation:

- `gate-verifier` — re-runs `tsc`, `build` and the static-artifact/hermetic checks on the
  current tree, returns PASS/FAIL with raw evidence. Read-only; run it before committing.
- `ui-verifier` — reviews component, style and layout changes against `DESIGN.md` by
  reading the source; no browser simulation. Run after touching any of them.
- `docs-sync` — audits `DOCUMENTATION.md` / `DESIGN.md` / `CHANGELOG.md` against the code
  and fixes the drift (routes, data model, hooks, tech debt, §15 history, date stamp).
- `data-layer-reviewer` — reviews repositories/hooks/auth against the Supabase skills.
- `commit-steward` — stages explicit paths and writes the Conventional Commit.

### Verifying UI changes

Do not simulate a browser: no headless Chrome, no screenshots, no CDP, no dev
server, no throwaway harness. Verify UI/UX from the source instead — trace visual
values to their token in `src/styles/theme.css`, check the interaction contracts
(ARIA, focus, `hidden` resting state, `prefers-reduced-motion`) in the JSX/CSS, and
run `npx tsc --noEmit` + `npm run build`.

`/dashboard` sits behind Supabase auth, so reason about it from `dashboard.tsx` and
the stylesheets rather than standing up credentials or a fixture.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)


## Prompt chain

Planned work for agents lives in `./prompts/` with strict naming: `PROMPT-NN-UPPERCASE-NAME.md`
(two-digit number, sequential, letter suffix for hotfixes such as `02B`).

- `PROMPT-01-INIT-PROJECT.md` — baseline of what already exists (done, do not re-run).
- `PROMPT-02-FIX-KNOWN-ISSUES.md` — env safety, artifact churn, 404 page, quality gates.

Each prompt has Goal, Stack, What to build, Constraints, Done when and Out of scope. Read the
latest open prompt before starting planned work, and mark it done when it ships.
`kill-criteria.md` is a blank scaffold for the business-facing side of the project; fill it in
before any paid or irreversible commitment.

## Deploy

- **Target**: Vercel, static output only.
- **Reason**: no server compute needed; Supabase is the backend and the site is a client-side SPA.
- **Required env vars**: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY` (see `.env.template`).
- **Setup cheatsheet** (first deploy):
  1. Import the repo in Vercel; the Astro preset runs `npm run build`.
  2. Set both env vars for Production and Preview (they are inlined at build time).
  3. Confirm `.vercel/output/functions/` does not exist after the build.
  4. Verify RLS on all tables (including `profiles`) and the `products-images` bucket.
