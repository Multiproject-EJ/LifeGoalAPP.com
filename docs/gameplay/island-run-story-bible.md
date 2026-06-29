# Island Run Story Bible — Current App Narrative and Rewrite Handoff

Status: current implementation snapshot for islands 1–5.
Audience: story collaborators, ChatGPT rewrite sessions, and implementation handoff.
Purpose: explain the existing Island Run story, what is live in the app, what is authored but deferred, and what constraints a rewrite must respect so updates can be implemented safely.

---

## 1. One-paragraph summary

Island Run is a gentle restoration adventure wrapped around the app's habit/game loop. The player arrives at damaged islands after a mysterious event called the **Great Drift**. Each island has five sequential landmarks: Hatchery, Habit, Mystery, Wisdom, and Boss/Guardian. The player rolls dice on the board, earns Essence, restores landmarks, receives short story reactions, then reaches the island guardian. The guardian is not framed as evil or killed; the finale is about calming, freeing, or restoring a being trapped in a fear-loop. The current first arc covers islands 1–5: **Luma Isle**, **Pebble Bay**, **Coconut Cove**, **Driftwood Isle**, and **Crown of Tides**.

---

## 2. Core narrative principles

### 2.1 Story observes gameplay; it does not drive gameplay

Narrative content is display-only. It can react to canonical game state, but it must not award rewards, complete stops, mutate builds, unlock travel, move tokens, change boss state, or write gameplay state.

Safe rewrite rule: change words, speakers, beat order intent, and future episode concepts; do not invent story actions that require narrative UI to become gameplay authority.

### 2.2 The guardian is reached, not destroyed

The UI/gameplay may still use terms like challenge, boss, defeat, or complete. The story copy should frame the moment as:

- freeing a guardian from a corrupted signal,
- calming a defensive loop,
- restoring a relationship,
- asking rather than attacking,
- breaking corruption around the guardian rather than hurting the guardian.

### 2.3 The player repairs community rhythm

Each island maps the app's self-development loop into a local restoration metaphor:

- Hatchery: care, bonding, creature life returning.
- Habit: one small repeated action.
- Mystery: community gathering, play, curiosity, restoration practice.
- Wisdom: reflection, naming the fear-pattern, revealing the Great Drift clue.
- Boss/Guardian: integrated test of the restored island rhythm.

### 2.4 Tone

The current tone is soft, hopeful, concise, and emotionally safe. Lines are short enough for mobile dialogue sheets and toasts. Rewrite suggestions should avoid punitive, violent, shame-heavy, or overly lore-dense phrasing.

---

## 3. How the story interacts with the app and game loop

### 3.1 Mechanical spine

The app's Island Run gameplay loop is:

1. Enter an island.
2. Complete the currently active stop/landmark objective.
3. Spend dice to move on the board.
4. Earn Essence and other rewards through board play.
5. Spend Essence to build the current island's landmarks.
6. Complete all five landmarks in order.
7. Challenge/resolve the guardian.
8. Clear the island and travel to the next island.

Narrative wraps this loop. It does not replace it.

### 3.2 Narrative surfaces

Current story surfaces are:

| Surface | What it is | Best use |
|---|---|---|
| `story_reader` | Full-screen/panel episode via `IslandStoryReader` manifests. | Arrival/resolution scenes with art, panel captions, or larger cinematic beats. |
| `dialogue_sheet` | Short speaker dialogue sheet. | Important guide/elder lines, finale setup, Wisdom reveals, calls to action. |
| `toast` | Lightweight ambient line. | Completion reactions, landmark restoration flavor, boss midpoint whispers. |

### 3.3 Current trigger vocabulary

Narrative beats can listen for these trigger types:

