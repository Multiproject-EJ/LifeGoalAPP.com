# Perfect Companion Program — Recommended Build Phases

## Goal
Ship a production-ready creature personalization system without destabilizing existing Island Run gameplay.

## Phase 0 — Foundations & Guardrails (1–2 days)

### Build
- Finalize canonical product terms:
  - `Sanctuary` (creature management)
  - `Garage` (ship upgrades/power-ups)
  - `Perfect Companion` (personalized high-fit creature)
- Add feature flags:
  - `perfectCompanionEnabled`
  - `sanctuaryZoneEnabled`
  - `garageShipShellEnabled`
- Define event taxonomy upfront (`perfect_companion_*`, `sanctuary_*`, `ship_zone_*`).

### Exit criteria
- Flags exist and default OFF in production.
- Telemetry schema approved.

---

## Phase 1 — Data Model: Ship Zones + Compatibility (2–3 days)

### Build
- Extend creature definitions with explicit `shipZone` metadata:
  - `'zen' | 'energy' | 'cosmic'`
- Keep existing `tier` + `habitat` unchanged.
- Add migration-safe fallback resolver from legacy habitat → zone.
- Add tests validating all 45 creatures resolve a zone.

### Why first
- Zones unlock UI/IA and onboarding placement logic while preserving current roster.

### Exit criteria
- 45/45 creatures resolve deterministic zones.
- No behavior regressions in existing selection/collection flows.

---

## Phase 2 — Companion Fit Engine (Core Brain) (3–5 days)

### Build
- Implement:
  - `creatureArchetypeBridge.ts`
  - `creatureFitEngine.ts`
- APIs:
  - `computeCreatureFitScore(...)`
  - `rankCreatureFitsForPlayer(...)`
  - `selectPerfectCompanions(...)`
- Inputs:
  - archetype hand + trait/axis signals
  - creature affinity/tier/zone
- Output:
  - top 1–3 perfect companion ids + reason payloads.
- Deterministic seed strategy:
  - `(userId, cycleIndex, islandNumber)`.

### Exit criteria
- Unit tests pass for determinism, tie-breaks, max-count=3, no duplicate picks per cycle.

---

## Phase 3 — Persistence + Runtime Wiring (2–3 days)

### Build
- Persist fit outputs in runtime state:
  - `perfectCompanionIds: string[]`
  - `perfectCompanionComputedAtMs`
  - `perfectCompanionModelVersion`
  - `perfectCompanionReasons`
- Recompute policy:
  - on personality hand change
  - on new cycle start
  - on model version bump

### Exit criteria
- Reloading app/device preserves same perfect companion set (until recompute trigger).

---

## Phase 4 — Player-Facing UX (3–5 days)

### Build
- Sanctuary card badges:
  - `⭐ Perfect for your hand`
- Inline explanation panel:
  - "Why this helps you"
  - strength boost + weakness support bullets
- Add “Your Best Companions (3)” mini-panel on sanctuary/HUD entry.
- Onboarding hook:
  - first companion placement references zone and personalized value.

### Exit criteria
- In usability check, player can identify "most valuable creature for me" in <5 seconds.

---

## Phase 5 — Encounter & Reward Loop Integration (4–6 days)

### Build
- Add soft encounter bias toward perfect companions (not guaranteed every island).
- Add pity rule:
  - guarantee at least one perfect companion by island N.
- Add personalized bonus triggers when active perfect companion is equipped.

### Exit criteria
- Progression feels personalized without collapsing rarity economy.
- No exploit path for deterministic reroll abuse.

---

## Phase 6 — Garage/Sanctuary Information Architecture (3–4 days)

### Build
- Introduce unified "Ship" shell with tabs:
  - Companions (sanctuary)
  - Upgrades (garage/power-ups)
  - Cosmetics/Habitat
- Keep old deep links working via redirects.

### Exit criteria
- Single mental model for players: "everything ship-related is in one place."

---

## Phase 7 — Live Tuning + Ops (ongoing)

### Build
- Dashboard metrics:
  - `% players who see perfect badge`
  - `% who equip perfect companion`
  - D1/D7 retention delta by feature exposure
  - Average time-to-first-bond-reward
- Runtime config knobs:
  - strength/healing weights
  - max perfect count
  - pity threshold
  - zone bias multipliers

### Exit criteria
- Ability to rebalance without redeploy.

---

## Suggested delivery order (MVP)
1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4

Then release as Beta behind flags before Phases 5–7.

## Team split recommendation
- Engineer A: data model + fit engine + tests (Phases 1–3)
- Engineer B: sanctuary/HUD UX + onboarding glue (Phase 4)
- Engineer C: telemetry/dashboard + config plumbing (Phases 3, 7)
- Product/Design: copy + badge semantics + explanation language
