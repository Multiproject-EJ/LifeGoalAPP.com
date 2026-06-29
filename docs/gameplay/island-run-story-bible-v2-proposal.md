# Island Run Story Bible V2 Proposal

Status: documentation/story-design proposal only. This document does not change live narrative definitions, gameplay behavior, creature state, technology state, triggers, rewards, schema, AI behavior, or runtime components.

## 1. New narrative thesis

**Communication is restoration.** The Great Drift did not only break routes and buildings. It disrupted emotional resonance: the ability of people, creatures, guardians, landmarks, and islands to understand emotion in context.

Warnings became threats. Protection became isolation. Silence became disconnection. The player restores islands by rebuilding communal landmarks, restoring safe rhythms, listening through The Concord, travelling with a creature companion, and helping each guardian integrate an emotion that has become too dominant.

The story must never say that fear, grief, caution, protection, or belonging are bad. The problem is imbalance: a healthy protective capacity has lost its complementary partner.

## 2. Great Drift definition

The Great Drift is a transmitted resonance distortion. It separates emotion from context and amplifies protective signals until communities repeat one response even when conditions change.

Arc 1 mystery escalation:

1. **Island 1:** Noctyra's threat is a distorted warning.
2. **Island 2:** Maelis repeats a safety pause long after the tide has changed.
3. **Island 3:** Tamba's abundance signals are translated as shortage alarms.
4. **Island 4:** Garran preserves memory so completely that rebuilding feels like betrayal.
5. **Island 5:** Thalassa proves the distortion can carry a borrowed voice from beyond the known route.

Arc 2 hook: after Crown of Tides, The Concord isolates a second signal under the Drift, not an island's voice, but something using island emotions as a broadcast medium.

## 3. Role of The Concord

The Concord is an old Lumin expedition communication technology designed to translate words, creature emotion, guardian resonance, and landmark memory into meaning. The Great Drift damaged the device and scattered its nine physical fragments through Luma Isle.

For Island 1:

- the **3x3 technology image** represents the completed Concord device;
- each piece is both a recovered physical Concord fragment and one ninth of the completed invention image;
- named modules may remain lore-only visual subassemblies: Echo Crystal = signal capture, Meaning Lens = context alignment, Concord Core = synthesis, but they are not separate collectible gates;
- all nine pieces complete The Concord and enable the future permanent translation unlock;
- the retro conversation interface is the Concord's low-bandwidth diagnostic mode;
- the first translated companion line proves it can interpret creature emotion;
- later islands use The Concord as a translator, not as automatic trust.

Technology is now a core island-story layer: each island may contain nine technology fragments that reconstruct one culturally and visually specific invention arising from that island civilization, buildings, emotional imbalance, and guardian problem. Most technologies should be local; only rare milestone technologies, such as The Concord, become expedition tools.


## 3A. Repeatable island technology model

Each island technology design must answer:

1. Why would this civilization have invented it?
2. Why was it broken or scattered?
3. Why do its fragments appear around this island's board?
4. How does its visual design belong to the island?
5. Which landmarks help restore, power, test, or understand it?
6. How does it contribute to the guardian resolution?
7. What visibly changes when it is completed?
8. Is it local or expedition scope?
9. Does it unlock a persistent ability?
10. How does it reveal the next Great Drift clue?

Illustrative documentation-only model:

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

Rules: fragment count is nine for the current 3x3 system; each slot is a real invention piece; duplicate slot behavior remains governed by existing collection logic; local technologies should not create permanent UI; expedition technologies must be rare; technology supports guardian resolution without replacing building progression; companion reactions must not require owning a specific creature.

## 4. Role of creatures

Creatures retain emotional capacities the Drift has not fully silenced. The active companion may model a response, notice a signal, interact with a landmark, speak through The Concord, or provide humor. It must never become an inventory key required to complete an island.

Recommended presentation families:

- Steadying: calm, patience, tenderness.
- Opening: curiosity, playfulness, hope.
- Brave Action: courage, determination, honesty.
- Relational Voice: generosity, connection, self_trust.

## 5. Role of buildings

