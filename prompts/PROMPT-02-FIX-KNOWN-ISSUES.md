# PROMPT 02: Fix Known Issues

> **Status:** done (2026-10-10). One precondition carried forward: the Vercel project
> does **not** yet have `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY` set, so **set
> them (Production + Preview) before the next deploy** — `PUBLIC_*` values are inlined
> at build time. `DOCUMENTATION.md` §4 / §11 state this loudly.

## Goal

Close the highest-priority items from `DOCUMENTATION.md` section 14 (known issues) and section 16 (next steps) without changing features or the static deploy shape.

## Stack

Unchanged from PROMPT-01. Do not add dependencies other than the quality-gate tooling named below.

## What to build in this pass

1. **Env safety.** Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_KEY` on the Vercel project (Production and Preview), then `git rm --cached .env` and add `.env` to `.gitignore`. Make the guard in `src/lib/supabase.ts` fail with a readable message instead of a blank page.
2. **Artifact churn.** Add `.astro/` and `dist/` to `.gitignore` and untrack them with `git rm -r --cached .astro dist`.
3. **404 page.** Add `src/pages/404.astro` so the 404 route in `.vercel/output/config.json` points at a real file.
4. **Quality gates.** Add an `npm run check` script (`astro check`) and a first Vitest setup covering `formatCurrency`, `formatDate`, `sanitizeSegment`, `getProductImagePath` and the `RepoResult` helpers.
5. **Package metadata.** Rename `smoggy-shell` to `cupos-sitio-web` in `package.json` and add a `description`.

## Constraints

- Follow the architecture in `AGENTS.md`
- Keep the build static and hermetic; run `npm run build` and confirm there is no `.vercel/output/functions/`
- Step 1 must not land before the Vercel variables exist, or the next deploy breaks
- Update `DOCUMENTATION.md` section 14 and the "Last documented" line in the same change

## Done when

- `npx tsc --noEmit`, `npm run check` and the test script all pass
- `git ls-files` no longer lists `.env`, `.astro/` or `dist/`
- Visiting an unknown URL shows the custom 404 page

## Out of scope for this pass

- Row Level Security audit (needs access to the Supabase project; do it as its own prompt)
- Pagination of "Mis ventas"
- Actionable sales rows and payment editing

## Next steps after this pass

Typical PROMPT-03 candidates: RLS audit and SQL migrations recorded in the repo, generated Supabase types, actionable rows in "Mis ventas".
