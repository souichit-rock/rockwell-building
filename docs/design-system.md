# Rockwell Building — Design System Brief

Multi-tower Building Information System. Stack: Vite + React 19 + TypeScript + Tailwind CSS v4 + react-router v7.
This file is the single visual source of truth. The **foundation step** implements §1–§5 in `src/styles/`,
`src/components/ui/` and `src/app/` (the shell and its sub-components in §3.1 / §4.1 / §5 belong to `src/app/`, owned by F1-c);
**feature agents** (one per `src/features/<key>/`) import those and copy recipes in §4 verbatim when they need a one-off. Palette is lifted 1:1 from rockwell-grove.vercel.app so the apps read as one system.

---

## 0. Rules for feature agents (read before writing JSX)

1. **Token utilities only.** `bg-surface`, `text-ink`, `border-line`, `bg-gold` … Tailwind's default palette is wiped
   in `index.css`, so `bg-blue-500` or `text-gray-600` will not compile. No hex, no `rgb()` literals, no `style={{color}}`.
2. **Never write `dark:`.** Tokens flip automatically under `html[data-theme="dark"]`.
3. **Import, don't fork.** `import { cn, Button, Badge, Card, PageHeader, StatTile, DataTable, SearchInput, Chip, Tabs,
   EmptyState, Modal, Drawer, Breadcrumb, DocumentCard, Timeline, Field, Notice, KV, Monogram, Loading, EquipmentIcon } from "@/components/ui"`
   (`FloorPlanSvg` from `@/components/plan/FloorPlanSvg`, `NotFound` from `@/app/NotFound`).
   `className` on these is for layout (margins/width/grid placement) only, never for recoloring.
4. **Six text styles** (`type-display`, `type-title`, `type-heading`, `type-body`, `type-small`, `type-eyebrow`) + the
   KPI numeral. Don't invent a seventh size.
5. **Mono** (`font-mono`) only for asset tags, serials, document numbers, IDs, model numbers.
6. **Vocabulary.** Rockwell says **team**, never "department". Credit line is always **Innovation Engineer**.
7. **Sample-data notice** lives in the shell footer and on the dashboard hero. Never remove it.
8. **No new dependencies.** `lucide-react` is the only UI dep. Use `<dialog>`, `Intl`, inline SVG, native `<input type="date">`.
9. Formats: dates `14 Mar 2025` (`Intl.DateTimeFormat('en-PH',{day:'numeric',month:'short',year:'numeric'})`,
   timezone Asia/Manila) via `fmtDate` / `fmtDateTime` from `@/lib/dates`, numbers `en-PH` via `fmtNumber` from `@/lib/format`. No money field exists this phase, so there is no currency formatter.

---

## 1. Tokens

### 1.1 `src/styles/tokens.css` — RGB triplets, exactly as Grove uses them

Consume as `rgb(var(--c-x))` or `rgb(var(--c-x) / .25)`. Never as a bare value.

```css
/* Rockwell house palette, lifted 1:1 from rockwell-grove.vercel.app. */
:root {
  color-scheme: light;

  /* surfaces */
  --c-bg: 240 244 250;            /* paper — page background */
  --c-surface: 255 255 255;       /* cards, tables, inputs */
  --c-surface2: 237 242 249;      /* wells, row hover, inactive chips */

  /* ink */
  --c-text: 19 42 78;             /* navy ink */
  --c-text-soft: 71 90 122;
  --c-muted: 105 122 153;

  /* lines */
  --c-border: 221 229 240;
  --c-border-strong: 197 208 224;

  /* gold accent */
  --c-accent: 245 197 24;
  --c-accent-hover: 224 178 16;
  --c-accent-soft: 254 245 205;
  --c-accent-line: 245 228 150;
  --c-on-accent: 17 38 71;

  /* navy rail */
  --c-nav-bg: 19 42 78;
  --c-nav-bg-deep: 12 30 58;
  --c-nav-hover: 30 57 100;
  --c-nav-border: 38 68 114;
  --c-nav-text: 255 255 255;
  --c-nav-muted: 175 193 222;

  /* status */
  --c-success: 22 130 82;   --c-success-soft: 223 244 232;  --c-success-deep: 20 92 60;
  --c-warn: 202 138 4;      --c-warn-soft: 254 243 199;     --c-warn-deep: 146 100 8;
  --c-danger: 220 38 38;    --c-danger-soft: 254 226 226;   --c-danger-deep: 153 27 27;
  --c-info: 37 99 235;      --c-info-soft: 219 234 254;     --c-info-deep: 30 64 175;
}

/* ponytail: one dark block. The boot script in index.html resolves prefers-color-scheme into
   data-theme before first paint, so no duplicated @media block is needed. Wrapped in `@media not print`
   so every printed sheet is light without re-declaring the light triplets. */
