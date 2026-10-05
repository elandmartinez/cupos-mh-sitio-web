# ⚠️ READ THIS BEFORE GENERATING ANY UI

**This is the project's design system. You (the AI) must load it on every session and follow its rules instead of defaulting to generic shadcn, Tailwind defaults, or your own aesthetic.**

If this file is named `uxonfly.md`, it is **not yet installed** — your tool will not auto-load it. Rename it now:

- Claude Code → `CLAUDE.md`
- Cursor → `.cursorrules`
- Windsurf → `.windsurfrules`
- Gemini CLI → `GEMINI.md`
- Zed / Google Antigravity / any modern tool → `AGENTS.md`
- GitHub Copilot → `.github/copilot-instructions.md`

Keep it at the project root (next to `package.json`).

---

# UXonFly — Design System

> Production-grade design and UX rules for AI coding sessions.
>
> Your AI reads this on every prompt and follows these rules instead of
> generating generic UI.
>
> Strong opinions. Border-first. Modern SaaS aesthetic
> (Linear / Stripe / Vercel-aligned). MIT licensed.
> Improvements welcome via PRs at github.com/Phanikondru/uxonfly-mcp.

---

## Tokens

### Colors

Brand color: `#6366F1` (indigo). Replace with your own brand hex — every
other color is derived from it.

Semantic palette:

- `--color-primary`: #6366F1
- `--color-primary-hover`: #4F46E5
- `--color-primary-active`: #4338CA
- `--color-primary-subtle`: #EEF2FF
- `--color-text`: #0F172A (slate-900 — never pure black)
- `--color-text-muted`: #64748B (slate-500)
- `--color-text-subtle`: #94A3B8 (slate-400)
- `--color-surface`: #FFFFFF
- `--color-surface-subtle`: #F8FAFC (slate-50)
- `--color-surface-sunken`: #F1F5F9 (slate-100)
- `--color-border`: #E2E8F0 (slate-200)
- `--color-border-strong`: #CBD5E1 (slate-300)
- `--color-success`: #10B981 (emerald-500)
- `--color-warning`: #F59E0B (amber-500)
- `--color-danger`: #EF4444 (red-500)
- `--color-info`: #3B82F6 (blue-500)

Rules:

- Never use pure black (`#000`) for text. Use slate-900 (`#0F172A`).
- Never use pure white surfaces against muted backgrounds. Use slate-50 for muted areas.
- The primary brand color is for ONE primary action per screen. Don't decorate with it.
- Semantic colors (success / warning / danger) appear only on status indicators — never as decoration.

Dark mode: invert surface and text. Brand color stays the same hue.

- `--color-surface` → `#0F172A` (slate-900)
- `--color-surface-subtle` → `#1E293B` (slate-800)
- `--color-text` → `#F8FAFC` (slate-50)
- `--color-text-muted` → `#94A3B8` (slate-400)
- `--color-border` → `#1E293B` (slate-800)

### Typography

- Display: **Cal Sans** (fallback: Inter Display)
- Body: **Inter**
- Mono: **JetBrains Mono**

Type scale (px):

- `xs`: 12 / 16 line-height
- `sm`: 14 / 20
- `base`: 16 / 24 (default body)
- `lg`: 18 / 28
- `xl`: 20 / 28
- `2xl`: 24 / 32
- `3xl`: 32 / 40
- `4xl`: 48 / 52

Weights:

- 400 (regular) — body text
- 500 (medium) — UI labels, buttons
- 600 (semibold) — headings, emphasis
- 700 (bold) — top-level page titles only, used sparingly

Rules:

- Body text is 16px minimum. Never smaller for readable content.
- Line height: body 1.5, headings 1.2.
- Never use more than 3 distinct font sizes on a single screen.

### Spacing

8-stop scale (pixels): `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`

Rules:

- Use only these values. No 7px, no 20px, no 50px.
- Default gap between major sections: 32px.
- Default gap between fields in a form: 16px.
- Default page padding: 24px desktop, 16px mobile.
- Compact UI (toolbars, dense tables): 8px gaps.

### Shape

Border radius scale:

- `sm`: 4px (badges, small chips)
- `md`: 8px (default — buttons, inputs)
- `lg`: 12px (cards, modals)
- `xl`: 16px (hero sections, large containers)
- `full`: 9999px (avatars, pill buttons)