Buildings are emotional and communal organs. Each landmark has a practical function, emotional function, visual identity, biome/civilization fit, companion interaction, story revelation, and finale preparation role.

Canonical stop IDs remain unchanged:

- `hatchery`
- `habit`
- `mystery`
- `wisdom`
- `boss`

## 6. Role of guardians

Guardians are protectors trapped in loops. Each protected something valuable, received or experienced Drift distortion, overused one response, can speak from inside the loop, and is reached through integration rather than defeat.

## 7. Player role

The player is a restorer of rhythm and meaning. They do not kill guardians, erase difficult emotions, or solve a community alone. They rebuild conditions where healthier choices become possible.

## 8. Captain Ivo versus companion role

Captain Ivo provides route literacy, practical risk framing, and player-facing CTA clarity. The companion provides embodied emotional contrast and occasional Concord-translated insight. Ivo should not replace the companion's emotional function; the companion should not replace Ivo's navigation and safety role.

---

# 9. Island 1 full revision — Luma Isle

## Identity

- **Civilization:** The Lumin, keepers of protected small lights and observatory craft.
- **Guardian:** Noctyra.
- **Biome/visual character:** celestial blue crystal, observatory domes, star mirrors, sheltered lantern nurseries.
- **Sensory motifs:** crystal chimes, distant owl-wing wind, cold blue light warming to gold.
- **Architecture/material language:** blue crystal ribs, moonstone lenses, brass star tracks, small lantern alcoves.
- **Technology:** The Concord (expedition): celestial crystal, moonstone lenses, blue/navy/antique-gold observatory geometry, star-track mechanisms, compact device body, retro diagnostic screen.
- **Arrival atmosphere:** beautiful but watchful; every light is shielded.
- **Restored atmosphere:** still careful, but curious; lights open toward the sky.

## Great Drift distortion

- **Healthy protective capacity:** protection.
- **Distorted dominant pattern:** hypervigilance.
- **Complementary capacity:** curiosity/trust/calm.
- **Communication effect:** warnings are translated as threats; creature gestures are mistaken for alarms.
- **Guardian loop:** Noctyra keeps repeating a real warning until every unknown light feels dangerous.
- **Forward clue:** the Drift signal can copy the shape of a warning.

## Companion role

- **Ideal capacity:** curiosity or calm.
- **Fallback capacities:** playfulness, patience, honesty.
- **Before Concord:** companion points, freezes, chirps, or sits near pulses without readable language.
- **Translated contribution:** “That sound is scared, not angry.”
- **Why no creature is mandatory:** any companion can show a non-panicked response; no-companion copy gives the observation to Miri/Ivo.

Variants:

1. Opening companion approaches a dim star shard and waits.
2. Steadying companion sits beside the warning pulse.
3. Brave Action companion names the difference between warning and danger.

## Building cohesion

| ID | Island name | Visual | Community purpose | Emotional purpose | Companion interaction | Revelation | Finale preparation |
|---|---|---|---|---|---|---|---|
| `hatchery` | Lantern Hatchery | crystal nests under star cloth | protects eggs/new lights | protection can be warm, not locked | companion warms one shielded nest | creatures respond to safe light | Noctyra sees protection without panic |
| `habit` | Rhythm Observatory | rotating brass star rings | schedules communal watch/rest | routine lowers fear | companion follows the calm orbit | alarms were firing without rhythm | creates reliable signal timing |
| `mystery` | Echo Lens Arcade | fractured blue lenses | tests signals through games/experiments | curiosity can investigate safely | companion taps false echo | some threats are amplified echoes | teaches signal comparison |
| `wisdom` | Sava's Star Archive | moonstone shelves, sky maps | preserves old warnings | memory needs context | companion reacts to old lullaby | Noctyra warned of a real Drift pulse | gives wording for finale |
| `boss` | Noctyra's Moon Gate | wing-shaped observatory aperture | focuses island warning beacon | fear can protect without ruling | companion holds steady at the gate | warning and threat separate | finale integration |

## Story sequence and compact copy