@media not print {
:root[data-theme="dark"] {
  color-scheme: dark;

  --c-bg: 8 20 40;
  --c-surface: 17 37 66;
  --c-surface2: 22 47 84;

  --c-text: 237 244 255;
  --c-text-soft: 184 200 228;
  --c-muted: 147 166 200;

  --c-border: 28 54 94;
  --c-border-strong: 42 71 117;

  --c-accent: 255 210 63;
  --c-accent-hover: 255 221 107;
  --c-accent-soft: 58 52 18;
  --c-accent-line: 92 80 30;
  --c-on-accent: 17 38 71;

  --c-nav-bg: 11 28 56;
  --c-nav-bg-deep: 8 21 43;
  --c-nav-hover: 21 46 86;
  --c-nav-border: 30 58 100;
  --c-nav-text: 237 244 255;
  --c-nav-muted: 158 179 214;

  --c-success: 82 196 137;  --c-success-soft: 16 48 33;   --c-success-deep: 167 224 192;
  --c-warn: 230 177 58;     --c-warn-soft: 51 42 18;      --c-warn-deep: 250 217 130;
  --c-danger: 248 113 113;  --c-danger-soft: 62 20 20;    --c-danger-deep: 252 165 165;
  --c-info: 96 165 250;     --c-info-soft: 17 34 64;      --c-info-deep: 147 197 253;
}
}
```

### 1.2 `src/index.css` — Tailwind v4 theme mapping

```css
@import "tailwindcss";
@import "./styles/tokens.css";

/* escape hatch only; agents should not need it because tokens flip by themselves */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme inline {
  --color-*: initial;                 /* wipe Tailwind's palette: only house tokens compile */
  --color-white: #fff;
  --color-black: #000;

  --color-paper:        rgb(var(--c-bg));
  --color-surface:      rgb(var(--c-surface));
  --color-surface-2:    rgb(var(--c-surface2));
  --color-ink:          rgb(var(--c-text));
  --color-ink-soft:     rgb(var(--c-text-soft));
  --color-muted:        rgb(var(--c-muted));
  --color-line:         rgb(var(--c-border));
  --color-line-strong:  rgb(var(--c-border-strong));

  --color-gold:         rgb(var(--c-accent));
  --color-gold-hover:   rgb(var(--c-accent-hover));
  --color-gold-soft:    rgb(var(--c-accent-soft));
  --color-gold-line:    rgb(var(--c-accent-line));
  --color-on-gold:      rgb(var(--c-on-accent));

  --color-navy:         rgb(var(--c-nav-bg));
  --color-navy-deep:    rgb(var(--c-nav-bg-deep));
  --color-navy-hover:   rgb(var(--c-nav-hover));
  --color-navy-line:    rgb(var(--c-nav-border));
  --color-nav-text:     rgb(var(--c-nav-text));
  --color-nav-muted:    rgb(var(--c-nav-muted));

  --color-ok:           rgb(var(--c-success));
  --color-ok-soft:      rgb(var(--c-success-soft));
  --color-ok-deep:      rgb(var(--c-success-deep));
  --color-warn:         rgb(var(--c-warn));
  --color-warn-soft:    rgb(var(--c-warn-soft));
  --color-warn-deep:    rgb(var(--c-warn-deep));
  --color-danger:       rgb(var(--c-danger));
  --color-danger-soft:  rgb(var(--c-danger-soft));
  --color-danger-deep:  rgb(var(--c-danger-deep));
  --color-info:         rgb(var(--c-info));
  --color-info-soft:    rgb(var(--c-info-soft));
  --color-info-deep:    rgb(var(--c-info-deep));

  --font-sans: "Montserrat", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace;

  --radius-ctl:  12px;   /* buttons, inputs, icon tiles, nav items */
  --radius-card: 14px;   /* cards, tables, KPI tiles */
  --radius-lg:   18px;   /* modal, drawer, navy hero */

  --shadow-pop: 0 16px 40px rgb(8 20 40 / 0.22);   /* floating layers ONLY (modal, drawer, menu) */
}

