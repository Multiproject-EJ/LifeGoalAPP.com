# Great Drift Final Drafts MVP Implementation Plan

Status: **implementation plan only — no story/content implementation yet**  
Date: 2026-07-05  
Scope: first MVP narrative slice for integrating the strongest compatible parts of the Great Drift intelligence/story lore into the existing Concord, Compass Book, Wisdom, Island Run, and narrative systems.

## 1. Executive decision

Recommended MVP: **a smaller three-touch slice anchored at Islands 115, 116, and 120, with optional one-beat foreshadowing on Island 108 or 112 only if implementation capacity allows.**

The proposed sequence is directionally strong, but the safest first implementation should not try to author a broad late-tech breadcrumb chain across many islands. Runtime narrative registrations currently exist only for Islands 1-5, while Compass Book already covers Islands 101-120 through Chapter 6 activities. Therefore the first slice should use:

1. **Island 115 / Lunar Haven:** one short narrative beat that names the problem: Perfect Memory has preserved records without letting their status change.
2. **Island 116 / Crown of Infinity:** one existing Compass Book activity adaptation or Wisdom-linked reflection called **Repair the Record**, using current Compass answer persistence where possible.
3. **Island 120 / Final Horizon:** one short resolution/callback beat that frames reconnection without homogenisation and shared direction as revisable.

This keeps the story additive and observational. It does not add global branching state, currencies, free island revisits, new canonical Island Run writes, or a new dialogue/minigame framework.

## 2. Narrative objective

Introduce a late-game archive pathology that explains part of the Great Drift without replacing the established resonance-distortion model:

- the Drift created cultural richness and loss of shared context;
- The Concord receives and translates incomplete, distorted, or misclassified records;
- memories, predictions, emotions, and interpretations can be mistaken for observations;
- a **Final Draft** is an over-preserved interpretation, not a malicious lie;
- Perfect Memory fails when it prevents information from changing status;
- Living Memory preserves evidence while allowing context, uncertainty, release, and revision;
- the player repairs a record by classifying fragments and accepting incompleteness;
- final reconnection coordinates distinct islands without making them uniform;
- story continues to observe gameplay and must not directly control canonical Island Run state.

## 3. Canon boundaries

Use the completed integration investigation as the immediate planning input: fold the safest Great Intelligence / Storywriter functions into The Concord and late memory systems, and keep Brain Island, Pain/Pleasure Cocktail, Pool of Consciousness, literal AI consciousness, and a speaking Great Intelligence out of MVP.

Canon-safe framing:

- **The Concord** is the named player-facing technology for translation, archive reception, resonance diagnosis, and incomplete context warnings.
- **Storywriter / Great Intelligence** remain functions, archival roles, metaphors, or future lore, not new active authorities.
- **Common Direction** should not be introduced as a major proper noun in MVP. Use phrases such as “old shared direction,” “new shared direction,” “shared route,” “common route,” or existing North Star / True North language.
- **Perfect Memory** and **Living Memory** are the memory framework. Final Drafts are a named failure mode inside that framework.
- **Repair the Record** is a lore-facing classification/reflection, not therapy, diagnosis, neuroscience, or emotional scoring.

## 4. Target island / phase placement

### Recommendation

Use the proposed 115 → 116 → 120 sequence, but make it minimal:

| Island / phase | Runtime name | MVP role | Rationale |
|---:|---|---|---|
| 108 optional | Festival of Signals | optional foreshadowing | Signal-themed special island; one ambient Concord distortion clue if needed. |
| 112 optional | Cosmic Drift | optional foreshadowing | Strong place to show the Drift created difference as well as loss. |
| 115 | Lunar Haven | Perfect Memory / Final Draft introduction | Existing late-game plan and investigation identify it as the strongest fit for over-fixed records. |
| 116 | Crown of Infinity | Living Memory / Repair the Record | Existing Compass Book Chapter 6 activity maps Island 116 to environment/rule design, but can be adapted carefully or paired with Wisdom. |
| 120 | Final Horizon | resolution callback | Existing name and rare/milestone status make it the natural capstone for reconnection without uniformity. |