| Trigger | Meaning |
|---|---|
| `island_entered` | Player enters an island. |
| `arrival_closed` | Player closes the arrival episode. |
| `stop_opened` | A landmark becomes the active/current objective. |
| `stop_completed` | A landmark objective is completed. |
| `landmark_level_completed` | A landmark reaches build level 1, 2, or 3. |
| `landmarks_restored_majority` | A threshold number of landmarks have reached level 3; current content uses threshold 3. |
| `boss_eligible` | All builds are done and the guardian first becomes challengeable; this is the finale-setup beat. |
| `boss_challenge_started` | The player starts the guardian challenge/fight; distinct from `boss_eligible`. |
| `boss_midpoint` | The active guardian challenge reaches its midpoint. |
| `boss_resolved` | The guardian is resolved/defeated/cleared. |
| `island_clear_travel_ready` | The island is clear and the travel CTA is available. |

### 3.4 Current app wiring status

- Islands 1–5 have registered TypeScript narrative definitions.
- Island 1 has illustrated arrival and resolution manifests.
- Islands 2–5 currently have reaction/dialogue/toast beats only.
- Islands 2–5 now include the missing finale-setup beat at `boss_eligible`, separate from boss fight start.
- Island 1's original `boss_eligible` beat remains legacy-owned so it does not double-fire in the generalized reaction layer.
- The remaining known story gaps for islands 2–5 are illustrated arrival episodes, illustrated resolution episodes, and travel-ready lines.

---

## 4. The Great Drift arc

### 4.1 Current arc shape

The Great Drift is the region-wide disruption that made routes fail, landmarks go quiet, communities withdraw, and guardians become trapped in defensive or fear-based loops. The player and Compass Expedition follow clues island by island.

### 4.2 Clue progression across islands 1–5

| Island | Clue / escalation | Guardian fear-loop | Self-development seam |
|---|---|---|---|
| 1 — Luma Isle | A corrupted warning signal and a symbol no Lumin craftsperson recognizes. | Noctyra protects small lights by staying stuck on warning. | Slow down, restore one gentle place, ask instead of attack. |
| 2 — Pebble Bay | The same shaped interruption appears in the tides. | Maelis holds her breath and stops the tide out of fear. | Consistency: gentle repeated motion. |
| 3 — Coconut Cove | The interruption was planted as silence in the grove. | Tamba hoards the grove's abundance against a famine that never came. | Generosity/gratitude: abundance is shared. |
| 4 — Driftwood Isle | A clue was broken by a hand, not the sea. | Garran freezes mid-build, mourning what was lost. | Resilience: what breaks can be rebuilt. |
| 5 — Crown of Tides | The Crown is relaying a borrowed song from somewhere far. | Thalassa broadcasts a voice that is not hers. | Integration: restored rhythms become one song. |

### 4.3 Arc-1 thesis

Small restored rhythms — one cradle, one habit, one gathering, one truth, one guardian — join into a route-opening song. The first five islands teach that restoration is not force. It is repeated care, shared resources, rebuilding after loss, and freeing one's own voice from borrowed fear.

---

## 5. Cast overview

### 5.1 Recurring expedition voice

- **Captain Ivo** — Compass Expedition voice. Used as an external adventure/route framing voice. Present in island definitions but not always the primary speaker in current beats.

### 5.2 Island 1 — Luma Isle / The Lumin

- **Miri** — local routekeeper and first-contact guide.
- **Elder Sava** — memory keeper and former dragon-route engineer.
- **Poko** — Hatchery tinkerer and warm supporting citizen.
- **Noctyra** — Black Crystal Dragon and guardian of Luma Isle.

### 5.3 Island 2 — Pebble Bay / The Tidefolk

- **Sela** — young tide-reader and first-contact guide.
- **Keeper Bryn** — lantern-and-tide keeper; the bay's wisdom figure.
- **Tobin** — net-mender and warm supporting citizen.
- **Maelis the Tideward** — ancient tide-guardian holding her breath.

### 5.4 Island 3 — Coconut Cove / The Covefolk