@layer base {
  html { font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
  body { @apply min-h-dvh bg-paper text-ink text-[15px] leading-[1.55]; }
  ::selection { background: rgb(var(--c-accent) / .35); }
  @media (prefers-reduced-motion: reduce) { *, ::before, ::after { transition: none !important; animation: none !important; } }
}

/* the six text styles */
@utility type-display { font-size: clamp(24px, 2.4vw, 30px); line-height: 1.1;  font-weight: 800; text-transform: uppercase; letter-spacing: -0.02em; }
@utility type-title   { font-size: 20px; line-height: 1.2;  font-weight: 800; text-transform: uppercase; letter-spacing: -0.01em; }
@utility type-heading { font-size: 15px; line-height: 1.3;  font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
@utility type-body    { font-size: 15px; line-height: 1.55; font-weight: 400; }
@utility type-small   { font-size: 13px; line-height: 1.5;  font-weight: 500; }
@utility type-eyebrow { font-size: 11px; line-height: 1.2;  font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; color: rgb(var(--c-muted)); }

/* shared focus ring — put on every button, link, chip, nav item */
@utility focus-ring { &:focus-visible { outline: none; box-shadow: 0 0 0 3px rgb(var(--c-accent) / .35); } }

/* the ONLY permitted gradient */
@utility bg-hero { background-image: linear-gradient(135deg, rgb(var(--c-nav-bg)), rgb(var(--c-nav-bg-deep))); }
```

Token → use map (memorise this):

| Need                            | Class                                        |
|---------------------------------|----------------------------------------------|
| Page background                 | `bg-paper`                                   |
| Card / table / input            | `bg-surface border-line`                     |
| Well, hover row, inactive chip  | `bg-surface-2`                               |
| Primary / secondary / meta text | `text-ink` / `text-ink-soft` / `text-muted`  |
| Dividers / input border         | `border-line` / `border-line-strong`         |
| Sidebar, hero                   | `bg-navy text-nav-text`, `bg-hero`           |
| Active nav, primary CTA         | `bg-gold text-on-gold`                       |
| Status                          | `bg-ok-soft text-ok-deep` etc. (§4.6)        |

---

## 2. Typography

`index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<meta name="theme-color" content="#132a4e">
```

| Style          | Size / line          | Weight | Case / tracking       | Where                                                 |
|----------------|----------------------|--------|-----------------------|-------------------------------------------------------|
| `type-display` | clamp(24–30px) / 1.1 | 800    | UPPER, −0.02em        | Page H1 (one per page)                                |
| `type-title`   | 20px / 1.2           | 800    | UPPER, −0.01em        | Modal/drawer title, hero H2, section H2               |
| `type-heading` | 15px / 1.3           | 800    | UPPER, +0.06em        | Card H3, empty-state title                            |
| `type-body`    | 15px / 1.55          | 400    | normal                | Paragraphs, lede (`text-ink-soft`, `max-w-[58ch]`)    |
| `type-small`   | 13px / 1.5           | 500    | normal                | Table cells, meta, doc card subtitle                  |
| `type-eyebrow` | 11px / 1.2           | 800    | UPPER, +0.18em, muted | Kicker over H1, nav group label, KV keys, tile label  |

Derived, not new styles: table `th` = eyebrow at 10px / .11em; form `label` = eyebrow at .12em; button/badge text =
11–12px / 800 / UPPER / .08–.09em; **KPI numeral** = `text-[28px] font-black leading-[1.1] tracking-[-.03em] tabular-nums`;
mono IDs = `font-mono text-[12px]`. Body weights: 400 text, 500 small/meta, 600 emphasised values (`dd`, first table
column), 700 item titles. Document/asset **names are normal-case** (`text-[14px] font-bold`) — never force uppercase on user data.

---

## 3. Layout & app shell

Numbers: sidebar **248px** fixed, full height, `bg-navy border-r border-navy-line`. Content column `flex-1 min-w-0`,
`<main class="mx-auto w-full max-w-[1400px] p-4 lg:p-6">` (16px gutter on phone, 24px desktop). Page sections stack with
`space-y-6`. Card grid gap 16px, KPI grid gap 12px. Cards: `rounded-card border border-line bg-surface p-5` (20px), **no shadow**.
Breakpoint: `lg` (1024px). Below it the rail is hidden; a sticky **56px navy top bar** shows brand + hamburger + theme toggle,
and the same nav markup slides in as a left drawer (`w-[280px]`, scrim `bg-navy-deep/60`, 200ms translate).

### 3.1 Shell (`src/app/Shell.tsx`, owned by foundation step F1-c; `Brand`, `NavGroup`, `NavItem`, `TowerScopeSelect`, `SearchTrigger`, `ThemeToggle`, `ResetDemo` live in `src/app/shell/*.tsx`, not in `components/ui`)

```tsx
<div className="flex min-h-dvh">
  <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-ctl focus:bg-gold focus:px-4 focus:py-2 focus:text-on-gold">Skip to content</a>

  {/* rail — desktop */}
  <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-navy-line bg-navy lg:flex">
    <Brand />                                {/* h-16 px-4 flex items-center border-b border-navy-line */}
    <div className="space-y-2 border-b border-navy-line p-3">
      <TowerScopeSelect />                   {/* §4.7 select recipe on navy: h-9 w-full rounded-ctl border-navy-line bg-navy-hover text-[12px] font-bold text-nav-text; first option "All towers" */}
      <SearchTrigger />                      {/* button with the inactive NavItem classes: Search icon, "Search", <kbd className="ml-auto text-[10px] opacity-70">Ctrl K</kbd>; opens CommandPalette */}
    </div>
    <nav className="flex-1 overflow-y-auto px-3 py-3">{groups.map(NavGroup)}</nav>
    <div className="space-y-0.5 border-t border-navy-line p-3">
      <ThemeToggle />
      <ResetDemo />                          {/* same classes as ThemeToggle, RotateCcw icon, "Reset demo data", native confirm() then store.resetDemo() */}
    </div>
  </aside>

  <div className="flex min-w-0 flex-1 flex-col">
    {/* top bar — phone */}
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-navy px-4 pt-[env(safe-area-inset-top)] lg:hidden">
      <button aria-label="Open menu" className="focus-ring grid size-10 place-items-center rounded-ctl text-nav-text hover:bg-navy-hover"><Menu className="size-5" /></button>
      <Brand />
      <span className="flex-1" />
      <SearchTrigger iconOnly />             {/* size-10, aria-label="Search" */}
      <ThemeToggle iconOnly />
    </header>
    {/* phone drawer = the identical aside markup (TowerScopeSelect at its top) in a <dialog> w-[280px], scrim bg-navy-deep/60 */}

    <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 p-4 lg:p-6"><Suspense fallback={<Loading />}><Outlet /></Suspense></main>

    <footer className="border-t border-line px-4 py-5 text-center text-xs text-muted">
      Sample data for demonstration · Rockwell Building · Souichi Takahama, Innovation Engineer
    </footer>
  </div>
</div>
```

`Brand`: 30px gold square `grid size-[30px] place-items-center rounded-[9px] bg-gold text-on-gold` with `<Building2 className="size-4" />`,
then `<span className="text-[14px] font-black tracking-[.11em] text-nav-text">ROCKWELL <span className="text-gold">BUILDING</span></span>`.

Nav groups (10 items — the spec §3 route table is the source; keep this grouping and order):

```
OVERVIEW    Dashboard · Towers
REGISTRY    Assets · Design standards · Brands & models · Documents
FACILITIES  Work orders · Maintenance · Warranties · Vendors
```

### 3.2 Page templates

**List page**: `Breadcrumb?` → `PageHeader` → KPI row (optional, `grid grid-cols-2 gap-3 lg:grid-cols-4`) → toolbar
(`flex flex-wrap items-center gap-3`: `SearchInput` `max-w-sm` + chips + `ml-auto` actions) → table card → nothing else.

**Detail page**: `Breadcrumb` → `PageHeader` (eyebrow = tower · floor, H1 = name, sub-line mono tag) → `Tabs` →
`grid gap-4 lg:grid-cols-[1fr_340px]`: main column (cards per tab) + aside (`KV` card, warranty card, vendor card).

**Dashboard**: navy hero (`bg-hero rounded-lg p-6 lg:p-8 text-nav-text`; eyebrow in `text-gold`; contains the
"Sample data" pill `Badge tone="gold"`) → KPI row → 2-col cards.

---

## 4. Components — exact recipes (`src/components/ui/*.tsx`)

`cn.ts`: `export const cn = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ")`
(ponytail: no clsx/tailwind-merge; components don't accept restyling so merge conflicts don't arise).
Icons: `lucide-react`, `strokeWidth={2}`; sizes `size-4` inline/buttons, `size-[18px]` nav, `size-5` card icon tiles, `size-8` empty state.
Transitions: `transition-colors duration-150` on anything hoverable. Nothing else animates except drawer/modal enter.

### 4.1 Sidebar nav item (`NavItem` — `src/app/shell/NavItem.tsx`, the one recipe here that is not in `components/ui`)

```tsx
<NavLink to={to} end={to === "/"} className={({ isActive }) => cn(
  "focus-ring flex h-10 items-center gap-3 rounded-ctl px-3 text-[12px] font-extrabold uppercase tracking-[.08em] transition-colors duration-150",
  isActive ? "bg-gold text-on-gold" : "text-nav-muted hover:bg-navy-hover hover:text-nav-text"
)}>
  <Icon className="size-[18px] shrink-0" /><span className="truncate">{label}</span>
  {count != null && <span className="ml-auto rounded-full bg-white/10 px-1.5 text-[10px] tabular-nums">{count}</span>}
</NavLink>
```
Props `to, label, icon, count?, also?: string[]`. `also` lists sibling path prefixes that keep the item lit (Design standards → `["/finishes", "/compliance"]`, Documents → `["/permits"]`, Maintenance → `["/inspections"]`, Towers → `["/spaces"]`, Assets → `["/a"]`): `const forced = also?.some(p => pathname.startsWith(p))` from `useLocation()`, then style on `isActive || forced`.
Group label: `<p className="type-eyebrow mt-5 mb-2 px-3 text-nav-muted/70 first:mt-1">REGISTRY</p>`. Items stack with `space-y-0.5`.

### 4.2 Page header (`PageHeader`) — props `eyebrow?, title, lede?, actions?, children?` (children = tabs)

```tsx
<header className="mb-6">
  <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
    <div className="min-w-0">
      {eyebrow && <p className="type-eyebrow mb-2">{eyebrow}</p>}
      <h1 className="type-display text-ink">{title}</h1>
      {lede && <p className="type-body mt-2 max-w-[58ch] text-ink-soft">{lede}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
  </div>
  {children}   {/* Tabs render here with mt-5 */}