- **Arrival:** “Luma Isle is lit like a sky under glass. Every lantern is covered.” CTA: “Step softly.”
- **First communication failure:** Miri's greeting breaks into warning glyphs. Secondary: “The words are not missing. Meaning is.” CTA: “Find the signal.”
- **Hatchery open:** “The Lantern Hatchery protects first light.” CTA: “Warm the nests.”
- **Hatchery complete:** “A shield opens without going dark.” Toast: “Protection can breathe.”
- **Habit open:** “The observatory has lost its rhythm.” CTA: “Set the watch.”
- **Habit complete:** “The warning bells pause for the first time.” Toast: “A safe rhythm returns.”
- **Mystery open:** “The Echo Lens shows three signals where one should be.” CTA: “Test the echoes.”
- **Mystery complete:** “One signal is fear repeating itself.” Toast: “False echo isolated.”
- **Wisdom reveal:** Elder Sava: “Noctyra was not threatening us. She was trying to keep us awake.” CTA: “Restore The Concord.”
- **Majority-restored beat:** “The covered lights turn outward.”
- **Finale setup:** “The Moon Gate hears Noctyra clearly enough to answer.” CTA: “Approach the warning.”
- **Challenge start:** Noctyra: “STAY AWAY. STAY SAFE. STAY AWAY.”
- **Midpoint:** Companion variant shows calm/curiosity/courage. Primary: “The warning pulse changes when no one runs.”
- **Resolution:** “Noctyra lowers one wing. The warning remains, but it no longer owns the sky.”
- **Great Drift clue:** “The Concord prints a second waveform under Noctyra's voice.”
- **Travel-ready:** Ivo: “If the Drift can wear a warning, the next island may be hearing safety wrong too.” CTA: “Sail to Pebble Bay.”

---

# 10. Island 2 full revision — Pebble Bay

## Identity

- **Civilization:** The Tidefolk, tide-pool engineers and breath-rhythm keepers.
- **Guardian:** Maelis.
- **Biome/visual:** rounded stones, tide pools, lantern paths, breath-like bellows, soft mist.
- **Arrival:** suspended tension; everything waits for a tide that already passed.
- **Restored:** gentle movement; lantern paths pulse like breathing.
- **Technology:** The Tidebreather (local): polished tidal stones, shell valves, mist chambers, soft blue water lenses, slow bellows, tide wheels.

## Great Drift distortion

Healthy caution/stillness becomes suspended tension. Complementary capacity: release/play/hopeful movement. Communication becomes overqualified; every “go” carries a hidden “not yet.” Maelis froze the bay to keep everyone from a dangerous tide, then could no longer feel the tide change. Forward clue: Drift can desynchronize timing.

## Companion role

Ideal: playfulness or hope. Fallback: calm, curiosity, courage. Before Concord, companion skips stones or hesitates with the tide. Translated contribution: “Safe can move slowly.” No creature is mandatory because inhabitants can model release if the active companion does not.

Variants:

1. Opening companion skips a pebble only after watching the water.
2. Steadying companion breathes with the tide machine.
3. Brave Action companion takes one measured step onto wet stone.

## Building cohesion

| ID | Island name | Visual | Community purpose | Emotional purpose | Companion interaction | Revelation | Finale preparation |
|---|---|---|---|---|---|---|---|
| `hatchery` | Tidepool Nursery | pearl bowls in rounded stone | shelters eggs with tide flow | safety can include motion | companion nudges a water gate | trapped water stagnates | shows Maelis moving safety |
| `habit` | Breathwheel Mill | slow bellows and waterwheel | times work/rest breaths | release tension through rhythm | companion matches inhale/exhale | island held its breath | creates breathing cadence |
| `mystery` | Skipping-Stone Forum | flat stones, lantern arcs | tests routes with playful trials | play can prove safe movement | companion skips first stone | motion can be measured | provides movement evidence |
| `wisdom` | Stillwater Listening Steps | submerged steps | listens to tide memory | stillness should listen, not freeze | companion waits then moves | Maelis stopped at old danger | gives tide-change truth |
| `boss` | Maelis Tidelock Gate | shell lock over inlet | releases bay channels | caution plus release | companion follows water line | current is safe now | finale integration |

