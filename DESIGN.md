# DESIGN.md — Cupos (Monster High) design system

How this project should **look and feel**. `AGENTS.md` covers how to *build*;
this file covers the visual contract. `src/styles/theme.css` is the
implementation of the tokens below — when the two disagree, the CSS wins.

Adapted from the Stitch `DESIGN.md` convention (see the `awesome-design-md`
reference in `.agents/skills/`).

**Last reviewed:** 2026-10-03

---

## 1. Visual theme & atmosphere

A calm, warm, editorial admin tool wearing a bold brand. The app is a
reseller's quota/commission tracker: a small operator books "cupos" (slots),
adds client purchases, and logs payments. It is used on a phone, one-handed,
often in a hurry — so **clarity and tap-target size beat decoration**.

The brand (Monster High) supplies two saturated accent hues. Everything else is
quiet: warm cream surfaces, a near-black eggplant ink, generous whitespace and
a single consistent light source for elevation.

Feel: *warm editorial boutique + dependable ledger*. Not "SaaS dashboard
template", not "AI purple-gradient landing page". The accent is a signature,
not a wallpaper.

Density: **low** (3/10). Airy padding over compact tables. If a screen feels
crowded, remove an element rather than shrink the type.

## 2. Color palette & roles

Brand hues are **given** — they come from the client's logo and are not ours to
re-tune. Consistency is achieved through *restrained usage*, not hue changes.

| Token | Value | Role |
| --- | --- | --- |
| `--color-dark` | `#110015` | Ink + the top bar. Near-black plum, never pure `#000`. |
| `--color-text` | = `--color-dark` | Body text on light surfaces. |
| `--color-text-muted` | `#6d6459` | Secondary text. Warm taupe — the *only* gray family. |
| `--color-bone` | `#f5f3ef` | App background. |
| `--color-bone-soft` | `#faf9f6` | Inset fields, subtle fills. |
| `--color-surface` | `#ffffff` | Cards, modals. |
| `--color-border` | `#e6e2da` | 1px hairlines, dividers. |
| `--color-purple` | `#522e93` | **Primary accent.** Focus rings, primary actions, badges. |
| `--color-purple-dark` | `#3c2170` | Pressed state for primary. |
| `--color-purple-soft` | `#efe9f9` | Accent fill (badges, tertiary buttons). |
| `--color-fuchsia` | `#a50062` | **Emphasis only.** Money amounts, gradient end-stop. |
| `--color-fuchsia-dark` | `#7d004a` | Pressed emphasis. |
| `--color-fuchsia-soft` | `#fbe6f0` | Emphasis fill. |
| `--gradient-brand` | 135deg purple → fuchsia | Primary CTA + logo lockup **only**. |
| `--color-danger-text` / `--color-danger-bg` | `#9a1b3a` / `#fdecec` | Destructive + inline errors. |
| `--color-warning-text` / `--color-warning-bg` | `#8a5a12` / `#fdf1e0` | Secondary/neutral action (Edit). |

**Rules**

- One accent *family* (violet→magenta). Purple is the workhorse; fuchsia is the
  exception. Never introduce a third hue.
- The gradient is a brand device: **≤ 1 gradient element per view** (the primary
  CTA). Everything else uses flat accent colors.
- One gray family only: warm (`#6d6459` taupe, `#e6e2da` hairline). Do not add
  cool/blue-grays.