Rules:

- Default radius is `md` (8px). Use it unless there's a reason not to.
- Never mix radius sizes inside the same component.
- Never use square corners (radius 0) on interactive elements.

### Shadows

**Border-first philosophy**: separation comes from borders, not shadows.

One shadow only — for genuinely elevated things:

```
shadow-elevated: 0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)
```

Use for:

- Modals (backdrop creates the elevation, shadow makes it feel held)
- Popovers and dropdowns
- Toasts
- Floating UI (FABs, command palettes)

Never use for:

- Cards in a list (use a border instead)
- Buttons (use the primary color, not a shadow, to indicate elevation)
- Inputs (use a focus ring, not a shadow)
- Headers, sidebars, navigation (use a `border-bottom`)

If you find yourself reaching for a shadow on a card, you want a border.

---

## Components

### button

Sizes:

- `sm`: 32px height, 12px horizontal padding, 14px text
- `md`: 40px height, 16px horizontal padding, 14px text (default)
- `lg`: 48px height, 24px horizontal padding, 16px text

Variants:

- `primary` — brand color background, white text. ONE per screen, max.
- `secondary` — surface background, border, text color. Default for everything that isn't the primary action.
- `ghost` — transparent background, no border, text color. For tertiary actions in toolbars and inline contexts.
- `danger` — red background, white text. For destructive actions only. Always paired with a 2-step confirmation.

States (every variant):

- `default` — base styling
- `hover` — slightly darker background (use the `-hover` token)
- `active` — even darker background (use the `-active` token)
- `focus-visible` — 2px ring in primary color at 50% opacity, 2px offset
- `disabled` — 50% opacity, `cursor: not-allowed`, no hover
- `loading` — spinner replaces label, button width stays the same

Rules:

- Maximum ONE `primary` button per screen. If two actions are equally important, redesign the screen.
- Destructive actions ALWAYS use the `danger` variant. Never red-color a primary button.
- Loading state: spinner replaces the label text but the button width does not change.
- Never use buttons for navigation. Navigation is for `<a>` tags. Buttons are for actions.
- Icon-only buttons require an `aria-label`.

### input

Default size: 40px height, 12px horizontal padding, 14px text.
Border: 1px solid `--color-border`, radius `md`.
Focus: 2px ring in `--color-primary` at 50% opacity, 2px offset.

Rules:

- Label ALWAYS above the field, always visible. Never use placeholder-as-label.
- Mark optional fields with `(optional)`. Never mark required fields with `*`.
- Validation runs on `blur`, never on every keystroke (one exception: password strength meters).
- Error messages appear below the field, in `--color-danger`, prefixed with an icon.
- Placeholders are example values (`jane@example.com`), never instructions ("Enter your email").
- Help text and error text share the same vertical slot — no layout shift between states.

### card

Background: `--color-surface`.
Border: 1px solid `--color-border` (NOT shadow).
Radius: `lg` (12px).
Padding: 24px.

Rules:

- Cards group related content. Don't use a card for a single piece of content.
- Cards in a list are separated by 16px vertical gaps. No additional shadows or dividers.
- Hoverable cards get `--color-border-strong` on hover, no shadow.
- Never nest cards more than one level deep.

### badge

Height: 24px.
Padding: 0 8px.
Radius: `full`.
Text: 12px, weight 500.

Variants:

- `neutral` — slate-100 background, slate-700 text
- `primary` — primary-subtle background, primary text
- `success` — emerald-50 background, emerald-700 text
- `warning` — amber-50 background, amber-700 text
- `danger` — red-50 background, red-700 text
- `info` — blue-50 background, blue-700 text

Rules:

- Badges are for status, counts, or labels. Never for navigation, never for actions.
- Never use a badge as a button. If it's clickable, it's a button.
- Never put more than one badge on a single piece of content unless they encode different information types (status + count is fine; two statuses is not).

### modal

Default max-width: 480px.
Wide variant: 640px.
Full variant: 90vw (only for large media or complex flows).
Backdrop: `rgba(15, 23, 42, 0.5)`.
Padding: 24px.
Radius: `lg`.
Shadow: `shadow-elevated`.

Required close affordances (ALL THREE):

- Close button (X) in the top-right
- Click on backdrop dismisses
- `Esc` key dismisses

Rules:

- Modals interrupt the user — only use them for short, focused tasks.
- NEVER nest modals inside modals. Redesign the flow.
- NEVER require horizontal scroll inside a modal.
- Modal title is required. Plain language, sentence case.
- Primary action is bottom-right. Cancel is bottom-left or the top-right X.
- Destructive modals follow the pattern in `### destructive-actions`.

### toast

Position: bottom-right on desktop, top-center on mobile.
Width: 360px max.
Padding: 16px.
Radius: `md`.
Shadow: `shadow-elevated`.
Stack: max 3 visible at once. Older toasts dismiss when the 4th appears.

Auto-dismiss timing:

- Success: 4 seconds
- Info: 5 seconds
- Warning: 7 seconds
- Error: 10 seconds
- With required action (e.g. "Undo"): never auto-dismiss until clicked

Rules:

- Toasts are for confirmations and non-critical errors. Never for blocking information.
- Toasts always include an icon matching the variant.
- Toasts NEVER contain "view more" links — the message must stand alone.
- Errors that need user action go inline or as a banner — NOT as a toast.

---

## UX Patterns

### navigation

- 5+ top-level sections → sidebar (left, fixed, 240px wide)
- 2–4 views → tabs (top of content, underline style)
- Hierarchy beyond 2 levels deep → breadcrumbs (above the page title)

Rules:

- Hamburger menus are FORBIDDEN on screens ≥1024px wide.
- Sidebar nav items are vertical icons + text. Never icon-only on desktop.
- Active state: brand color text + brand color subtle background. NOT a colored bar.
- Tabs: underline only, no background fill. Active tab gets brand color underline + text.
- Breadcrumbs: separator is `/`, never `>`. Last item is the current page (no link).

### modals

Use a modal when:

- The task is short (under 30 seconds)
- The task is focused (single clear outcome)
- The task interrupts the current flow intentionally (confirmation, quick edit)

Use a new page when:

- The task has multiple steps
- The task requires reference to other content on the page
- The task IS the primary flow (creating the main resource of the app)

Forbidden:

- Modal nested inside a modal
- Modal that opens another modal on success
- Modal taller than the viewport with internal scroll AND a sticky footer
- Modal without a close X button

### forms

Layout:

- Single column by default, ALWAYS. Two-column only when fields are paired (first/last name, city/zip).
- Field gap: 16px vertical.
- Section gap (within a form): 32px.

Labels:

- Above the field, always visible. Sentence case. Singular ("Project name", not "Project Names:").
- No colon at the end.

Optional vs required:

- Mark OPTIONAL fields with `(optional)` after the label.
- Never mark required fields with `*` or "required".

Validation:

- On `blur`, NEVER on keystroke (one exception: password strength meters).
- On submit if the user has not yet blurred the field.
- Error message below the field, in danger color, prefixed with icon.

Submit button:

- Bottom-right by default.
- Cancel button to its left, secondary or ghost variant.
- Submit label is always verb + object: "Create project", not "Submit" or "OK".

Forbidden:

- "Reset" buttons. Use Cancel instead.
- Submit disabled until the form is valid (the user can't tell what's missing).
- Multiple submit buttons.

### loading

Apply by perceived task duration:

| Estimated time | Treatment |
| --- | --- |
| < 100ms | Nothing. Feels instant. |
| 100ms – 1s | Nothing visible, OR a brief shimmer if the user might wonder. |
| 1s – 3s | Inline spinner OR skeleton if the shape is known. |
| 3s+ | Progress bar + descriptive text ("Importing 1,200 rows…") |
| Unknown duration | Skeleton if shape known, indeterminate spinner with text otherwise. |

Rules:

- Skeleton vs spinner: skeleton if you know the shape (a card grid, a table, a profile). Spinner if you don't.
- NEVER show a spinner AND a skeleton on the same content at the same time.
- Loading replaces the content. Don't overlay a spinner on stale content unless the action is a refresh.
- Loading on a button: spinner replaces the label inline; button width stays the same.

### empty-states

ALWAYS four elements, in this order:

1. **Illustration** — small (max 120px tall), monochrome or low-contrast, never a photo.
2. **Heading** — what the user is seeing, in 1 short sentence. "No projects yet."
3. **Subtext** — what they can do about it, in 1 sentence. "Create your first project to start tracking work."
4. **Primary CTA button** — verb + object. "Create project."