## Sequence/copy

Arrival: “Pebble Bay is holding its breath.” CTA “Listen to the tide.” First failure: “The Kin say ‘soon,’ but The Concord hears ‘never.’” Hatchery: “Let nursery water move without rushing.” Habit: “Restart the Breathwheel.” Mystery: “Test one playful step.” Wisdom: “The tide that frightened Maelis has passed.” Finale: Maelis says, “If I move, I lose them.” Resolution: “The first channel opens slowly. No one is swept away.” Great Drift clue: “The timing distortion lags behind real tide data.” Travel-ready: “The Drift can trap a moment.” CTA “Sail to Coconut Cove.”

---

# 11. Island 3 full revision — Coconut Cove

## Identity

Civilization: The Covefolk. Guardian: Tamba. Visual: abundant palms, fruit structures, hanging platforms, drums, communal shade. Arrival: lush but guarded; fruit is counted twice. Restored: shared shade, drums, visible abundance. Technology: The Sharing Canopy (local), a network of pulley baskets, seed counters, growth readers, fruit chutes, drum relays, and wooden balance arms.

## Great Drift distortion

Healthy stewardship becomes scarcity protection. Complementary capacity: generosity/gratitude/shared joy. Communication turns offers into suspected theft and requests into threats. Tamba hoards the harvest because the Drift makes every future season sound empty. Forward clue: Drift can invert abundance signals into shortage alarms.

## Companion role

Ideal: generosity or connection. Fallback: playfulness, hope, tenderness. Translated line: “Sharing made the tree louder, not quieter.” No creature mandatory; community feast copy covers fallback.

Variants: relational companion offers fruit back; opening companion turns sharing into play; steadying companion stays with the smallest seedling.

## Building cohesion

| ID | Name | Visual | Practical | Emotional | Companion | Revelation | Finale prep |
|---|---|---|---|---|---|---|---|
| `hatchery` | Canopy Seed Cradle | woven coconut husks | starts seedlings/eggs | care multiplies | companion guards shared seed | seeds sprout when uncrowded | abundance evidence |
| `habit` | Drumshade Commons | drum platforms under palms | coordinates harvest | rhythm turns mine into ours | companion keeps beat | hoarding broke timing | shared cadence |
| `mystery` | Fruitfall Exchange | pulley baskets | fair distribution games | trust through visible exchange | companion swaps tokens | shortage count was false | transparent ledger |
| `wisdom` | Root Memory Grove | elder roots and shell records | remembers seasons | gratitude sees cycles | companion hears root hum | past scarcity was survived together | seasonal context |
| `boss` | Tamba's Crown Palm | giant fruit vault palm | releases stored harvest | protection plus generosity | companion opens first basket | sharing sustains grove | finale integration |

## Sequence/copy

Arrival: “Coconut Cove is overflowing, yet every basket is locked.” First failure: “Welcome sounds like warning; gift sounds like loss.” Hatchery: “Plant without counting who owns the shade.” Habit: “Bring the harvest drums back together.” Mystery: “Make exchange visible.” Wisdom: “The Cove survived scarcity by sharing maps, not hiding fruit.” Finale: Tamba: “If I give, tomorrow is empty.” Resolution: “The vault opens. The canopy answers with new blossoms.” Clue: “The Drift translated abundance as alarm.” CTA: “Sail to Driftwood Isle.”

---

# 12. Island 4 full revision — Driftwood Isle

## Identity

Civilization: The Driftfolk. Guardian: Garran. Visual: salvaged timber, visible joins, patched sails, reused structures, warm lantern tar. Arrival: careful grief; nothing new is built high. Restored: repairs are visible and honored. Technology: The Mender Engine (local by default; future expedition candidate only with explicit approval), built from salvaged timber, brass clamps, stitched sails, resin lamps, repair seams, and rope tension mechanisms.

## Great Drift distortion

Healthy remembrance becomes grief-frozen resignation. Complementary capacity: courage/hope/adaptive creativity. Communication turns “rebuild” into “forget.” Garran protects memory by stopping change. Forward clue: Drift can detach memory from future possibility.

