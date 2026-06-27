# Island Inhabitant Conversation Content Contract

Status: content foundation only. No runtime/UI integration is included in this PR.

## Product direction

The future Island Run inhabitant flow is a two-stage presentation flow:

1. premium inhabitant encounter screen,
2. selectable topic buttons,
3. retro conversation mode,
4. deterministic close back to the encounter or board.

This PR only adds read-only content definitions, validation, registry accessors, and tests. Future UI/runtime components must be separate PRs.

## Civilization relationship

Island 1 remains Luma Isle, home of The Lumin. Servant wizards are supporting inhabitants within island civilizations, not replacement civilizations. The first sample inhabitant is named **Caretaker** to keep the character broadly reusable while establishing a helpful woodland servant-wizard identity: a small practical caretaker with a long woodland hat hiding their face.

## Read-only content boundaries

Inhabitant and conversation content must not mutate gameplay, persist progress, trigger services, dispatch actions, write localStorage, or change schema. Gameplay services remain authoritative for dice, rewards, stops, builds, bosses, travel, and persistence.

## Shallow graph limits

Conversation graphs are intentionally small:

- version `1` definitions only,
- NPC, choice, optional presentation-only text-response, and close nodes only,
- NPC text is capped at 180 characters,
- choice labels are capped at 70 characters,
- each choice node has 2–4 choices,
- every referenced node must exist,
- every node must be reachable from the opening node,
- every reachable path must terminate in a close node,
- cycles are rejected,
- maximum reachable path depth is six nodes.

## Prohibited gameplay-authority fields

Content validators reject reward/economy, tile/stop, build, boss, travel, action/callback, function, and gameplay mutation fields anywhere in the content tree. Display-only strings such as topic labels and close labels are allowed when they do not act as action identifiers.

## No saved conversation progress

No conversation progress is saved in this PR. The optional `player_text_response` node can only declare presentation/deferred intent metadata; any future Compass, reflection, or goal write must route through the canonical owner in a separate integration PR.

## Expected future asset paths

The Island 1 caretaker metadata reserves these future asset paths without requiring files to exist yet:

- `/assets/islands/island-001/inhabitants/luma-caretaker-full.webp`
- `/assets/islands/island-001/inhabitants/luma-caretaker-retro.png`

No placeholder binary assets are added by this PR.

## Production Island 1 integration

Island Run now exposes the Island 1 caretaker flow as an automatic board encounter on the top tile of the 40-tile ring. When an Island 1 roll passes that tile, the board pauses post-roll tile handling and opens the caretaker flow. A manual **Talk to Caretaker** launcher remains available only inside the dev-mode HUD tools for QA.

The entry point is restricted to canonical current island `1` and resolves the caretaker, three topics, and referenced conversations at runtime through the read-only inhabitant registry. If that content is incomplete, the action is not shown and the flow-level missing-content screen remains a secondary safety net.

The caretaker flow is intentionally not collision-gated by the old inhabitant-flow blocker map; the automatic tile encounter and dev launcher can open it directly. Opening and closing the flow remains presentation-only: no gameplay services, rewards, progression, persistence, or schema changes are added.

The encounter reuses Island 1 runtime background art (`islandArtAmbientBackgroundSrc` when available, otherwise the legacy island background resolver). The caretaker metadata still points at the expected future character and retro sprite paths, and the existing component fallbacks render if those binaries are unavailable.

Deferred work remains seen-state suppression/persistence, Island 2+ rollout, final approved character art, and any Compass/reflection writes.
