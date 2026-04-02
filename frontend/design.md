# Attenborofy Design System

## Color Palette

### Semantic tokens (CSS variables)

| Token | Value | Usage |
|---|---|---|
| `--background` | `oklch(0.13 0.015 120)` | Near-black with olive-green undertone — full-page background |
| `--canvas` | `oklch(0.13 0.015 120)` | Same as background — no distinct canvas split |
| `--panel` | `oklch(0.18 0.012 120)` | Slightly lighter dark — card/surface background |
| `--card` | `oklch(0.22 0.01 120)` | Elevated dark grey — inner card / list item surface |
| `--foreground` | `oklch(1 0 0)` | White — primary text |
| `--muted-foreground` | `#B6B6B6` | Light grey — labels, hints, secondary text |
| `--primary` | `oklch(0.84 0.2 122)` | Lime / yellow-green — CTA buttons, active states, send button |
| `--primary-foreground` | `oklch(0.13 0.015 120)` | Near-black — text on primary (dark text on bright green) |
| `--border` | `oklch(0.28 0.01 120)` | Subtle dark grey-green — dividers, card borders |
| `--input` | `#111111` | Darker than card — input fields recess into their surface |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Red — error states |

### Tailwind classes

- `bg-background` — page background
- `bg-panel` — primary surface (cards, nav bar)
- `bg-card` — elevated inner surface (list items, input fields)
- `text-foreground` — primary text (white)
- `text-muted-foreground` — secondary text (grey)
- `bg-primary` / `text-primary` — lime-green accent

---

## Typography

**Font:** Geist Variable (variable sans-serif)

| Role | Class | Size |
|---|---|---|
| Page greeting / hero | `text-3xl font-bold text-foreground` | 30px |
| Section heading | `text-base font-semibold text-foreground` | 16px |
| Card label / name | `text-sm font-medium text-foreground` | 14px |
| Body / message text | `text-sm text-foreground` | 14px |
| Helper / timestamp | `text-xs text-muted-foreground` | 12px |

---

## Layout

The landing page uses a **1/3 + 2/3 split** at full viewport height.

```
┌─────────────┬──────────────────────────┐
│  bg-panel   │        bg-canvas         │
│  w-1/3      │        w-2/3             │
│             │                          │
│  [Logo]     │    (reserved for future  │
│  [Card]     │     hero / preview)      │
│             │                          │
└─────────────┴──────────────────────────┘
```

- No header bar on the landing page — logo lives inside the left panel.
- Other routes (processing, result, gallery) retain the standard header + footer layout.

---

## Components

### Card
- Background: `bg-card`
- Border: `border border-border`
- Radius: `rounded-2xl`
- Shadow: `shadow-sm`
- Padding: `p-6`

### Drop Zone
- Border: `border-2 border-dashed border-border rounded-xl`
- Hover: `hover:border-primary/40`
- Drag active: `border-primary bg-primary/5`
- Icon container: `w-10 h-10 rounded-full bg-primary/10`

### Button (primary CTA)
- Full-width: `w-full`
- Size: `lg`
- Uses shadcn `<Button>` with default variant (maps to `--primary`)

### Textarea
- `resize-none text-sm`
- Background inherits from `--input`

---

## Spacing

Uses Tailwind's default spacing scale. Key values used:

- Page padding: `px-4 py-6`
- Section gap: `gap-4` between stacked sections
- List item padding: `px-4 py-3`
- Icon-to-label gap: `gap-2`

---

## Border Radius

| Token | Value |
|---|---|
| `--radius` | `1rem` (16px base) |
| `rounded-2xl` | ~18px — cards, chat bubbles, input fields |
| `rounded-3xl` | ~24px — order summary cards, payment rows |
| `rounded-full` | pill — buttons, service icon circles, quick-reply chips, send button |
