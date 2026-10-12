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
- Copy ships in **Spanish and English** and both use the same type scale; language
  changes *formatting*, not type. Dates and amounts go through the locale-bound
  formatters (`useFormatters()` — `es` → `es-CO`, `en` → `en-US`), never a
  hand-built string, so `180.000`/`180,000` and `4 de oct de 2026`/`Oct 4, 2026`
  follow the switch. Tabular figures stay on in both.
- Ellipsis is always the single character `…`, never `...` (`Iniciando sesión…`).
- Headings get `text-wrap: balance`, paragraphs `text-wrap: pretty`.
- Never all-caps a sentence — caps are reserved for 12px badges/labels.

## 4. Component stylings

**Every new shared primitive ships with a JSDoc header** — one block above the
component that says *why it exists* and what its accessibility contract is (what
it announces, what it hides, which keys it answers). `skeleton.tsx` and
`languageSwitch.tsx` are the reference shape. Prop types are documented inline with
`/** … */` rather than enforced at runtime: the repo is strict TypeScript, so
PropTypes would only duplicate what the compiler already proves. **Cross-screen**
primitives live in `src/components/ui/` and are imported from its barrel; the
shared-but-flat ones (`button.tsx`, `modal.tsx`, `confirmModal.tsx`,
`emptyState.tsx`) stay in `src/components/` and are imported by name
(`DOCUMENTATION.md` §6 has the rule).

**Copy is never baked into a shared primitive.** Anything whose wording depends on
the screen (`Button`, `Modal`, `ConfirmModal`, `EmptyState`) takes it as a prop and
stays i18n-agnostic; the screen owns the `t(...)` call. The one primitive allowed
to translate is `LanguageSwitch`, whose whole purpose is the language — and its
visible label is the two-letter code, never the word ("Español" is too wide for a
phone top bar), with the action ("Cambiar a inglés") in `aria-label`.

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
`.btnClose`, `.purchasesNewBtn`, `.paymentSubmitBtn`, `.rowRemoveBtn`,
`.imageRemoveBtn`, `.productDetailPrimary`, `.productDetailButtonRow`.

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
and the body folds away and rests `hidden` — same animation and `hidden`
contract as a section, so it is the *card* counterpart to `.collapsibleSection`
— reach for it when the disclosure should read as a surface (a thing in a list),
not a page-level heading row.

**The product card is itself the button** (`.card.productCard`) — it carries no
controls, just the image and what is worth knowing before opening it: name, ID
badge, value, purchase count. Tapping anywhere on it opens the product dialog,
which is where "Compras", "Editar" and "Eliminar" live. Three buttons per card
multiplied down a phone screen into a wall of chrome; one tap target keeps the
grid reading as a catalogue of things rather than a panel of controls. Because
the surface *is* a `<button>`, its padding is `--space-12` (a quarter of the
`--space-24` a read-only card takes), its content is left-aligned `--text-sm`,
and everything inside it must stay phrasing content — spans, never a `<div>` or
an `<h3>`, and never a nested control. The image bleeds past that tighter
padding (`calc(100% + 2 * var(--space-12))` and a matching negative margin) so it
still meets the card's own edges. Its element defaults (`font: inherit`,
`color: inherit`, `text-align: left`, `width: 100%`) are reset explicitly,
because the card class is applied to the button itself. The image is decorative
here (`alt=""`, the component default) — the name sits right beside it, so
naming it again would just make the button announce itself twice. Hover warms the
border to the accent, pressed deepens it to `--color-primary-active`, and the
global `:focus-visible` ring is the keyboard cue.

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
ring on an edge-to-edge row gets clipped.

