# LifeGoalApp Design System - Developer Guide

## Overview

This design system provides a futuristic, glassmorphic UI with light/dark themes and modular components. It integrates seamlessly with the existing React + TypeScript application and theme system.

## Quick Start

### 1. The design system is already integrated

The theme system uses:
- **React ThemeContext** (`src/contexts/ThemeContext.tsx`) for theme management
- **ThemeToggle component** (`src/components/ThemeToggle.tsx`) for UI toggle
- Theme names: `'bright-sky'` (light) and `'dark-glass'` (dark)
- LocalStorage key: `'lifegoal-theme'`

### 2. Import the design system styles

In your React component or main entry:
```typescript
import '/src/styles/theme.css';
```

The styles are already imported in the main app, so you can use the component classes immediately.

### 3. Use the theme toggle

```tsx
import { ThemeToggle } from './components/ThemeToggle';

function MyComponent() {
  return (
    <header>
      <ThemeToggle />
    </header>
  );
}
```

## Components

### Cards

Glass-style cards with hover effects:

```html
<section class="card glass">
  <div class="card__header">
    <img src="/public/assets/icons/target.svg" width="20" alt="">
    <div class="card__title">Card Title</div>
    <span class="card__meta right">Meta info</span>
  </div>
  <p class="muted">Card content goes here.</p>
</section>
```

### Buttons

```html
<!-- Primary button -->
<button class="btn btn--primary">Save</button>

<!-- Ghost button -->
<button class="btn btn--ghost">Cancel</button>
```

### Toggle Switch

```html
<div class="row">
  <div class="toggle" role="switch" aria-label="Feature name" data-on="true">
    <span class="toggle__thumb"></span>
  </div>
  <span>Toggle label</span>
</div>
```

### Tabs

```html
<nav class="tabs">
  <button class="tab" aria-selected="true">All</button>
  <button class="tab" aria-selected="false">Active</button>
  <button class="tab" aria-selected="false">Completed</button>
</nav>
```

### Badges

Status badges with color variants:

```html
<!-- Default badge -->
<span class="badge">Default</span>

<!-- Success badge -->
<span class="badge badge--success">On Track</span>

<!-- Warning badge -->
<span class="badge badge--warn">At Risk</span>

<!-- Error badge -->
<span class="badge badge--error">Overdue</span>

<!-- Accent badge -->
<span class="badge badge--accent">Active</span>
```

### Navigation Bar

```html
<header class="navbar glass">
  <div class="brand">LifegoalApp</div>
  <div class="actions">
    <button class="btn btn--ghost" data-action="toggle-theme">Light / Dark</button>
    <a class="btn btn--primary" href="/app/new">Add</a>
  </div>
</header>
```

### Modal

```html
<div class="modal" id="modal-example">
  <div class="modal-backdrop" data-close="#modal-example"></div>
  <section class="modal__panel card glass">
    <h2 class="card__title">Modal Title</h2>
    <p>Modal content...</p>
    <div class="modal__actions">
      <button class="btn btn--ghost" data-close="#modal-example">Cancel</button>
      <button class="btn btn--primary">Save</button>
    </div>
  </section>
</div>

<!-- Button to open modal -->
<button class="btn btn--primary" data-open="#modal-example">Open Modal</button>
```

## Layouts

### Container & Grid

```html
<main class="container">
  <div class="grid" data-grid>
    <section class="card glass" data-draggable draggable="true">
      <!-- Card content -->
    </section>
    <section class="card glass" data-draggable draggable="true">
      <!-- Card content -->
    </section>
    <section class="card glass" data-draggable draggable="true">
      <!-- Card content -->
    </section>
  </div>
</main>
```

The grid automatically adjusts:
- Mobile (< 768px): 1 column
- Tablet (768px - 1119px): 2 columns
- Desktop (≥ 1120px): 3 columns

## Utility Classes

```html
<!-- Spacing -->
<div class="mt-4">Margin top</div>
<div class="mb-4">Margin bottom</div>

<!-- Layout helpers -->
<div class="row">Flex row with gap</div>
<div class="center">Centered grid</div>
<div class="right">Pushed to right</div>

<!-- Width -->
<input class="w-full" type="text">

<!-- Text -->
<span class="muted">Muted text</span>

<!-- Visibility -->
<div class="hidden">Hidden element</div>
```