## Companion role

Ideal: hope or courage. Fallback: tenderness, determination, honesty. Translated line: “New wood can carry old names.” No specific creature mandatory; Menders can demonstrate repair.

Variants: brave companion steps on patched bridge; steadying companion rests by old name plank; opening companion finds a new use for broken sail.

## Building cohesion

| ID | Name | Visual | Practical | Emotional | Companion | Revelation | Finale prep |
|---|---|---|---|---|---|---|---|
| `hatchery` | Keel-Nest Hatchery | cradle in boat ribs | shelters eggs in salvaged hull | new life honors old vessels | companion curls in old keel | loss can hold beginnings | evidence for Garran |
| `habit` | Mending Bench | joined planks/tools | communal repairs | repair creates new form | companion holds a peg | visible joins are strength | repair proof |
| `mystery` | Sail-Patch Market | patched sails/banners | trades useful remnants | creativity from fragments | companion tugs patch into flag | fragments are not only ruins | adaptive symbol |
| `wisdom` | Names-in-Wood Hall | carved boards | preserves names/stories | remembrance with movement | companion listens quietly | rebuilding is not betrayal | language for finale |
| `boss` | Garran's Breakwater | driftwood wall | protects harbor | grief plus hope | companion stands in opened gap | harbor can protect and open | finale integration |

## Sequence/copy

Arrival: “Driftwood Isle has repaired everything except tomorrow.” Failure: “When Ivo says build, the Menders hear forget.” Hatchery: “Set a new nest in an old keel.” Habit: “Repair in public.” Mystery: “Turn remnants into use.” Wisdom: “Names survive when carried forward.” Finale: Garran: “If the wall opens, the lost are gone.” Resolution: “The wall becomes a gate. The names remain.” Clue: “The Concord records memory with no future tense.” CTA: “Sail to Crown of Tides.”

---

# 13. Island 5 full revision — Crown of Tides

## Identity

Civilization: The Reefborn. Guardian: Thalassa. Visual: luminous reef architecture, ceremonial crowns, layered aquatic music, shell amphitheaters. Arrival: beautiful harmony with no solo voices. Restored: harmony with distinct voices. Technology: The Voice Prism (local with possible story relevance), built from luminous coral, pearl amplifiers, shell resonators, current forks, layered aquatic light, and ceremonial crown geometry.

## Great Drift distortion

Healthy belonging/harmony becomes loss of authentic voice. Complementary capacity: self_trust/authentic expression. Communication compresses differences into one acceptable tone. Thalassa protects unity by absorbing individual voices into the crown-song. Forward clue: the Drift carries a borrowed voice.

## Companion role

Ideal: self_trust or honesty. Fallback: connection, courage, playfulness. Translated line: “Harmony changed when one true note stayed.” No creature mandatory; player/Ivo/inhabitant can hold the solo if needed.

Variants: relational companion answers with its own call; brave companion keeps one note steady; opening companion makes a playful counter-rhythm.

## Building cohesion

| ID | Name | Visual | Practical | Emotional | Companion | Revelation | Finale prep |
|---|---|---|---|---|---|---|---|
| `hatchery` | Pearl Voice Nursery | reef cradles with shell mics | nurtures young voices | belonging begins with being heard | companion echoes unique chirp | identical lullabies stress eggs | validates difference |
| `habit` | Tide Choir Steps | coral risers | practices call/response | rhythm includes solo/rest | companion keeps own beat | chorus needs pauses | solo structure |
| `mystery` | Crown Current Arcade | current puzzles/crowns | tests currents and signals | play with difference | companion disrupts false unison | borrowed voice detected | signal split |
| `wisdom` | Thalassa Archive | shell phonograph reef | preserves old songs | truth honors many voices | companion reacts to false voice | crown-song contains outsider tone | proof for finale |
| `boss` | Crown Amphitheater | luminous reef crown | gathers island voice | harmony plus self-trust | companion anchors unique note | unity without sameness | finale integration |

## Sequence/copy

