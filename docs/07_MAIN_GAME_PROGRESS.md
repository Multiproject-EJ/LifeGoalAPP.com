Date: 2026-03-01
Slice: M10A — Audio + Haptics system foundation
Summary:
- Created `islandRunAudio.ts` service with typed `IslandRunSoundEvent` and `IslandRunHapticEvent` event IDs, `playIslandRunSound`, `triggerIslandRunHaptic`, `getIslandRunAudioEnabled`, and `setIslandRunAudioEnabled` exports.
- Wired roll sound + haptic, token_move sound, stop_land sound + haptic, island_travel sound + haptic, and reward_claim haptic at all correct call sites in `IslandRunBoardPrototype.tsx`.
- Added compact 🔊/🔇 audio toggle button to Island Run HUD, persisting the `islandRunAudioEnabled` preference to localStorage.
Files changed:
- src/features/gamification/level-worlds/services/islandRunAudio.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M10B: Wire audio/haptic triggers for hatchery events (egg set, egg ready, egg open) and market events (purchase attempt, purchase success, insufficient coins).

Date: 2026-03-01
Slice: M12Z — Final visual polish cohesion audit (MVP polish gate completion)
Summary:
- Added `island-stop-modal--market` CSS rule to match onboarding modal max-width (480px) for consistent overlay sizing.
- Added `island-stop-modal--market h3` padding-bottom and `:not(:has(.island-stop-modal__context))` fallback rules to ensure bare-title modals have the same title-to-body spacing as context-block modals.
- Added `island-stop-modal .island-hatchery-card button` sizing rule so hatchery card buttons not using `__btn` class still meet minimum touch-target and weight standards.
- Added audio toggle button CSS (`.island-run-prototype__audio-toggle`) to design system so the M10A HUD control matches the M12 chip/button visual rhythm.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M10A: Audio + Haptics system foundation (audio service creation, 4 sound + 4 haptic events, HUD toggle).

Date: 2026-03-01
Slice: M12Y — Twenty-fifth visual polish pass for overlay action-row vertical anchoring
Summary:
- Added `island-stop-modal__cta--anchored` and `island-stop-modal__actions--anchored` CSS modifier (align-self: flex-start + margin-top: auto) to pin action rows to their natural top-of-area anchor regardless of how long body copy grows.
- Applied `--anchored` to all five CTA/action-row containers across onboarding, market, stop, and encounter modal variants.
- Kept all changes presentation-only and preserved gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12Z: final visual polish cohesion audit pass (MVP polish gate completion).

Date: 2026-03-01
Slice: M12X — Twenty-fourth visual polish pass for overlay action-row alignment
Summary:
- Added a dedicated aligned action-row class to market/stop/encounter modal action rows so alignment behavior is explicitly shared.
- Tuned balanced action-row layout rules so multi-button rows remain evenly distributed while single-button rows are width-capped and centered.
- Kept all changes presentation-only and preserved gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12Y apply twenty-fifth visual polish pass to overlay action-row vertical anchoring (top/center alignment consistency across modal variants).

Date: 2026-03-01
Slice: M12W — Twenty-third visual polish pass for overlay CTA spacing consistency
Summary:
- Added explicit balanced CTA/action-row classing so onboarding CTA and stop-modal action rows share a consistent spacing rhythm.
- Added balanced row sizing/alignment rules to reduce visual jump between one-button CTA areas and multi-button action rows.
- Kept all changes presentation-only and preserved gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12X apply twenty-fourth visual polish pass to overlay action-row alignment (single vs multi-button row balance).

Date: 2026-03-01
Slice: M12V — Twenty-second visual polish pass for modal headline spacing consistency
Summary:
- Added explicit headline class usage in overlay markup for onboarding/market/stop/encounter titles and travel headline text.
- Tuned eyebrow→title and title→body spacing rules so headline stacks feel consistently balanced across modal/travel overlays.
- Kept all changes presentation-only and preserved gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12W apply twenty-third visual polish pass to overlay CTA spacing consistency (button row rhythm under varied copy lengths).

Date: 2026-03-01
Slice: M12U — Twenty-first visual polish pass for long-copy readability wrap rhythm
Summary:
- Added a dedicated long-copy modal variant so overlay paragraph lines keep a stable readable measure (`ch`-bounded line length) on mobile.
- Applied pretty-wrap/overflow wrapping rules for modal and travel helper copy to reduce awkward breaks in longer text scenarios.
- Added explicit long-copy classing in overlay markup while preserving gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12V apply twenty-second visual polish pass to modal headline spacing consistency (eyebrow/title/body vertical rhythm).

Date: 2026-03-01
Slice: M12T — Twentieth visual polish pass for overlay copy-hierarchy contrast
Summary:
- Increased contrast separation between overlay eyebrow/title/body layers so headline priority reads faster on mobile.
- Tuned travel overlay text hierarchy similarly (eyebrow de-emphasis, title emphasis, helper-copy softening) for consistent scan order.
- Added lightweight semantic copy classes in onboarding/travel markup to keep hierarchy styling explicit without changing behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12U apply twenty-first visual polish pass to modal readability under long-copy scenarios (line-length + wrap rhythm).

Date: 2026-03-01
Slice: M12S — Nineteenth visual polish pass for overlay density balance
Summary:
- Added a dedicated dense-overlay variant to keep onboarding/stop/encounter modal content compact while preserving readability.
- Tightened context/action spacing rhythm in dense overlays (copy block + CTA divider spacing) for better mobile density balance.
- Slightly reduced travel card padding to harmonize overlay density with the updated modal rhythm, with no behavior/signature changes.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12T apply twentieth visual polish pass to overlay copy hierarchy contrast (eyebrow/title/body priority).

Date: 2026-03-01
Slice: M12R — Eighteenth visual polish pass for overlay interaction affordance accessibility
Summary:
- Added explicit action-affordance classing for overlay buttons to unify focus/tap behavior across onboarding and stop modals.
- Improved accessible interaction feedback with visible focus rings and touch-target clarity (tap highlight + larger action heights).
- Added active-state feedback for overlay actions while preserving existing gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12S apply nineteenth visual polish pass to overlay density balance (compact copy blocks + action spacing harmony).

Date: 2026-03-01
Slice: M12Q — Seventeenth visual polish pass for overlay action-emphasis states
Summary:
- Added explicit action-state styling for onboarding CTA and stop-modal buttons so default/hover/focus/disabled feedback is more consistent.
- Tuned hover/focus emphasis with subtle lift/shadow and clearer border/brightness feedback to reinforce action affordance.
- Kept runtime behavior/signatures unchanged and limited this slice to presentation-only interaction feedback polish.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12R apply eighteenth visual polish pass to overlay interaction affordance accessibility (focus ring + tap clarity).

Date: 2026-03-01
Slice: M12P — Sixteenth visual polish pass for overlay CTA/context separation
Summary:
- Introduced explicit onboarding overlay structure (`context` + `cta` blocks) so guidance copy and primary action are visually separated.
- Added CTA-divider styling and full-width onboarding action treatment to reinforce action focus after context copy.
- Kept copy/content and gameplay behavior/signatures unchanged; this slice is presentation-only.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12Q apply seventeenth visual polish pass to overlay action emphasis states (default/hover/disabled clarity).

Date: 2026-03-01
Slice: M12O — Fifteenth visual polish pass for onboarding/travel overlay clarity
Summary:
- Added lightweight overlay eyebrow labels to onboarding and travel overlays so headline/context hierarchy is easier to scan at a glance.
- Kept onboarding and travel messaging content unchanged while improving visual parsing between context label, headline, and helper copy.
- Preserved gameplay behavior/signatures and kept the slice presentation-only.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12P apply sixteenth visual polish pass to overlay CTA/context separation (actions vs guidance emphasis).

Date: 2026-03-01
Slice: M12N — Fourteenth visual polish pass for modal-body readability rhythm
Summary:
- Tightened stop-modal body rhythm with refined title/body typography sizing and line-height to improve title/body scanability on mobile.
- Refined modal action-row spacing with a subtle divider and tighter gap so action areas read as a distinct, predictable section.
- Tuned travel overlay copy rhythm (title/subtitle spacing + line-height) for clearer quick-read feedback while preserving gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12O apply fifteenth visual polish pass to onboarding/travel overlay clarity (headline + helper-copy hierarchy).

Date: 2026-03-01
Slice: M12M — Thirteenth visual polish pass for button hierarchy consistency
Summary:
- Added an explicit roll CTA class so the primary gameplay action keeps stronger size/weight hierarchy versus secondary controls.
- Rebalanced button typography/sizing rhythm across scene/debug/booster controls, QA debug buttons, and modal action buttons for more consistent hierarchy.
- Kept all changes presentation-only and preserved gameplay behavior/signatures while tightening control density on mobile.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12N apply fourteenth visual polish pass to modal-body readability and spacing rhythm (title/body/list scanability).

Date: 2026-03-01
Slice: M12L — Twelfth visual polish pass for micro-typography and spacing consistency
Summary:
- Added a dedicated prototype title style and tuned text rhythm (font-size/line-height/letter-spacing) across HUD labels and landing text for cleaner mobile scanability.
- Tightened spacing consistency across HUD cards, status chips, controls wrap, and Home panel to align chip/label/button rhythm.
- Harmonized control typography sizing (scene/debug/roll/booster + QA note/label) so text hierarchy feels more consistent without changing gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12M apply thirteenth visual polish pass to button hierarchy consistency (primary/secondary/debug sizing + rhythm).