- **Pip** — young coconut-climber and first-contact guide.
- **Grandmother Liko** — grove elder and storykeeper.
- **Nuru** — fruit-stall keeper and warm supporting citizen.
- **Tamba the Grovekeeper** — giant canopy guardian curled in fear.

### 5.5 Island 4 — Driftwood Isle / The Driftfolk

- **Wren** — young builder-scavenger and first-contact guide.
- **Old Fenn** — master mender and the isle's wisdom figure.
- **Bodie** — salvager and warm supporting citizen.
- **Garran the Driftwarden** — great shore-guardian frozen mid-build.

### 5.6 Island 5 — Crown of Tides / The Reefborn

- **Reev** — young reef-runner and first-contact guide.
- **Elder Cael** — Tidesinger; keeper of the Crown's song.
- **Sprat** — reef-diver and warm supporting citizen.
- **Thalassa the Tide Sovereign** — great crowned guardian caught relaying a borrowed song.

---

## 6. Current complete story by island

## 6.1 Island 1 — Luma Isle

**Civilization:** The Lumin
**Theme:** gentle restoration, slowing the signal, asking rather than attacking.
**Guardian:** Noctyra, Black Crystal Dragon.
**Implementation status:** Island 1 has live StoryReader arrival/resolution plus selected live dialogue beats. Additional reaction beats are authored in the definition; many are handled by the generalized reaction layer, while original legacy-owned beats remain excluded from that layer to avoid double firing.

### Island 1 story sequence

1. **Arrival StoryReader:** Luma Isle should be shining; landmarks stand quiet; Noctyra waits at the Island Heart; the first instruction is to start small and wake one gentle place.
2. **Arrival closed:** Miri tells the player, "Start small. Help us wake one gentle place."
3. **Hatchery opens:** Poko says the Hatchery is quiet, not gone, and asks the player to wake one cradle.
4. **Hatchery completion/build reactions:** The island starts noticing; cradle lights answer; something small listens; the Hatchery becomes a welcome again.
5. **Habit / Routekeeper Steps:** Miri frames the objective as relighting the Routekeeper Steps through one steady action. The route chime eventually rings clearly.
6. **Mystery / Gathering Grounds:** Poko frames the grounds as a restoration practice. The community adds lanterns, benches, banners, and a festival bell.
7. **Wisdom / Listening Terrace:** Sava asks what protection has become. The truth emerges: Noctyra is not calling for battle; she is stuck on warning. The map is no longer hidden.
8. **Majority restored:** People come outside again.
9. **Finale setup (`boss_eligible`):** Sava says the five lights are speaking again and the player should ask, not attack. The player should aim for the crystal around Noctyra, not the heart inside it.
10. **Boss fight start:** Miri says to break the corrupted crystal, not the dragon.
11. **Boss midpoint:** Noctyra's line reveals the fear-loop: "Too much noise. Protect the small lights."
12. **Resolution StoryReader:** The warning breaks; Luma Isle answers again; Sava finds an unknown symbol inside the corrupted crystal; one route opens and another answers.
13. **Travel-ready:** Miri says, "The route is open because we opened it together." CTA text: "Follow the restored route."

### Island 1 implemented StoryReader panels

**Arrival:**

- Luma Isle should be shining by now.
- The landmarks are standing but quiet.
- At the Island Heart, Noctyra waits.
- Start small. Help us wake one gentle place.

**Resolution:**

- The warning breaks.
- Luma Isle begins to answer again.
- Inside the corrupted crystal, Sava finds a symbol no Lumin craftsperson recognizes.
- One route opens. Another answers.

---

## 6.2 Island 2 — Pebble Bay

**Civilization:** The Tidefolk
**Theme:** consistency, breath, gentle repeated motion.
**Guardian:** Maelis the Tideward.
**Implementation status:** reaction/dialogue/toast beats live through the generalized reaction layer. Arrival, resolution, and travel-ready episode/line are deferred.

### Current beat sequence