## Design Tokens

All design tokens are available as CSS variables:

### Spacing
- `--space-1` through `--space-8` (4px to 48px)

### Border Radius
- `--radius-sm`: 8px
- `--radius-md`: 12px
- `--radius-lg`: 20px
- `--radius-pill`: 999px

### Colors
- `--bg`: Background color
- `--surface`: Glass surface
- `--surface-strong`: Stronger glass surface
- `--text`: Primary text
- `--text-muted`: Muted text
- `--border`: Border color
- `--accent`: Accent color (teal-blue)
- `--success`, `--warn`, `--error`: Status colors

### Shadows
- `--shadow-1`: Small elevation
- `--shadow-2`: Large elevation
- `--shadow-glow`: Glow effect

### Timing
- `--fast`: 150ms
- `--normal`: 220ms
- `--slow`: 360ms

### Typography
- `--font-ui`: UI font stack
- `--fs-xs` through `--fs-xl`: Font sizes

## Theme System

The theme system is React-based and automatically integrates with the design system tokens.

### Theme Names
- **`bright-sky`** - Light theme (default)
- **`dark-glass`** - Dark theme with glassmorphic effects

### Using Themes in React

```tsx
import { useTheme } from './contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      {/* Or set specific theme */}
      <button onClick={() => setTheme('dark-glass')}>Dark Mode</button>
    </div>
  );
}
```

### Theme Persistence
- Theme preference is saved to localStorage as `lifegoal-theme`
- Respects user's choice across sessions
- Applied to `:root[data-theme="..."]` attribute

### CSS Variables
The design system tokens automatically adapt to the current theme:
- `--bg`, `--surface`, `--text` change based on `bright-sky` vs `dark-glass`
- Component styles use these tokens for automatic theme support

## Interactive Features

### React Components

The design system is designed to work with React components. For interactive features like drag & drop, modals, and toggles, implement them as React components using the design system's CSS classes.

### Example: Modal in React

```tsx
import { useState } from 'react';

function MyModal() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button className="btn btn--primary" onClick={() => setIsOpen(true)}>
        Open Modal
      </button>
      
      {isOpen && (
        <div className="modal" open>
          <div className="modal-backdrop" onClick={() => setIsOpen(false)} />
          <section className="modal__panel card glass">
            <h2>Modal Title</h2>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </button>
              <button className="btn btn--primary">Save</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
```

### Example: Toggle Component

```tsx
import { useState } from 'react';

function ToggleSwitch({ label }: { label: string }) {
  const [isOn, setIsOn] = useState(false);
  
  return (
    <div className="row">
      <button
        className="toggle"
        role="switch"
        aria-label={label}
        aria-checked={isOn}
        data-on={isOn.toString()}
        onClick={() => setIsOn(!isOn)}
      >
        <span className="toggle__thumb" />
      </button>
      <span>{label}</span>
    </div>
  );
}

## Migration Checklist

When updating existing pages:

1. ✅ Wrap main content with `.container`
2. ✅ Convert feature blocks to `.card glass` with appropriate headers
3. ✅ Replace binary controls with `.toggle` components
4. ✅ Use `.grid` for widget layouts
5. ✅ Replace custom modals with `.modal` structure
6. ✅ Add theme toggle button to navigation
7. ✅ Ensure interactive elements have adequate hit areas (min 44px)
8. ✅ Keep existing JS functionality; only update classes/markup

## Browser Support

- Modern browsers with CSS custom properties support
- Backdrop filter for glass effect (graceful degradation on older browsers)
- ES6+ JavaScript (defer script loading)

## Accessibility

- Keyboard navigation supported on all interactive elements
- `:focus-visible` styles for keyboard users
- ARIA attributes recommended for complex components
- Color contrast meets WCAG AA standards in both themes
- Minimum 44px touch targets for mobile

## Performance

- CSS variables for instant theme switching
- Minimal JavaScript (< 3KB combined)
- No external dependencies
- Optimized animations using `transform` and `opacity`

## Examples

See the `/examples` directory for full page templates:
- Dashboard with draggable widgets
- Goals page with tabs and filters
- Habits page with toggles
- Vision board gallery
- Modal examples

## Support

For issues or questions, please refer to the main project documentation or create an issue in the repository.
