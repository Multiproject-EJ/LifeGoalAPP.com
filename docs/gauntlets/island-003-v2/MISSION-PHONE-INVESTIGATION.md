# Mission phone 0/5 investigation

Date: 2026-09-12. Status: reproduced; correction planned, not yet implemented. Source main: e8db4af0541e356951380477d7d17d0dc5c04019.

## Finding

`islandRunMissionTracker.ts` computes `buildsComplete` from canonical L3 build levels and `fullyRestored` from **both** L3 and `objectiveComplete`. The Hatchery additionally requires terminal egg state. Most signature-mission cases then feed `fullyRestored` into the row labelled **Build Landmarks**. The caller explains that row as “Open Build and raise every island landmark to its final level.” The resulting label and guidance do not match the counted state.

A player may fully upgrade all buildings and see 0/5 if activities remain incomplete. Collecting/ selling the egg also changes the number even though building level did not change. This is not evidence that upgrades were lost.

Read-only reproduction: `scripts/investigate-island-mission-tracker.mjs` calls the real service with 57 synthetic fixtures across 19 island numbers; full rows in `qa/mission-phone-reproduction-v001.json`. All fixture buildings are L3. Unfinished activities yield Build Landmarks 0/5 on 2,3,4,5,6,7,8,9,10,12,13,14,16,18,19; Island 1 shows 0/4 (its four outer-landmark rule). Standard paths on 11 and 15 show the truthful Build Landmarks 5/5 separately from Complete Landmarks 0/5. Island 20 deliberately says Solve Level-3 Labyrinth and its combined prerequisite should remain.

The SSR reproduction emitted a sandbox-denied optional Vite HMR websocket warning; the service loaded and all 57 fixture outputs were written. No account, remote data or persisted state was touched.

## Recommended bounded fix

1. Build Landmarks reads `buildsComplete`.
2. Make activity/egg completion explicit instead of silently incorporating it under the build label. Prefer a separate compact activity readout when the signature mission occupies the first row.
3. Preserve all true completion conditions, including egg resolution, Island 1's four outer landmarks, and Island 20's explicit labyrinth prerequisite. Do not make the mission phone declare island clear just because the build row reaches 5/5.
4. Preserve launch behavior: build opens Build; mission opens the appropriate controller; activity completion opens or explains the relevant canonical landmark flow.
5. Add regression tests for full builds/unfinished activities, partial builds, egg ready versus collected/sold, other-island state and true completion. Check short-phone layout and accessibility before release.

## Limits

This reproduces the code-level symptom and explains why many mission types differ. It does not inspect the user's private save or rule out additional hydration issues. The tracker intentionally reports no current build progress when asked for an island other than `state.currentIslandNumber`; inspect caller identity in a live case if zero persists after activities are also complete. Current and displayed tracker states and their action/detail arrays should be reconciled during the UI slice, because the displayed briefing may name another island while handlers use the current tracker.