| Moment | Speaker | Current line |
|---|---|---|
| Hatchery opens — Tide-Cradle | Tobin | The Tide-Cradle has gone quiet — help me warm one pool again. |
| Hatchery completes | Sela | One pool stirs. The cradle remembers the water. |
| Hatchery L1 | Tobin | A little warmth comes back to the stones. |
| Hatchery L2 | Island/Pebble Bay | Something in the shallows is listening. |
| Hatchery L3 | Sela | The Tide-Cradle could welcome a bond again. |
| Habit opens — Turning Stones | Sela | Turn one stone with me. Small, but the bay needs the motion. |
| Habit completes | Sela | One steady turn is enough for today. |
| Habit L1 | Tobin | Folk are drifting back to the Turning Stones. |
| Habit L2 | Sela | They are keeping the rhythm together again. |
| Habit L3 | Sela | The shore turns like it used to. |
| Mystery opens — Tide Pools | Tobin | The Tide Pools are calm enough to read. Come listen to the water. |
| Mystery completes | Tobin | A pool clears. We added one lantern to the pools. |
| Mystery L1 | Tobin | The pools are gathering folk again. |
| Mystery L2 | Sela | These pools were never just for fishing. |
| Mystery L3 | Tobin | A tide-bell rings over the pools. |
| Wisdom opens — Lantern Walk | Bryn | The Lantern Walk asks what your stillness is protecting. |
| Wisdom completes | Bryn | Maelis is not attacking. She is holding her breath. / Help her let it go, gently. |
| Wisdom L1 | Bryn | One more lantern lit along the walk. |
| Wisdom L2 | Bryn | This stopped tide was shaped by someone. |
| Wisdom L3 | Sela | We stop hiding what the water told us. |
| Majority restored | Tobin | Folk are back on the shore, turning stones. |
| Finale setup (`boss_eligible`) | Bryn | The bay is breathing again. The basin will hear us now. / Help her let go — do not force the tide. |
| Boss fight start | Sela | Free her breath — do not fight the tide. |
| Boss midpoint | Maelis | ...the wave... it never came... |

---

## 6.3 Island 3 — Coconut Cove

**Civilization:** The Covefolk
**Theme:** generosity, gratitude, shared abundance.
**Guardian:** Tamba the Grovekeeper.
**Implementation status:** reaction/dialogue/toast beats live through the generalized reaction layer. Arrival, resolution, and travel-ready episode/line are deferred.

| Moment | Speaker | Current line |
|---|---|---|
| Hatchery opens — Sprout Nursery | Nuru | The Sprout Nursery has gone still — help me wake one seedling. |
| Hatchery completes | Pip | A sprout uncurls. The nursery remembers. |
| Hatchery L1 | Nuru | Green creeps back into the nursery. |
| Hatchery L2 | Island/Coconut Cove | Something small rustles in the leaves. |
| Hatchery L3 | Pip | The nursery could cradle a new bond again. |
| Habit opens | Pip | Climb one tree with me. The grove needs tending, daily. |
| Habit completes | Pip | One tree tended is enough for today. |
| Habit L1 | Nuru | Folk are climbing the groves again. |
| Habit L2 | Pip | We are tending the rows together again. |
| Habit L3 | Pip | The canopy gives like it used to. |
| Mystery opens — Shade Circle | Nuru | The Shade Circle is cool and calm. Come sit and breathe. |
| Mystery completes | Nuru | A breeze returns. We hung one lantern in the shade. |
| Mystery L1 | Nuru | The shade is gathering folk again. |
| Mystery L2 | Pip | This circle was never just for resting. |
| Mystery L3 | Nuru | A husk-drum sounds under the palms. |
| Wisdom opens — Story Stump | Liko | The Story Stump asks what your grasping is guarding. |
| Wisdom completes | Liko | Tamba is not hoarding. He fears the grove will run dry. / Show him it still gives. |
| Wisdom L1 | Liko | Dust leaves the old story-carvings. |
| Wisdom L2 | Liko | This silence was planted here on purpose. |
| Wisdom L3 | Pip | We share what the grove tells us again. |
| Majority restored | Nuru | Folk are back in the groves, sharing the haul. |
| Finale setup (`boss_eligible`) | Liko | The grove is full again. The canopy will listen now. / Show him it gives — do not take. |
| Boss fight start | Pip | Show him the grove still gives — do not take. |
| Boss midpoint | Tamba | ...so little left... I held it all... |