**The fold is animated, and `hidden` is still the resting state.** A collapsed
panel *rests* `hidden` (unchanged for assistive tech and for `aria-controls`) —
`useCollapsiblePanel()` lifts the attribute only long enough to play the fold,
then puts it back. It folds the real measured height down to `0` through the Web
Animations API (`EXPAND_MS` 200 in, `COLLAPSE_MS` 160 out) rather than a CSS
transition, because `height: auto` cannot be transitioned, and it holds the
panel open across the exit so the content never disappears before the animation.
The padding lives on an inner wrapper (`.collapsibleBodyInner` /
`.collapsibleCardBodyInner`), so the panel's own height can animate all the way to
flat without a residual gap. The chevron
swaps glyph rather than rotating; rotating it would need a second, competing
motion. There is no `hidden`-flip flash, no collapse without animation, and
`prefers-reduced-motion` skips straight to the end state.

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

**Modals animate both ways.** A dialog *arrives* (the overlay fades in at
`--duration-base`; the card rises 24px with `slideUp` at `--duration-slow` —
weight, so the slower token) and *leaves* faster than it came (`fadeOut` /
`slideDown` back down 16px, both at `--duration-base` with `--ease-exit`, which
accelerates out instead of decelerating in). Both exits end on `forwards`, holding
the last frame across the gap between the animation finishing and React
unmounting, and the closing overlay drops `pointer-events`, because a click on a
dialog already on its way out must not land. The exit is a React problem, not a
CSS one: the moment `{show && <Modal/>}` flips the node is gone and there is
nothing left to animate. `usePresent()` owns the flag instead — the caller renders
on `isPresent`, passes `isClosing` down as the `closing` prop, and the value it
carries survives the whole exit, so a closing dialog never flashes different
content on the way out ("Editar compra" → "Agregar compra"). The unmount happens
after the animation, which is also what rebuilds per-open state (form fields,
lazily loaded payments) from scratch next time.

**Dialogs stack, and the last one opened answers the keyboard.** The product card
opens `ProductDetailModal`; from *inside* it, "Compras" opens `PurchasesModal`,
"Editar" opens the shared form and "Eliminar" opens the confirm. Each is a
separate `<Modal>` later in the document than the one that opened it, so the
newest is the one trapping Tab and closing on Escape — and closing it returns to
the dialog underneath, which is still mounted. Nothing is unmounted to make room,
and no dialog is allowed to own the state of another: the detail dialog reads its
product out of the live catalogue (falling back to its own snapshot so it can
finish its exit after the product is deleted), which is why an edit saved from
the form shows up behind it immediately.

The product dialog is a **read view with an action list**, not a form: the image
leads, then a two-column label/value ledger (`Fecha de lanzamiento`, `Valor`,
`Compras`), then the description as the one stacked row — prose, so it drops to
regular weight and left alignment while the values stay right-aligned and
tabular. The actions sit under it in the order they matter: "Compras (N)" as the
full-width primary, with "Editar" and "Eliminar" sharing the row beneath. The one
toolbar-shaped arrangement on a phone is the one that genuinely needs a toolbar.

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

## 6. Depth, elevation & motion

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

**Motion is decorative and asymmetric: things arrive slowly and leave quickly.**
Arriving is the part the eye needs to follow, so it gets the longer token;
leaving should get out of the way.

| Token | Value | Use |
| --- | --- | --- |
| `--duration-fast` | 120ms | Hover, press and focus feedback — anything the pointer drives. |
| `--duration-base` | 180ms | The default enter, and every **exit**. |
| `--duration-slow` | 280ms | Enters that carry weight — modals and sheets. |
| `--ease-standard` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Decelerate — arriving. |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Accelerate — leaving. |

Two rules keep it honest. **Motion never moves the thing you are reading** —
prefer opacity, and keep transforms small (`--space-16`–`--space-24`, 16–24px), so
nothing reflows while it plays. And **every animation is skippable**: `prefers-reduced-motion: reduce`
collapses durations to nothing in `theme.css`, and the two JS drivers
(`usePresent`, `useCollapsiblePanel`) check the same media query and skip their
timers/animations instead of merely shortening them. `--duration-base` is also
the one number JS cannot read out of CSS, so `EXIT_MS` in `usePresent.ts` is
that value written down a second time — **change one, change the other.**

