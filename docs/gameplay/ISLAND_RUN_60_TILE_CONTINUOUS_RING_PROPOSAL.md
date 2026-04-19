# Island Run Proposal: 60-Tile Continuous Circular Board

Date: 2026-04-11
Status: **⚠️ SUPERSEDED (historical).** Do not treat any statement in this file
as a target state or an open action item. The production board ships on the
**`spark40_ring`** profile (40 discrete ring tiles + 5 landmark orbit HUD
buttons), and the references to `spark60` / `spark60_preview` below are the
*prior proposal wording* preserved only for archival purposes. Every
subsequent change — rename from `spark60_preview` → `spark40_ring`, landmark
decoupling, camera director, reward-bar v2 — has already shipped. Canonical
source of truth is `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`.

If you are an agent asked to work on board topology, **do not** resurrect
`spark60_preview`, the continuous-lane renderer, or the 60-segment proposal
from this file without an explicit instruction that names the doc and the
section. Prefer editing the contract or `islandBoardProfiles.ts` directly.

---

## Implementation execution phases (agreed kickoff)

- **Phase 1 (started): topology/profile activation plumbing**
  - Add runtime-selectable board profile entry (`boardProfile=spark60_preview`) in Island Run.
  - Ensure renderer uses profile-matching anchor set (spark60_preview vs future profiles).
  - Keep default profile as `spark60_preview` during parity buildout.
- **Phase 2 (next): continuous ring renderer**
  - Replace discrete tile puck visuals with continuous segmented lane for spark60.
  - **Started:** added first-pass spark60 segmented ring lane visual layer and compact marker-style tiles for spark profile.
  - **Completed:** segment coloring now maps to tile types across the full spark60 segment count for consistent at-a-glance readability on the continuous lane.
- **Phase 3 (next): stop/camera/HUD parity**
  - Apply agreed stop focus camera flow, top bar/reward bar/footer shell, and interaction guardrails.
  - **Started:** camera mode state machine scaffold added (`board_follow`, `stop_focus`, `overview_manual`) with stop-focus transitions and overview toggle.
  - **In progress:** top bar (avatar + essence + menu) and persistent reward bar shell added to board overlay.
  - **In progress:** footer control row now includes Creature/Story on left and Shop/Market on right around primary dice CTA.
  - **In progress:** Market now has its own modal surface (separate from Shop) with dedicated flash-offer checkout entry.
  - **In progress:** camera control affordances now include `Focus next stop` and `Reset view` actions alongside overview mode.
  - **In progress:** topbar menu panel now hosts compact control actions (HUD collapse/expand + camera quick controls).
  - **In progress:** reward bar now opens a dedicated details modal for progress/event context.
- **Phase 4 (next): rollout + validation**
  - QA matrix, telemetry validation, staged rollout, and profile-default decision.
  - **Started:** telemetry markers now capture board-profile exposure and reward-bar details entry to support rollout validation.

## 1) Goal

Upgrade Island Run board presentation and topology from legacy discrete small circles to a **continuous circular track with 60 tile segments**, while preserving stop-first gameplay and profile-driven topology.

Inspired by the provided reference images:
- visual read: one clear, continuous board ring
- token travel on a lane rather than jumping between isolated dots
- tile ownership by contiguous slices/segments on that lane

## 2) What I suggest (high level)

### A. Canonical direction

Adopt `spark60` as the new production-default board profile with:
- `tileCount = 60`
- continuous ring lane geometry
- tile segments rendered as contiguous arcs (not isolated circular pucks)
- stop markers remaining external to tile movement

Keep canonical stop and progression rules unchanged:
- 5 sequential stops
- stop completion gates progression
- island progression is not timer-completion based

### B. Visual model (continuous lane)

Render the board as 3 concentric visual layers:
1. **Outer ring stroke** (board boundary)
2. **Playable tile lane** (continuous band)
3. **Segment overlays** (60 equal arc slices; each slice is a tile)

Each tile slice can be styled by type (currency, hazard, feeding, event, etc.) using:
- base fill color
- top highlight gradient
- optional icon or glyph in segment center
- subtle divider strokes between adjacent segments

### C. Token movement model

Move token along ring centerline with profile-derived arc interpolation:
- movement uses `tileCount` from profile (no hardcoded 17)
- one step = advance to next segment center
- smooth tween around arc for readability and polish
- wrap logic modulo tileCount

### D. Camera/layout behavior

For mobile readability:
- keep full ring visible at rest on most screens
- optional soft zoom toward active token during movement
- preserve safe-area spacing and stop-marker readability

### E. Backward compatibility

Use profile gate:
- keep `spark60_preview` profile as default and add optional fallback/dev QA profile only if needed
- switch production default to `spark60` only after parity checks
- support live rollback by profile flag if issues occur


