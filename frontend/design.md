# Attenborofy Design System

## Color Palette

### Semantic tokens (CSS variables)

| Token | Value | Usage |
|---|---|---|
| `--background` | `oklch(0.935 0.022 265)` | Soft periwinkle — full-page background |
| `--canvas` | `oklch(0.955 0.015 265)` | Slightly lighter periwinkle — right-side blank canvas |
| `--panel` | `oklch(0.935 0.022 265)` | Left upload panel background |
| `--card` | `oklch(1 0 0)` | White — card/form surface |
| `--foreground` | `oklch(0.13 0.01 265)` | Near-black — primary text |
| `--muted-foreground` | `oklch(0.52 0.01 265)` | Medium grey — labels, hints |
| `--primary` | `oklch(0.52 0.22 263)` | Blue — CTA buttons, active states |
| `--primary-foreground` | `oklch(1 0 0)` | White — text on primary |
| `--border` | `oklch(0.9 0.015 265)` | Subtle periwinkle-grey — dividers, card borders |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Red — error states |

### Tailwind classes

- `bg-background` — page background
- `bg-panel` — upload panel (left 1/3)
- `bg-canvas` — blank right 2/3
- `bg-card` — white card surface
- `text-foreground` — primary text
- `text-muted-foreground` — secondary text
- `bg-primary` / `text-primary` — blue accent

---

## Typography

**Font:** Geist Variable (variable sans-serif)

| Role | Class | Size |
|---|---|---|
| Logo / wordmark | `text-lg font-semibold tracking-tight` | 18px |
| Card label | `text-sm font-medium` | 14px |
| Body / input | `text-sm` | 14px |
| Helper text | `text-xs text-muted-foreground` | 12px |

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

- Page padding: `px-8 py-8`
- Card gap: `gap-5` between form sections
- Logo bottom margin: `mb-8`

---

## Border Radius

| Token | Value |
|---|---|
| `--radius` | `0.75rem` (12px base) |
| `rounded-xl` | ~12px — drop zone, video preview |
| `rounded-2xl` | ~18px — card |
| `rounded-full` | pill — icon container |
