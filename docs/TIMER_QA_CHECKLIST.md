# Timer QA Checklist

Use this checklist to validate timer behavior after changes to session persistence, launch context, footer launcher state, presets, completion profiles, analytics, or theme variants.

## 1) Core lifecycle
- [ ] Start a timer from idle and confirm countdown decrements each second.
- [ ] Pause and resume; confirm remaining time is preserved.
- [ ] Reset while running/paused; confirm session returns to idle and original duration.
- [ ] Let a timer reach completion; confirm status moves to completed and `Done` acknowledges back to idle.

## 2) Launch context + deep links
- [ ] Start from Actions deep link and confirm source prefill.
- [ ] Start from Goals deep link and confirm `sourceType=goal` + context label.
- [ ] Start from Vision Board deep link and confirm `sourceType=vision` + context label.
- [ ] Verify launch context does not overwrite active running session unexpectedly.

## 3) Footer launcher states (mobile)
- [ ] Idle: footer action button shows default action label/icon.
- [ ] Active: footer action button shows live countdown + timer icon.
- [ ] Alert: completed timer keeps footer in alert state until timer is opened/acknowledged.
- [ ] Tap footer action while active/alert routes to Timer tab.

## 4) Persistence + stale session handling
- [ ] Reload page during running session; timer restores and continues.
- [ ] Reload page after completion; completed alert persists until acknowledged.
- [ ] Seed a session older than 24h and reload; session is normalized back to idle.

## 5) Preferences + customization
- [ ] Save/remove personal presets and verify persistence across reload.
- [ ] Change default source type and confirm idle timer defaults accordingly.
- [ ] Switch completion profile (bell/chime/vibrate/silent) and verify behavior on completion.
- [ ] Switch theme variant (sleek/high-contrast/calm) and verify visual token changes.

## 6) Analytics by source
- [ ] Complete at least one session per source and verify row appears under “Focus time by source”.
- [ ] Verify cumulative total increases on subsequent completions for same source.
- [ ] Verify session count increments by 1 per completion event.
- [ ] Verify list is sorted by total focused time descending.
- [ ] Cross-tab sanity: completing in another tab should persist and display after refresh.

## 7) Regression guardrails
- [ ] Meditation completion still awards lotus currency once per completion.
- [ ] Existing modules (Actions/Projects/Habits/Journal/Meditation/Goals/Vision Board) still navigate correctly.
- [ ] Keyboard and screen-reader labels remain present on timer controls/selectors.

