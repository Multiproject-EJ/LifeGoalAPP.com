# Vision board tab background layering

## Goal
Use a fixed, non-scrolling background image for a specific workspace tab (the Vision Board / `insights` tab) while keeping the content layers transparent or lightly styled.

## Layering overview
When `activeWorkspaceNav === 'insights'`, the app applies these layers (top to bottom):

1. **Content layer**
   - `main.workspace-main` and `section.workspace-stage` hold the visible UI and scrolling content.
   - These should stay transparent (or lightly styled) so the true background shows through.
2. **Workspace shell**
   - `.workspace-shell` holds the layout and provides z-index stacking for navigation and content.
3. **True background layer**
   - `.app--vision-board::after` is a fixed, full-viewport background used only on the Vision Board tab.
   - It is positioned behind the UI and does not scroll.

## How it is wired
- The root wrapper is `div.app` in `src/App.tsx`.
- When the Vision Board tab is active (`activeWorkspaceNav === 'insights'`), we append `app--vision-board` to the root class list.
- The CSS uses `app--vision-board::after` as the fixed background layer, with theme-specific overrides:
  - Light theme: `--vision-board-bg: url('./assets/Visiontablight.webp')`
  - Dark themes: `--vision-board-bg: url('./assets/Visiontabdark.webp')`

## Key selectors
- **Enable background for a tab**:
  - `app--vision-board` (applied in `src/App.tsx`)
- **Fixed background image layer**:
  - `.app--vision-board::after`
- **Theme override**:
  - `:is([data-theme='dark-glass'], [data-theme='midnight-purple'], [data-theme='flow-night'], [data-theme='bio-night']) .app--vision-board`
- **Keep content layers transparent**:
  - `.workspace-main--vision-board`
  - `.vision-board`
  - `.progress-dashboard__panel-content--vision-board`

## Adding another tab background
1. Update `src/App.tsx` to add a tab-specific class on `div.app` (similar to `app--vision-board`).
2. Add a `::after` rule for that class in `src/index.css` with `position: fixed` and `inset: 0`.
3. Define a custom CSS variable for the background image and override it for dark themes.
4. Ensure the tab’s content containers are transparent so the fixed background remains visible.