</header>
```

### 4.3 Buttons (`Button`) — `variant: "primary" | "ghost" | "navy" | "danger"`, `size: "md" | "sm"`, `icon?: boolean` (icon-only), `to?: string` (renders a react-router `<Link>` with the same classes — every "Raise work order" / "Open plan" style navigation button uses this instead of `useNavigate`), otherwise all native `<button>` props

Base: `focus-ring inline-flex items-center justify-center gap-2 rounded-ctl border font-extrabold uppercase whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50`
- md: `h-10 px-4 text-[12px] tracking-[.09em]` · sm: `h-8 px-3 text-[11px] tracking-[.07em]` · icon-only: `w-10 px-0` / `w-8` + `aria-label`
- primary: `border-gold bg-gold text-on-gold hover:bg-gold-hover hover:border-gold-hover` — **one per view**
- ghost: `border-line-strong bg-surface text-ink hover:border-ink-soft`
- navy: `border-navy bg-navy text-white hover:bg-navy-hover` — secondary emphasis inside the hero or next to primary
- danger: `border-danger bg-danger text-white hover:opacity-90` — destructive confirms only

### 4.4 KPI stat tile (`StatTile`) — props `label, value, delta?, tone?: "default" | "hot" | "gold"`

```tsx
<div className={cn("rounded-card border px-4 py-3.5", tone === "gold" ? "border-gold bg-gold" : "border-line bg-surface")}>
  <p className={cn("text-[10.5px] font-extrabold uppercase tracking-[.11em]", tone === "gold" ? "text-on-gold" : "text-muted")}>{label}</p>
  <p className={cn("mt-1 text-[28px] font-black leading-[1.1] tracking-[-.03em] tabular-nums",
      tone === "hot" ? "text-danger" : tone === "gold" ? "text-on-gold" : "text-ink")}>{value}</p>
  {delta && <p className={cn("mt-1 text-xs font-medium", tone === "gold" ? "text-on-gold/80" : "text-muted")}>{delta}</p>}