---

## 6.4 Island 4 — Driftwood Isle

**Civilization:** The Driftfolk
**Theme:** resilience, rebuilding, repairing after loss.
**Guardian:** Garran the Driftwarden.
**Implementation status:** reaction/dialogue/toast beats live through the generalized reaction layer. Arrival, resolution, and travel-ready episode/line are deferred.

| Moment | Speaker | Current line |
|---|---|---|
| Hatchery opens — Nesting Hollow | Bodie | The Nesting Hollow has gone cold — help me line one nest again. |
| Hatchery completes | Wren | A nest holds. The hollow remembers warmth. |
| Hatchery L1 | Bodie | Driftwood settles back into the hollow. |
| Hatchery L2 | Island/Driftwood Isle | Something stirs among the reeds. |
| Hatchery L3 | Wren | The Nesting Hollow could hold a bond again. |
| Habit opens | Wren | Mend one piece with me. Small repairs, every day. |
| Habit completes | Wren | One mend is enough for today. |
| Habit L1 | Bodie | Folk are back at the Mending Bench. |
| Habit L2 | Wren | We are rebuilding side by side again. |
| Habit L3 | Wren | The isle holds together like it used to. |
| Mystery opens — Tide Table | Bodie | The Tide Table is dry now. Come gather on the flats. |
| Mystery completes | Bodie | The flats fill. We set one lantern on the table. |
| Mystery L1 | Bodie | The flats are gathering folk again. |
| Mystery L2 | Wren | This table was never just for sorting salvage. |
| Mystery L3 | Bodie | A driftwood chime rings on the flats. |
| Wisdom opens — Wreck Archive | Fenn | The Wreck Archive asks what your stillness is mourning. |
| Wisdom completes | Fenn | Garran is not frozen. He mourns what the sea took. / Help him build again. |
| Wisdom L1 | Fenn | Sand falls from the old wreck-charts. |
| Wisdom L2 | Fenn | This was broken by a hand, not the sea. |
| Wisdom L3 | Wren | We stop hiding the charts we salvaged. |
| Majority restored | Bodie | Folk are back on the shore, building again. |
| Finale setup (`boss_eligible`) | Fenn | The isle stands rebuilt. The warden will see us now. / Build beside him — do not break through. |
| Boss fight start | Wren | Help him build again — do not break what is left. |
| Boss midpoint | Garran | ...all of it... washed away... why rebuild... |

---

## 6.5 Island 5 — Crown of Tides

**Civilization:** The Reefborn
**Theme:** integration, voice, restored rhythms becoming one song.
**Guardian:** Thalassa the Tide Sovereign.
**Implementation status:** reaction/dialogue/toast beats live through the generalized reaction layer. Arrival, resolution, and travel-ready episode/line are deferred.

