# Creature Card v2 Slice 6B Verification

Date: 2026-05-26

## Scope
Verify whether the sanctuary roster grid in Island Run actually adopted `CreatureCardSimpleFront` after Slice 6B, and whether behavior/state wiring was preserved.

## Findings

1. **Interactive sanctuary roster grid now renders `CreatureCardSimpleFront` via `CreatureGridCard`.**
   - `IslandRunBoardPrototype.tsx` builds `simpleView` for each visible creature and passes it into `CreatureGridCard` in the active roster path (`.island-run-sanctuary-panel__grid`).
   - `CreatureGridCard.tsx` conditionally renders `<CreatureCardSimpleFront view={resolvedSimpleView} />` when `simpleView` is provided.
   - Exact rendered component path:
     - `IslandRunBoardPrototype` → `CreatureGridCard` → `CreatureCardSimpleFront`.

2. **`buildCreatureCardSimpleView` is still in the active card path.**
   - The interactive roster map calls:
     - `buildCreatureCardSimpleView(creature.creature, undefined, { discovered: true, active: ..., ownedCopies: ... })`
   - This indicates the active list remains adapter-driven (not hardcoded JSX fallback).

3. **State semantics are preserved (locked/discovered/active/click).**
   - `active` state is passed to `buildCreatureCardSimpleView` and also used for `CreatureGridCard` props.
   - `discovered: true` is explicitly set for collected creatures.
   - `locked` remains enforced via separate locked-slot rendering (`locked` prop on `CreatureGridCard` with no `simpleView`, preserving legacy locked silhouette card behavior).
   - Click behavior is preserved: each discovered card still receives `onClick={() => sanctuaryHandlers.openCreature(creature.creatureId)}` and button disablement still depends on `onClick` presence.

4. **Secondary `aria-hidden` preview grid was intentionally left on legacy/fallback card rendering.**
   - In the selected-creature detail mode, the `aria-hidden="true"` preview grid renders `CreatureGridCard` **without** `simpleView`.
   - This means it intentionally continues to use the fallback minimal-frame surface, likely to avoid coupling the decorative hidden preview with the primary interaction path.

5. **Slice 6B did more than dead-code removal for the primary roster UI.**
   - Primary interactive roster was switched to pass `simpleView`, so it does render the new `CreatureCardSimpleFront` surface.
   - The hidden preview grid did not switch; therefore adoption is partial-by-surface and appears intentional.

## Verdict
Slice 6B **did achieve the intended UI adoption for the active interactive sanctuary roster grid** (new component surface is live there), while leaving the secondary `aria-hidden` grid untouched.

## Follow-up before broader adoption
- Decide whether the hidden preview grid should be migrated for visual consistency, or deliberately remain legacy because it is non-interactive and accessibility-hidden.
- If full consistency is desired, introduce a tiny shared render mode policy (interactive vs decorative) to make intentional divergence explicit in code comments.
- Optional: add a focused UI regression test/assertion that the interactive roster path passes `simpleView` into `CreatureGridCard`.

## Validation
- `npm run test:island-run` — pass.
- `npm run build` — pass.