</div>
```
Row: `grid grid-cols-2 gap-3 lg:grid-cols-4`. Max **one** gold tile per row.

### 4.5 Data table (`DataTable<T>`) — props `columns: Column<T>[], rows: T[], rowKey: (row: T) => string, onRowClick?: (row: T) => void, pageSize = 50, maxHeight? (default "70vh"), empty?: ReactNode` (rendered instead of the table when `rows` is empty; default `<EmptyState icon={Inbox} title="No results" body="Nothing matches these filters." />`)

`Column<T> = { key: string; label: string; render?: (row: T) => ReactNode; sort?: (row: T) => string | number; align?: "left" | "right"; mono?: boolean }`.
Sorting (click a `th` with `sort`, toggles asc / desc) and 50-row pagination live **inside** `DataTable`; features never re-implement either. `render` defaults to `String(row[key])`.

```tsx
<div className="overflow-hidden rounded-card border border-line bg-surface">
  <div className="overflow-auto" style={{ maxHeight }}>
    <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[13px]">   {/* border-separate keeps sticky th borders */}
      <thead>
        <tr>
          <th className="sticky top-0 z-10 border-b-[1.5px] border-line bg-surface px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-[.11em] text-muted">Tag</th>
          {/* numeric: add text-right; sortable: <button className="focus-ring inline-flex items-center gap-1 rounded"> + ChevronUp/Down size-3 */}
        </tr>
      </thead>
      <tbody>
        <tr className="group cursor-pointer transition-colors duration-150 hover:bg-surface-2" onClick={…}>
          <td className="border-b border-line px-3 py-2.75 align-top group-last:border-b-0 font-mono text-[12px] text-ink-soft">AHU-12-01</td>
          <td className="border-b border-line px-3 py-2.75 align-top group-last:border-b-0 font-semibold text-ink">Air Handling Unit</td>
          <td className="… text-right tabular-nums">1,250</td>
        </tr>
      </tbody>
    </table>
  </div>
  {/* footer when rows > pageSize: flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-muted → "Showing 1–50 of 190" + sm ghost Prev/Next */}
</div>
```
Zebra striping is **off**. No vertical borders. Empty rows → render `EmptyState` inside the card instead of the table.

### 4.6 Status badge (`Badge`) — `tone: BadgeTone` (= `"ok" | "warn" | "danger" | "info" | "neutral" | "gold" | "solid-ok"`, exported from `@/data/types`; not the same union as `Tone`, which is the discipline fill colour for plan pins), `dot?`

```tsx
<span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[.09em]", tones[tone])}>
  {dot && <span className="size-1.5 rounded-full bg-current" />}{children}
</span>
```
```ts
const tones = {
  ok: "bg-ok-soft text-ok-deep", warn: "bg-warn-soft text-warn-deep", danger: "bg-danger-soft text-danger-deep",
  info: "bg-info-soft text-info-deep", neutral: "bg-surface-2 text-ink-soft", gold: "bg-gold-soft text-warn-deep",
  "solid-ok": "bg-ok text-white",
};
```
Domain → tone (every feature uses this map; it lives in `src/lib/status.ts`, one pure function per enum in `types.ts`, no data imports):

| Function (enum)                   | ok           | warn               | danger                                                  | info       | neutral          | gold        |
|-----------------------------------|--------------|--------------------|---------------------------------------------------------|------------|------------------|-------------|
| `conditionTone` (Condition)       | good         | fair               | poor                                                    | —          | unknown          | —           |
| `assetStatusTone` (AssetStatus)   | in-service   | under-repair       | —                                                       | standby    | decommissioned   | —           |
| `woStatusTone(status, overdue?)`  | done         | open               | any non-final status when `overdue` (from `isOverdueWo`) | assigned   | on-hold, cancelled | in-progress |
| `priorityTone` (WOPriority)       | —            | P2                 | P1                                                      | P3         | P4               | —           |
| `dueTone` (DueStatus)             | on-track     | due                | overdue                                                 | —          | —                | —           |
| `warrantyTone` (WarrantyBand)     | active, 365d | 90d                | 30d, expired                                            | —          | none             | —           |
| `docStatusTone` (DocStatus)       | current      | for-review         | —                                                       | —          | superseded       | —           |
| `permitTone` (PermitStatus)       | valid        | due                | expired                                                 | —          | —                | —           |
| `complianceTone` (ComplianceStatus) | compliant  | phase-out          | deviation                                               | waived     | no-standard      | —           |
| `tierTone` (ApprovalTier)         | preferred    | phase-out          | prohibited                                              | acceptable | —                | —           |
| `resultTone` (InspectionResult)   | pass         | pass-with-findings | fail                                                    | —          | —                | —           |
| `healthTone` (HealthScore.band)   | —            | Watch              | Action                                                  | —          | —                | —           |

`solid-ok` is used only by `healthTone` for the band **Good**. Badge text is the enum value with hyphens replaced by spaces (`in-service` → "In service"); no other label mapping.

### 4.7 Search input (`SearchInput`) — controlled: `value: string`, `onChange: (value: string) => void` (the string, not the event), `placeholder?`

```tsx
<label className="relative block">
  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
  <input type="search" className="h-10 w-full rounded-ctl border-[1.5px] border-line-strong bg-surface pl-9 pr-3 text-[14px] text-ink outline-none transition-colors placeholder:text-muted focus:border-gold focus:ring-3 focus:ring-gold/25" />
</label>
```
Same input recipe (without the icon, `px-3`) is `Field`'s `<input>`, `<select>` (append `pr-9` + absolute `ChevronDown size-4 text-muted right-3`) and `<textarea min-h-[110px] py-3 resize-y>`.
`Field` (`label: string`, `hint?: string`, `error?: string`, `htmlFor?`, `children` = the control): `<label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.12em] text-muted">` → control →
`<p className="mt-1.5 text-xs font-medium text-muted">hint</p>` / error `text-danger`. Fields stack with `space-y-4`. The input / select / textarea class strings are exported as `inputClass`, `selectClass`, `textareaClass` from `Field.tsx` so forms use them on native elements.