## 2A) Stop placement recommendation (based on your suggestion)

I think your idea is strong and should improve readability + progression clarity.

Recommended layout:
- **4 outer stops** (Hatchery, Habit, Breathing, Wisdom): place one in each “corner quadrant” outside the circular ring (top-left, top-right, bottom-right, bottom-left).
- **Boss stop**: place in the center of the board interior as the final focal objective.

Why this is good:
- Strong visual hierarchy: the center naturally reads as the “final gate”.
- Less clutter on the ring: movement lane stays clean and readable.
- Better mobile scanning: players can quickly identify current outer objective vs final boss destination.

Implementation guardrails:
- Stops remain external gameplay structures and are not tied to tile indices.
- Outer stop anchors should be profile-driven (`spark60`) and responsive-safe (notch/safe-area aware).
- Center boss anchor should reserve clear space for token pathing and reward FX.


## 2B) Camera movement + board tilt (Monopoly GO-style guidance)

Based on observed gameplay feel (including your reference screenshots), the camera model should be:

- **Perspective top-down with tilt**: not a flat orthographic map; the board is pitched so the near edge appears larger and the far edge recedes.
- **Mostly fixed framing at rest**: player can see the full ring or most of it without constant camera drift.
- **Auto-follow during token motion**: slight pan/track toward the moving token to keep attention on movement outcomes.
- **Contextual auto-zoom pulses**: brief zoom-in for key events (landing reward/hazard, stop completion, boss reveal), then ease back to default framing.
- **Controlled manual pinch mode**: allow pinch for explicit overview mode, but keep roll-flow camera predictable and interrupt-safe.

Recommended control policy for Island Run:
- Default mode: auto camera + guided focus transitions (predictable and polished).
- Optional accessibility toggle: `Reduced Camera Motion` (disables zoom pulses + reduces pan amplitude).
- Production: pinch-out enters bounded overview mode; debug/dev can retain extra zoom tooling.

Suggested numeric baseline (tunable):
- Rest pitch: ~42° to 50°
- Follow pan lag: 120–220 ms smoothing
- Event zoom-in: +8% to +14% scale for 450–900 ms
- Return-to-rest ease: 300–700 ms

Design goal:
- Make the board feel alive and premium without disorienting users or hiding stop/CTA information.


## 2C) Stop-guided zoom behavior (progression camera mode)

I strongly agree with this. It adds onboarding clarity without removing player control.

Proposed camera state machine:
- `board_follow` (default): board-level framing + token follow while moving.
- `stop_focus` (guided): zoom/pan to the currently active stop.
- `overview_manual` (pinch out): user-controlled zoom showing all 5 stops.

Trigger rules:
1. **Island entry / unlock / first run (Island 1):** auto-enter `stop_focus` on Stop 1.
2. **Stop completion:** auto-transition to `stop_focus` on the next unlocked stop.
3. **User taps dice/roll instead of stop CTA:** immediately return to `board_follow`.
4. **User taps a visible stop in overview:** auto-focus that stop (`stop_focus`).
5. **After landing/movement sequence ends:** remain in `board_follow` unless a new stop-focus trigger fires.

Manual pinch behavior:
- Allow pinch-out to a bounded **overview zoom** where all 4 corner stops + center boss are visible simultaneously.
- In manual overview, stop markers remain tappable.
- Tapping a stop exits manual zoom and animates to focused stop framing.
- Add a “Reset View” affordance to return to default board framing.

Interaction guardrails:
- Never block rolling because a stop-focus animation is active (skip/interrupt allowed).
- Camera transitions must be interruptible by user input (roll tap, stop tap, pinch).
- Keep stop progression rules authoritative; camera focus is guidance, not logic.

Telemetry (recommended):
- `camera_stop_focus_shown` (stopId, reason: island_start|stop_completed|tap)
- `camera_focus_interrupted_by_roll`
- `camera_manual_overview_entered` / `camera_manual_overview_exited`
- `stop_tap_from_overview`


## 2D) HUD chrome proposal (top bar + reward bar + footer)

I strongly agree with this direction. It gives us a clear game-shell identity and better moment-to-moment usability.

### Top bar (thin, full width)
Recommended contents (left → right):
1. **Player avatar button** (circular portrait; opens profile/player panel)
2. **Essence wallet chip** (primary visible board currency)
3. **Menu icon button** (collapsible drawer for secondary surfaces/settings)

Design notes:
- Keep this bar thin and always visible in Island Run.
- Secondary currencies/status can live behind menu unless needed for active mode.
- Respect safe-area insets and avoid overlap with stop-focus camera framing.

