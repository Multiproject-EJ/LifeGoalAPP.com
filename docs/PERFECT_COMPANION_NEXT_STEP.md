# Perfect Companion — Recommended Next Step (Implementation Slice 1)

## Recommendation
Implement **Slice 1: Companion Fit Engine (pure functions + tests)** before any UI work.

Why this first:
- It creates the objective personalization logic that all future UI and island encounter behavior depends on.
- It is deterministic and easy to validate in isolation.
- It de-risks balancing early (weights, pity rule, rarity modifiers) before wiring game surfaces.

## Scope (Slice 1)

### 1) New bridge + scoring modules
Add new service files under Island Run services:

- `src/features/gamification/level-worlds/services/creatureArchetypeBridge.ts`
- `src/features/gamification/level-worlds/services/creatureFitEngine.ts`

### 2) Define canonical mapping tables
In `creatureArchetypeBridge.ts`:

- `AFFINITY_TO_ARCHETYPE_IDS: Record<Affinity, ArchetypeId[]>`
- `AFFINITY_WEAKNESS_SUPPORT_TAGS: Record<Affinity, WeaknessTag[]>`

Keep this data-only and versioned for balancing.

### 3) Implement deterministic fit scoring
In `creatureFitEngine.ts`, expose:

- `computeCreatureFitScore(creature, playerHandContext, config)`
- `rankCreatureFitsForPlayer(catalog, playerHandContext, config)`
- `selectPerfectCompanions(rankedFits, maxCount, seedContext)`

Use deterministic tiebreaking with a stable seed (`userId + cycleIndex + islandNumber`).

### 4) Persist top matches
Add lightweight state shape (local + Supabase patchable later):

```ts
{
  perfectCompanionIds: string[]; // max 3
  fitComputedAtMs: number;
  fitModelVersion: string;
}
```

### 5) Unit tests (required in Slice 1)
Add tests to guarantee:

- deterministic output for same input
- max count enforcement (1–3)
- stable ordering/tiebreaking
- pity rule behavior
- no duplicate perfect companions in a cycle

## Out of scope for Slice 1
- No badge UI yet
- No encounter modal changes yet
- No telemetry dashboards yet

## Acceptance criteria
- Given fixed player hand + catalog + seed, output top companions is identical across runs.
- Output includes at most 3 perfect companions.
- Engine config can be changed without code restructuring.
- Tests pass in CI.

## Immediate follow-up (Slice 2)
After Slice 1 lands:
- Add `⭐ Perfect for your hand` badge and "Why this helps you" explanation on creature cards.
- Add a HUD mini-panel `Your Best Companions (3)`.