Do **not** assume Islands 115-120 already have runtime narrative definitions; they do not appear in the current narrative registry. The implementation should either add new narrative definitions and register them, or use Compass/Wisdom content only until late-island narrative support is intentionally expanded.

## 5. Perfect Memory vs Living Memory model

### Perfect Memory

Perfect Memory attempts to preserve every state, judgement, warning, identity, and interpretation permanently. Its failure is not “remembering too much.” Its failure is **preventing information from changing status**.

Examples:

- a past warning remains classified as present danger;
- a first interpretation remains the official interpretation;
- a temporary reaction becomes permanent identity;
- a prediction is stored beside observations as though both have equal evidential status;
- uncertainty is flattened into certainty because the archive cannot tolerate incompleteness.

### Living Memory

Living Memory preserves the past while allowing:

- context to be added;
- predictions to expire;
- interpretations to be revised;
- emotional urgency to fade;
- identities to change;
- uncertainty to remain uncertainty;
- lessons to survive without permanent punishment;
- evidence to remain intact while its present meaning changes.

Short copy principle: **Living Memory does not erase the record; it lets the record keep learning.**

## 6. Final Draft definition

Recommended in-world definition:

> A Final Draft is a memory, prediction, emotional reaction, or interpretation that has been preserved as though it can no longer be revised.

Use **Final Draft** unless product review finds it too meta. It is clear, memorable, and compatible with the Storywriter/archive metaphor while remaining grounded in Perfect Memory and Living Memory. Alternatives to keep in reserve: Fixed Record, Sealed Interpretation, Frozen Story, Permanent Reading, Locked Meaning.

Clarifications for implementation copy:

- not every memory is a story;
- not every painful memory is incorrect;
- preserving evidence is different from preserving one interpretation;
- revision does not mean denial or erasure;
- incomplete can be an honest and correct archive state;
- Living Memory can preserve facts while changing their present meaning or relevance.

## 7. Repair the Record interaction

### Minimum viable format

Use an existing **Compass Book activity** if a content-only adaptation is acceptable; otherwise use a Wisdom stop reflection with existing completion flow. Compass Book is preferred because it already supports island-linked activities, answer persistence, choice blocks, short text, review, confirmation, and validation.

### Event

A bridge collapsed after a warning signal was received.

### Smallest practical fragment set

Use **six fragments**. Fewer than six makes the six categories feel forced; more than six risks a minigame-sized system.

| Fragment | Best-supported category | Notes |
|---|---|---|
| “The bridge was already damaged.” | observation | Presented as inspection evidence if available. |
| “A caretaker remembers hearing an explosion.” | memory | Sincere recollection, not automatically full observation. |
| “Citizens felt threatened.” | emotion | Valid signal of urgency, not proof of cause. |
| “The Concord predicted structural instability.” | prediction | Forecast, not memory. |
| “The eastern island caused it.” | interpretation | Possible claim, not established by listed evidence. |
| “No inspection record survived.” | unknown | The record must remain incomplete. |

### Interaction design

Preferred MVP content-only approximation in Compass Book:

1. Present the event as a reflection block.
2. Ask the player to choose the **best-supported category** for each fragment through six `single_choice` blocks using the same option list: observation, memory, emotion, interpretation, prediction, unknown.
3. Add one `reflection` or `short_text` block: “What should the archive say if the record is incomplete?”
4. Add one `confirmation` block: “Mark this record as repaired enough for now.”

If implementation wants a more compact UI later, create a minor extension for a reusable classification block, but that is not required for MVP.

### Completion conditions