Date: 2026-03-01
Slice: M12K — Eleventh visual polish pass for stop/tile readability contrast
Summary:
- Strengthened stop-label readability across scene variants with darker label surfaces, clearer border contrast, and slightly heavier shadow separation.
- Added explicit tile value and anchor-id text styling hooks to improve number/debug-id legibility against tile gradients.
- Slightly rebalanced back/front tile contrast filters so mid-board tile values remain easier to parse on mobile without changing gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12L apply twelfth visual polish pass to micro-typography and spacing consistency (chip/label/button rhythm).

Date: 2026-03-01
Slice: M12J — Tenth visual polish pass for board focal hierarchy
Summary:
- Added an explicit board focus treatment layer so the board center reads as the main focal zone with softer edge falloff.
- Rebalanced board edge shading/highlight intensity to reduce edge noise while keeping depth cues from the framed board treatment.
- Slightly tuned center lap-chip surface contrast so it remains legible without overpowering stop/tile visuals.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12K apply eleventh visual polish pass to stop/tile readability contrast (mid-board clarity under all scenes).

Date: 2026-03-01
Slice: M12I — Ninth visual polish pass for board chrome/background framing
Summary:
- Refined board container framing with cleaner edge chrome (subtle border/glass insets + deeper external shadow) so the playfield reads as a distinct, polished surface.
- Added non-interactive board overlay layers (top highlight + bottom vignette + inner edge shading) to improve depth balance without affecting gameplay interactions.
- Slightly tuned per-scene board gradients to keep center readability while preserving stop/tile/token and movement behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12J apply tenth visual polish pass to board focal hierarchy (center emphasis + edge falloff balance).

Date: 2026-03-01
Slice: M12H — Eighth visual polish pass for debug/QA control de-emphasis
Summary:
- Grouped QA/debug controls into a dedicated tools container with a compact label so these controls are clearly separated from primary gameplay actions.
- Visually de-emphasized debug buttons (muted surface/border/weight) while preserving existing QA/debug gating and behavior.
- Kept Market debug helper hint available in QA mode and restyled it as a lower-priority QA note.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12I apply ninth visual polish pass to board chrome/background framing (container edges + depth balance).

Date: 2026-03-01
Slice: M12G — Seventh visual polish pass for control-state emphasis
Summary:
- Promoted the roll control as a clear primary CTA with dedicated visual treatment when dice are available.
- Added a distinct convert-state style for the roll button when the action shifts to heart-to-dice conversion.
- Strengthened disabled-state clarity across gameplay/modal actions (lower emphasis, no glow, explicit not-allowed cursor) while preserving existing behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12H apply eighth visual polish pass to debug/QA control de-emphasis in normal flow.

Date: 2026-03-01
Slice: M12F — Sixth visual polish pass for semantic color-token consistency
Summary:
- Added semantic color-token styling for key run-status chips (hearts/dice/coins/timer) to improve at-a-glance parsing.
- Added semantic landing-text variants (`info`, `plan`, `states`, `success`, `warn`) so status and guidance copy uses clearer visual meaning.
- Kept all changes presentation-only and preserved existing gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12G apply seventh visual polish pass to control-state emphasis (primary roll CTA + disabled clarity).

Date: 2026-03-01
Slice: M12E — Fifth visual polish pass for HUD density/scanability
Summary:
- Grouped header HUD into two compact sections (`Run status` and `Live feed`) to reduce scan noise and improve information hierarchy on mobile.
- Added explicit HUD section labels and panel containers so status chips and landing text are easier to parse at a glance.
- Tuned status-chip and landing-text readability (contrast/spacing/line-height) while preserving gameplay behavior and signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12F apply sixth visual polish pass to color-token consistency and semantic emphasis (success/warn/info tones).

Date: 2026-03-01
Slice: M12D — Fourth visual polish pass for modal surfaces and CTA hierarchy
Summary:
- Refined travel and stop modal surfaces with stronger backdrop/contrast, improved spacing rhythm, and clearer modal title/body hierarchy.
- Added explicit modal action-row styling with primary/secondary CTA variants and updated modal button group markup for clearer action emphasis on mobile.
- Enhanced travel overlay card messaging hierarchy with title/subtitle structure while preserving existing travel timing and gameplay behavior.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12E apply fifth visual polish pass to HUD density/scanability (status row + landing text grouping).

Date: 2026-03-01
Slice: M12C — Third visual polish pass for motion/feedback styling
Summary:
- Added stronger active-stop feedback with subtle pulse animation and selected-stop highlight styling for clearer focus during stop interactions.
- Added current-token tile emphasis (`island-tile--token-current`) and tuned token motion/shadow styling for clearer movement feedback.
- Added reduced-motion guardrails for motion polish effects while preserving gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12D apply fourth visual polish pass to modal surfaces and CTA hierarchy (travel + stop modals).

Date: 2026-03-01
Slice: M12B — Second visual polish pass for board/chip readability
Summary:
- Improved board readability by increasing contrast/weight of the center lap chip and stop labels.
- Enhanced tile-chip legibility with stronger chip surface contrast, clearer number rendering, and refined depth/shadow treatment.
- Updated mobile behavior to keep compact stop labels visible (truncated) instead of fully hiding them, improving on-board orientation on phone screens.
Files changed:
- src/features/gamification/level-worlds/LevelWorlds.css
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12C apply third visual polish pass to motion/feedback styling (token + active stop emphasis).

Date: 2026-03-01
Slice: M12A — First visual polish pass for Island Run header/controls
Summary:
- Refined Island Run prototype header styling with improved hierarchy: larger title treatment, stronger panel surface, and clearer status-chip grouping.
- Added a dedicated Home hatchery summary panel container and tuned copy/readability spacing so informational rows are easier to scan on mobile.
- Updated control-button typography/spacing and landing text rhythm to move prototype UI toward production polish without changing gameplay logic.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12B apply second visual polish pass to board/chip readability (tile labels + stop labels + contrast).

Date: 2026-03-01
Slice: M9D — Home Island progression-hint row scaffold
Summary:
- Added a compact Home Island progression-hint row clarifying dormant/home egg flow behavior in prototype copy.
- Hint explains that ready uncollected island eggs can carry as dormant eggs and that dormant/home eggs are opened from hatchery surfaces when available.
- Updated index planning to make visual polish expectations explicit for MVP quality (`M12 is mandatory before MVP sign-off`) and set next slice to M12A visual polish pass.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12A apply first visual polish pass to Island Run header/controls (spacing + typography + hierarchy).

Date: 2026-03-01
Slice: M9C — Home Island action-hint row scaffold
Summary:
- Added a compact Home Island action-hint row in the Island Run header that explains set/open behavior in prototype copy.
- Action hint clarifies that home eggs can be set when slot is empty and opened immediately from Home Island when ready, without movement requirements.
- Updated index planning to include an explicit UI beautification milestone track (M12) so roadmap now captures production polish work beyond prototype scaffolds.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M9D add Home Island panel progression-hint row (dormant/home egg flow copy scaffold).

Date: 2026-03-01
Slice: M9B — Home Island slot/ready status row scaffold
Summary:
- Added a dedicated Home Island status row in the Island Run prototype header with explicit slot usage and ready-egg status copy.
- Status copy is intentionally scaffold-only (`0/1` slot usage, `0` ready eggs) to improve panel clarity without introducing new runtime state wiring in this slice.
- Preserved existing roll/stop/travel gameplay behavior and QA/debug helper behavior.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M9C add Home Island panel action-hint row (set/open behavior copy scaffold).

Date: 2026-03-01
Slice: M9A — Home Island hatchery summary panel scaffold
Summary:
- Added a lightweight Home Island Hatchery summary note in the Island Run prototype header that states always-available behavior.
- Summary copy explicitly documents v1 expectations (single home egg slot and collect-anytime once ready) without adding new gameplay state changes.
- Preserved existing roll/stop/travel behavior and QA/debug controls; this slice is display-copy scaffold only.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M9B add Home Island panel state row for slot/ready status (copy-only scaffold).

Date: 2026-03-01
Slice: M8J — In-UI Market debug helper discoverability note
Summary:
- Added a compact QA/debug-only helper hint note in the Island Run prototype controls to surface Market debug helper console commands in-product.
- Helper note lists export/reset/status-coverage helper calls and is gated behind existing `showDebug || showQaHooks` conditions, keeping non-debug runtime behavior unchanged.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M9A scaffold Home Island prototype panel with always-collect hatchery summary copy.

Date: 2026-03-01
Slice: M8I — Market status coverage assertion helper
Summary:
- Added `window.__islandRunMarketDebugAssertStatusCoverage(expectedStatuses?, limit?)` to return pass/fail Market marker status coverage reports.
- Helper evaluates expected statuses against compact exported marker rows and returns coverage/missing metadata with baseline context.
- Updated QA checklist with exact assertion-helper commands and expected report shape for deterministic coverage checks.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8J add Market marker helper section to inline dev controls/readme for faster operator discovery.

