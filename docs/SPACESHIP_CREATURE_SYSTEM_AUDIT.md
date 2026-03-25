# Spaceship + Creature Habitat Audit (Current Repo State)

## Executive summary
As of the current codebase, there are **two different "spaceship/garage" concepts**:

1. **Score Tab "Garage"** → currently a wrapper around `PowerUpsStore` (boosters/power-ups).
2. **Island Run "Creature Sanctuary"** → the actual creature habitat/management surface (collection, active companion, feeding, bond rewards).

So: creature living systems exist, but they are implemented in the **sanctuary panel**, not the Score Tab garage.

## 1) What exists today: Garage in Score Tab

In `ScoreTab.tsx`, the `garage` tab is present and labeled **"Spaceship Controller Garage"**.
However, it currently renders `PowerUpsStore` and copy about managing boosters.

Implication: this surface is not yet a creature habitat manager; it's a power-up/boost store surface.

## 2) What exists today: Creature habitat in Island Run (Sanctuary)

Creature habitat behavior is implemented in `IslandRunBoardPrototype.tsx` as a dedicated sanctuary panel:

- `showSanctuaryPanel` state + open/close handlers
- collection list, filtering/sorting, detail view
- active companion selection
- feeding loop via treat inventory + cooldown
- bond milestones/reward claim
- companion bonus application once per island visit

UI copy explicitly frames this as a shipboard creature space
("start your shipboard sanctuary").

## 3) Creature data and persistence already in runtime state

`IslandRunRuntimeState` / `IslandRunGameStateRecord` already persist the key creature fields:

- `creatureCollection`
- `activeCompanionId`
- `creatureTreatInventory`
- `companionBonusLastVisitKey`

These fields are wired through hydration and patch persistence (local + table-backed runtime state),
so creature habitat progress is durable across sessions/devices when runtime sync succeeds.

## 4) Legacy + design docs signal intended ship manifest path

`docs/04_MAIN_GAME_EGGS_HATCHERY_HOME.md` already states collect flow reserves species for
"ship manifest / future sanctuary systems".

So the current sanctuary implementation aligns with that direction.

## 5) Important current gap

The **Score Tab Garage** and **Creature Sanctuary** are not unified yet:

- Garage = power-ups UX
- Sanctuary = creature UX

If product intent is "spaceship garage is where creatures live + where ship customization lives,"
then a consolidation step is needed (navigation and information architecture), or clear dual-surface
positioning with shared entry points.

## 6) Suggested product-technical direction

Short-term:
- Keep sanctuary as source-of-truth for creature management.
- Add bridge CTA from Score Garage → Sanctuary (and vice versa).
- Label both surfaces clearly to avoid player confusion.

Medium-term:
- Introduce a unified "Ship" shell with tabs:
  - Companions (current sanctuary)
  - Ship Upgrades (current/future garage power-ups)
  - Cosmetics/Habitat modules

This preserves shipped logic while aligning with the spaceship fantasy and future customization roadmap.