### 4.8 Filter chips (`Chip`) — `label: string, active: boolean, count?: number, onClick`

```tsx
<button className={cn("focus-ring inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-xs font-bold transition-colors duration-150",
  active ? "border-gold bg-gold text-on-gold" : "border-line bg-surface-2 text-ink-soft hover:border-line-strong")}>
  {label}{count != null && <span className="opacity-70 tabular-nums">{count}</span>}
</button>
```
Row: `flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]` (scrolls sideways on phone, never wraps into three lines).

### 4.9 Tabs (`Tabs`) — two modes, one component:
`type TabItem = { label: string; count?: number } & ({ to: string; end?: boolean } | { key: string })`;
props `items: TabItem[]` plus, for key mode, `value: string` and `onChange: (key: string) => void`. Items with `to` render `NavLink` (route tabs: Standards / Finishes / Compliance, Register / Permits, Schedule / Inspections); items with `key` render `<button role="tab" aria-selected>` (local tabs: passport `?tab=`, warranty `?band=`, document "Where used"). Never mix modes in one `items` array.

```tsx
<nav role="tablist" className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
  <NavLink className={({isActive}) => cn("focus-ring -mb-px flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-xs font-extrabold uppercase tracking-[.08em] transition-colors",
    isActive ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink-soft")}>
    Documents <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular-nums text-ink-soft">12</span>
  </NavLink>
</nav>
```

### 4.10 Empty state (`EmptyState`) — `icon, title, body?, action?`

```tsx
<div className="rounded-card border-2 border-dashed border-line-strong bg-surface-2 px-4 py-10 text-center">
  <Icon className="mx-auto size-8 text-muted" />
  <p className="type-heading mt-3 text-ink">No work orders</p>
  {body && <p className="type-small mt-1 text-muted">Nothing matches these filters.</p>}
  {action && <div className="mt-4">{action}</div>}     {/* Button variant="ghost" size="sm" */}
</div>
```

### 4.11 Modal & Drawer (native `<dialog>`; `open, onClose, title, footer?, children`)

Both call `ref.current.showModal()` in an effect and close on `Escape`/backdrop click. Shared body: header
`flex items-center justify-between gap-4 border-b border-line px-5 py-4` with `<h2 className="type-title text-ink">` and an
icon `Button variant="ghost" size="sm"` (`X`); body `px-5 py-4 space-y-4`; footer `flex justify-end gap-2 border-t border-line px-5 py-4`.

- **Modal**: `<dialog className="m-auto w-[min(560px,calc(100vw-32px))] rounded-lg border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-navy-deep/60 backdrop:backdrop-blur-[2px]">`
- **Drawer** (right side, asset/doc quick view): `<dialog className="m-0 ml-auto h-dvh max-h-dvh w-[min(480px,100vw)] rounded-none border-l border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-navy-deep/60">`
  Inner column `flex h-full flex-col`; body `flex-1 overflow-y-auto`.

### 4.12 Breadcrumb (`Breadcrumb`) — `items: {to?, label}[]`

```tsx
<nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
  <Link className="focus-ring rounded hover:text-ink" to="/towers">Towers</Link>
  <ChevronRight className="size-3.5" />
  <Link to="/towers/prl">Proscenium Lincoln</Link>
  <ChevronRight className="size-3.5" />
  <span aria-current="page" className="text-ink-soft">L20 · PRL-L20-FCU-01</span>
</nav>
```

### 4.13 Document card (`DocumentCard`) — `doc: Document`, `href?: string` (default `paths.document(doc.id)`; the title and the open button are `<Link>`s to it)

```tsx
<article className="flex gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong">
  <div className="grid size-11 shrink-0 place-items-center rounded-ctl bg-surface-2 text-ink-soft"><FileText className="size-5" /></div>
  <div className="min-w-0 flex-1">
    <p className="font-mono text-[11px] font-bold tracking-[.06em] text-muted">PRL-M-AB · REV B</p>
    <h3 className="truncate text-[14px] font-bold text-ink">Proscenium Lincoln — Mechanical as-built</h3>
    <p className="mt-0.5 text-xs text-ink-soft">PDF · 4.2 MB · Rev B 14 Mar 2025 · HVAC</p>
    <div className="mt-2 flex flex-wrap gap-1.5"><Badge tone="ok">Current</Badge><Badge tone="neutral">As-built</Badge></div>
  </div>
  <Button variant="ghost" size="sm" icon aria-label="Open"><ExternalLink className="size-4" /></Button>
</article>
```
Icon by `DocType`: as-built / shop-drawing / finish-schedule `FileText`; om-manual / datasheet `BookOpen`; tc-report / inspection-report `ClipboardCheck`; permit `BadgeCheck`; warranty-cert `ShieldCheck`; contract `FileSignature`. Grid: `grid gap-3 md:grid-cols-2 xl:grid-cols-3`.

### 4.14 Timeline (`Timeline`) — `items: { when: string (already formatted); what: string; note?: string; tone?: "ok" | "warn" | "danger" | "info"; href?: string }[]`; dot is gold unless `tone` is set (`bg-ok` / `bg-warn` / `bg-danger` / `bg-info`); `href` makes `what` a `<Link>`

