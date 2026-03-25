# Perfect Companion — Remaining Work After Phase 2

## Current status (done)
- ✅ Phase 1 foundations shipped:
  - `shipZone` metadata on all 45 creatures
  - habitat → zone resolver
- ✅ Phase 2 core engine shipped:
  - affinity/archetype + weakness bridge
  - deterministic fit scoring/ranking
  - deterministic top-3 selector
  - service tests integrated

---

## What is left to build

## Phase 3 — Runtime persistence + recompute orchestration

### Build
1. Extend Island Run runtime state with:
   - `perfectCompanionIds: string[]`
   - `perfectCompanionComputedAtMs: number | null`
   - `perfectCompanionModelVersion: string | null`
   - `perfectCompanionReasons: Record<string, { strength: string[]; weaknessSupport: string[]; zoneMatch: boolean }>`
2. Add hydration/persist wiring across:
   - local storage runtime state
   - Supabase table patch payloads
3. Add deterministic recompute triggers:
   - personality hand changed
   - cycle index changed
   - model version changed

### Acceptance criteria
- Reload/device switch preserves same perfect companions unless a trigger fires.
- Backward compatibility: old records hydrate safely with defaults.

---

## Phase 4 — Sanctuary UX (first player-visible slice)

### Build
1. Add `⭐ Perfect for your hand` badge on creature cards.
2. Add compact "Why this helps you" panel per perfect creature:
   - strength matches
   - weakness support tags
   - zone alignment
3. Add top strip in sanctuary:
   - `Your Best Companions (3)`

### Acceptance criteria
- Player can identify their best companion in <5 seconds.
- Zero regressions in existing sanctuary feed/claim/active-companion actions.

---

## Phase 5 — Onboarding integration

### Build
1. Hook first creature onboarding to show personalized messaging:
   - "Best for your hand" hint
2. Ensure first-run flow still works for users with no personality profile:
   - fallback generic messaging
3. Add one-time educational tooltip about companion fit.

### Acceptance criteria
- New users understand what "Perfect Companion" means without leaving onboarding.

---

## Phase 6 — Gameplay loop integration (encounter bias + bonuses)

### Build
1. Add soft bias so perfect companions are surfaced more often (not guaranteed every island).
2. Add pity rule config:
   - ensure ≥1 perfect companion by island N in cycle.
3. Apply active perfect companion bonus hooks on island start.

### Acceptance criteria
- Personalization feels meaningful without overpowering economy balance.

---

## Phase 7 — Ship IA unification (Garage + Sanctuary)

### Build
1. Introduce unified "Ship" shell with tabs:
   - Companions
   - Upgrades
   - Cosmetics
2. Keep legacy deep links working with redirects.

### Acceptance criteria
- Player has one coherent spaceship mental model.

---

## Phase 8 — Telemetry + balancing operations

### Build
1. Add events:
   - `perfect_companion_seen`
   - `perfect_companion_equipped`
   - `perfect_companion_effect_triggered`
2. Add balancing config service for runtime tuning:
   - score weights
   - rarity bonus
   - pity threshold
   - max perfect count
3. Build dashboard slices for retention + conversion analysis.

### Acceptance criteria
- PM/design can tune fit behavior without redeploying app code.

---

## Suggested next PR (immediate)
**Do Phase 3 + minimal Phase 4 (badge only)** in one larger delivery:

- Runtime state fields + hydration/persist wiring
- Recompute orchestration utility
- Sanctuary badge render using persisted ids
- Integration tests for persistence + deterministic recompute behavior

This gives you real player-visible value and a stable data backbone for the rest.