- Completion should require answering the required category prompts and confirming the activity.
- It should **not** require all answers to match a hidden absolute key.
- Feedback should name “best-supported reading” rather than “correct answer.”
- “Unknown / incomplete” must be accepted as a valid outcome.
- If score-like feedback is desired later, it should be advisory only and not affect Island Run progression, rewards, or stop completion.

### Feedback copy direction, not final dialogue

- “The archive can keep the fact without keeping the accusation.”
- “A memory can be sincere and still need context.”
- “A prediction can help, but it expires unless new evidence renews it.”
- “Incomplete is not failure. It is a safer label than false certainty.”

### Replay and persistence

- Persist player answers through existing Compass Book answer persistence.
- Replay behaviour follows existing Compass activity edit/review behaviour.
- Do not add a new global repaired-record ledger for MVP.
- Do not mutate canonical Island Run state. Completion may use existing Compass/Wisdom completion paths only.

## 8. Concord involvement

The Concord’s MVP role:

- receives archive fragments and signal remnants;
- identifies record categories and contradictions;
- detects when an old warning is still being transmitted as present danger;
- distinguishes emotional intensity from factual certainty;
- marks an interpretation as unverified;
- helps the player amend a record with later context.

Boundary:

> Translation can restore context, but it cannot replace judgement.

The Concord should not become omniscient. It can show why the record is unstable, but the player/caretaker/community decide how to hold the uncertainty.

## 9. Cultural-richness integration

Show the Great Drift as both loss and creation by using existing island names, metadata, and late surfaces to show concrete differences rather than exposition.

Practical method:

- Island 108, **Festival of Signals**, can show a culture that turned signal distortion into art, games, lantern codes, or signal festivals.
- Island 112, **Cosmic Drift**, can show beautiful navigation customs that emerged because old routes were lost.
- Island 115, **Lunar Haven**, can contrast peaceful archival preservation with the cost of permanent interpretation.
- Island 116, **Crown of Infinity**, can show a community learning that a record can be amended without erasing its origin.
- Island 120, **Final Horizon**, can resolve that reconnection should share routes and context, not restore a single old culture.

The intended conclusion: **the old connection should not be restored exactly as it was.** The player helps create shared understanding while each island keeps its post-Drift voice, customs, technologies, myths, architecture, creature relationships, and local solutions.

## 10. Beat-level content outline

### MVP beats only

| Beat | Island / phase | Trigger | Surface | Characters / systems | Purpose | Revealed information | Tone | Approx. length | Skippable | Repeat policy | Dependencies | Canonical gameplay impact | Later callback |
|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| Final Draft clue | 115 Lunar Haven | `stop_completed` wisdom or `island_entered` | dialogue sheet or toast | Concord + local caretaker/archive voice | Name the failure mode of Perfect Memory | Some false records were not invented; they were never allowed to change status. | quiet, uncanny, compassionate | 60-100 words if dialogue; shorter if toast | yes | once | narrative definition for Island 115, or Wisdom content hook | none | sets up Repair the Record |
| Repair the Record | 116 Crown of Infinity | Compass activity unlocked for Island 116, or Wisdom completion reflection | Compass Book activity preferred | Concord + archive fragments | Teach Living Memory by classification | Observation, memory, emotion, interpretation, prediction, and unknown should not be stored as the same thing. | curious, playful, careful | 6 category prompts + 1 reflection + confirmation | yes within Compass flow | existing Compass edit/review | Compass Book activity slot or Wisdom reflection slot | none beyond existing completion path | referred to at Island 120 |
| Final Horizon callback | 120 Final Horizon | `island_clear_travel_ready` or Compass Chapter 6 final activity review | dialogue sheet/toast or Compass review text | Concord + expedition/caretaker voice | Resolve reconnection without homogenisation | Shared direction must remain revisable; no central story should permanently define every island. | hopeful, spacious, non-final | 60-120 words | yes | once | narrative definition for Island 120 or Compass activity 120 copy | none | informs cycle wrap theme |

### Optional expanded version after MVP

