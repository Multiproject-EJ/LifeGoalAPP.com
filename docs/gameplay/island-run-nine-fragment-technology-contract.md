# Island Run Nine-Fragment Technology Contract

Status: canonical documentation/design contract only. This document introduces no runtime behavior, assets, migrations, rewards, triggers, SQL, persistence changes, UI changes, or live narrative edits.

## 1. Verdict

**PASS WITH CONDITIONS.** Island Run should align future technology implementation around island-specific inventions reconstructed from nine physical fragments through the existing per-island 3x3 technology collection foundation. The conditions are that implementation remains canonical-gameplay-state driven, preserves existing reward behavior until an explicit economy PR changes it, and treats content definitions as read-only design data.

## 2. Canonical nine-fragment rule

Each Island Run island may contain one technology or invention reconstructed from exactly nine distinct collectible fragments. The nine fragments are physical pieces of that island's invention, not generic resource counters. Each fragment maps one-to-one to a 3x3 collection slot numbered 0 through 8, and each collected slot reveals one ninth of a coherent completed technology image.

The current 3x3 collection persistence and reward system remains the gameplay foundation. Duplicate slot behavior, line rewards, full-grid rewards, and persistence semantics remain governed by the existing collection logic until a separate implementation PR intentionally changes them.

## 3. Board collectible and 3x3 modal relationship

- Board collectibles should be island-specific 3D fragments that visually belong to the invention.
- Slot 0-8 should correspond to one real visible piece, module, shard, panel, lens, valve, basket, clamp, prism face, or equivalent artifact part.
- The modal should reveal the matching ninth of the technology image for each collected slot.
- The completed image must form one coherent artifact.
- Collection content must not mutate story or gameplay directly; completion is observed from canonical gameplay state in later implementation work.

## 4. Technology scopes

Illustrative documentation-only shape:

```ts
type IslandTechnologyScope = 'local' | 'expedition';
```

### Local technology

A local technology belongs primarily to one island, helps resolve that island's story or guardian problem, changes local visuals/narrative/interaction, normally does not add permanent global UI or mechanics, and may remain visible as a completed island artifact. Most island technologies should be local.

### Expedition technology

An expedition technology becomes part of the player's long-term toolkit, remains available after leaving the island, unlocks a new interaction type or persistent ability, and should be rare and narratively important. The Concord is an expedition technology.

## 5. The Concord canonical construction model

- Island: Luma Isle.
- Civilization: The Lumin.
- Scope: expedition.
- Construction: nine island-specific Concord fragments.
- Collection UI: existing 3x3 technology collection modal.
- Completion: all nine distinct slots collected.
- Permanent unlock: translated communication with inhabitants and creatures in a later implementation PR.

There is no separate general-component gameplay requirement for The Concord. Echo Crystal, Meaning Lens, and Concord Core may remain internal lore names or visual subassemblies, but they are not separate collectible gates in the current design. The current model is:

```text
9 Concord fragments collected -> 3x3 image completed -> The Concord is built -> completion celebration -> communication with inhabitants and creatures unlocks
```

When the ninth fragment is collected, a later implementation should reveal the final image section, show the complete untinted/illuminated device, play the completion celebration, name The Concord, explain translated communication, and only then make communication available through canonical gameplay state.

## 6. Island 1-5 working technologies

| Island | Civilization | Technology | Scope | Guardian connection | Completion effect |
|---:|---|---|---|---|---|
| 1 | The Lumin | The Concord | Expedition | Noctyra's apparent threat is understood as a distorted warning. | Translated inhabitant and creature communication becomes available after future gating work. |
| 2 | The Tidefolk | The Tidebreather | Local | Maelis sees that safety can move in measured pulses. | Channels move, mist clears, nursery pools circulate. |
| 3 | The Covefolk | The Sharing Canopy | Local | Tamba sees that shared circulation sustains abundance. | Baskets move, stalls reopen, fruit and seeds circulate, blossoms return. |
| 4 | The Driftfolk | The Mender Engine | Local by default | Garran sees continuation without erasure. | Patched sails rise and broken structures become useful without becoming pristine. |
| 5 | The Reefborn | The Voice Prism | Local with story relevance | Thalassa's true voice is separated from forced unison and borrowed signal. | Many voices and waveforms return while the foreign transmission is isolated. |

## 7. Building, guardian, creature, and Great Drift cohesion

Technology should support guardian resolution, not replace building progression. The repeatable cohesion pattern is:

```text
Great Drift emotional distortion -> buildings lose their communal function -> nine technology fragments are recovered -> landmarks restore the conditions needed to use the invention -> companion demonstrates an emotional counter-capacity -> completed technology helps the island understand or enact the change -> guardian integrates the missing capacity
```

Technology does not magically cure emotion. It helps reveal, test, communicate, regulate, distribute, repair, or separate signals. The community, companion, buildings, and guardian still perform the restoration.

## 8. Cast and civilization continuity

Preserve established names: The Lumin, Miri, Elder Sava, Poko, Noctyra; The Tidefolk, Sela, Keeper Bryn, Tobin, Maelis; The Covefolk, Pip, Grandmother Liko, Nuru, Tamba; The Driftfolk, Wren, Old Fenn, Bodie, Garran; The Reefborn, Reev, Elder Cael, Sprat, Thalassa. Captain Ivo remains expedition/route framing. Tidelock, Canopy Steward, Salvage Mender, and Chorus Reef may be roles, mechanisms, locations, or traditions, not replacement civilization names.

## 9. Trigger and surface implementation audit

| Proposed beat/surface | Status | Notes |
|---|---|---|
| `island_entered`, `stop_opened`, `stop_completed`, `boss_midpoint`, `boss_resolved`, `island_clear_travel_ready` | Existing and currently supported for narrative planning. | Use only through current narrative registry/contracts in implementation PRs. |
| 3x3 completion result | Existing event available outside narrative registry / new bridge required. | The collection system can determine a full grid, but narrative should observe canonical state through a safe bridge rather than mutate gameplay. |
| `tech_grid_completed` | New bridge or trigger required unless implementation verifies registration. | Do not document it as currently registered narrative vocabulary. |
| `retro_conversation` | Existing inhabitant/conversation surface outside StoryReader registry. | Treat as separate inhabitant flow until a bridge is designed. |
| Concord completion -> translated conversation | New bridge required. | Celebration may queue a conversation only after gameplay state records the unlock; narrative content must not grant the unlock. |
| Communication gating | Deferred. | Dedicated future PR; no gating in this documentation PR. |

## 10. Art implications

Each island needs a coherent completed technology image plus nine board fragment visuals that match the island's materials, civilization, and guardian problem. The Concord uses celestial crystal, moonstone lenses, blue/navy/antique-gold observatory geometry, star-track mechanisms, compact expedition-device form, and a retro diagnostic screen.

## 11. Runtime implementation implications

This contract does not add runtime types. An illustrative future content model is:

```ts
type IslandTechnologyDefinition = {
  id: string;
  islandNumber: number;
  displayName: string;
  scope: 'local' | 'expedition';
  fragmentCount: 9;
  imageSrc: string;
  boardFragmentArt: string[];
  civilizationOrigin: string;
  visualLanguage: string[];
  storyPurpose: string;
  guardianConnection: string;
  completionEffect: string;
  persistentAbility?: string;
};
```

Rules for implementation: no gameplay writes in UI components; no narrative content mutating gameplay; no direct persistence patches from UI for gameplay fields; no new runtime mirrors in UI; no reward retuning; no live trigger additions without a dedicated implementation PR.

## 12. Recommended implementation PR stack

1. Island technology content model: pure definitions and validation, local versus expedition scope, no gameplay changes.
2. Island-specific board fragment presentation: replace generic 3D tech objects with Island 1 Concord fragments through a central asset manifest while preserving slot/persistence behavior.
3. Concord build state and unlock contract: canonical permanent Concord-built marker, compatibility/migration investigation, no communication wiring.
4. Concord completion celebration: completed device presentation, ability-unlocked explanation, queue/blocker behavior.
5. Communication gating: caretaker, inhabitant, and creature access through defensive helpers with existing-user compatibility.
6. Island 1 story rewrite: communication failure, fragment progression reactions, first translated creature line, Noctyra warning reveal.
7. Local technologies for Islands 2-5: split by island or pairs after Island 1 proves the pattern.

## 13. Superseded decisions

The earlier hybrid recommendation, six-general-component requirement, Ancient Components framing, and separate Echo Crystal / Meaning Lens / Concord Core gameplay gates are superseded as current design. They remain historical investigation context only.

## 14. Open questions

- Should the Concord completed image be presented as handheld equipment, shipboard equipment, or both?
- What compatibility rule should grant The Concord to existing users who already completed Island 1 or the full Island 1 grid?
- Should full-grid reward celebration and named-technology celebration share one overlay queue or appear sequentially?
- Which exact art pipeline owns the nine fragment assets and completed image?
