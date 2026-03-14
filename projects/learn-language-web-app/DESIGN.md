# Design Guidelines

The UI follows a **polished stone + frosted glass** aesthetic — warm-gray backgrounds, crisp white card surfaces, and a dusty lavender accent. Modern, luminous, gender-neutral. Think Linear meets a premium educational app.

## Color Palette

All colors are defined as CSS custom properties in `src/app/globals.css` and exposed to Tailwind via `@theme inline`.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#f5f5f3` | Page background (warm stone gray) |
| `--color-surface` | `#ffffff` | Card/panel surfaces (crisp white) |
| `--color-ink` | `#1a1a1a` | Primary text (near-black) |
| `--color-ink-soft` | `#52525b` | Secondary text (zinc-600) |
| `--color-ink-faint` | `#a1a1aa` | Tertiary/muted text (zinc-400) |
| `--color-line` | `#e4e4e7` | Borders (zinc-200) |
| `--color-line-strong` | `#d4d4d8` | Heavier borders (zinc-300) |
| `--color-accent` | `#8b7ec8` | Primary action color (dusty lavender) |
| `--color-accent-hover` | `#7568b3` | Accent hover state (deeper lavender) |
| `--color-accent-subtle` | `#f5f3ff` | Accent background tint (lavender-50) |
| `--color-accent-soft` | `#c4b5fd` | Lighter accent (soft violet) |
| `--color-surface-hover` | `#fafafa` | Hover state for surfaces (zinc-50) |
| `--color-surface-active` | `#f4f4f5` | Active/pressed state (zinc-100) |
| `--color-success` | `#16a34a` | Positive states (green-600) |
| `--color-success-subtle` | `#f0fdf4` | Success background (green-50) |
| `--color-error` | `#dc2626` | Negative states (red-600) |
| `--color-error-subtle` | `#fef2f2` | Error background (red-50) |

### Semantic color usage

- **Buttons**: `bg-accent text-white`, hover `bg-accent-hover`
- **Status "New"**: `bg-accent-subtle text-accent`
- **Status "Learning"**: `bg-amber-50 text-amber-600`
- **Status "Mastered"**: `bg-success-subtle text-success`
- **Status "Relearning/Error"**: `bg-error-subtle text-error`
- **Completed**: `bg-success-subtle text-success`
- **Pending**: `bg-amber-50 text-amber-600`

## Typography

- **Primary font**: Plus Jakarta Sans (`--font-jakarta`) — geometric with warmth, slightly rounded terminals
- **Arabic font**: Noto Sans Arabic (`--font-arabic`) — unchanged
- **Monospace font**: Geist Mono (`--font-geist-mono`) — unchanged
- **Base size**: 15px with `-0.01em` letter-spacing (set on body)
- **Page titles**: `text-[28px] font-bold tracking-tight`
- **Section headers**: `text-lg font-semibold`
- **Labels**: `text-[13px] font-medium uppercase tracking-wide` or `text-[11px] font-medium`

## Design Tokens

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Inputs, small buttons, badges |
| `--radius-md` | `10px` | Cards, containers, medium buttons |
| `--radius-lg` | `14px` | Modals, flashcards, large panels |
| `--radius-xl` | `20px` | Special large elements |

Use via `rounded-[var(--radius-sm)]`, etc.

### Shadows

| Token | Usage |
|-------|-------|
| `--shadow-card` | Default card elevation (subtle) |
| `--shadow-card-hover` | Card hover state (lifted) |
| `--shadow-lg` | Flashcards, prominent panels |
| `--shadow-xl` | Modals |

Apply via inline `style={{ boxShadow: "var(--shadow-card)" }}` since Tailwind arbitrary values don't support CSS vars in shadow utilities cleanly.

## Component Patterns

### Header
- Frosted glass: `bg-bg/80 backdrop-blur-xl`
- Border: `border-b border-line/50`
- Active nav: pill-shaped `bg-surface shadow-sm rounded-full px-3 py-1.5`
- Inactive nav: `text-ink-faint hover:text-ink-soft hover:bg-surface-hover rounded-full`

### Cards
- Base: `border border-line/50 bg-surface rounded-[var(--radius-md)]` with `style={{ boxShadow: "var(--shadow-card)" }}`
- Hover lift: `hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all`
- Card grids use `stagger-children` class for entrance animations

### Buttons
- **Primary**: `bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover`
- **Secondary/Cancel**: `border border-line text-ink-soft hover:bg-surface-hover`
- **Ghost**: `text-ink-faint hover:text-ink-soft hover:bg-surface-hover`
- **Danger**: `text-error hover:bg-error-subtle`

### Modals
- Overlay: `bg-ink/40 backdrop-blur-sm`
- Content: `animate-modal rounded-[var(--radius-lg)] bg-surface border border-line/50` with `style={{ boxShadow: "var(--shadow-xl)" }}`
- Inputs inside modals: `rounded-[var(--radius-sm)]`

### Progress Bars
- Track: `h-1.5 rounded-full bg-surface-active`
- Fill: `rounded-full bg-accent transition-all duration-500`
- Animated entry: `animation: progress-fill 0.8s ease-out`

### Filter Pills / Tabs
- Active: `bg-accent text-white rounded-full`
- Inactive: `bg-surface text-ink-soft hover:bg-surface-hover rounded-full`

### Review Rating Buttons
- Again: `border-error/20 bg-error-subtle text-error`
- Hard: `border-amber-200 bg-amber-50 text-amber-600`
- Good (primary): `border-accent bg-accent text-white` (filled)
- Easy: `border-success/20 bg-success-subtle text-success`

## Animations

Defined as `@keyframes` in `globals.css`:

- **`fade-up`**: Cards/items entering view (opacity + translateY 8px)
- **`slide-up-fade`**: Modals entering (opacity + translateY 16px + scale)
- **`shimmer`**: Skeleton loading states
- **`progress-fill`**: Progress bars filling from 0%

### Utility classes
- `.stagger-children`: Applies `fade-up` with 50ms delay per child (up to 12)
- `.animate-modal`: Applies `slide-up-fade` on mount
- `.skeleton`: Shimmer loading placeholder

## What Does NOT Change

- All API calls, data fetching, and business logic
- Arabic RTL support (`dir="rtl"`, Noto Sans Arabic, `--font-arabic`)
- Semantic color variable names (bg, surface, ink, accent, line)
- Component structure and state management
- Mobile responsive breakpoints (sm/md/lg)