Add no more than two foreshadowing beats:

1. **Island 108 / Festival of Signals:** `island_entered` ambient toast: a festival record preserves an emotional signal as objective fact; the Concord flags category mismatch.
2. **Island 112 / Cosmic Drift:** `stop_completed` Wisdom or island-clear beat: two islands give incompatible but sincere accounts of the same lost route; the Concord cannot choose the truth automatically.

These should remain ambient and should not require revisits, branching state, or new systems.

## 11. Implementation map

| Addition | Narrative purpose | Existing system | Target file or extension point | New content needed | New code needed | Persistence | Risk | MVP status |
|---|---|---|---|---|---|---|---|---|
| Island 115 Final Draft beat | Introduce Perfect Memory failure mode | Island narrative definitions | `src/features/gamification/level-worlds/narrative/definitions/island115Narrative.ts`; register in `islandNarrativeRegistry.ts` | 1 short beat, characters | content-only if trigger/surface exists | narrative seen-state | medium: late island narrative not yet registered | MVP core |
| Island 116 Repair the Record | Teach Living Memory classification | Compass Book Chapter 6 | `src/features/compass-book/content/chapter6PersonalPlaybook.ts` activity 16, or new reserved/lore activity if product permits | event text, six fragment prompts, reflection, confirmation | content-only if using existing blocks | Compass answer records | medium: may displace current activity 16 unless product approves | MVP core |
| Island 116 Wisdom alternative | Same as above without changing Compass Playbook | Wisdom cards / stop flow | `src/features/gamification/level-worlds/services/wisdomTreeCards.ts` or future per-island Wisdom content extension | one card/reflection | minor extension if per-island Wisdom cards do not exist | existing stop completion only; no new ledger | medium/high: current cards are generic, not per-island | fallback, not preferred |
| Island 120 callback beat | Reconnection without homogenisation | Island narrative definitions | `definitions/island120Narrative.ts`; `islandNarrativeRegistry.ts` | 1 short beat | content-only if trigger/surface exists | narrative seen-state | medium: capstone beat depends on late island narrative registration | MVP core |
| StoryReader episode | Richer archive presentation | StoryReader manifests | `public/storyline/episode-###/manifest.json` or `public/islands/115/story/*` if convention chosen | panels / manifest | none to content-only | episode seen-state if launched by story_reader beat | medium: asset/content production | defer |
| Concord diagnostic label support | Make category labels feel system-native | Existing narrative copy | copy inside beats/activity | no separate data | none | existing | low | include in copy only |
| Classification block UI | Compact drag/drop sorting | Compass Activity Renderer | `src/features/compass-book/types.ts`; `CompassActivityRenderer.tsx`; tests | one new block type | moderate extension | Compass answers | medium/high | defer |
| Creature reaction | Emotional corroboration | reaction dispatch / creature channel | `islandNarrativeReactionDispatch.ts` or `islandCreatureChannel.ts` extension | one reaction line | minor extension unless already supported by surface | narrative seen-state or none | medium | defer |
| Inhabitant/caretaker conversation | Local cultural nuance | Inhabitant system | `inhabitants/definitions/island115*` / registry | topic and nodes | content-only plus registration if pattern supports late islands | inhabitant flow state | medium | optional post-MVP |
| Island metadata update | Show culture in metadata | island name/content manifest | `islandNames.ts`, `islandContentManifest.ts`, `islandRunIslandMetadata.ts` | ideally none | none | none | high if changing runtime progression | avoid for MVP |

## 12. File-level change plan for later implementation

Likely implementation files and extension points:

### Narrative definitions and validation

