# Cupos Sitio Web

Internal admin web app for managing "cupos" (order slots) for a small reseller business, with a Monster High theme. A signed-in operator manages products, client purchases and payments. The interface is in Spanish.

## Stack

- Astro 7 (static output) with React 19 islands
- TypeScript (strict)
- Supabase for auth, Postgres and storage
- Plain CSS with design tokens
- Deployed to Vercel as a static site

## Quick start

```sh
cp .env.template .env      # then fill in the two PUBLIC_SUPABASE_* values
npm install
npm run dev                # http://localhost:4321
```

Requires Node 22.12 or newer.

| Command           | Action                                  |
| :---------------- | :-------------------------------------- |
| `npm run dev`     | Start the dev server                    |
| `npm run build`   | Build the static site into `./dist`     |
| `npm run preview` | Serve the built output locally          |

## Documentation

- [DOCUMENTATION.md](./DOCUMENTATION.md): what the app does, architecture, routes, data model, deployment, known issues.
- [DESIGN.md](./DESIGN.md): the design system (tokens, components, states, accessibility).
- [AGENTS.md](./AGENTS.md): working rules for contributors and AI agents.
- [CHANGELOG.md](./CHANGELOG.md): change history.

## Prompts

Planned work for AI coding agents lives in `prompts/` as `PROMPT-NN-DESCRIPTIVE-NAME.md`. `PROMPT-01` records the baseline that already exists; `PROMPT-02` fixes the known issues.

## Deploy

Target: Vercel, static output only. Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_KEY` on the Vercel project for Production and Preview, since they are inlined at build time. See section 11 of `DOCUMENTATION.md`.

## License

Private.