- Never pure `#000`, and never gray shadows. Shadows are tinted with the ink hue.
- Semantic color is never the only signal — pair it with text ("Pagado", "Sin
  pagos registrados") or an icon.

## 3. Typography rules

Single family, **Outfit** (Google Fonts, weights 400–700), loaded with
`display=swap` plus a system fallback stack so the app degrades gracefully
offline. One family keeps a small app coherent; Outfit's geometric forms give
headlines presence without shouting.

| Token | Size | Use |
| --- | --- | --- |
| `--text-2xs` | 11px | Badges (`ID: 12`), uppercase + `--tracking-label`. |
| `--text-xs` | 12px | Meta lines (release date), modal sub-labels. |
| `--text-sm` | 13px | Form labels, chips, small buttons. |
| `--text-base` | 15px | Body, inputs, buttons. |
| `--text-md` | 17px | Card titles (`.productName`). |
| `--text-lg` | 22px | Page title (h1). |
| `--text-xl` | 32px | Login wordmark (mobile). |
| `--text-2xl` | `clamp(2.5rem, 9vw, 3.5rem)` | Login wordmark (desktop). |

**Rules**

- Display/heading text: negative tracking (`--tracking-tight` /
  `--tracking-display`) with `--leading-tight`. Small caps/labels: *positive*
  tracking (`--tracking-label`).
- Body copy ≤ 65 characters (`--measure`), `--leading-normal`.
- Weights: 400 body · 500 labels/UI · 600 buttons & card titles · 700 headlines.
  Avoid 800+, it reads as shouting in Outfit.
- Money and comparable numbers get `font-variant-numeric: tabular-nums` so
  `$1,250` and `$9,999` align in a column.
- Ellipsis is always the single character `…`, never `...` (`Iniciando sesión…`).
- Headings get `text-wrap: balance`, paragraphs `text-wrap: pretty`.
- Never all-caps a sentence — caps are reserved for 11px badges/labels.

## 4. Component stylings

**Buttons** — all share `touch-action: manipulation`, an explicit hover state,
`:active { transform: scale(.98) }` and a `:focus-visible` ring. Minimum hit
area 44×44px (`.btnEdit` / `.btnDelete` pad out to reach it).

| Class | Look |
| --- | --- |
| `.btnNew` / `.submit-btn` | Brand gradient, white ink, `--radius-full`, `--shadow-brand`. The primary action — one per view. |
| `.btnPrimary` | Same gradient, `--radius-sm` — modal form submits. |
| `.btnSecondary` | Bone fill, hairline border, ink text — Cancel. |
| `.btnDanger` | `--color-danger-text` fill, white ink — destructive confirm only. |
| `.btnEdit` | Warning-soft (amber) fill: signals "this modifies data", calmer than a solid accent. |
| `.btnDelete` | Danger-soft fill, never solid red — it sits in a dense card row. |
| `.btnGhost` | Transparent + 1px light border, for the dark top bar. |
| `.btnClose` / `.imageRemoveBtn` | Circular icon buttons — **must** carry `aria-label`. |

**Inputs** — bone-soft fill, hairline border, 8px radius, 44px tall. Focus =
white fill + `--color-purple` border + 3px `--focus-ring` glow. Labels are
always visible above the field (13px, weight 500) and wired with `htmlFor`/`id`
— never placeholder-as-label. Use the right `type`/`inputmode`/`autocomplete`
(`type="email"` + `autoComplete="username"` on login).

**Cards** (`.productCard`, `.purchaseCard`) — white, hairline border,
`--radius-md`, `--shadow-sm`. Hover raises to `--shadow-md` and warms the border
to the accent, signalling the whole card is actionable.

**Progress** (`.purchaseProgressBar`) — 8px track in `--color-bone`, fill in
`--gradient-brand`, accompanied by a `$paid / $agreed` label. Color alone never
carries payment status: the `Pagado` / `Pendiente` badge does.

**Empty & loading states** — never a bare sentence in a box. Loading pairs the
shared `.spinner` with `Estado…` copy inside an `aria-live="polite"` region;
empty states are centered, muted, ≤ 40 words, and offer the primary action when
one exists.

**Modals** — one behaviour, implemented once in `src/components/modal.tsx`:
`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape closes, backdrop
click closes, Tab is trapped inside, focus moves in on open and returns to the
trigger on close, and background scroll is locked. On mobile they present as a
bottom sheet (`--radius-lg` top corners + safe-area padding); from `640px` up
they center as cards.

## 5. Layout principles

- Spacing scale: `--space-1` 4px → `--space-12` 48px. Compose from these; no
  arbitrary values.
- Mobile-first single column, capped at `--content-width` (64rem) and centered.
- Product grid: 1 column → 2 at `640px` → 3 at `1024px`.
- Breakpoints are fixed: `480px` (header becomes a row), `640px` (2-col grid,
  centered modals, 2-col forms), `1024px` (3-col grid). Don't add ad-hoc ones.
- Respect `env(safe-area-inset-*)` on the sticky top bar and bottom sheets.
- Prefer flex/grid over JS measurement for layout.

## 6. Depth & elevation

One light source: above and slightly in front. Shadows are warm-plum tinted,
never gray-black.

| Token | Use |
| --- | --- |
| `--shadow-sm` | Resting cards — barely there. |
| `--shadow-md` | Raised/hovered cards, primary buttons. |
| `--shadow-lg` | Modals only. |
| `--shadow-brand` | Magenta-tinted bloom under the primary CTA on hover. |
| `--focus-ring` | 3px accent glow — the one "special" surface treatment. |

Radii: `--radius-sm` 8px (inputs, small buttons) · `--radius-md` 14px (cards) ·
`--radius-lg` 20px (modals) · `--radius-full` (pills, CTA, icon buttons).

## 7. Do's and don'ts

**Do**

- Keep the top bar dark plum and everything below it warm cream — a committed
  light theme, not random dark sections.
- Give every interactive element a visible `:focus-visible` ring.
- Make destructive actions confirm first (they do: `confirmModal.tsx`).
- Show money with `formatCurrency()` (`Intl.NumberFormat('es-CO')`, no symbol)
  plus tabular figures.
- Write state copy in Spanish, sentence case, ending in `…` while pending.

**Don't**

- Don't add a second accent hue, a cool gray, or a new font.
- Don't use `transition: all` — list the properties.
- Don't remove an outline without replacing it with a focus ring.
- Don't put `outline: none` on `:focus` only; support `:focus-visible`.
- Don't nest cards inside cards; at most one surface level per concept.
- Don't leave icon-only buttons unlabelled.
- Don't repeat the brand gradient on every button — it stops meaning "primary".

## 8. Responsive behaviour

Mobile-first; every rule below the breakpoints targets a phone.

| Breakpoint | Change |
| --- | --- |
| base (< 480px) | Single column. Page header stacks title over actions. Modals are bottom sheets. Primary CTA is full-width. |
| `480px` | Page header becomes a row (title left, actions right). |
| `640px` | Product grid → 2 columns. Modals center. Form cards cap at 30rem. |
| `1024px` | Product grid → 3 columns. Roomier page padding. |

Touch targets ≥ 44×44px always. `viewport-fit=cover` is set and
`safe-area-inset-*` is honoured on the top bar and bottom sheets.

## 9. Agent prompt guide

**Quick reference**

```
ink        #110015   plum-black
bg         #f5f3ef   warm bone
muted      #6d6459   warm taupe (only gray)
border     #e6e2da
accent     #522e93   violet (primary)
emphasis   #a50062   magenta (money, gradient end)
danger     #9a1b3a   on #fdecec
warning    #8a5a12   on #fdf1e0
radius     8 / 14 / 20px + pill
font       Outfit 400/500/600/700
```

**Ready-to-use prompts**

- *"Add a field to the product modal."* → Use `.fieldGroup` + `.label` +
  `.input`, a visible `<label htmlFor>` (never a placeholder), 8px radius, and
  make sure `:focus-visible` shows the `--focus-ring`. No new colors.
- *"Add a new screen."* → Reuse `Layout.astro` (it sets `lang="es"`, fonts and
  tokens), `role="main"` with `id="main"`, `--content-width` wrapper, and the
  existing `.btnNew` as the single primary action. Skip link comes from the
  layout.
- *"Add a destructive action."* → Route it through `confirmModal.tsx` (or the
  shared `modal.tsx` with `variant="danger"`), danger-soft styling, and include
  a consequence sentence ("Esta acción no se puede deshacer.").
- *"Polish the loading/empty state."* → `.spinner` + `Cargando…` inside
  `aria-live="polite"`; empty states get a muted 40-word explanation.

**Pre-flight checklist** (all must pass before shipping UI work)

- [ ] No new colors, fonts, or breakpoints outside this file.
- [ ] Every interactive element has hover **and** `:focus-visible`.
- [ ] No `transition: all`, no bare `outline: none`.
- [ ] Icon-only buttons have `aria-label`.
- [ ] Modals: `role="dialog"` + `aria-modal` + `aria-labelledby` + Escape +
      focus trap + scroll lock.
- [ ] Money uses `formatCurrency` with tabular figures.
- [ ] Copy: Spanish, sentence case, `…` (not `...`) for pending states.
- [ ] Empty/loading/error states exist for every async view.
- [ ] `prefers-reduced-motion` honoured (motion is decorative only).
- [ ] Verified with a real screenshot at 390px and 1280px wide.

**Reviewing code against this file:** use the `web-design-guidelines` skill in
`.agents/skills/` (it fetches Vercel's canonical Web Interface Guidelines) and
report findings as `file:line`. For a bigger visual overhaul than this file
covers, use the `redesign-existing-projects` skill.