Date: 2026-03-01
Slice: M8H — Market marker reset helper for clean-slate QA sequencing
Summary:
- Added `window.__islandRunMarketDebugResetState()` (debug/QA gated) to clear Market local owned/feedback state and establish a new marker export baseline timestamp for the session.
- Updated Market marker export helper to respect baseline filtering and expose baseline metadata (`baselineApplied`, `baselineIso`) in snapshot output.
- Added QA checklist steps for reset-helper verification and post-reset clean-slate export expectations.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8I add compact Market marker assertion helper for expected status coverage checks.

Date: 2026-03-01
Slice: M8G — Compact Market marker export helper
Summary:
- Added `window.__islandRunMarketDebugExportMarkers(limit?)` in `IslandRunBoardPrototype` (debug/QA gated) to return compact snapshots of recent `island_run_market_purchase` events.
- Snapshot rows normalize key marker fields (`status`, `bundle`, cost/reward, coin deltas, owned snapshot flags, timestamp`) for copy/paste QA triage.
- Updated QA checklist with exact helper commands and expected output shape for compact marker exports.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8H add Market marker reset helper for deterministic clean-slate QA sequencing.

Date: 2026-03-01
Slice: M8F — Dev-only deterministic helper for `already_owned` marker verification
Summary:
- Added dev-only QA controls in `IslandRunBoardPrototype` to emit deterministic Market `already_owned` marker paths for both dice and heart bundles.
- Helper path pre-sets owned-state context and emits `island_run_market_purchase` debug/telemetry payloads without relying on repurchase timing.
- Updated QA checklist with explicit M8F helper steps and expected evidence additions for both bundle types.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8G add dedicated Market marker export helper for compact QA evidence snapshots.

Date: 2026-03-01
Slice: M8E — Market marker QA checklist commands
Summary:
- Added a dedicated Market QA checklist section with explicit console extraction commands for `island_run_market_purchase` evidence events.
- Documented marker verification steps/fields for `attempt`, `insufficient_coins`, `success`, and `already_owned` statuses plus owned-state payload context.
- Kept runtime behavior unchanged (docs-only slice) while making Market marker triage repeatable for QA handoffs.
Files changed:
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8F add dev-only Market marker QA helper for deterministic `already_owned` verification.

Date: 2026-03-01
Slice: M8D — Market repurchase-block telemetry/debug marker path
Summary:
- Added explicit `already_owned` Market purchase marker emission when users attempt to buy a bundle they already own in the current island session.
- Extended Market marker payload context to include owned-state snapshot fields (`owned_dice_bundle`, `owned_heart_bundle`) for debug/telemetry triage.
- Preserved no-repurchase UX and existing Market progression flow while making repurchase-block outcomes observable.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8E add Market QA checklist section with explicit `already_owned` marker verification commands.

Date: 2026-03-01
Slice: M8C — Market owned-state scaffold with no-repurchase UX
Summary:
- Added Market prototype owned-state tracking (`dice_bundle`, `heart_bundle`) in `IslandRunBoardPrototype`.
- Market purchase buttons now transition to owned/disabled state after a successful buy and display owned labels/context, preventing repurchase in the same island session.
- Preserved existing Market progression flow by resetting owned-state on market stop completion / island travel while keeping non-Market stop behavior unchanged.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8D add Market owned-state telemetry/debug markers (`already_owned` path + owned-state snapshot payloads).

Date: 2026-03-01
Slice: M8B — Market purchase telemetry + debug markers
Summary:
- Added explicit Market purchase marker emission in `IslandRunBoardPrototype` for `attempt`, `insufficient_coins`, and `success` outcomes.
- Wired markers to both `logIslandRunEntryDebug('island_run_market_purchase', ...)` and `recordTelemetryEvent(..., eventType: 'economy_earn')` with bundle/cost/reward/coin-balance context.
- Preserved Market modal and stop progression behavior from M8A while making purchase-path observability deterministic for QA triage.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8C add Market prototype inventory slot scaffold (owned-item state + disabled repurchase UX).

Date: 2026-03-01
Slice: M8A — Market stop prototype purchase modal stub
Summary:
- Added a dedicated Market stop prototype modal in `IslandRunBoardPrototype` so Market interactions are now separated from generic stop handling.
- Added mock purchase actions (`Dice Bundle`, `Heart Bundle`) with visible feedback and starter coin-cost checks while preserving existing non-Market stop flows.
- Kept stop-completion flow intact; Market can still be completed explicitly after trying purchases.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8B add Market stop telemetry + purchase event debug markers for prototype buy attempts/success.

Date: 2026-03-01
Slice: M7N — Run-filter resolution metadata for progression helpers
Summary:
- Added explicit run-filter resolution metadata to progression bundle/filter helper outputs: `filterApplied` and `filterMatched`.
- Kept existing helper signatures and assertion pass/fail behavior unchanged while making matched vs unmatched ref outcomes explicit.
- Updated progression QA checklist with exact commands to verify `filterApplied`/`filterMatched` for no-ref, matched-ref, and unmatched-ref paths.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8A add Market stop interaction stub + prototype purchase modal wiring in Island Run board flow.

Date: 2026-03-01
Slice: M7M.1 — Scope normalization follow-up for unmatched run refs
Summary:
- Tightened `scope` derivation in progression filter/export helpers so `run_filtered` is emitted only when a provided ref resolves to a matched repro run window.
- Restored summary helper `summaryLine` format to preserve existing output string behavior while keeping new `scope` metadata available as a separate field.
- Updated QA checklist scope spot-check commands with matched vs unmatched run-ref expectations.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7N add explicit run-filter resolution metadata (`filterApplied` + `filterMatched`) to filter/bundle helper outputs.

Date: 2026-03-01
Slice: M7M — Explicit scope metadata for progression helper outputs
Summary:
- Added normalized `scope` metadata (`full_buffer` | `run_filtered`) to progression assertion report/summary models so helper outputs carry explicit evidence scope context.
- Updated progression summary/filter/bundle helpers to emit `scope` consistently while preserving existing call signatures and assertion pass/fail behavior.
- Expanded the progression QA checklist with exact scope-verification console commands for unfiltered and filtered helper paths.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7N add explicit run-filter resolution metadata (`filterApplied` + `filterMatched`) to filter/bundle helper outputs.

Date: 2026-03-01
Slice: M7L — Filter-aware export bundle support
Summary:
- Extended `window.__islandRunEntryDebugExportProgressionBundle(mode, ref?)` to optionally accept a run reference (`runId` or scenario label) while preserving the original one-argument call signature.
- When `ref` is provided, the bundle now scopes `evidence.events` to run-window progression events and returns filter metadata (`runFilterRef`, `matchedRunId`, `matchedScenario`, `filteredEventCount`) for explicit triage context.
- Updated progression QA checklist with side-by-side no-filter vs filtered bundle examples and expected metadata keys.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7M add normalized `scope` metadata across summary/filter/bundle outputs for unambiguous export interpretation.

Date: 2026-03-01
Slice: M7K — Run-scoped progression debug filter helper
Summary:
- Added `window.__islandRunEntryDebugFilterProgressionRun(ref, mode)` to isolate progression-relevant runtime-state events for a single repro run.
- Helper accepts either `runId` or scenario label, scopes to the matching `repro_run_started` window, and returns assertion-compatible output (`events` + `report`) for deterministic per-run triage.
- Updated progression QA checklist with run-start + run-filter examples and expected output keys.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7L add optional run-filter support to export bundle helper so one call can produce scoped summary+evidence payloads.

Date: 2026-03-01
Slice: M7J — QA export bundle helper for progression runs
Summary:
- Added `window.__islandRunEntryDebugExportProgressionBundle(mode)` to return both progression assertion summary and latest debug evidence in a single payload.
- Bundle helper reuses the existing assertion + summary paths and appends `collectDebugEvidence()` output so triage exports include both verdict and supporting events/network context.
- Updated progression QA checklist with explicit table/fallback bundle helper commands and expected output keys.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7K add run-scoped progression debug filter helper so exported assertions can be narrowed to a single repro run.

Date: 2026-03-01
Slice: M7I — Console-friendly progression assertion summary helper
Summary:
- Added `window.__islandRunEntryDebugAssertProgressionSummary(mode)` to print and return a compact pass/fail summary for progression assertions.
- Summary helper reuses the existing structured assertion report path and returns failed check names, counts, and a single-line `summaryLine` for fast triage copy/paste.
- Updated progression QA checklist with table/fallback summary helper commands and expected output shape.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7J add progression QA export bundle helper that returns assertion summary + evidence snapshot in one call.

Date: 2026-03-01
Slice: M7H — Parameterized assertion presets for table vs fallback environments
Summary:
- Updated progression assertion helper to accept mode presets: `window.__islandRunEntryDebugAssertProgressionSequence('table' | 'fallback')`.
- Table mode now requires `runtime_state_hydrate_query_success` marker evidence, while fallback mode requires fallback hydration stages with fallback marker payloads.
- Updated QA checklist docs with explicit invocation/examples for both presets so environment-specific verification is unambiguous.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7I add compact summary printer helper for assertion reports (single-line pass/fail + failed check names) to speed console triage.

Date: 2026-03-01
Slice: M7G — Dev-only automated assertion harness for progression-marker debug stages
Summary:
- Added `window.__islandRunEntryDebugAssertProgressionSequence()` in `islandRunEntryDebug` to deterministically validate reset→resolve→advance→refresh progression-marker evidence stages.
- Assertion report returns per-check pass/fail + matched event indices, reducing manual interpretation drift in QA triage.
- Updated progression QA checklist with an explicit final assertion-helper step and expected success shape.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7H add optional parameterized assertion presets (table-success vs fallback-mode) to support environment-specific verification without editing helper code.

Date: 2026-03-01
Slice: M7F — Progression-marker regression checklist + deterministic QA hooks
Summary:
- Added deterministic QA hook controls in `IslandRunBoardPrototype` (`QA: Mark boss resolved`, `QA: Advance island`, `QA: Reset progression`) behind debug/dev conditions to make marker-transition verification repeatable.
- Added dedicated QA checklist doc (`docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md`) that maps each transition step to expected debug evidence payload keys.
- Keeps production gameplay behavior unchanged while reducing ambiguity in progression-marker regression triage and manual verification runs.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (manual QA hooks verification)
Next:
- M7G add minimal automated assertion harness (dev-only) that validates expected progression-marker stage payloads from debug buffer.

Date: 2026-03-01
Slice: M7E — Progression-marker debug evidence instrumentation pass
Summary:
- Extended runtime-state debug events in `islandRunGameStateStore` to include progression marker payloads (`currentIslandNumber`, `bossTrialResolvedIslandNumber`) across hydrate/persist success, error, and fallback stages.
- Added fallback marker snapshots to hydration skip/no-row/error stages so exported evidence shows both attempted table state and active local fallback context.
- Keeps runtime behavior unchanged while making `window.__islandRunEntryDebugEvidence()` materially more actionable for progression persistence regressions.
Files changed:
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7F add targeted regression checklist/assertions around progression marker transitions (boss resolve, boss clear, timer-expiry advance) for repeatable QA runs.

Date: 2026-03-01
Slice: M7D — Table-first persistence for Island Run progression markers
Summary:
- Added Supabase migration `0167_island_run_runtime_state_progression_markers.sql` to create/harden `island_run_runtime_state` with progression marker columns (`current_island_number`, `boss_trial_resolved_island_number`) and RLS policies.
- Updated runtime-state game-store table read/write paths to include progression marker columns in table selects/upserts, aligning M7C marker persistence with table-first behavior.
- Updated `database.types.ts` and product spec notes so typed Supabase contracts explicitly include Island Run runtime-state progression fields.
Files changed:
- supabase/migrations/0167_island_run_runtime_state_progression_markers.sql
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/lib/database.types.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7E wire operator/debug evidence capture to show progression-marker hydration/persist values for fast regression triage.

Date: 2026-03-01
Slice: M7C — Persist boss-clear progression runtime markers
Summary:
- Extended Island Run runtime-state schema with `currentIslandNumber` and `bossTrialResolvedIslandNumber` so boss progression survives refresh.
- Wired `IslandRunBoardPrototype` to hydrate island/boss marker state from runtime-state and persist marker updates on boss resolve + island advance paths.
- Keeps existing M7A/M7B gameplay + telemetry behavior while preventing refresh resets from dropping boss progression context.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (manual refresh/persistence verification)
Next:
- M7D align persisted progression markers with table-first runtime-state columns/migration so cross-device continuity matches local refresh continuity.

Date: 2026-03-01
Slice: M7B — Boss stop telemetry + reward contract wiring
Summary:
- Wired boss trial rewards into shared reward/session rails by logging `awardHearts(..., 'shooter_blitz', ...)`, `awardGold(..., 'shooter_blitz', ...)`, and `logGameSession(...)` during boss resolve/clear.
- Added explicit telemetry payloads for `island_run_boss_trial_resolved` and `island_run_boss_island_cleared` using `economy_earn` so operator analytics can audit reward/clear stages.
- Preserved M7A gameplay gating behavior (boss clear still blocked until trial resolve) while adding instrumentation-only follow-through.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (manual boss-stop telemetry wiring verification)
Next:
- M7C persist per-island boss-clear progression/runtime markers so travel + unlock state survive refresh/session changes.

Date: 2026-03-01
Slice: M7A — Boss stop reward prototype (challenge resolve + clear gating)
Summary:
- Added a dedicated boss-stop challenge stub in `IslandRunBoardPrototype` with explicit resolve action before island clear can be claimed.
- Boss resolve now grants prototype reward feedback (`+2 hearts`, `+120 coins`) and surfaces a clear confirmation message before travel.
- Kept non-boss stop behavior unchanged (existing hatchery/encounter/standard stop completion flows preserved).
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (manual boss-stop flow verification)
Next:
- M7B wire boss-stop resolve + island-clear events into telemetry/reward logging contract for auditability.

Date: 2026-03-01
Slice: M7P.15 — Fleet-level legacy alias rollout gate helper
Summary:
- Added `getLegacyAliasSunsetRollup(userIds)` in `gameRewards` to aggregate per-user sunset scans into a single go/no-go payload.
- Rollup reports scanned user count, total legacy reward/session rows, and explicit `usersWithLegacyAliases` for targeted cleanup follow-up.
- Keeps existing runtime behavior unchanged while making staged alias-removal decisions scriptable across multiple operator-selected accounts.
Files changed:
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.16 wire rollup summary into the operator diagnostics surface (or scripted export path) to capture baseline evidence before deleting residual legacy-read scaffolding.

Date: 2026-03-01
Slice: M7P.14 — Canonical-only game/source unions with legacy-read compatibility
Summary:
- Removed `pomodoro_sprint` from canonical game/source unions (`HabitGameId`, `GameSource`, `EconomySourceKey`) so new compile-time call sites only emit `shooter_blitz`.
- Preserved non-breaking compatibility for existing persisted legacy rows by widening storage-read normalizers in `gameRewards` to accept legacy aliases and self-heal to canonical IDs.
- Dropped legacy-only metadata/economy labels tied to `pomodoro_sprint` while keeping the sunset-readiness scanner intact for operator verification.
Files changed:
- src/types/habitGames.ts
- src/services/gameRewards.ts
- src/constants/economy.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.15 remove now-unused legacy scanner UI/actions after at-scale diagnostics confirm zero legacy alias rows for target accounts.

Date: 2026-03-01
Slice: M7P.13 — Operator/dev diagnostics wiring for alias sunset readiness
Summary:
- Wired legacy alias readiness into an operator-facing diagnostics surface inside Account → Developer & Analytics Tools.
- Added a “Run legacy alias scan” action that calls `getLegacyAliasSunsetReadiness(userId)` and displays reward/session legacy row counts plus readiness status.
- Enables baseline capture of real user/device alias counts before removing `pomodoro_sprint` compatibility entries.
Files changed:
- src/features/account/MyAccountPanel.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (manual visual verification)
Next:
- M7P.14 begin staged legacy alias removal (types/economy/source unions) once baseline scans show zero active legacy rows.

Date: 2026-03-01
Slice: M7P.12 — Legacy alias sunset-readiness scanner
Summary:
- Added `getLegacyAliasSunsetReadiness(userId)` in `gameRewards` to report legacy `pomodoro_sprint` usage counts in reward/session storage.
- The scanner returns per-user legacy row counts and an aggregate readiness boolean (`hasLegacyAliases`) to support telemetry-backed alias-removal decisions.
- Keeps runtime behavior unchanged while making the alias sunset checklist measurable instead of manual.
Files changed:
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.13 wire the sunset-readiness summary into an operator/dev diagnostics surface and collect baseline counts before removing legacy aliases.

Date: 2026-03-01
Slice: M7P.11 — Self-healing legacy alias cleanup in history storage
Summary:
- Updated reward/session history readers in `gameRewards` to perform in-place cleanup of legacy `pomodoro_sprint` rows when encountered.
- When legacy aliases are found, normalized events are now persisted back to localStorage, reducing repeated legacy drift and preparing for eventual alias sunset.
- Kept write-path compatibility unchanged while adding shared event/session normalizers for cleaner canonicalization logic.
Files changed:
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.12 draft and execute telemetry-backed criteria to safely remove legacy alias types/entries.

Date: 2026-03-01
Slice: M7P.10 — Centralized legacy game-id alias contract
Summary:
- Added shared legacy game-id alias contract in `types/habitGames.ts` via `LEGACY_HABIT_GAME_ID_ALIASES` and `normalizeHabitGameId(...)`.
- Updated reward/session history service to consume the shared normalizer, removing duplicated legacy game-id alias logic from `gameRewards.ts`.
- Keeps current compatibility behavior unchanged while tightening a single-source path for future `pomodoro_sprint` sunset steps.
Files changed:
- src/types/habitGames.ts
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.11 define and execute final `pomodoro_sprint` alias removal checklist once telemetry confirms no active legacy writes.

Date: 2026-03-01
Slice: M7P.9 — Legacy alias normalization in reward/session history rails
Summary:
- Added centralized legacy alias normalization in `gameRewards` so any incoming `pomodoro_sprint` source/game IDs are canonicalized to `shooter_blitz` before persistence.
- Updated history readers (`getRewardHistory`, `getGameSessionHistory`) to normalize existing legacy rows on read, preventing mixed legacy/current identifiers in analytics/UI consumers.
- Keeps compatibility safe for old callers while tightening post-migration data consistency without removing legacy type aliases yet.
Files changed:
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.10 evaluate formal sunset plan for `pomodoro_sprint` type/economy aliases after compatibility window and telemetry review.

Date: 2026-03-01
Slice: M7P.8 — Legacy Pomodoro stale-reference hardening pass
Summary:
- Extended Level Worlds legacy normalization so persisted `pomodoro_sprint` nodes now migrate not only objective IDs to `shooter_blitz`, but also stale node copy (`label`, `description`) and tomato emoji to shooter-aligned values.
- Keeps migration non-breaking for old localStorage boards while preventing mixed legacy naming in post-migration UI surfaces.
- Preserves the same load-time compatibility strategy: normalize once during `loadState(...)`, then persist upgraded state back to storage.
Files changed:
- src/features/gamification/level-worlds/services/levelWorldsState.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.9 audit remaining legacy `pomodoro_sprint` mentions in shared type/economy copy and decide whether to keep compatibility aliases or formally sunset them.

Date: 2026-03-01
Slice: M7P.7 — Shooter Blitz UX polish pass
Summary:
- Added mission-phase status messaging and a visible progress bar so Shooter Blitz runs communicate pacing and completion readiness more clearly.
- Added reward pill chips in the mission setup panel to make coin/dice/token payouts scannable before mission start.
- Kept gameplay/reward/session callback contracts unchanged (`onClose`, `onComplete`, existing reward grants + session events) while polishing presentation only.
Files changed:
- src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx
- src/features/gamification/games/shooter-blitz/shooterBlitz.css
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (visual verification)
Next:
- M7P.8 run a post-migration stale-reference audit for `pomodoro_sprint` and narrow remaining legacy-only copy where safe.

Date: 2026-03-01
Slice: M7P.6 — Retire standalone Pomodoro Sprint runtime surface
Summary:
- Removed unused standalone Pomodoro Sprint component/runtime files now that Lucky Roll and Level Worlds both route mini-game tiles to Shooter Blitz.
- Added dedicated `shooterBlitz.css` and renamed Shooter Blitz CSS classes away from Pomodoro-prefixed class names.
- Updated economy source matrix to include Shooter Blitz as an earn source and mark Pomodoro copy as legacy-only.
Files changed:
- src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx
- src/features/gamification/games/shooter-blitz/shooterBlitz.css
- src/features/gamification/games/pomodoro-sprint/PomodoroSprint.tsx (deleted)
- src/features/gamification/games/pomodoro-sprint/pomodoroSprintState.ts (deleted)
- src/features/gamification/games/pomodoro-sprint/pomodoroSprintTypes.ts (deleted)
- src/features/gamification/games/pomodoro-sprint/pomodoroSprint.css (deleted)
- src/constants/economy.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.7 run a quick UX polish pass on Shooter Blitz visuals/controls now that legacy Pomodoro styling debt is removed.

Date: 2026-03-01
Slice: M7P.5 — Lucky Roll mini-game tiles switched from Pomodoro Sprint to Shooter Blitz
Summary:
- Replaced Lucky Roll mini-game routing from `pomodoro_sprint` to `shooter_blitz` so both Level Worlds and Lucky Roll launch the same shooter replacement surface.
- Updated Lucky Roll board tile generation/types so mini-game tile metadata now emits/accepts `shooter_blitz` identifiers.
- Updated Lucky Roll UI labels/comments and launch state wiring to open `ShooterBlitz` instead of `PomodoroSprint` while preserving reward refresh flow.
Files changed:
- src/features/gamification/daily-treats/LuckyRollBoard.tsx
- src/features/gamification/daily-treats/luckyRollState.ts
- src/features/gamification/daily-treats/luckyRollTypes.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.6 evaluate removal/deprecation path for the standalone Pomodoro Sprint component files and legacy economy copy.

Date: 2026-03-01
Slice: M7P.4 — Legacy Pomodoro board-state migration to Shooter Blitz objective IDs
Summary:
- Added Level Worlds state-load normalization that migrates persisted legacy mini-game objectives from `pomodoro_sprint` to `shooter_blitz`.
- Migration runs during `loadState(...)`, returns normalized in-memory state, and persists upgraded state back to localStorage to avoid repeated remapping.
- Prevents stale pre-migration boards from failing Shooter Blitz routing expectations after the mini-game ID transition.
Files changed:
- src/features/gamification/level-worlds/services/levelWorldsState.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.5 complete Pomodoro runtime deprecation review and remove no-longer-referenced Pomodoro code paths where safe.

Date: 2026-03-01
Slice: M7P.3 — First-class `shooter_blitz` identifiers in reward/session rails
Summary:
- Promoted `shooter_blitz` to first-class game/source identifiers in shared reward/session typing (`HabitGameId`, `GameSource`) while keeping `pomodoro_sprint` as explicitly legacy for compatibility.
- Updated `ShooterBlitz` reward grants and session logs to emit `shooter_blitz` IDs instead of legacy `pomodoro_sprint` values.
- Updated shared game metadata/token/reward-priority config to include Shooter Blitz as the active pride/focus mini-game entry.
Files changed:
- src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx
- src/types/habitGames.ts
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.4 remove or retire remaining Pomodoro Sprint runtime route/surface paths after compatibility review.

Date: 2026-03-01
Slice: M7P.2 — Shooter Blitz reward/session parity pass
Summary:
- Upgraded `ShooterBlitz` from placeholder interaction to a rewarding mini-game loop with completion grant values (coins/dice/token).
- Added session logging parity (`enter`/`complete`/`exit`) through existing game reward/session telemetry rails so Shooter Blitz runs are observable.
- Added mission reward messaging and completion haptic feedback to align with existing mini-game UX expectations.
Files changed:
- src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (visual verification)
Next:
- M7P.3 migrate legacy `pomodoro_sprint` identifiers in reward/session type unions to a first-class `shooter_blitz` ID.

Date: 2026-03-01
Slice: M7P.1 — Replace Pomodoro Sprint node route with Shooter Blitz mini-game surface
Summary:
- Added new `ShooterBlitz` mini-game surface for Level Worlds mini-game nodes with a simple mission loop (start, hit targets, complete/abort).
- Replaced `pomodoro_sprint` routing in `LevelWorldsHub` with `shooter_blitz` so mini-game node launches now align with Island Run shooter replacement direction.
- Updated Level Worlds mini-game typing/objective labeling and board generator mini-game pool to emit `shooter_blitz` instead of `pomodoro_sprint`.
Files changed:
- src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- src/features/gamification/level-worlds/types/levelWorlds.ts
- src/features/gamification/level-worlds/hooks/useNodeObjectives.ts
- src/features/gamification/level-worlds/services/levelWorldsGenerator.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.2 wire Shooter Blitz rewards/telemetry parity and replace remaining Pomodoro-specific naming/assets.

Date: 2026-03-01
Slice: M7O.16 — Guided repro run/checkpoint helpers for consistent evidence capture
Summary:
- Added structured repro helper APIs in Island Run debug tooling: `__islandRunEntryDebugStartRun(scenario)` and `__islandRunEntryDebugMarkCheckpoint(checkpoint, payload?)`.
- Standardized checkpoint vocabulary for login incident captures (`login_click`, `post_redirect_paint`, `session_established`, `island_run_entry_visible`, `blank_screen_observed`, `recovered`).
- Keeps debug-only behavior gated by `?islandRunEntryDebug=1` while reducing analyst variance in evidence traces.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.17 execute two guided repro runs using run/checkpoint helpers and append evidence payloads + conclusions to incident ledger.

Date: 2026-03-01
Slice: M7O.15 — Lifecycle + manual marker support for repro evidence capture
Summary:
- Updated `islandRunEntryDebug` to install helpers/listeners only when `?islandRunEntryDebug=1` is active, keeping non-debug sessions untouched.
- Added lifecycle breadcrumbs (`document_visibility_change`, `window_pageshow`, `window_pagehide`) and evidence metadata (`visibilityState`) to better explain apparent blank-screen windows.
- Added `window.__islandRunEntryDebugMark(label, payload?)` for reproducible manual checkpoints during repro runs (e.g., pre-login click, post-redirect paint).
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.16 run guided repro captures using `__islandRunEntryDebugMark(...)` and append resulting evidence payloads to incident log.

Date: 2026-03-01
Slice: M7O.14 — Capture global runtime failures in debug evidence stream
Summary:
- Extended `islandRunEntryDebug` to capture `window.error` and `unhandledrejection` events into the same buffered evidence stream.
- Global listeners install once and remain gated by `?islandRunEntryDebug=1`, so non-debug sessions remain unchanged.
- This makes blank-screen repro evidence include top-level runtime exceptions alongside bootstrap/mount/network diagnostics.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.15 execute repro sessions and append captured `window.__islandRunEntryDebugEvidence()` payloads (including any `window_error` / `window_unhandled_rejection` events) to incident ledger.

Date: 2026-03-01
Slice: M7O.13 — One-call debug evidence export (events + relevant network resources)
Summary:
- Extended the `islandRunEntryDebug` helper with `window.__islandRunEntryDebugEvidence()` to return a single structured evidence payload.
- Evidence payload now bundles location snapshot, buffered Island Run entry events, and filtered resource timing rows relevant to Supabase/runtime-state calls.
- Keeps debug-only behavior behind `?islandRunEntryDebug=1`; no gameplay or routing contract changes.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.14 execute repro runs and paste `window.__islandRunEntryDebugEvidence()` output snapshots for both login paths into the incident ledger.

Date: 2026-03-01
Slice: M7O.12 — Debug evidence buffering + runtime-state network stage logs
Summary:
- Extended Island Run entry debug helper to persist an in-session event buffer and expose `window.__islandRunEntryDebugDump()` / `window.__islandRunEntryDebugClear()` for reproducible evidence export.
- Added runtime-state table query/persist stage logs in `islandRunGameStateStore` (query start/success/error/no-row, persist start/success/error, remote-skip reasons) under the same `islandRunEntryDebug=1` flag.
- Keeps product behavior unchanged while enabling concrete protocol evidence that links mount sequencing to runtime-state API outcomes.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.13 run two login repro passes and paste `window.__islandRunEntryDebugDump()` output + network panel evidence into the incident ledger.

Date: 2026-03-01
Slice: M7O.11 — Mount-level evidence instrumentation for login blank-screen repro
Summary:
- Added shared `islandRunEntryDebug` helper for consistent opt-in debug detection/logging across Island Run entry surfaces.
- Added `[IslandRunEntryDebug]` mount/unmount instrumentation in `LevelWorldsHub` and `IslandRunBoardPrototype` to explicitly capture protocol step #5 (whether those trees mount).
- Added hydration result/error debug snapshots in `IslandRunBoardPrototype` to correlate runtime-state source/failure with entry sequencing evidence.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.12 execute the full login repro protocol and paste captured console/network evidence for both direct app login and `/level-worlds.html` sourced login.

Date: 2026-03-01
Slice: M7O.10 — Login repro instrumentation for Island Run entry bootstrap
Summary:
- Added opt-in dev instrumentation in `App.tsx` (`?islandRunEntryDebug=1`) to capture first-paint URL flags, bootstrap param consumption, and modal auto-open sequencing.
- Instrumentation emits structured `[IslandRunEntryDebug]` console snapshots aligned to the incident repro protocol (`openIslandRun*` presence, `shouldAutoOpenIslandRun`, and `showLevelWorldsFromEntry` transitions).
- Kept runtime behavior unchanged for non-debug sessions; this slice is diagnostics-only to support evidence-first regression verification.
Files changed:
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.11 run login-path repro pass (with and without `/level-worlds.html` source) and attach captured console/network evidence before any further bootstrap behavior changes.

Date: 2026-02-27
Slice: M7O.9 — Incident debug ledger for login blank-screen regression
Summary:
- Added `docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md` as an append-only incident ledger for this recurring blank-screen issue.
- Documented suspect code zones, attempted fixes, ranked hypotheses, reproducible debug protocol, and gated decision rule.
- Establishes an evidence-first debugging workflow to avoid repeated blind patch loops.
Files changed:
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O.10 execute repro protocol with instrumentation and collect concrete failure evidence before further routing changes.

Date: 2026-02-27
Slice: M7O.8 — Consume entry bootstrap flags on first paint to avoid login-path side effects
Summary:
- Added first-paint URL cleanup in `App.tsx` that removes `openIslandRun`/`openIslandRunSource` immediately when present.
- Scoped bootstrap detection to root path (`/`) + explicit source marker to reduce unintended activation after auth/login redirects.
- Kept intentional `/level-worlds.html` entry behavior while preventing stale bootstrap params from lingering through auth transitions.
Files changed:
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.9 add integration coverage for bootstrap-param consume path across auth redirect scenarios.

Date: 2026-02-27
Slice: M7O.7 — Scope entry bootstrap to legacy level-worlds redirect source
Summary:
- Restricted auto-open bootstrap in `App.tsx` to require both `openIslandRun=1` and `openIslandRunSource=level-worlds`.
- Updated `/level-worlds.html` redirect shim to set `openIslandRunSource=level-worlds` so intentional entry still works.
- Removes accidental Level Worlds modal activation on unrelated login URLs that might include stale/partial params.
Files changed:
- public/level-worlds.html
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.8 add entry-source analytics on redirect handoff to confirm scoped trigger behavior.

Date: 2026-02-27
Slice: M7O.6 — Baseline alert thresholds + low-volume guardrail
Summary:
- Added shared default hydration alert thresholds in runtime telemetry constants (`fallbackRatio24h`, `failureCount24h`, `minHydrationEvents24h`).
- Updated SQL alert seed query to require minimum hydration volume before triggering fallback-ratio alerts (reduces low-traffic false positives).
- Updated telemetry playbook with explicit default threshold values and code/SQL alignment notes.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeTelemetry.ts
- docs/09_ISLAND_RUN_RUNTIME_HYDRATION_ALERT_QUERIES.sql
- docs/08_ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PLAYBOOK.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.7 wire threshold values into ops dashboard config and runbook ownership.

Date: 2026-02-27
Slice: M7O.5 — Backend alert query seeds for hydration fallback monitoring
Summary:
- Added SQL query seeds for hydration source distribution, fallback ratio, and failure trend monitoring.
- Added starter alert query logic for 24h fallback ratio/failure thresholds to accelerate ops rollout checks.
- Unified hydration source typing by reusing shared `IslandRunRuntimeHydrationSource` in game-state store type alias.
Files changed:
- docs/09_ISLAND_RUN_RUNTIME_HYDRATION_ALERT_QUERIES.sql
- docs/08_ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PLAYBOOK.md
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.6 validate alert thresholds against production baseline and wire dashboards.

Date: 2026-02-27
Slice: M7O.4 — Hydration telemetry emission guardrails (dedupe)
Summary:
- Added client-side dedupe guard for runtime hydration telemetry to avoid repeated high-volume emits on repeated mounts.
- Dedupe key scopes by user/event/source/day (UTC) using sessionStorage so rollout dashboards retain signal quality.
- Kept hydration logic behavior unchanged; guard only impacts telemetry emission frequency.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeTelemetry.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/08_ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PLAYBOOK.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.5 align backend alert thresholds with deduped client emission semantics.

Date: 2026-02-27
Slice: M7O.3 — Runtime hydration telemetry playbook + constantized stage/source contract
Summary:
- Added `docs/08_ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PLAYBOOK.md` with event taxonomy, source meanings, and monitoring guidance.
- Added shared Island Run runtime telemetry constants/type to avoid hard-coded hydration stage/source strings drifting across files.
- Refactored Island Run prototype/runtime-state boundary typings to consume shared hydration source type/constants.
Files changed:
- docs/08_ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PLAYBOOK.md
- src/features/gamification/level-worlds/services/islandRunRuntimeTelemetry.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.4 wire hydration-source observability into backend analytics queries/alerts.

Date: 2026-02-27
Slice: M7O.2 — Dedicated telemetry event taxonomy for runtime hydration lifecycle
Summary:
- Added dedicated telemetry event types for runtime hydration lifecycle (`runtime_state_hydrated`, `runtime_state_hydration_failed`) instead of overloading `onboarding_completed`.
- Updated Island Run hydration telemetry emissions to use dedicated event types while preserving existing stage/source/error metadata.
- Improves analytics clarity and avoids semantic ambiguity in onboarding funnels.
Files changed:
- src/services/telemetry.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.3 add telemetry query playbook/dashboard doc for fallback rate monitoring.

Date: 2026-02-27
Slice: M7O.1 — Hydration fallback UX + unexpected failure telemetry
Summary:
- Added lightweight UX messaging in Island Run prototype when runtime-state hydration falls back from table reads.
- Added telemetry for unexpected hydration exceptions (`stage: island_run_runtime_state_hydration_failed_unexpected`) with error metadata.
- Preserved table-first behavior and hydration guardrails while improving rollout diagnosability from client signals.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.2 align telemetry taxonomy for hydration lifecycle events (dedicated event type/stage map).

Date: 2026-02-27
Slice: M7O — Runtime-state hydration observability baseline
Summary:
- Added runtime-state hydration source reporting (`table` vs explicit fallback reasons) in the Island Run game-state store/runtime-state service boundary.
- Added `hydrateIslandRunRuntimeStateWithSource` API and backend passthrough so callers can observe hydration provenance without changing persistence behavior.
- Emitted hydration telemetry from `IslandRunBoardPrototype` (`stage: island_run_runtime_state_hydrated`) with source metadata for migration monitoring.
Files changed:
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.1 add backend-facing dashboards/alerts for hydration fallback rate spikes.

Date: 2026-02-27
Slice: M7N.7 — Make Island Run prototype the default Level Worlds surface
Summary:
- Switched `LevelWorldsHub` to default to `IslandRunBoardPrototype` instead of requiring `?islandRunDev=1`.
- Added explicit opt-out behavior (`?islandRunDev=0`) for temporary fallback access to legacy board UI.
- Aligns live user entry with migration intent so users no longer land on old 1/7 arc board by default.
Files changed:
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O remove legacy board code path after final validation window.

Date: 2026-02-27
Slice: M7N.6 — Remove obsolete Lucky Roll bridge prop after direct entry routing
Summary:
- Removed `openLevelWorldsOnMount` from `LuckyRollBoard` now that `openIslandRun` routes directly to `LevelWorldsHub` from `App.tsx`.
- Deleted corresponding reactive open-on-prop effect and reverted Lucky Roll Level Worlds state initialization to internal default.
- Reduced entry-path complexity and eliminated dead migration bridge code.
Files changed:
- src/features/gamification/daily-treats/LuckyRollBoard.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O begin formal deprecation of remaining legacy `/level-worlds.html` shim once app-native routes are finalized.

Date: 2026-02-27
Slice: M7N.5 — Direct Level Worlds entry routing (skip Lucky Roll intermediary)
Summary:
- Updated `openIslandRun` bootstrap flow to open `LevelWorldsHub` directly from `App.tsx` instead of first opening `LuckyRollBoard`.
- Preserved one-time URL flag consumption (`openIslandRun`) while reducing modal-chain complexity and improving entry reliability.
- Kept existing Lucky Roll gameplay entry behavior unchanged for in-app usage.
Files changed:
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O consolidate legacy entrypoints and remove obsolete bridge props/routes.

Date: 2026-02-27
Slice: M7N.4 — Fix lost Level Worlds auto-open intent
Summary:
- Fixed a regression where `openIslandRun` was consumed before `LuckyRollBoard` received the `openLevelWorldsOnMount` intent, which could prevent Level Worlds from opening.
- Added dedicated `openLevelWorldsFromEntry` handoff state in `App.tsx` so entry intent survives URL-flag cleanup.
- Added reactive prop sync in `LuckyRollBoard` so late-arriving `openLevelWorldsOnMount` still opens Level Worlds hub.
Files changed:
- src/App.tsx
- src/features/gamification/daily-treats/LuckyRollBoard.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O continue runtime-state observability and remove remaining legacy route assumptions.

Date: 2026-02-27
Slice: M7N.3 — One-time `/level-worlds.html` auto-open consumption
Summary:
- Fixed repeat auto-open behavior after `/level-worlds.html` redirect by consuming `openIslandRun=1` only once per page load.
- Removed `openIslandRun` query param from URL after auto-open using `history.replaceState` to prevent repeated modal re-open on later renders.
- Preserved `islandRunDev=1` and other query params while cleaning only the bootstrap flag.
Files changed:
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O continue runtime-state observability and legacy entrypoint retirement.

Date: 2026-02-27
Slice: M7N.2 — Activate Island Run surface for `/level-worlds.html`
Summary:
- Replaced legacy static `/level-worlds.html` 1/7 arc map with a redirect shim into the app runtime (`openIslandRun=1`) so users land on the current Island Run implementation.
- Added app bootstrap handling to auto-open Lucky Roll -> Level Worlds hub when `openIslandRun=1` is present.
- Added Lucky Roll prop-based auto-open path for Level Worlds so `islandRunDev=1` links now surface the 17-tile prototype instead of legacy dots UI.
Files changed:
- public/level-worlds.html
- src/App.tsx
- src/features/gamification/daily-treats/LuckyRollBoard.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O add runtime-state hydration observability + routing cleanup to retire remaining legacy entry points.

Date: 2026-02-27
Slice: M7N.1 — Runtime hydration guardrails + stale-merge prevention
Summary:
- Prevented first-run modal/telemetry false positives by waiting for runtime-state hydration completion before evaluating first-run gate conditions.
- Blocked daily-hearts claim actions until runtime-state hydration completes to avoid pre-hydration duplicate grants.
- Updated runtime-state patch persistence to merge against hydrated table-first state (when available) instead of local-only reads to reduce stale overwrite risk.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O add explicit runtime-state hydration observability (success/fallback/error telemetry) and API contract hardening.

Date: 2026-02-27
Slice: M7N — Supabase runtime-state read hydration (table-first)
Summary:
- Added explicit runtime-state hydration reads from `island_run_runtime_state` so first-run and daily-hearts markers prefer table/API data when available.
- Phased out auth-metadata fallback for runtime marker reads by defaulting to dedicated game-state storage fallback (`localStorage` + safe defaults).
- Kept non-breaking behavior for demo/no-Supabase environments and runtime-table read failures by retaining local fallback state.
Files changed:
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O align server/API contracts and telemetry for runtime-state hydration/error observability.

Date: 2026-02-27
Slice: M7M — Supabase-ready game-state store write path (with fallback)
Summary:
- Extended Island Run game-state store with a Supabase upsert write path targeting `island_run_runtime_state` (user_id keyed record).
- Kept local storage persistence as fallback so prototype behavior remains stable when table/backend is unavailable.
- Wired runtime backend persistence to use store write result and surface errors when Supabase write path fails.
Files changed:
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7N add explicit read hydration from Supabase game-state table and phase out metadata fallback.

Date: 2026-02-27
Slice: M7L — Remove temporary metadata parity bridge for runtime markers
Summary:
- Updated Island Run runtime-state backend to persist runtime markers only in dedicated game-state storage service.
- Removed temporary auth-metadata write-through for first-run/daily marker fields while keeping onboarding completion metadata writes.
- Preserved runtime state read fallback behavior from metadata when no local game-state record exists.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7M implement Supabase-backed Island Run game-state table/API backend and replace browser storage store.

Date: 2026-02-27
Slice: M7K — Dedicated Island Run game-state storage backend (selector default)
Summary:
- Added `islandRunGameStateStore` as dedicated runtime marker storage for Island Run (first-run claim + daily hearts day key).
- Updated runtime-state backend selector default to use game-state storage backend instead of auth-metadata-only backend.
- Kept temporary auth metadata parity write-through in backend persistence while migration completes.
Files changed:
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7L replace temporary metadata parity bridge with dedicated Supabase game-state table/API and read path hydration.

Date: 2026-02-27
Slice: M7J — Runtime-state backend selector (table/API swap-ready)
Summary:
- Added `islandRunRuntimeStateBackend` with a formal backend interface and selector for runtime marker read/write.
- Moved auth-metadata runtime marker logic behind backend implementation so prototype components remain backend-agnostic.
- Kept current behavior unchanged while enabling future dedicated game-state table/API backend replacement with minimal surface changes.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7K implement dedicated Island Run game-state table backend and switch selector default from auth metadata.

Date: 2026-02-27
Slice: M7I — Runtime-state service boundary for Island Run markers
Summary:
- Added `islandRunRuntimeState` service to centralize read/write of Island Run runtime markers (first-run claim + daily hearts day key).
- Refactored Island Run prototype to use runtime-state service functions instead of reading/writing metadata fields inline.
- Kept current persistence backend unchanged (auth metadata + demo parity) while establishing a clean migration boundary for future game-state table/API work.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7J swap runtime-state backend from auth metadata to dedicated Island Run game-state storage.

Date: 2026-02-27
Slice: M7H — First-run claim marker moved to profile metadata
Summary:
- Replaced localStorage-based first-run claim marker usage with profile metadata field `island_run_first_run_claimed`.
- Updated shared Island Run profile persistence helper to write first-run claim state and kept demo parity mapping.
- Extended demo profile/session shape to expose first-run claim metadata in demo mode.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/services/islandRunProfile.ts
- src/services/demoData.ts
- src/services/demoSession.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7I migrate Island Run runtime markers from auth metadata into dedicated game-state table/API boundary.

Date: 2026-02-27
Slice: M7G — Shared Island Run profile metadata persistence helper
Summary:
- Added shared `persistIslandRunProfileMetadata` helper to centralize Island Run profile metadata writes for both live Supabase users and demo users.
- Refactored onboarding-complete persistence and daily-hearts claim persistence in the prototype to use the shared helper.
- Reduced duplicated `auth.updateUser` / demo profile branching in `IslandRunBoardPrototype` and standardized error handling paths.
Files changed:
- src/features/gamification/level-worlds/services/islandRunProfile.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7H move first-run claim marker + daily-hearts claim marker into server-backed game-state table (not auth metadata) for cleaner domain boundaries.

Date: 2026-02-27
Slice: M7F — Server-backed daily hearts claim persistence
Summary:
- Replaced local-only daily hearts claim persistence with profile-backed state using `island_run_daily_hearts_daykey` metadata.
- Added demo parity by storing daily hearts claim day key in demo profile and exposing it in demo session metadata.
- Added claim telemetry (`economy_earn`) for daily hearts with source/day key payload.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/services/demoData.ts
- src/services/demoSession.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7G move daily-hearts metadata updates into shared reward/profile write service to reduce duplicated auth.updateUser calls.

Date: 2026-02-27
Slice: M7E — Morning hearts guarantee (spin/day hatch split)
Summary:
- Added deterministic daily reward planner that guarantees 1-3 hearts each UTC day for each user.
- Routed daily reward source to either Spin of the Day or Daily Hatch (one source per day), with one-time claim persisted in localStorage.
- Wired Island Run prototype UI to claim daily hearts from the correct source and reflect claim status.
Files changed:
- src/features/gamification/level-worlds/services/islandRunDailyRewards.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7F move daily reward claim persistence from localStorage to server-backed state for cross-device parity.

Date: 2026-02-27
Slice: M7D — Scene-aware stop markers + collision-safe label rules
Summary:
- Upgraded outer-orbit stop markers from text chips to icon-centric markers with per-stop icon mapping (hatchery/boss/dynamic kinds/shop).
- Added scene-aware visual treatment hooks for marker icons and introduced collision-safe label offsets (alternating top/bottom) with viewport clamp.
- Added responsive label behavior to hide orbit labels on smaller viewports to reduce overlap while keeping icon markers interactive.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7E add richer stop art assets and tuned anchor sets per island scene pack.

Date: 2026-02-27
Slice: M7C — Canonical anchored stop placement for outer orbit markers
Summary:
- Replaced computed arc stop-marker positioning with canonical board anchor coordinates for stable placement across viewport sizes.
- Added explicit `OUTER_STOP_ANCHORS` in board layout service to define Hatchery/3 dynamic stops/Boss and Shop marker positions.
- Kept tile-triggered gameplay logic unchanged while using anchored visuals to match intended outside-of-loop stop arrangement.
Files changed:
- src/features/gamification/level-worlds/services/islandBoardLayout.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7D replace text chips with scene-aware stop art assets and collision-safe label rules.

Date: 2026-02-27
Slice: M7B — 17-tile lap readability + outer-orbit stop markers (incl. shop)
Summary:
- Improved board readability so the 17-tile lap is visually explicit in the prototype (center lap label + stronger foreground layering).
- Added outer-orbit stop markers around the loop and included a Shop marker as a dedicated outside-of-loop destination marker.
- Kept gameplay triggers tile-based while making orbit markers clickable shortcuts for stop modal inspection during prototype balancing.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7C replace placeholder stop chips with art/anchors tied to final island scene composition system.

Date: 2026-02-27
Slice: M7A — Persist first-run completion to profile metadata (Supabase + demo parity)
Summary:
- Added first-run launch persistence so Island Run writes `onboarding_complete: true` when first-run launch is confirmed.
- Implemented environment parity: demo sessions update local demo profile, while live sessions update Supabase auth metadata.
- Added guarded failure handling so first-run modal stays open if persistence fails, with actionable landing text for retry.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7B move first-run profile persistence into shared onboarding completion utility (reduce duplicated updateUser paths).

Date: 2026-02-27
Slice: M6F — Metadata-gated first-run flow + telemetry milestones
Summary:
- Integrated first-run Island Run gate with real onboarding metadata (`onboarding_complete`) so celebration flow is skipped for already-onboarded users.
- Added telemetry milestones for first-run flow start, reward claim, and launch confirmation (tracked via `onboarding_completed` with stage metadata).
- Kept one-time local claim marker behavior and starter rewards while adding metadata-driven guardrails.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7A connect first-run completion to persisted profile/onboarding state write path (Supabase + demo parity).

Date: 2026-02-27
Slice: M6E — First-run gate + celebration claim sequence (prototype)
Summary:
- Added first-run Island Run celebration gate in the prototype using a per-user localStorage claim marker.
- Added two-step first-run flow: starter gift claim then launch step.
- Wired starter grants in prototype state (+5 hearts, +250 coins, +1-heart equivalent dice boost) and blocked rolling until launch step is completed.
- Added prototype coin HUD readout for first-run reward visibility.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M6F integrate first-run gate with real onboarding metadata + telemetry events.

Date: 2026-02-27
Slice: M6D — Stop progression states + boss unlock gating (prototype)
Summary:
- Added stop progression state model in Island Run prototype (`active`, `completed`, `locked`) derived from generated stop plans.
- Added boss gating rule: boss stop remains locked until all non-boss stops are completed.
- Added stop completion actions in stop modal and island-complete transition path when boss is completed.
- Exposed stop-state summary in HUD for QA visibility and balancing verification.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M6E first-run game onboarding gate + celebration claim sequence wiring.

Date: 2026-02-27
Slice: M6C — Dynamic stop orchestration prototype
Summary:
- Added deterministic island stop generation service with fixed Hatchery/Boss stops and 3 weighted dynamic stops.
- Enforced rule that every island plan includes at least one real-life behavior stop (habit/action or check-in/reflection).
- Wired Island Run prototype to render and resolve active stop content from generated stop plans instead of static stop copy.
- Added stop-plan visibility in prototype HUD to help QA and balancing checks per island.
Files changed:
- src/features/gamification/level-worlds/services/islandRunStops.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M6D stop objective state progression (pending/in-progress/completed) + boss unlock gating.

Date: 2026-02-27
Slice: M6B — Hearts-to-dice starter economy prototype wiring
Summary:
- Added Island Run economy helper service with deterministic heart-to-dice conversion tiers.
- Updated Island Run board prototype to use dice pool for rolls and convert hearts into dice when empty.
- Set starter prototype economy baseline to 5 hearts and 20 dice per heart at island 1 (with scaling tiers at higher islands).
Files changed:
- src/features/gamification/level-worlds/services/islandRunEconomy.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M6C stop orchestration rules (5 stops + boss) with dynamic stop pool constraints.

# PROGRESS LOG — HabitGame Main Loop

Date: 2026-02-24
Slice: M1A — Hybrid board renderer v1 + dev overlay
Summary:
- Added canonical 17-anchor board layout data with zBand/tangent/scale and locked stop mapping.
- Implemented a mobile-first Island Run prototype renderer (canvas ring path + tile anchors + stop markers + token + depth mask layer).
- Added dev overlay toggle for anchor indices, stop labels, zBand colors, and tangent arrows.
- Added three depth mask template PNGs and scene switch buttons for 3 background variants in dev mode.
- Wired prototype behind `?islandRunDev=1` in Level Worlds to keep existing flow intact.
Files changed:
- src/features/gamification/level-worlds/services/islandBoardLayout.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- public/assets/islands/depth/depth_mask_001.png
- public/assets/islands/depth/depth_mask_002.png
- public/assets/islands/depth/depth_mask_003.png
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- npm run lint
Next:
- M1B token movement/actions and landing resolution scaffolding.

Date: 2026-02-24
Slice: M1B — Token movement v1 on 17 anchors
Summary:
- Added roll interaction to prototype board (`Roll (1 heart)`) using 1..3 dice outcomes.
- Implemented heart consumption, modulo-17 movement, and per-hop token animation over intermediate anchors.
- Added landing resolver message to indicate stop vs non-stop tile landings.
- Kept dev overlay and debug/tangent visualization fully compatible during movement.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M3A stop modal wiring for each stop tile type.

Date: 2026-02-24
Slice: M3A — Stop modal wiring on landing
Summary:
- Added stop-modal routing for stop tiles (0/4/8/12/16) using stop IDs from canonical stop mapping.
- Implemented five modal stubs (Hatchery, Minigame, Market, Utility, Boss) shown only when landing on stop tiles.
- Kept non-stop tile landings modal-free while preserving roll/hop movement behavior.
- Added modal styling and close action with lightweight dev-friendly presentation.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M4A timer + expiry/travel overlay simulation with state reset.

Date: 2026-02-24
Slice: M4A — Timer + expiry simulation + travel overlay
Summary:
- Added per-island countdown timer (dev duration 45s) to prototype HUD.
- Added expiry detection that triggers a travel overlay and island advancement simulation.
- Implemented reset-on-advance behavior for token position, hearts, roll state, and stop modal state.
- Preserved board stability and roll flow after travel transition completes.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M5A hatchery/egg scaffold in prototype.

Date: 2026-02-24
Slice: M5A — Hatchery/egg scaffold in prototype
Summary:
- Added single active-egg scaffold state to prototype (tier, set time, hatch time).
- Added hatchery stop panel with egg creation actions (common/rare/mythic).
- Added time-based stage progression (1..4) and ready-to-open state messaging.
- Defined expiry behavior in prototype as egg progress carryover across island travel reset.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M6A encounter tile prototype behavior.

Date: 2026-02-24
Slice: M5B-prep — Hearts-empty onboarding booster bridge
Summary:
- Wired Island Run dev prototype to accept session context so it can bridge into existing Game of Life onboarding progress state.
- Added hearts-empty booster action that opens Loop 1 (display-name) onboarding panel copy and interaction.
- On successful "Save name & continue", persisted onboarding display-name loop completion (`stepIndex >= 1`) in existing onboarding storage key and granted +1 heart reward.
- Added guard to prevent repeated booster claiming once the display-name loop has already been completed.
Files changed:
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- npm run lint
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M6A encounter tile prototype behavior.

Date: 2026-02-24
Slice: M6A — Encounter tile prototype behavior
Summary:
- Added a fixed encounter tile marker in the Island Run dev board so at least one encounter tile is clearly identifiable.
- Wired landing resolution so encounter tile landing opens an encounter challenge modal (non-stop, easy stub).
- Added encounter resolve action that grants prototype reward feedback (+1 heart) and updates landing status messaging.
- Preserved existing stop-tile modal behavior so non-encounter tiles and stop flow remain unaffected.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M7A boss stop reward prototype behavior.