| Moment | Speaker | Current line |
|---|---|---|
| Hatchery opens — Coral Cradle | Sprat | The Coral Cradle has gone dark — help me light one polyp again. |
| Hatchery completes | Reev | A polyp glows. The cradle remembers the song. |
| Hatchery L1 | Sprat | Color seeps back into the coral. |
| Hatchery L2 | Island/Crown of Tides | Something glimmers deep in the reef. |
| Hatchery L3 | Reev | The Coral Cradle could carry a bond again. |
| Habit opens | Reev | Keep one channel with me. The reef needs daily tending. |
| Habit completes | Reev | One channel kept is enough for today. |
| Habit L1 | Sprat | Folk are back tending the tide-channels. |
| Habit L2 | Reev | We are keeping the reef in time together. |
| Habit L3 | Reev | The channels run clear like they used to. |
| Mystery opens — Singing Shallows | Sprat | The Singing Shallows are calm. Come hear the water. |
| Mystery completes | Sprat | A note returns. We lit one lantern in the shallows. |
| Mystery L1 | Sprat | The shallows are gathering folk again. |
| Mystery L2 | Reev | These shallows were never just for diving. |
| Mystery L3 | Sprat | A reef-bell rings through the shallows. |
| Wisdom opens — Crown Archive | Cael | The Crown Archive asks whose song you are carrying. |
| Wisdom completes | Cael | Thalassa is not drowning us. She carries a borrowed song. / Help her find her own again. |
| Wisdom L1 | Cael | Salt clears from the old song-tablets. |
| Wisdom L2 | Cael | The interruption is being sung from somewhere far. |
| Wisdom L3 | Reev | We stop hiding what the Crown still hears. |
| Majority restored | Sprat | Folk are back on the reef, singing it awake. |
| Finale setup (`boss_eligible`) | Cael | The reef sings in time again. The Crown will answer now. / Free her voice — do not silence the song. |
| Boss fight start | Reev | Help her find her own song — do not silence the Crown. |
| Boss midpoint | Thalassa | ...not my voice... it sings through me... |

---

## 7. Existing sequence pattern for islands 2–5

Each of islands 2–5 currently follows this sequence:

1. Stop-open intros.
2. Stop completions.
3. Landmark level reactions.
4. Majority-restored beat when 3 landmarks reach level 3.
5. Finale setup when the boss first becomes challengeable (`boss_eligible`).
6. Boss fight start (`boss_challenge_started`).
7. Boss midpoint (`boss_midpoint`).

This is intentionally distinct from Island 1's wider sequence, because Island 1 also has arrival, resolution, and travel-ready surfaces.

---

## 8. Deferred story gaps and best next writing targets

### 8.1 Deferred for islands 2–5

The known honest remaining gap is:

- illustrated arrival episodes,
- illustrated resolution episodes,
- travel-ready dialogue lines.

These are deferred because they need either art/StoryReader panels or careful handling of island-clear celebration timing.

### 8.2 Clean next writing target: dialogue-style versions without art

If a rewrite wants to fill the deferred beats before art is ready, the safest content format is:

| Island | Needed arrival dialogue | Needed resolution dialogue | Needed travel-ready line |
|---|---|---|---|
| 2 | First view of Pebble Bay, stopped tide, Maelis implied in basin. | Maelis releases breath; shaped-tide clue appears. | Route opens by moving gently with the tide. |
| 3 | First view of quiet grove, ungiven abundance, Tamba curled in canopy. | Tamba lets the grove give again; planted-silence clue appears. | Route opens through shared abundance. |
| 4 | First view of broken shore, frozen building, Garran mid-build. | Garran rebuilds; hand-broken driftwood clue appears. | Route opens because the isle chose to rebuild. |
| 5 | First view of Crown/reef, borrowed song motif, Thalassa in signal. | Thalassa finds her voice; far-source clue escalates arc. | Route opens as first-arc song completes. |

### 8.3 Suggested deliverable format for a story rewrite

For implementation, provide updates in this structure:

```md
## Island N — Island Name

### Characters
- id/display name/role updates, if any

### Beat updates
| Beat id or moment | Speaker | Surface | New text | New secondary text |
|---|---|---|---|---|

### New deferred beats
| Trigger | Speaker | Surface | Text | Secondary text / CTA |
|---|---|---|---|---|

### Notes
- Any lore continuity changes.
- Any art/panel needs.
- Any implementation risk.
```

---

## 9. Rewrite constraints for ChatGPT or another story collaborator

### 9.1 Keep these implementation facts stable unless explicitly changing game design

