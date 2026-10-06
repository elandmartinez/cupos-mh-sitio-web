# DESIGN.md — Cupos (Monster High) design system

How this project should **look and feel**. `AGENTS.md` covers how to *build*;
this file covers the visual contract. `src/styles/theme.css` is the
implementation of the tokens below — when the two disagree, the CSS wins.

Adapted from the Stitch `DESIGN.md` convention (see the `awesome-design-md`
reference in `.agents/skills/`).

**Last reviewed:** 2026-10-05

---

## 1. Visual theme & atmosphere

A calm, practical admin tool wearing a bold brand. The app is a reseller's
quota/commission tracker: a small operator books "cupos" (slots), adds client
purchases, and logs payments. It is used on a phone, one-handed, often in a
hurry — so **clarity and tap-target size beat decoration**.

One hue supplies the brand: the Monster High violet (`--color-primary`).
Everything else is a cool **slate** neutral — near-black ink, white surfaces,
hairline borders and generous whitespace. Surfaces are **border-first**: the
edge does the work, not a shadow.

Feel: *calm ledger*. Not "SaaS gradient dashboard", not "AI purple wallpaper".
The accent is a signature, not a wallpaper — one accent per screen.

Density: **low** (3/10). Airy padding over compact tables. If a screen feels
crowded, remove an element rather than shrink the type.

## 2. Color palette & roles

Brand hue is **given** — it comes from the client's logo and is not ours to
re-tune. Consistency is achieved through *restrained usage*, not hue changes.

**Brand accent — one, and only one**

| Token | Value | Role |
| --- | --- | --- |
| `--color-primary` | `#522e93` | **The** accent. Primary actions, focus ring, active/selected state, emphasis. |
| `--color-primary-hover` | `#45277e` | Hover step for accent fills. |
| `--color-primary-active` | `#3c2170` | Pressed step. |
| `--color-primary-subtle` | `#efe9f9` | Accent tint — `badge--primary`, subtle fills, quiet accent buttons. |
| `--color-primary-subtle-hover` / `-active` | `#e4d9f5` / `#d8c9ee` | Hover / pressed for that tint. |
| `--color-on-primary` | `#ffffff` | Text on accent fills (9.6:1 on `#522e93`). |

**Neutrals — one slate family, never pure black**

| Token | Value | Role |
| --- | --- | --- |
| `--color-text` | `#0f172a` | Body text and headings. Near-black slate, never `#000`. |
| `--color-text-muted` | `#64748b` | Secondary text, meta lines, labels. |
| `--color-text-subtle` | `#94a3b8` | Least-important / disabled text. |
| `--color-surface` | `#ffffff` | Cards, modals, the top bar. |
| `--color-surface-subtle` | `#f8fafc` | Muted areas, inset fields, zebra rows. |
| `--color-surface-sunken` | `#f1f5f9` | Tracks, wells, hovered ghost buttons. |
| `--color-border` | `#e2e8f0` | The default 1px hairline. |
| `--color-border-strong` | `#cbd5e1` | Stronger dividers, secondary-button border. |

**Status — indicators only, never decoration**

| Token | Value |
| --- | --- |
| `--color-success-text` / `-subtle` | `#047857` / `#ecfdf5` |
| `--color-warning-text` / `-subtle` | `#b45309` / `#fffbeb` |
| `--color-danger-text` / `-subtle` | `#b91c1c` / `#fef2f2` |
| `--color-danger-hover` / `-active` | `#991b1b` / `#7f1d1d` |
| `--color-info-text` / `-subtle` | `#1d4ed8` / `#eff6ff` |
| `--color-neutral-text` / `-subtle` | `#334155` / `#f1f5f9` |

**Rules**

- One accent, on one thing per screen (the primary action). Everything else is
  slate plus, where status is involved, a semantic badge.
- **There is no second accent and no brand gradient.** Emphasis comes from
  weight, size and the accent — never from a new hue.
