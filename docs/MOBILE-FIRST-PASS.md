# Mobile-first pass (recommended approach)

We are **not** rebuilding from scratch. The app is responsive and works on mobile; this pass makes mobile the **design and implementation priority** and fixes gaps.

## Theme: Light Sport (updated March 2026)

The app uses a **bright, sporty light theme** as the default. Key principles:

- **Never use hard-coded Tailwind slate/dark colors** for surfaces. Use semantic CSS-variable-based classes: `bg-background`, `bg-card`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `border-border`.
- **Emerald is the primary accent** — mapped to `--primary` (`oklch(0.607 0.173 151)`) in `globals.css`. Use `<Button>` (default variant) or `bg-primary text-primary-foreground` for CTAs — not `bg-emerald-600 text-white`.
- **Dark mode supported but off by default.** The `.dark` block in `globals.css` has a full dark palette. Adding `class="dark"` to `<html>` activates it with no component changes needed.
- **Status badges** use token-based class maps (`STATUS_COLORS` / `STATUS_BADGE` per component). Keep them in sync with new token names when refactoring.

## Principle from here on

- **Design and implement for the smallest viewport first** (e.g. 375px width).
- **Then** add `sm:`, `md:`, `lg:` for larger screens.
- **Touch targets:** minimum 44x44px for interactive elements (buttons, links, toggles).
- **No `window.innerWidth`** (or similar) for layout — use CSS breakpoints only.
- **CTAs:** Use `<Button>` (default variant) — it resolves to the emerald primary via tokens. Avoid overriding with raw `bg-emerald-*` classes.

## Fix list (in order)

### 1. Global / layout
- [x] Viewport meta (done)
- [x] Header logout touch target (done)
- [x] Header: "Sessions" and "Login with Line" >=44px tap height
- [ ] Main content: confirm horizontal padding and max-width don't cause overflow on 320px

### 2. Landing (home)
- [ ] Hero and cards: already stack on small screens; verify text doesn't overflow
- [x] "View sessions" CTA: min-height 44px, comfortable padding

### 3. Sessions list
- [ ] Session cards: full-width on mobile, tap target for whole card (already a link)
- [x] "New Session" button: min 44px height
- [x] Empty state "Create your first session" CTA: token-based primary button

### 4. Create session form
- [x] Pairing rule: replaced dropdown with 3-option segmented control (tap-friendly)
- [ ] Form fields and buttons: 44px min height for inputs and primary actions
- [ ] Grids: already `grid-cols-1` then `sm:grid-cols-2`; verify no horizontal scroll
- [ ] Switches and secondary controls: increase tap area (e.g. padding) to >=44px

### 5. Court dashboard (moderator)
- [x] Header row: "Players" button >=44px
- [x] Court cards: action buttons (Start, Record result, Void, Auto-pair, Submit, Cancel, Auto-pair) — min-h-[44px] h-11; score inputs min-h-[44px]
- [x] Player list: **Sheet** (bottom slide-up) for all viewports — one tap opens, no layout shift
- [x] Result form: 44px inputs and buttons

### 6. Player view
- [ ] "My match" card and recent matches: already single column; ensure tap/readable
- [ ] Any links or buttons: 44px min

### 7. Join flow
- [ ] Join page: single column, "Join session" button >=44px (likely already fine)

### 8. Lint / QA
- [ ] Add a simple "touch target" rule or checklist to the workflow (e.g. in DESIGN.md or a PR template)
- [ ] Manually test critical paths at 375px and 320px (or use browser-tester at mobile viewport)

## What we are not doing

- Rewriting the app or changing backend/API for mobile.
- Introducing a separate "mobile" codebase or layout engine.
- Redesigning every screen from zero — we're **tightening and standardizing** what we have.

## Effort

Roughly **a few hours** of focused work: component-by-component touch targets and, if we do it, the Court dashboard player list as a Sheet on small screens. No need to do everything in one go; tackle by screen or by PR.
