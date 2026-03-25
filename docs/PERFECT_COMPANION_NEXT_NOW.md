# Perfect Companion — What to Build Next (Post Phase 3+4)

## Current state
You now have:
- deterministic scoring + selection engine
- runtime persistence backbone
- first player-visible badge (`⭐ Perfect for your hand`)

## Next recommended implementation (single high-impact PR)

## Phase 4.5 — Explainability + trust layer

### Why this next
Players now see the badge, but they still need to understand **why** a creature is perfect.
This is the shortest path to meaningful perceived personalization.

### Build scope
1. **Reason drawer in sanctuary detail**
   - Show `Strength matches` (archetype ids mapped to friendly labels)
   - Show `Weakness support` tags mapped to player-facing copy
   - Show `Zone match` status

2. **Top-3 strip (persistent in sanctuary header)**
   - `Your Best Companions`
   - ranked #1/#2/#3 chips
   - click chip jumps to creature detail card

3. **Fallback copy when no personality hand exists**
   - keep deterministic picks
   - message: "Using starter profile until your archetype hand is set"

4. **Telemetry for explainability interactions**
   - `perfect_companion_reason_opened`
   - `perfect_companion_chip_selected`
   - `perfect_companion_reason_cta_set_active`

### Acceptance criteria
- A first-time user can answer "Why is this companion perfect for me?" in one tap.
- At least one top companion is visible without scrolling in sanctuary.
- No regressions to feed/claim/set-active flows.

---

## After that (next two slices)

### Slice B — onboarding integration
- During first hatch flow, show one micro-hint linking the first creature to player profile.

### Slice C — gameplay integration
- soft encounter bias + pity rule
- active perfect companion startup bonus with balance caps

---

## Explicit do-not-build-yet list
- Do not unify Garage/Sanctuary IA yet (bigger navigation change).
- Do not rename all creature content yet (separate migration effort).
- Do not add complex economy multipliers yet (wait for telemetry baseline).
