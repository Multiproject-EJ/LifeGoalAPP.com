# Zen Garden & Wisdom Tree — Upgrade Roadmap

> **Status**: Partially built. Core growth loop is live. Decay mechanic and upgrade system are PLANNED / NOT YET BUILT.

---

## Current state (live)

- The Wisdom Tree grows via waterings (weekly closure +1, 30-day streak +3, seasonal event +5, level-up +1).
- Grace buffer: a single bad week pauses growth but does NOT reduce stage.
- 5 stages: Seedling → Sapling → Young Tree → Flourishing → Ancient.
- Score = `currentLevel + impactTotal` (see `src/features/zen-garden/ZenGarden.tsx`).
- No decay mechanic exists in the current codebase.

---

## Planned: Wisdom Tree decay mechanic (NOT YET BUILT)

### Design decision (locked)
The Wisdom Tree **can decay / level down** if the player stops watering it consistently.

### Inputs required to maintain / grow the tree
- **Water**: earned from habit completions, journal entries, and check-ins in the real PWA (outside the game).
- **Lotus stars**: earned from meditation sessions and zen garden interactions.

### Decay rules (to be designed in detail — placeholder)
- If the tree receives **zero waterings for X consecutive weeks** (X = TBD, suggested: 3), it drops one stage.
- Decay cannot go below Stage 1 (Seedling) — the tree never fully dies.
- A decay event should trigger a gentle, non-punitive push notification / in-app message:
  - e.g. "Your Wisdom Tree is thirsty 🌱 — a few habits this week will help it recover."
- Recovering from decay: earning enough waterings in a recovery week restores the stage (does not require re-earning the full threshold from scratch).

### Why decay (rationale)
- Creates a meaningful long-term retention hook outside the main game.
- Reinforces the connection between real-life habits (PWA) and the game ecosystem.
- Non-punitive framing: the tree never dies, always recoverable — consistent with the app's positive habit philosophy.

---

## Planned: Zen Garden upgrade items (backlog)
The Zen Garden shop already exists (see `src/constants/zenGarden.ts` and `src/features/zen-garden/ZenGarden.tsx`).

Future upgrade ideas (not yet built):
- **Watering can upgrade**: allows one "catch-up watering" per month if a streak is missed.
- **Soil enrichment**: doubles watering points earned for a limited period.
- **Tree guardian**: prevents one decay event per quarter.
- **Seasonal decorations**: cosmetic items tied to real-world seasons.

---

## Implementation notes for future agents

- Current growth logic lives in `src/services/impactTrees.ts`.
- Current display lives in `src/features/zen-garden/ZenGarden.tsx`.
- Decay mechanic will need:
  1. A scheduled server-side job (or client-side check on app open) to evaluate weeks without waterings.
  2. A new `decay_event` entry type in `ImpactTreeSource` (defined in `src/services/impactTrees.ts`).
  3. A stage-decrement function with floor at Stage 1.
  4. A push notification / in-app prompt trigger on decay.
  5. A "recovery week" detection path that restores stage without full re-earn.
- Do NOT implement decay until the design decisions (X weeks threshold, recovery rules) are finalised and documented here.