- There are exactly five landmarks per island in the current loop: Hatchery, Habit, Mystery, Wisdom, Boss.
- Landmark IDs should remain `hatchery`, `habit`, `mystery`, `wisdom`, and `boss`.
- The story can rename how landmarks are described per island, but it should not require new gameplay stop IDs.
- The boss/guardian finale should have two distinct moments: finale setup when challengeable, and fight-start when the player starts.
- Beat lines should stay compact for mobile surfaces.
- Story should not depend on tile indices or board locations.
- Story should not grant rewards or change progression.

### 9.2 Copy length guidance

- Toast: usually one short sentence.
- Dialogue primary text: one or two short sentences.
- Dialogue secondary text: one gentle clarifying sentence.
- StoryReader panel caption/text: one concise image caption or one short paragraph.

### 9.3 Safety/tone rules

Prefer:

- restore, free, calm, listen, ask, mend, share, breathe, build, return, open.

Avoid as primary framing:

- kill, punish, dominate, force, destroy the guardian, shame, failure, cowardice.

### 9.4 Continuity rules

- Each island should reveal a new aspect of the Great Drift.
- Each Wisdom landmark should clarify the guardian's fear-loop.
- Each finale setup should give a gentle action principle.
- Each boss midpoint can let the guardian speak from inside the fear-loop.
- Each resolution should show the guardian restored and reveal a clue that points forward.

---

## 10. Current implementation file map

| Concern | Current source |
|---|---|
| Narrative types and trigger vocabulary | `src/features/gamification/level-worlds/narrative/islandNarrativeTypes.ts` |
| Registered island definitions | `src/features/gamification/level-worlds/narrative/islandNarrativeRegistry.ts` |
| Island 1 content | `src/features/gamification/level-worlds/narrative/definitions/island001Narrative.ts` |
| Island 2 content | `src/features/gamification/level-worlds/narrative/definitions/island002Narrative.ts` |
| Island 3 content | `src/features/gamification/level-worlds/narrative/definitions/island003Narrative.ts` |
| Island 4 content | `src/features/gamification/level-worlds/narrative/definitions/island004Narrative.ts` |
| Island 5 content | `src/features/gamification/level-worlds/narrative/definitions/island005Narrative.ts` |
| Generalized reaction dispatch | `src/features/gamification/level-worlds/narrative/islandNarrativeReactionDispatch.ts` |
| Island 1 arrival manifest | `public/islands/001/story/arrival/manifest.json` |
| Island 1 resolution manifest | `public/islands/001/story/resolution/manifest.json` |
| Island Run architecture rules | `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md` |
| Canonical gameplay rules | `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md` |

---

## 11. Prompt you can paste into ChatGPT with this file

Use this prompt with the story bible above:

> You are helping rewrite the Island Run narrative for a mobile self-development game. Preserve the gameplay constraints and trigger vocabulary from the story bible. Improve the story's emotional clarity, character voice, and Great Drift arc while keeping lines compact for mobile dialogue/toast surfaces. Do not invent narrative-triggered gameplay rewards or progression writes. Return changes as implementation-ready tables by island, preserving beat ids where possible. For any new arrival/resolution/travel-ready content, label whether it can ship as dialogue-only or needs StoryReader art panels.

---

## 12. Quick checklist for future story updates

Before handing rewritten content back for implementation, check:

- [ ] Every edited beat has an island number and trigger/moment.
- [ ] Every edited line has a speaker or intentionally uses the island as ambient narrator.
- [ ] Toast lines are short.
- [ ] Dialogue lines fit mobile.
- [ ] Boss setup is distinct from boss fight start.
- [ ] Guardian is restored/freed, not killed.
- [ ] No story beat requires awarding currency or changing gameplay state.
- [ ] Any new StoryReader episode lists panels and art needs.
- [ ] Travel-ready lines do not replace the actual travel action; they only support the CTA.