Forbidden:

- Empty area with no content
- Generic "No data" string
- Disabled CTA
- More than one CTA (no "Learn more" + "Create" — pick one)
- Apologetic tone ("Sorry, no items found")

### errors

Choose by error type:

| Error | Treatment |
| --- | --- |
| Form validation | Inline, below the field |
| Action failure (e.g. save failed) | Inline at the action point, OR top-of-form banner |
| Page-level (5xx, network) | Top-of-page banner with retry button |
| Critical, blocks all action | Full-page error state with retry CTA |

Forbidden:

- Errors as toasts (toasts auto-dismiss; the user might miss critical info)
- Raw error codes ("Error 500") — translate to plain language
- Error messages without next steps ("Something went wrong" — say WHAT and what to do)

Plain language rule:

- Always tell the user (a) what failed, (b) what to do next.
- Bad: `Error: ENOENT no such file or directory`
- Good: `Couldn't find the file. It may have been moved. Refresh the page or upload it again.`

### destructive-actions

Minimum 2 steps: trigger → confirmation.

Confirmation modal copy format:

```
Title:    Delete [resource type]?
Body:     This will permanently delete [resource name]. This cannot be undone.
Cancel:   Cancel
Danger:   Delete [resource type]
```

For HIGH-VALUE destructive actions (deleting a workspace, an account, paid data):

- Require typed confirmation: "Type [resource name] to confirm"
- Disable the danger button until the typed input matches exactly

After success:

- If reversible within a window: show an undo toast for 10 seconds.
- If irreversible: show a success toast confirming what was deleted, no undo.

Forbidden:

- Single-click delete with no confirmation
- "Are you sure?" with an OK button (vague + non-destructive button color)
- Confirmations where the danger and cancel buttons look similar

### data-tables

Pagination:

- Show pagination at 25+ rows.
- Default page size: 25. Allowed: 25 / 50 / 100.
- Page navigation: bottom-right. Total count: bottom-left.

Sorting:

- Click the column header to sort. Click again to reverse. Click a third time to clear.
- Sort indicator: arrow up/down icon next to the column label.

Filtering:

- Filters live ABOVE the table, left-aligned.
- Filter chips show active filters; X to remove.
- "Clear all filters" appears when 2+ filters are active.

Bulk actions:

- Row selection via leading checkbox.
- Bulk action bar appears above the table when 1+ rows selected.
- Bulk action bar shows: count selected, available actions, "deselect all".

Column behavior:

- Sticky first column when horizontal scroll is needed.
- Truncate long values with `…` and a tooltip showing the full value on hover.
- Right-align numbers, left-align text and dates.

Forbidden:

- Horizontal scroll without sticky first column
- Pagination AND infinite scroll on the same table
- Sortable columns without a visible sort indicator

### notifications

Three types — never use the wrong one.

| Type | Use for | Position | Persistence |
| --- | --- | --- | --- |
| **Toast** | Transient confirmation (saved, sent, copied) | Bottom-right | Auto-dismiss |
| **Banner** | Persistent state info (trial ending, system maintenance) | Top of page | Dismissible by user |
| **Inline** | Field-level feedback (validation error, status near a control) | Adjacent to the control | Persists until resolved |

Rules:

- Critical errors NEVER use toasts. Use a banner or inline error.
- Banners stack at the top in priority order — most critical first.
- Inline notifications never auto-dismiss.

---

## Flows

### empty-state

Steps:

1. Route loads. Detect empty data.
2. Render the empty state component (illustration + heading + subtext + CTA — see UX Patterns → empty-states).
3. CTA leads DIRECTLY to the create flow. No intermediate "welcome" screen.
4. After successful creation, route back to the populated view with a success toast: "[Resource] created."

Anti-patterns:

- Empty state that just says "Loading…" for a second before content appears (use a skeleton instead)
- Empty state with multiple CTAs ("Create" AND "Learn more")
- Empty state that disables the CTA until the user completes onboarding

### onboarding

Philosophy: minimum viable onboarding. Skip is ALWAYS allowed.

Steps:

1. **Welcome screen** — one sentence about what the product does. One primary CTA: "Get started." One secondary: "Skip."
2. **Minimum collection** — name + primary use case. NO MORE THAN 2 INPUTS. If you need 5 fields, your onboarding is wrong.
3. **One contextual highlight** — when the user lands on the main view, point at the most important thing with a small popover. Just one. Dismissible.
4. **Mark as onboarded** — never show the onboarding again, even if the user clears state.