## 7. Do's and don'ts

**Do**

- Keep the app white/slate with **one** violet accent — a committed light theme,
  not random dark sections.
- Give every interactive element a visible `:focus-visible` ring.
- Make destructive actions confirm first (they do: `confirmModal.tsx`).
- Show money with `formatCurrency()` (`Intl.NumberFormat`, no symbol)
  plus tabular figures — and through `useFormatters()` so the locale follows the
  language. Never hardcode a separator.
- Write state copy in the locale resources (`src/i18n/locales/es.ts` + `en.ts`),
  sentence case, ending in `…` while pending. Spanish is the reference file; a new
  key lands in both or the parity test fails.
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
- Don't fake a segmented control with `role="tab"`/`radiogroup` — two independent
  choices over a stored preference are `aria-pressed` buttons in a labelled
  `role="group"`, and a tablist would owe a keyboard contract we don't implement.
- Don't put a user-facing sentence straight into JSX. New copy goes in both locale
  files; a literal left in a component is invisible to the parity test.
- Don't use a toast for a failed mutation — failures are a `role="alert"` banner
  that stays until it is read (or dismissed); when toasts arrive, they are for
  confirmations only.

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
- *"Add an action to a product."* → It goes in `ProductDetailModal`'s action list,
  not on the card. The card stays a single tap target with no controls (it has to
  fit a phone), and anything interactive inside a `<button>` is invalid HTML
  anyway. Stack the actions: the one people came for full-width, the quieter ones
  sharing the row under it.
- *"Add a destructive action."* → Route it through `confirmModal.tsx` (or the
  shared `modal.tsx` with `variant="danger"`), danger-soft styling, and include
  a consequence sentence ("Esta acción no se puede deshacer.").
- *"Polish the loading/empty state."* → `.spinner` + `Cargando…` inside
  `aria-live="polite"`; empty states get a muted 40-word explanation.
- *"Make this panel/modal appear and disappear."* → Enter with `--duration-base`
  (or `--duration-slow` for a modal) and `--ease-standard`; leave with
  `--duration-base` and `--ease-exit`. A surface that unmounts on a boolean needs
  `usePresent`; a disclosure that folds needs `useCollapsiblePanel`. Never
  animate `height` with a transition, and never skip the reduced-motion branch.

**Pre-flight checklist** (all must pass before shipping UI work)

- [ ] No new colors, fonts, or breakpoints outside this file.
- [ ] Every interactive element has hover **and** `:focus-visible`.
- [ ] No `transition: all`, no bare `outline: none`.
- [ ] Icon-only buttons have `aria-label`.
- [ ] Modals: `role="dialog"` + `aria-modal` + `aria-labelledby` + Escape +
      focus trap + scroll lock, and the exit animates (render on `usePresent`'s
      `isPresent`, pass its `isClosing` down as `closing`) rather than snapping
      out of the DOM.
- [ ] Money uses `formatCurrency` and dates `formatDate`, with tabular figures on
      the numbers.
- [ ] Disclosures use `aria-expanded`/`aria-controls`, fold through
      `useCollapsiblePanel`, and rest `hidden` — never unmounted.
- [ ] Copy: Spanish, sentence case, `…` (not `...`) for pending states.
- [ ] Empty/loading/error states exist for every async view.
- [ ] `prefers-reduced-motion` honoured (motion is decorative only).
- [ ] Every value traced to a `theme.css` token (checked by reading the source).

**Reviewing code against this file:** use the `web-design-guidelines` skill in
`.agents/skills/` (it fetches Vercel's canonical Web Interface Guidelines) and
report findings as `file:line`. For a bigger visual overhaul than this file
covers, use the `redesign-existing-projects` skill.