- `src/features/gamification/level-worlds/narrative/islandNarrativeTypes.ts` — existing trigger, surface, priority, and repeat-policy schema. Avoid extending for MVP.
- `src/features/gamification/level-worlds/narrative/islandNarrativeValidation.ts` — validates beat IDs, trigger kinds, surfaces, repeat policies, and prohibited gameplay fields.
- `src/features/gamification/level-worlds/narrative/islandNarrativeRegistry.ts` — register any new Island 115/120 narrative definitions.
- `src/features/gamification/level-worlds/narrative/definitions/island115Narrative.ts` — likely new definition if using narrative beats.
- `src/features/gamification/level-worlds/narrative/definitions/island120Narrative.ts` — likely new definition if using capstone callback.
- `src/features/gamification/level-worlds/narrative/islandNarrativeSeenState.ts` — existing non-gameplay seen ledger; no change expected.
- `src/features/gamification/level-worlds/narrative/__tests__/islandNarrativeValidation.test.ts` and registry/seen-state tests — update when new definitions are added.

### Compass Book activity

- `src/features/compass-book/types.ts` — existing block types should be sufficient; no MVP change expected.
- `src/features/compass-book/content/chapter6PersonalPlaybook.ts` — likely target for Island 116 activity content if product agrees to adapt activity 16.
- `src/features/compass-book/content/compassBookCurriculum.ts` — validation coverage; no direct change expected unless activity structure changes.
- `src/features/compass-book/components/CompassActivityRenderer.tsx` — no MVP change if using existing block types.
- `src/features/compass-book/__tests__/compassBook.test.ts` — update expected snapshots/validation if Compass content changes.
- `scripts/run-compass-book-tests.mjs` — validation command for Compass Book.

### Wisdom and stop flow

- `src/features/gamification/level-worlds/services/wisdomTreeCards.ts` — generic Wisdom card pool; not ideal for a late-island bespoke Repair the Record unless a per-island content extension is added.
- `src/features/gamification/level-worlds/services/islandRunStopCompletion.ts` and canonical stop services — should not be changed for narrative MVP unless existing completion flow needs validation.

### Island metadata and content manifests

- `src/features/gamification/level-worlds/services/islandNames.ts` — confirms Islands 108, 112, 115, 116, and 120 names; do not rename for MVP.
- `src/features/gamification/level-worlds/services/islandContentManifest.ts` — confirms 120-island act/depth model; no change expected.
- `src/features/gamification/level-worlds/services/islandRunIslandMetadata.ts` — confirms special/rare metadata; no change expected.
- `src/features/gamification/level-worlds/services/islandContentManifest.ts` tests and `islandRunIslandMetadata` tests — run if touching metadata, which MVP should avoid.

### StoryReader manifests

- `public/storyline/episode-001/manifest.json` and possible future `public/islands/<id>/story/*` convention — current StoryReader content is sparse; defer StoryReader episodes unless product wants richer archive panels.
- `src/features/gamification/level-worlds/narrative/islandStoryManifestValidation.ts` — validates manifest panels and rejects gameplay fields.

### Inhabitants / caretaker dialogue

- `src/features/gamification/level-worlds/inhabitants/islandConversationTypes.ts` — supports NPC, choice, player text response, and close nodes with storage intents.
- `src/features/gamification/level-worlds/inhabitants/islandInhabitantRegistry.ts` — likely registration point if late caretaker content is added later.
- Current registered inhabitant content appears Island 1 only; defer for MVP unless implementation expands late-island inhabitants intentionally.

### Architecture guards