- One gray family only: cool slate. Do not introduce warm/taupe grays.
- Never pure `#000`, and never gray-black shadows. Shadows are tinted with the
  ink hue — `rgba(15, 23, 42, …)`.
- Semantic color is never the only signal — pair it with text ("Pagado", "Sin
  pagos registrados") or an icon.

## 3. Typography rules

Single family, **Outfit** (Google Fonts, weights 400–700), loaded with
`display=swap` plus a system fallback stack (`--font-sans`) so the app degrades
gracefully offline. One family keeps a small app coherent; Outfit's geometric
forms give headlines presence without shouting. `--font-mono` exists for code
only — never for UI copy.

| Token | Size | Use |
| --- | --- | --- |
| `--text-xs` | 12px | Badges, meta lines, uppercase labels + `--tracking-label`. |
| `--text-sm` | 14px | Secondary text, card meta, buttons, sale rows. |
| `--text-base` | 16px | Body, inputs, card titles (`.productName`) — the floor. |
| `--text-lg` | 18px | Modal titles (`.authTitle`), h3. |
| `--text-xl` | 20px | Section headings (h2). |
| `--text-2xl` | 24px | Page title on mobile (`.title`), h1 base, login wordmark. |
| `--text-3xl` | 32px | Page title from `640px` up, h1 at rest. |
| `--text-4xl` | 48px | Reserved — not used today. |

**Rules**

- Display/heading text: negative tracking (`--tracking-heading`, -0.02em) with
  `--leading-heading` (1.2). Small caps/labels: *positive* tracking
  (`--tracking-label`, 0.04em) with `text-transform: uppercase`.
- Body copy ≤ `--measure` (40rem ≈ 65 characters), `--leading-body` (1.5).
- Weights: 400 body · 500 labels/UI · 600 buttons & card titles · 700 headlines.
  Avoid 800+, it reads as shouting in Outfit.
- Money and comparable numbers get `font-variant-numeric: tabular-nums` so
  `$1,250` and `$9,999` align in a column.
- Ellipsis is always the single character `…`, never `...` (`Iniciando sesión…`).
- Headings get `text-wrap: balance`, paragraphs `text-wrap: pretty`.
- Never all-caps a sentence — caps are reserved for 12px badges/labels.

## 4. Component stylings

**Buttons** (`theme.css`) — shared base: inline-flex, `--radius-md`, `min-height`
2.5rem (40px, the `md` default), 14px/500, transitioning background,
border-color and color. Sizes are **sm 32 / md 40 / lg 48** (the two ends are
the `.btnSm` / `.btnLg` modifiers; `md` is the base class). Every variant has
hover, active, `:focus-visible` and disabled. **One primary per screen; never
use a button for navigation.**

| Class | Look |
| --- | --- |
| `.btnPrimary` | Solid `--color-primary`, white ink. The one primary action per view. |
| `.btnSecondary` | White fill, `--color-border-strong` border, ink text — Cancel. |
| `.btnGhost` | Transparent, ink text; sunken fill on hover — top bar and quiet actions. |
| `.btnGhost--danger` | Ghost that turns `--color-danger-subtle` on hover — delete inside a card or row. |
| `.btnDanger` | Solid `--color-danger-text` (red-700, not red-500) — the confirm dialog only. |
| `.btnIcon` | 2.5rem square, transparent, muted icon — **must** carry `aria-label`. |

The dashboard's own button classes are *layout*, not looks: `.btnRefresh`,
`.btnClose`, `.btnCardAction`, `.btnPurchases`, `.purchasesNewBtn`,
`.paymentSubmitBtn`, `.rowRemoveBtn`, `.imageRemoveBtn`.

**Inputs** (`theme.css`) — white fill, 1px `--color-border`, `--radius-md`,
`min-height` 2.5rem, and **16px** text (not 14px — 16px stops iOS zooming the
viewport when a field takes focus). The global `:focus-visible` ring does the
work and the border tints to `--color-primary` alongside it. Labels are always
visible above the field (`--text-sm`, weight 500) and wired with `htmlFor`/`id`
— never placeholder-as-label. Help text (`.fieldHint`, 12px muted) and
validation (`.fieldError`, 14px danger + icon) share one vertical slot so
validating never shifts the layout. Use the right `type`/`inputmode`/
`autocomplete` (`type="email"` + `autoComplete="username"` on login).

**Cards** (`.card` + the app's `.productCard` / `.purchaseCard`) — white, 1px
hairline border, `--radius-lg`, 24px padding. **Border-first: no shadow at
rest.** Hover may warm the border to the accent, signalling the whole card is
actionable. A card can be made foldable with `.collapsibleCard`: the header row
becomes the toggle (same `aria-expanded`/`aria-controls` contract as a section)
and the body hides with the `hidden` attribute, so it is the *card* counterpart
to `.collapsibleSection` — reach for it when the disclosure should read as a
surface (a thing in a list), not a page-level heading row.

**Sections / disclosure** (`.collapsibleSection`, `.collapsibleTrigger`) — how the
dashboard groups its top-level content ("Mis productos", "Mis ventas"). A section
is **not** a card: the header is a hairline-ruled row sitting directly on the
page background, so the cards or rows inside stay the only surface on screen
(see "don't nest cards inside cards"). The whole row is the button — full-width,
`min-height` 2.75rem (44px), `aria-expanded` + `aria-controls` — with the title
(`--text-base`/600, tight tracking) left, an optional muted 12px `meta` summary
right, and a muted `▲`/`▼` chevron as the affordance. Hover washes it to
`--color-surface-sunken`, active to `--color-border`, and `:focus-visible` is an
**inset** 2px `--color-primary` ring (`outline-offset: -2px`) because an offset
ring on an edge-to-edge row gets clipped. Collapsing hides the panel with the
`hidden` attribute — it stays mounted so `aria-controls` always resolves, and the
chevron swaps glyph rather than animating.

**Ledger rows** (`.saleRow`) — the read-only "Mis ventas" list is rows, not cards:
hairline separators between entries (none after the last), a 12px gutter between
the client block and the money block, no elevation, no hover. Client name is
14px/600 ink over a 12px muted meta line; the money block is a right-aligned
column — `pagado` in full-contrast ink with `de acordado` muted behind it, all in
tabular figures, with the status badge beneath. It has to read as a ledger, so
the numbers never move when the column changes.

**Progress** (`.purchaseProgressBar` / `.purchaseProgressFill`) — 8px track, fill
in `--color-primary`, accompanied by a `$paid / $agreed` label. Color alone never
carries payment status: the `Pagado` / `Pendiente` badge does.

**Badges** (`.badge` + modifiers) — pill, 12px/500, status only, never
clickable or navigational: `--primary` (accent tint), `--success`, `--warning`,
`--danger`, `--info`, `--neutral`.

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

- Spacing scale: `--space-4` 4px → `--space-64` 64px, in eight stops (4, 8, 12,
  16, 24, 32, 48, 64). Compose from these; no arbitrary values.
- Mobile-first single column, capped at `--content-width` (64rem) and centered.
- Product grid: 1 column → 2 at `640px` → 3 at `1024px`.
- Breakpoints are fixed: `480px` (header becomes a row), `640px` (2-col grid,
  centered modals, 2-col forms), `1024px` (3-col grid). Don't add ad-hoc ones.
- Respect `env(safe-area-inset-*)` on the sticky top bar and bottom sheets.
- Prefer flex/grid over JS measurement for layout.
- Scrollbars are hidden globally (`theme.css`, the `*` scrollbar rules) while
  scrolling still works by wheel, touch, keyboard and script. Don't reintroduce
  visible scroll tracks; if a container scrolls, make that affordance obvious
  through layout (a fade, a partial card) rather than a scrollbar.

## 6. Depth & elevation

**Border-first.** Surfaces are defined by a 1px hairline, not a shadow: nothing
in the resting UI floats. There is exactly **one** elevation token, for UI that
is genuinely above the page.

| Token | Use |
| --- | --- |
| `--shadow-elevated` | Floating UI only — modals, popovers. Tinted `rgba(15,23,42,…)`, never gray-black. |
| `--overlay-backdrop` | Modal backdrop — `rgba(15, 23, 42, 0.5)`. |
| `--focus-ring` | 2px `--color-primary` ring at 2px offset — the one "special" surface treatment. |

Radii: `--radius-sm` 4px (badges, small chips) · `--radius-md` 8px (inputs,
buttons) · `--radius-lg` 12px (cards, modals) · `--radius-xl` 16px (large
containers) · `--radius-full` (pills).

## 7. Do's and don'ts

**Do**

- Keep the app white/slate with **one** violet accent — a committed light theme,
  not random dark sections.
- Give every interactive element a visible `:focus-visible` ring.
- Make destructive actions confirm first (they do: `confirmModal.tsx`).
- Show money with `formatCurrency()` (`Intl.NumberFormat('es-CO')`, no symbol)
  plus tabular figures.
- Write state copy in Spanish, sentence case, ending in `…` while pending.
- Keep scrollbars hidden (scroll behaviour stays intact) — the global rules in
  `theme.css` do this; don't add visible track styling back.

**Don't**

- Don't add a second accent hue, a warm gray, or a new font.
- Don't use `transition: all` — list the properties.
- Don't remove an outline without replacing it with a focus ring.
- Don't put `outline: none` on `:focus` only; support `:focus-visible`.
- Don't nest cards inside cards; at most one surface level per concept.
- Don't leave icon-only buttons unlabelled.
- Don't reach for a shadow where a border would do, and never a gray-black one.

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

The dashboard's sections are full-width at every breakpoint; only their *content*
reflows (1 → 2 → 3 grid columns), and inside a section a sale row wraps its money
block under the client name rather than shrinking it. In the page header,
`.pageHeaderActions` centres its button against the taller primary CTA so the row
does not look ragged at 480px and up.

## 9. Agent prompt guide

**Quick reference**

```
ink        #0f172a   slate-900 (never #000)
surface    #ffffff
muted      #64748b   slate-500 (the only gray)
border     #e2e8f0   slate-200
accent     #522e93   violet — the ONLY accent
accent-sub #efe9f9
danger     #b91c1c   on #fef2f2
success    #047857   on #ecfdf5
warning    #b45309   on #fffbeb
radius     4 / 8 / 12 / 16px + pill
shadow     one (--shadow-elevated), floating UI only
font       Outfit 400/500/600/700
```

**Ready-to-use prompts**

- *"Add a field to the product modal."* → Use `.fieldGroup` + `.label` +
  `.input`, a visible `<label htmlFor>` (never a placeholder), 8px radius, and
  make sure `:focus-visible` shows the `--focus-ring`. No new colors.
- *"Add a new screen."* → Reuse `Layout.astro` (it sets `lang="es"`, fonts and
  tokens), `role="main"` with `id="main"`, `--content-width` wrapper, and the
  existing `.btnPrimary` as the single primary action. Skip link comes from the
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
- [ ] Money uses `formatCurrency` and dates `formatDate`, with tabular figures on
      the numbers.
- [ ] Disclosures use `aria-expanded`/`aria-controls` and hide with `hidden`,
      never by unmounting.
- [ ] Copy: Spanish, sentence case, `…` (not `...`) for pending states.
- [ ] Empty/loading/error states exist for every async view.
- [ ] `prefers-reduced-motion` honoured (motion is decorative only).
- [ ] Verified with a real screenshot at 390px and 1280px wide.

**Reviewing code against this file:** use the `web-design-guidelines` skill in
`.agents/skills/` (it fetches Vercel's canonical Web Interface Guidelines) and
report findings as `file:line`. For a bigger visual overhaul than this file
covers, use the `redesign-existing-projects` skill.