Arrival: “Crown of Tides sings beautifully. No one sings alone.” Failure: “The Concord translates every greeting into the same sentence.” Hatchery: “Let each pearl hear its own echo.” Habit: “Practice call and answer.” Mystery: “Separate current from chorus.” Wisdom: “Thalassa's voice contains a note she never sang.” Finale: Thalassa: “One voice. Safe voice. Stay together.” Resolution: “The chorus returns with solos intact.” Clue: “The borrowed voice points beyond Island 5.” Travel-ready: “The next signal is not an island asking for help. It is something using help as a mask.” CTA: “Prepare for Arc 2.”

---

## 14. Companion variation model

Use: canonical island beat + active companion emotional profile -> one display-only reaction variant.

Rules:

- 4 presentation families plus fallback/no-companion.
- deterministic selection;
- no narrative mutation;
- no gameplay reward difference;
- no stop completion authority;
- no creature requirement;
- mobile-first one-line copy.

Example for Luma finale:

- Canonical truth: “Noctyra needs uncertainty without panic.”
- Opening: “{Creature} noses toward the unknown light, curious but slow.”
- Steadying: “{Creature} sits beside the pulse until it softens.”
- Brave Action: “{Creature} steps forward, then stops before rushing.”
- Relational Voice: “{Creature} answers the warning with a small friendly sound.”
- None: “Miri holds up one uncovered lantern and waits.”

## 15. Technology progression model

The Concord remains the Arc 1 expedition interpretive tool. Later technologies should normally be local, story-specific inventions: The Tidebreather enables safe movement on Pebble Bay, The Sharing Canopy makes abundance circulation visible on Coconut Cove, The Mender Engine permits repair without erasure on Driftwood Isle, and The Voice Prism separates true voices from forced unison on Crown of Tides. Technology helps reveal, test, communicate, regulate, distribute, repair, or separate signals; it does not magically cure emotion. The community, companion, buildings, and guardian still perform emotional restoration. Technologies should be presentation/content affordances unless explicitly scoped in a gameplay PR.

## 16. AI/personal-data boundary

The authored island story must work with no AI and no personal-data reads. Optional future companion AI may connect themes to habits/goals/reflections only after a separate privacy review, explicit user-facing boundary, and opt-in design.

## 17. Implementation mapping

Existing target files are proposed targets only; this task does not edit them.

Trigger/surface audit status for this proposal: standard narrative triggers such as `island_entered`, `stop_opened`, `stop_completed`, `boss_midpoint`, `boss_resolved`, and `island_clear_travel_ready` are currently supported by the narrative vocabulary; `tech_grid_completed` is proposed and requires a new bridge or trigger; full 3x3 completion is observable in tech-collection logic outside the narrative registry; `retro_conversation` is an inhabitant/conversation flow surface that needs a bridge before StoryReader can hand off to it; Concord completion must not grant gameplay unlocks from narrative content.