Forbidden:

- Multi-step wizards with 5+ screens
- Required onboarding (no skip allowed)
- Tutorial overlays that grey out the screen and block interaction
- Asking for payment, phone number, or company size in onboarding

### auth

Steps:

1. **Single screen, sign-in OR sign-up** — one email field. The button auto-detects: "Sign in" if account exists, "Create account" if not.
2. **Authentication method** — magic link OR password OR OAuth. NEVER show all three side by side. Pick one primary, others as smaller text-link alternatives.
3. **After auth** — route to the user's last intended destination. Default: dashboard.
4. **Errors are inline** — never in a toast. "Wrong password" appears below the password field.

Forbidden:

- Separate "Sign in" and "Sign up" pages with identical fields
- Forced password complexity requirements visible before the user has typed anything
- "Remember me" checkboxes (assume yes — provide a sign-out instead)
- CAPTCHA on the first login attempt

---

## Copy Rules

**Voice**: direct, human, never cute. Closest reference: Linear, Stripe, Vercel.
**Tense**: present.
**Person**: second person (you / your).

### Errors

- Tell the user (a) what failed, (b) what to do next.
- Never show error codes ("Error 500", "ENOENT", etc.). Translate.
- Bad: `Failed to fetch.`
- Good: `Couldn't load your projects. Check your connection and try again.`

### CTAs

- Format: verb + object. "Create project", "Send invite", "Delete account."
- Forbidden: "Submit", "OK", "Click here", "Continue" (when the action is destructive or specific).

### Empty states

- Encouraging, not apologetic.
- Bad: `Sorry, no projects found.`
- Good: `No projects yet. Create your first to get started.`

### Tooltips

- One sentence max.
- No trailing punctuation.
- Bad: `This will permanently delete the selected items. This action cannot be undone.`
- Good: `Delete the selected items`

### Placeholders

- Example values, never instructions.
- Bad: `Enter your email`
- Good: `jane@example.com`

### Labels

- Sentence case, singular.
- No colons at the end.
- Bad: `PROJECT NAMES:`
- Good: `Project name`

### Headings

- Title case for H1 page titles. Sentence case for H2/H3 section headings.
- Maximum 5 words for H1.

### Numbers

- Spell out one through nine in body copy. Use numerals for 10+.
- Always use numerals in UI labels, table cells, and stats.

---

## Principles

These are the north stars. When two rules conflict, the one closer to the top wins.

### 1. Accessibility is not a feature

WCAG AA minimum, no exceptions. Contrast enforced at the token level. ARIA
landmarks on every route. Keyboard reachable for every interactive element.
Focus-visible rings on everything that can be tabbed to. If your design fails
accessibility, it fails — period.

### 2. One primary action per screen

If the user lands on a screen and there are two equally important things to
do, redesign the screen. Secondary actions are visually subordinate. No
competing CTAs. The user should never have to ask "what's the main thing here?"

### 3. Error prevention over recovery

Design so mistakes are hard to make in the first place. Default to safe
inputs. Make destructive actions require deliberate effort (typed confirmation
for high-value cases). Surface validation early enough that the user can fix
it before they commit.

### 4. Progressive disclosure

Show what the user needs RIGHT NOW. Reveal more on demand. The default view
is the most common case. Power features live one click deeper. A user should
be able to ignore 80% of the interface 80% of the time.

### 5. Copy drives decisions

Write the copy before designing the UI. If the copy is vague, the UI is wrong.
If the heading takes 3 seconds to understand, no font choice will save it.
Test by reading aloud — if it sounds like a robot, rewrite it.

### 6. Keyboard navigable by default

Every interactive element is reachable via Tab in logical order. Every
interactive element shows a visible focus ring when focused. Esc dismisses
overlays (modals, popovers, dropdowns). Enter submits the focused form.
Arrow keys navigate within components (tabs, menus, listboxes).

### 7. Trust the system

Don't second-guess these rules to "make it pop" or "match the brand." The
brand is your color and your typography. Everything else is consistent across
all UXonFly-built apps so your AI doesn't drift between sessions. If a rule
is wrong, fix it in this file — don't override it case by case.