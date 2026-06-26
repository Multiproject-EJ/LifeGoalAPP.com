# Island Run Modal Text Color Audit — 2026-06-26

Island Run overlays render in a controlled dark game environment. Modal and overlay text must be owned by Island Run CSS, not by the main app theme, system appearance, browser defaults, or React ancestry.

## Guardrail

- Island Run board roots must expose game-owned text and surface tokens.
- Portal-rendered Island Run overlays must use `island-run-overlay-root` or declare component-owned equivalent tokens.
- Island Run modal CSS must not rely on `color: inherit` or generic app text tokens such as `--text-primary`, `--text-secondary`, `--foreground`, or `--muted-foreground`.
- Native buttons, inputs, placeholders, disabled states, fallback states, loading states, and error states inside Island Run overlays must declare readable text colors through Island Run-owned tokens or component-owned tokens.

## Current source-verified status

| Surface | Status | Notes |
| --- | --- | --- |
| Shared Island Run root / portal overlay root | SAFE | `LevelWorlds.css` declares fixed Island Run text/surface/focus tokens on shell/root/portal classes. |
| StoryReader | SAFE | Uses component-owned story tokens and explicit CTA/control colors. |
| Narrative dialogue | SAFE | Portal root now carries shared game tokens; dialogue text and buttons use explicit component colors. |
| Narrative toast | SAFE | Portal root now carries shared game tokens; card/label/speaker/text colors are explicit. |
| Build modal V2 | SAFE | Portal root now carries shared game tokens; heading/body/progress/card/fallback/disabled colors are explicit. |
| Stop modals, encounters, hatchery, wisdom, shop/market, sanctuary, wallet/store, boss, minigame, dormant-door, traffic-light | SAFE (source-verified), NEEDS MANUAL VISUAL CHECK | All board-owned stop-modal portal backdrops now receive the shared overlay class and stop-modal text/button rules are explicit. Individual dense states should still be spot-checked visually on devices. |
| Travel overlay | SAFE | Overlay root and card/title/subtitle/body colors are explicit. |
| Island/win clear celebration | SAFE | Overlay root and card/title/body/reward/button colors are explicit. |
| Welcome pack / creature reward card reveal | SAFE | Overlay root and shell/card/button/status colors are explicit. |
| Compass modal input surface | SAFE | Portal root and input/caret/placeholder colors are explicit. |
| Tech collection and egg-ready modal variants | SAFE (source-verified), NEEDS MANUAL VISUAL CHECK | Portal backdrops receive shared tokens; egg-ready intentionally uses a light surface with explicit dark text. |

## Prevention tests

`islandRunModalTextColorGuards.test.ts` verifies shared token declarations, portal root usage, StoryReader owned tokens, explicit dialogue/toast/build/travel/win/stop colors, input/placeholder/caret colors, and a source guard against generic text tokens or `color: inherit` on Island Run modal/overlay selectors.