| Island | Beat ID | Trigger | Surface | Speaker | Primary copy | Secondary copy | Companion family | Art required | Existing file target | Risk |
|---:|---|---|---|---|---|---|---|---|---|---|
| 1 | i1.arrival.v2 | island_entered | StoryReader | Ivo | Luma Isle is lit like a sky under glass. | Every lantern is covered. | none | yes | `public/islands/001/story/arrival/manifest.json` | low |
| 1 | i1.communication_failure | story_after_arrival | dialogue_sheet | Miri | The words are not missing. | Meaning is. | none | no | `island001Narrative.ts` | medium |
| 1 | i1.hatchery.open | stop_opened:hatchery | dialogue_sheet | Miri | The Lantern Hatchery protects first light. | Warm the nests without locking them away. | fallback | no | `island001Narrative.ts` | low |
| 1 | i1.hatchery.complete | stop_completed:hatchery | toast | System | Protection can breathe. | A shield opens without going dark. | steadying | no | `island001Narrative.ts` | low |
| 1 | i1.habit.open | stop_opened:habit | dialogue_sheet | Ivo | The observatory has lost its rhythm. | A watch that never rests becomes an alarm. | steadying | no | `island001Narrative.ts` | low |
| 1 | i1.habit.complete | stop_completed:habit | toast | System | A safe rhythm returns. | The warning bells pause. | steadying | no | `island001Narrative.ts` | low |
| 1 | i1.mystery.open | stop_opened:mystery | dialogue_sheet | Poko | The Echo Lens shows three signals. | Only one is real. | opening | no | `island001Narrative.ts` | low |
| 1 | i1.mystery.complete | stop_completed:mystery | toast | System | False echo isolated. | Fear was repeating itself. | opening | no | `island001Narrative.ts` | low |
| 1 | i1.wisdom.reveal | stop_opened:wisdom | retro_conversation | Elder Sava | Noctyra was trying to keep us awake. | The warning lost its context. | brave_action | yes | future conversation definitions | medium |
| 1 | i1.concord_restored | tech_grid_completed | StoryReader | Concord | CONCORD SIGNAL RESTORED. | Creature emotional channel unlocked. | all | yes | tech collection narrative layer | medium |
| 1 | i1.boss.start | stop_opened:boss | dialogue_sheet | Noctyra | STAY AWAY. STAY SAFE. | STAY AWAY. | steadying | yes | `island001Narrative.ts` | medium |
| 1 | i1.boss.midpoint | boss_midpoint | dialogue_sheet | Companion | That sound is scared, not angry. | The warning changes when no one runs. | all | no | `island001Narrative.ts` | medium |
| 1 | i1.resolution | boss_resolved | StoryReader | Ivo | The warning remains, but no longer owns the sky. | A second waveform hides beneath it. | fallback | yes | `public/islands/001/story/resolution/manifest.json` | low |
| 2 | i2.arrival.v2 | island_entered | StoryReader | Ivo | Pebble Bay is holding its breath. | The tide has moved on. | none | yes | future island002 narrative | low |
| 2 | i2.hatchery.open | stop_opened:hatchery | dialogue_sheet | The Tidefolk | Let nursery water move without rushing. | Safety can flow. | steadying | no | future island002 narrative | low |
| 2 | i2.habit.complete | stop_completed:habit | toast | System | The Breathwheel turns. | Inhale. Exhale. Begin. | steadying | no | future island002 narrative | low |
| 2 | i2.mystery.complete | stop_completed:mystery | toast | System | One playful step held. | The path did not break. | opening | no | future island002 narrative | low |
| 2 | i2.wisdom.reveal | stop_opened:wisdom | retro_conversation | Elder | The dangerous tide has passed. | Maelis never heard the change. | brave_action | yes | future conversation definitions | medium |
| 2 | i2.boss.resolution | boss_resolved | StoryReader | Maelis | The first channel opens slowly. | No one is swept away. | all | yes | future island002 story | low |
| 3 | i3.arrival.v2 | island_entered | StoryReader | Ivo | Coconut Cove is overflowing. | Every basket is locked. | none | yes | future island003 narrative | low |
| 3 | i3.hatchery.complete | stop_completed:hatchery | toast | System | Care multiplies. | The shared seed sprouts. | relational_voice | no | future island003 narrative | low |
| 3 | i3.habit.complete | stop_completed:habit | toast | System | The harvest drums align. | Mine becomes ours. | relational_voice | no | future island003 narrative | low |
| 3 | i3.wisdom.reveal | stop_opened:wisdom | retro_conversation | Root Elder | The Cove survived scarcity together. | Hiding fruit made the warning louder. | relational_voice | yes | future conversation definitions | medium |
| 3 | i3.boss.resolution | boss_resolved | StoryReader | Tamba | The vault opens. | The canopy answers with blossoms. | all | yes | future island003 story | low |
| 4 | i4.arrival.v2 | island_entered | StoryReader | Ivo | Driftwood Isle repaired everything except tomorrow. | The joins are visible everywhere. | none | yes | future island004 narrative | low |
| 4 | i4.hatchery.complete | stop_completed:hatchery | toast | System | New life rests in an old keel. | Nothing was erased. | steadying | no | future island004 narrative | low |
| 4 | i4.mystery.complete | stop_completed:mystery | toast | System | A torn sail becomes a flag. | Fragments can move again. | opening | no | future island004 narrative | low |
| 4 | i4.wisdom.reveal | stop_opened:wisdom | retro_conversation | Name Keeper | Rebuilding is not betrayal. | Names survive when carried forward. | brave_action | yes | future conversation definitions | medium |
| 4 | i4.boss.resolution | boss_resolved | StoryReader | Garran | The wall becomes a gate. | The names remain. | all | yes | future island004 story | low |
| 5 | i5.arrival.v2 | island_entered | StoryReader | Ivo | Crown of Tides sings beautifully. | No one sings alone. | none | yes | future island005 narrative | low |
| 5 | i5.hatchery.complete | stop_completed:hatchery | toast | System | Each pearl hears its own echo. | The nursery calms. | relational_voice | no | future island005 narrative | low |
| 5 | i5.mystery.complete | stop_completed:mystery | toast | System | False unison split. | One note is borrowed. | honesty | no | future island005 narrative | low |
| 5 | i5.wisdom.reveal | stop_opened:wisdom | retro_conversation | Archive Keeper | Thalassa contains a note she never sang. | The Drift is borrowing voices. | brave_action | yes | future conversation definitions | medium |
| 5 | i5.boss.resolution | boss_resolved | StoryReader | Thalassa | The chorus returns with solos intact. | Beyond the reef, another voice answers. | all | yes | future island005 story | low |
| 5 | i5.arc2_hook | island_clear_travel_ready | dialogue_sheet | Concord | SOURCE NOT ISLAND-LOCAL. | The next signal is wearing a borrowed voice. | none | no | future narrative registry | medium |

