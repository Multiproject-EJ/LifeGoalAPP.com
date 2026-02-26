# Dark Theme Analysis – Pass 3 (Habits)

## Scope reviewed
- Habits tracker shell and checklist card stack.
- Habit intentions modal and compact day-nav panel.

## Confirmed dark-theme issues found
1. **Habit intentions modal remained bright/warm-light**
   - Card/body/button surfaces relied on `#fff7ed`, `#fff`, and light grays.
2. **Habit tracker empty/cards could still read as white panels**
   - Empty state, board body, and card stack retained light default surfaces.
3. **Secondary controls had light-theme text/border assumptions**
   - Legacy toggle and refresh controls used light surfaces with dark text.

## Fixes applied in this pass
- Added dark-glass overrides for tracker shell/empty state/card stack/body.
- Added dark-glass overrides for intentions modal surfaces, controls, and error state.
- Updated key helper/control text to semantic dark-theme text tokens.

## Next analysis targets
1. Account/settings tab nested cards and forms.
2. Remaining modal overlays with white fallback backgrounds.
