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

Reusable subagents in `.cursor/agents/` — **delegate; don't serialise.** They run in
isolated contexts, so independent checks fan out in parallel and their noisy output
(build logs, DOM dumps, screenshots) stays out of the main conversation:

- `gate-verifier` — re-runs `tsc`, `build` and the static-artifact/hermetic checks on the
  current tree, returns PASS/FAIL with raw evidence. Read-only; run it before committing.
- `ui-verifier` — headless-Chrome screenshots plus real DOM geometry at 390/1280 px,
  checked against `DESIGN.md`. Run after touching components, styles or layouts.
- `docs-sync` — audits `DOCUMENTATION.md` / `DESIGN.md` / `CHANGELOG.md` against the code
  and fixes the drift (routes, data model, hooks, tech debt, §15 history, date stamp).
- `data-layer-reviewer` — reviews repositories/hooks/auth against the Supabase skills.
- `commit-steward` — stages explicit paths and writes the Conventional Commit.

### Verifying UI changes

Chrome is installed and works headless. Take a real screenshot and look at it
instead of assuming the result:

```bash
npm run dev
google-chrome --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=390,1400 --screenshot=/tmp/ui-390.png http://localhost:4321/
```

The dashboard sits behind Supabase auth, so `/dashboard` needs real credentials
(or a static harness) before its product grid will render.


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
