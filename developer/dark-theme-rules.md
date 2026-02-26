# Dark Theme Rules (Future-Proof Checklist)

Use this when adding or updating UI so dark themes stay visually consistent and accessible.

## Core rules
- Never use pure/light backgrounds (`#fff`, `#ffffff`, `rgb(255,255,255)`) for panels/cards in dark themes.
- Never use dark text colors (`#0f172a`, `#111827`, etc.) directly inside dark-theme blocks.
- Prefer semantic tokens (`--color-surface-*`, `--color-text-*`, `--color-border-*`) over hardcoded color values.

## Surface recipe for dark theme
- Primary panel: `color-mix(in srgb, var(--color-surface-primary) 85-92%, transparent)`
- Secondary panel/chip: `color-mix(in srgb, var(--color-surface-secondary) 72-88%, transparent)`
- Border: `var(--color-border-primary)` or `var(--color-border-secondary)`
- Muted text: `var(--color-text-secondary)` or `var(--color-text-muted)`

## Text and contrast rules
- Headings/body on dark surfaces should use `var(--color-text-primary)` / `var(--color-text-secondary)`.
- Placeholder/helper text should use `var(--color-text-muted)`.
- Status colors in dark theme should use tinted translucent backgrounds and light foregrounds.

## PR checklist (required)
1. Search changed files for risky values: `#fff`, `#ffffff`, `rgb(255, 255, 255)`, `#0f172a`.
2. If light value is needed for glow/highlight, ensure it is not the base panel background.
3. Add or update `[data-theme='dark-glass']` overrides for new components.
4. Verify at least one full pass through each affected screen in dark mode.

## Useful audit command
```bash
rg -n "#fff|#ffffff|rgb\(255,\s*255,\s*255\)|#0f172a" src/index.css src/themes.css src/styles
```