```tsx
<ol className="ml-1 border-l-2 border-line pl-4">
  <li className="relative pb-4 last:pb-0">
    <span className="absolute -left-[21px] top-1.5 size-[9px] rounded-full border-2 border-surface bg-gold" />   {/* tone danger → bg-danger */}
    <p className="type-eyebrow tracking-[.08em]">12 Sep 2026 · 09:40</p>
    <p className="font-bold text-ink">PM completed — quarterly filter change</p>
    <p className="text-[13.5px] text-ink-soft">By J. Dela Cruz, Engineering team. Next due 12 Dec 2026.</p>
  </li>
</ol>
```

### 4.15 Small shared bits

- **Card** (`Card`, `title?, actions?, tight?`): `rounded-card border border-line bg-surface p-5` (`tight` → `p-4`); header `mb-4 flex items-center justify-between gap-3` with `<h2 className="type-heading text-ink">`.
- **KV** (detail specs; `items: { k: string; v: ReactNode; mono?: boolean }[]`): `<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5">`, `dt` = `text-[10.5px] font-extrabold uppercase tracking-[.11em] text-muted pt-0.5`, `dd` = `m-0 font-semibold text-ink break-words` (`mono` → `font-mono text-[12px]` for serial/model/tag).
- **Notice** (`tone: "ok" | "warn" | "danger" | "info"`, `children`): `rounded-ctl px-4 py-3 text-sm font-semibold` + `bg-ok-soft text-ok-deep` / `bg-warn-soft text-warn-deep` / `bg-danger-soft text-danger-deep` / `bg-info-soft text-info-deep`. Inline confirmations only; no toast system this phase.
- **Monogram** (brand/vendor "logo"; `name: string`, `size?: "md" | "lg"`): `grid size-10 place-items-center rounded-ctl bg-surface-2 text-[13px] font-black tracking-[.04em] text-ink` (`lg` → `size-14 text-[18px]`) showing `initials(name)` from `@/lib/format` (1–2 letters). Never real third-party logos.
- **EquipmentIcon** (`name: EquipmentIconName, className?`): looks up a fixed `EQUIPMENT_ICONS` map of exactly the names in `types.ts` (never `import { icons }` — that pulls the whole set into the bundle); unknown → `Box`.
- **Plan pin** (exists only inside `FloorPlanSvg`, spec §5.3): `<g role="button" tabIndex={0}>` with `<title>` tooltip, `<circle r={1.6} className="fill-<discipline tone> stroke-white" strokeWidth={0.35}>`; selected adds `<circle r={2.6} className="fill-none stroke-gold" opacity={0.4}>`. There is no HTML marker variant — every plan, including the `compact` mini-plan, is this SVG. Floor-plan canvas: `rounded-card border border-line bg-surface-2 overflow-hidden aspect-[16/10]`.
- **Charts** (dashboard only, inline SVG, no libs): single series navy; highlight gold; categorical order navy → gold → info → ok → warn; grid lines `line`; labels `text-muted` 11px. Bars `rx-3`. No 3D, no pie.
- **Loading**: `flex items-center justify-center gap-2.5 py-12 font-semibold text-muted` + spinner `size-4 animate-spin rounded-full border-[2.5px] border-line-strong border-t-gold`.

---

## 5. Dark mode

Mechanism: `html[data-theme="dark"]` swaps the RGB triplets (§1.1). Default follows `prefers-color-scheme`; the user
toggle persists in `localStorage["rb-theme"]`.

`index.html`, first thing in `<head>` after charset (runs before paint, no flash):
```html
<script>
(function(){try{var t=localStorage.getItem('rb-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})();
</script>
```

`src/app/useTheme.ts`:
```ts
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem("rb-theme", theme); } catch {} }, [theme]);
  return { theme, toggle: () => setTheme(t => (t === "dark" ? "light" : "dark")) };
}
// ponytail: system-preference changes apply on next load; add a matchMedia listener if anyone asks.
```

`ThemeToggle` (rail footer / phone top bar): `focus-ring flex h-9 w-full items-center gap-3 rounded-ctl px-3 text-[12px] font-extrabold uppercase tracking-[.08em] text-nav-muted hover:bg-navy-hover hover:text-nav-text`
with `Moon`/`Sun` `size-[18px]` and label "Dark mode" / "Light mode" (`aria-pressed`). On phone: icon-only `size-10`.

Dark-mode checks every agent must pass: gold text only on navy/hero; badges use `*-soft`/`*-deep` pairs (both flip);
no `bg-white` (use `bg-surface`); no `text-black`; images/plans get `rounded-card border border-line` so they don't float.

---

## 6. DO / DON'T

**DO**
- Use token utilities and the six type styles; let dark mode come for free.
- Gold **only** for: active nav item, the one primary CTA per view, active chip, active tab underline, timeline dots, focus ring, selection rings (selected plan pin, finish-override cell), one gold KPI tile per row, the hero eyebrow, the soft `Badge tone="gold"` (the hero "Sample data" pill and in-progress work orders — §4.6), the "today" bar in dashboard charts.
- White cards, 1px `line` border, 14px radius, no shadow. Shadows only on modal/drawer/menus.
- Uppercase 800 for display/title/heading/eyebrow/buttons/badges/th. Body copy and user data stay normal-case.
- Mono for tags, serials, model and document numbers. `tabular-nums` on every number column.
- Say **team** ("Engineering team", "Property Management team"). Credit **Innovation Engineer**.
- Keep the footer line "Sample data for demonstration" and the hero "Sample data" pill; keep every tower, serial, vendor and person fictional.
- Tables scroll sideways on phone (`min-w-[640px]`); chips scroll sideways; actions wrap under the H1.
- `aria-label` on icon-only buttons, `aria-current` on breadcrumb/nav, `role="tablist"` on tabs, 40px minimum tap targets.