## 18. Art and asset implications

- Luma needs Concord grid, Moon Gate, covered/open lantern states, Noctyra warning/restored poses.
- Pebble Bay needs breathwheel, tidepool nursery, rounded stone paths, Maelis locked/released inlet poses.
- Coconut Cove needs canopy platforms, fruit vault, exchange baskets, Tamba hoard/share poses.
- Driftwood needs visible repair joins, name boards, patched sail flags, Garran wall/gate poses.
- Crown needs reef choir architecture, shell audio devices, crown current puzzles, Thalassa chorus/solo poses.

## 19. Migration from current narrative

Do not overwrite current Island 1 live definitions. Add V2 definitions behind content review in later PRs, then migrate beat-by-beat. Preserve current trigger vocabulary where possible: `island_entered`, `stop_opened`, `stop_completed`, `boss_midpoint`, `boss_resolved`, and `island_clear_travel_ready`. `tech_grid_completed` is a proposed bridge/new trigger, not current registered vocabulary. `retro_conversation` is a separate inhabitant/conversation surface rather than a registered StoryReader surface.

## 20. Proposed implementation PR stack

1. **PR 1 — Story Bible V2 and emotion taxonomy:** documentation/content model only.
2. **PR 2 — Creature emotional-profile metadata:** catalogue/type tests only if approved; no migration.
3. **PR 3 — Pure companion narrative resolver:** display-only resolver and tests.
4. **PR 4 — Island 1 Concord-integrated narrative rewrite:** content plus existing trigger wiring only.
5. **PR 5 — Islands 2-3 narrative rewrite:** content-focused.
6. **PR 6 — Islands 4-5 narrative rewrite:** content-focused.
7. **PR 7 — Optional companion AI context bridge:** separate privacy/data-boundary investigation.

## 21. Open questions

1. Should capacities live directly on `CreatureDefinition` or in a separate `creatureEmotionalProfiles.ts` config?
2. Should `trust` be its own capacity, or should Luma use calm + curiosity + connection?
3. Does The Concord have a visible device owner after Island 1, or is it shipboard equipment?
4. Should lore-only subassemblies Echo Crystal, Meaning Lens, and Concord Core appear as visual labels after the nine-fragment Concord is complete?
5. How much retro UI should appear in StoryReader versus conversation surfaces?
6. Which Island 2-5 characters become named recurring inhabitants?

## 22. Final verdict

**PASS WITH CONDITIONS.** This proposal is coherent with current creature architecture if emotional capacity remains static content metadata and companion variants remain display-only. It requires no schema migration and no gameplay authority changes.