### Reward bar (priority HUD row)
- Place directly beneath top bar (or as a prominent floating strip near upper center).
- Must always be visible during board play and clearly show:
  - current progress,
  - next payout threshold,
  - reward type indicators (token/dice/sticker style outputs).
- Tapping reward bar opens reward details/escalation state modal.

### Bottom footer controls
Recommended order (left → right):
- **Creature Collection**
- **Story**
- **Dice CTA (primary center control)**
- **Shop**
- **Market**

Dice CTA behavior:
- Use visually “real” dice treatment (3D style/physics-inspired animation).
- On tap: dice roll animation + haptic + sound + movement resolve.
- Support quick-roll UX (`x1`, `x3`, optional hold-for-auto) only after baseline stability.

Control guardrails:
- Footer remains tappable in all camera states.
- If a stop-focus animation is active, dice tap interrupts and returns to board-follow before movement resolve.
- Buttons should expose notification badges for pending actions (new creature, story chapter, shop offer, market refresh).

Information architecture recommendation:
- **Shop** = progression/economy purchases (persistent catalog).
- **Market** = rotating/time-bound offers and event inventory.

## 2E) Shop + Stripe dice purchase flow (agreed)

Decision:
- The **Shop** will expose the existing Stripe dice product (currently one product) as a first-class purchase CTA.
- When the player runs out of dice (cannot roll), the game should auto-trigger an **out-of-dice purchase prompt** with Stripe option.

Expected behavior:
1. User reaches dice-depleted state.
2. Auto prompt appears with:
   - primary action: `Buy 500 Rolls (Stripe)`,
   - secondary action: `Open Shop`,
   - dismiss action: `Not now`.
3. If user opens Shop, the same Stripe dice purchase CTA is available in the Shop panel.
4. Checkout start errors are shown inline and do not block gameplay.

Entry-point telemetry:
- `dice_checkout_start` (`entry_point`: `out_of_dice_prompt` | `shop_panel` | `market_panel`)
- `dice_checkout_error` (`entry_point`: `out_of_dice_prompt` | `shop_panel` | `market_panel`)

## 3) Canonical markdown changes I recommend (after approval)

In `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`, update/clarify:

1. Board topology compatibility note:
   - current production default remains `spark60_preview` (60 tiles)
2. Add explicit rendering guidance:
   - tiles are contiguous segments on a continuous ring lane
   - isolated circular node rendering is legacy/fallback only
3. Keep strict rules unchanged:
   - profile-derived tileCount required
   - stops are external, never gameplay-bound to tile indices

## 4) Implementation plan (after approval)

### Phase 1 — Topology + layout (safe)
- Add `spark60` profile and segment anchor generator.
- Ensure movement and wrap logic consume `profile.tileCount` everywhere.
- Add test coverage for 60-tile wrap and movement deltas.

### Phase 2 — Continuous ring renderer
- Implement SVG/CSS ring lane with 60 segment arcs.
- Replace discrete puck tiles in `spark60` mode.
- Map tile types to segment styling + icon slots.

### Phase 3 — Gameplay parity pass
- Validate stop triggers, rewards, encounters, egg flows, boss flows.
- Validate telemetry payloads still report correct tile indices/types.
- Validate contract-v2 (Essence + reward bar) loop parity on `spark60`.

### Phase 4 — Rollout
- Enable by feature flag for internal QA.
- A/B or staged rollout if needed.
- Promote `spark60` to production default once metrics and QA pass.

## 5) Acceptance criteria

- Board renders as one continuous circular lane with 60 contiguous tile segments.
- Token movement is smooth and profile-derived across 60 segments.
- No game logic depends on hardcoded tile counts.
- Stops remain external structures and progression-correct (4 outside + boss center layout).
- Mobile readability meets current baseline (touch targets, label legibility, no overlap regressions).
- Camera supports guided stop-focus transitions plus interruptible manual overview pinch mode.
- Top HUD + reward bar + footer control layout is implemented and responsive.
- Stripe dice purchase CTA is available in Shop and from out-of-dice auto prompt.

## 6) Risks and mitigations

- **Risk:** visual clutter with 60 segments on small devices.  
  **Mitigation:** icon simplification, divider contrast tuning, progressive detail by zoom level.

- **Risk:** hidden 17-tile assumptions in legacy helpers.  
  **Mitigation:** grep audit + unit tests for modulo and traversal rules.

- **Risk:** stop marker overlap with denser ring UI.  
  **Mitigation:** collision-safe anchor offsets and responsive hide rules.

## 7) Decision needed

If you approve this direction, I will next:
1. update canonical md exactly as above,
2. implement `spark60` continuous ring board in the app,
3. ship behind a profile/feature flag with parity tests.