**DON'T**
- No gradients anywhere except `bg-hero` (navy → navy-deep, 135deg).
- No gold as large fills or as text on paper/white (fails contrast). No gold borders on cards.
- No zebra stripes, no vertical table borders, no card shadows, no button drop shadows, no glassmorphism.
- No `dark:` variants, no hex/`rgb()` in JSX, no `style` colors, no Tailwind default palette (it doesn't compile).
- No emojis in UI, no real brand logos (monogram tiles), no stock photos, no avatars of real people.
- No new packages (clsx, tailwind-merge, headless UI, date-fns, chart or table libs). No toasts, no skeleton loaders this phase.
- Never "department". Never bylines like "IT Manager".
- Don't invent type sizes, radii, or spacing outside 4px multiples. Don't redefine a `ui/` component locally.

---

## 7. App-shell wireframes

Desktop (≥ 1024px)
```
┌──────────────┬───────────────────────────────────────────────────────────────────┐
│ ▣ ROCKWELL   │ paper                                                              │
│   BUILDING   │  Towers › Proscenium Lincoln                          (breadcrumb) │
│──────────────│  PROSCENIUM AT ROCKWELL                                  (eyebrow) │
│ OVERVIEW     │  ASSET REGISTRY                        [ CLEAR SCOPE ]  [ EXPORT ] │
│   Dashboard  │  Lede text, max 58ch, ink-soft.                                    │
│   Towers     │                                                                    │
│              │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  KPI tiles     │
│ REGISTRY     │  │ ASSETS   │ │ OPEN WO  │ │ OVERDUE  │ │ PM DONE  │  (1 gold max)  │
│ ▌ASSETS▐ gold│  │ 190      │ │ 12       │ │ 6  (hot) │ │ 88%      │                │
│   Design std │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                │
│   Brands     │                                                                    │
│   Documents  │  [🔍 Search assets, serials, rooms… ]  (All)(HVAC)(Elec)(Fire) ⋯    │
│ FACILITIES   │  ┌───────────────────────────────────────────────────────────────┐ │
│   Work orders│  │ TAG            NAME              LOCATION    BRAND     STATUS │ │ sticky th
│   Maintenance│  ├───────────────────────────────────────────────────────────────┤ │
│   Warranties │  │ EDS-L12-FCU-01 Fan coil unit     L12 · U01   Tanaka    ● GOOD │ │ hover → surface-2
│   Vendors    │  │ 8RW-B5-CHL-02  Chiller           B5 · CHP    Boreal    ● FAIR │ │
│              │  │ …                                                             │ │
│──────────────│  │ Showing 1–50 of 190                            [PREV] [NEXT]  │ │
│ ☾ DARK MODE  │  └───────────────────────────────────────────────────────────────┘ │
│ ↺ RESET DEMO │  Sample data for demonstration · Rockwell Building · Innovation Eng.│
└──────────────┴───────────────────────────────────────────────────────────────────┘
  248px navy rail         flex-1 · main max-w 1400px · p-6 · sections space-y-6
```

Phone (< 1024px)
```
┌──────────────────────────────┐
│ ≡   ▣ ROCKWELL BUILDING   ☾  │  56px navy top bar, sticky
├──────────────────────────────┤
│ Towers › Proscenium Lincoln  │  16px gutter
│ PROSCENIUM AT ROCKWELL       │
│ ASSET                        │  type-display wraps
│ REGISTRY                     │
│ [ CLEAR SCOPE ]  [ EXPORT ]  │  actions wrap under title
│ ┌───────────┐ ┌───────────┐  │  tiles 2-up
│ │ ASSETS    │ │ OPEN WO   │  │
│ │ 190       │ │ 12        │  │
│ └───────────┘ └───────────┘  │
│ [🔍 Search…               ]  │
│ (All)(HVAC)(Electrical)(F… → │  chips scroll sideways
│ ┌──────────────────────────┐ │
│ │ TAG      NAME     LOC… → │ │  table scrolls sideways (min-w 640)
│ │ EDS-L12-FCU-01 Fan co…   │ │
│ └──────────────────────────┘ │
│ Sample data for demonstration│
└──────────────────────────────┘
  ≡ opens a 280px left drawer with the identical rail markup over a navy-deep/60 scrim.
```

Detail page (desktop, for orientation)
```
 Towers › Edades Suites › B3 › EDS-B3-FP-01
 EDADES SUITES · B3 · FIRE PUMP ROOM
 FIRE PUMP (ELECTRIC) 01                          [ RAISE WORK ORDER ]  [ EDIT ]
 EDS-B3-FP-01 · S/N HFS-2016-004182 (mono)
 ─OVERVIEW─  DOCUMENTS 4    MAINTENANCE 1   HISTORY 14            ← tabs, gold underline
 ┌──────────────────────────────────────┐ ┌──────────────────────┐
 │ LOCATION (floor plan + selected pin) │ │ SPECIFICATIONS  (KV) │
 └──────────────────────────────────────┘ │ Brand     Halcyon    │
 ┌──────────────────────────────────────┐ │ Model     HF-750E    │
 │ RECENT ACTIVITY (timeline)           │ │ Flow      750 GPM    │
 └──────────────────────────────────────┘ └──────────────────────┘
                                          ┌──────────────────────┐
                                          │ WARRANTY  ● ACTIVE   │
                                          │ VENDOR    monogram   │
                                          └──────────────────────┘
      1fr                                   340px
```