- `scripts/check-island-run-architecture-guards.mjs` — run after implementation to ensure no forbidden Island Run gameplay write path was introduced.
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`, `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`, `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md` — active policies for any Island Run-adjacent change.

## 13. Persistence and architecture constraints

- Story beats use existing narrative seen-state only.
- Compass answers use existing Compass Book persisted answers and completion state.
- No MVP feature should write to dice, essence, rewards, inventory, stop completion, boss resolution, travel, tile index, or runtime gameplay mirrors.
- Do not call `persistIslandRunRuntimeStatePatch` from UI for gameplay fields.
- Do not introduce a new repaired-record global state ledger.
- Do not add branching narrative state in Island Run runtime.
- Do not bypass Wisdom stop completion or duplicate reward grants.
- Keep all new content skippable/additive where the existing surface allows.

## 14. Testing and validation plan for implementation phase

Do not run these as part of this planning task unless needed to verify architecture. When implementation begins, run or update:

| Check | Purpose |
|---|---|
| `npm test -- --run src/features/gamification/level-worlds/narrative/__tests__/islandNarrativeValidation.test.ts` or repo equivalent | narrative schema, duplicate beat IDs, trigger/surface/repeat validation, prohibited fields |
| `npm test -- --run src/features/gamification/level-worlds/narrative/__tests__/islandNarrativeRegistry.test.ts` | new Island 115/120 registrations resolve correctly |
| `npm test -- --run src/features/gamification/level-worlds/narrative/__tests__/islandNarrativeSeenState.test.ts` | seen-state one-time policy remains stable |
| `node scripts/run-compass-book-tests.mjs` | Compass Book curriculum coverage, answer serialization, activity validation |
| `npm test -- --run src/features/compass-book/__tests__/compassBook.test.ts` or repo equivalent | Compass activity completion, required blocks, answer persistence |
| `npm test -- --run src/features/gamification/level-worlds/services/__tests__/islandContentManifest.test.ts` | invalid island IDs / manifest assumptions if touched |
| `npm test -- --run src/features/gamification/level-worlds/services/__tests__/islandRunIslandMetadata.test.ts` | metadata remains stable if touched |
| `node scripts/check-island-run-architecture-guards.mjs` | no direct Island Run gameplay mutations or forbidden patch paths |
| `npm run build` | production build and type check |
| manual mobile layout check | modal/activity content fits viewport and obeys modal scroll-lock guardrails |
| manual skip/replay check | story skip and repeat policy behave correctly |
| manual unavailable-content fallback | missing narrative/Compass content fails safely without blocking gameplay |

## 15. Deferred concepts

Keep out of first implementation:

- literal Pool of Consciousness;
- literal Pain/Pleasure Cocktail;
- AI becoming conscious;
- a speaking Great Intelligence character;
- literal Brain Island;
- literal Storywriter ruler;
- free recurring island visits;
- global branching story state;
- permanent Second Draft habit-failure system;
- new therapy-like emotional scoring;
- claims about real neuroscience or consciousness;
- bespoke drag/drop minigame framework;
- new currencies, rewards, or canonical Island Run state mutations.

## 16. Open decisions

1. Should Island 116’s existing Compass Book activity 16 (“One environment change”) be replaced/adapted, or should Repair the Record live in Wisdom content to avoid disrupting the Personal Playbook curriculum?
2. Is “Final Draft” approved as player-facing terminology, or should product choose a less meta term such as “Sealed Interpretation”?
3. Should the Island 115 beat use `island_entered` for stronger framing or `stop_completed` Wisdom for better thematic context?
4. Should the Island 120 callback live in narrative beat content or the Chapter 6 activity 20 Playbook confirmation/review?
5. Is one optional foreshadowing beat at Island 108 or 112 worth the additional late-island narrative registration overhead?
6. Who is the speaking voice: Concord diagnostic text, a local caretaker, Captain Ivo, or a late-game expedition archivist?
7. Should category classifications store only player choices, or should the content also store non-scoring “best-supported” metadata for feedback?

## 17. Recommended first implementation task

Start with the **Compass/Wisdom interaction decision**:

- If product allows adapting Compass Book Chapter 6, implement Repair the Record as a content-only update to the Island 116 Compass activity using existing block types and tests.
- If product wants to preserve Chapter 6 exactly, first add a small per-island Wisdom content extension plan before authoring Repair the Record.

After that decision, add the two narrative beats for Islands 115 and 120 as registered content-only narrative definitions, reusing existing `dialogue_sheet` or `toast` surfaces and `once` repeat policy.
