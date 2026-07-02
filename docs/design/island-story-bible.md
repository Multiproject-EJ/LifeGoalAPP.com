# Island Run — Story & System Bible (current state)

> **What this document is.** A single, self-contained snapshot of the **entire
> current narrative** for the game *Island Run* (inside the HabitGame app), plus
> **how that story attaches to gameplay** and **the rules any rewrite must obey
> to stay implementable**. It is written so it can be handed to another writer or
> an LLM to **rework/upgrade the story**, then brought back as concrete changes.
>
> **How to use it for an upgrade.** Read §1–§4 for the world + system. §5 is the
> full per-island content (every line currently in the game). §6 tells you
> exactly what's *cheap* to change (copy, new beats on existing triggers) vs
> *expensive* (new trigger types, illustrated cutscenes, art). §7 is the beat
> schema to write new content in. Keep the constraints in §3.4 or the changes
> can't ship as-is.
>
> Last updated: 2026-06-28. Reflects Islands 1–5 (the MVP launch set).

---

## 1. The game in one minute (context for the story)

- **HabitGame** is a cozy self-improvement RPG. Real-life actions — completing a
  habit, journaling, a check-in, a breathing exercise — feed progress in a game.
- **Island Run** is the main board game inside it. The player travels a fixed
  sequence of **120 islands** (only 1–5 have story so far). Each island is a
  board you roll around (spending **dice**), earning **essence** to fund
  buildings and open **stops**.
- **Every island has exactly 5 "stops" (a.k.a. landmarks), always in this order:**
  1. **Hatchery** — set/raise a creature egg.
  2. **Habit** — *do a real-life action* (the bridge to the actual app).
  3. **Mystery** — a short in-game practice (breathing / check-in / reflection).
  4. **Wisdom** — a reflection / story / questionnaire moment.
  5. **Boss** — the final gate; clear it to finish the island and travel on.
- Each stop also has a **building** the player funds with essence across 3 levels
  (L1→L2→L3). An island is "cleared" when all stops are done, the egg resolves,
  and all 5 buildings hit L3 — then the player taps to travel to the next island.

**The core promise:** small, sustainable real-life actions (habits) make the game
better. The story is the *meaning layer* on top of that loop.

For the full new-player gameplay loop see `docs/NEW_PLAYER_GAME_LOOP.md`.

---

## 2. How the story attaches to gameplay (the interaction model)

The story is a **thin layer that reacts to what the player does** in the game. It
**never drives gameplay** — it can't complete a stop, give a reward, or move the
player. It only *shows a line at the right moment*. So the player's real actions
(turning a pebble = doing a habit; building a landmark; fighting the boss) trigger
short story moments that make those actions feel meaningful.

### The moments where story fires (gameplay event → story beat)

| When this happens in the game | A story "beat" can fire |
|---|---|
| Player **arrives** at an island (first time) | arrival intro *(Island 1 only today)* |
| Player **opens a stop** (Hatchery / Habit / Mystery / Wisdom) | a character introduces that stop |
| Player **completes a stop's objective** | a reaction ("nice, that helped") |
| A **building reaches L1 / L2 / L3** | a small "the place is healing" reaction |
| **3 of the 5 buildings** reach L3 | a "the whole island is reviving" beat |
| The **boss becomes challengeable** (all built) | a "finale setup" beat |
| The player **starts the boss fight** | a framing line ("don't fight — free it") |
| The boss fight reaches its **halfway point** | a mid-fight reveal from the guardian |
| The boss is **defeated** | resolution cutscene *(Island 1 only today)* |
| The island is **cleared & ready to travel** | a closing line *(Island 1 only today)* |

The **Habit stop (Stop 2)** is the most important seam: completing it means the
player did a real action in the app (logged a habit, etc.). Its story beats are
deliberately gentle and non-judgmental ("one steady action is enough for today")
— never "if you fail, the island suffers."

### How a beat looks to the player (three "surfaces")

- **`dialogue_sheet`** — a modal card with a character portrait, name, 1–2 lines,
  and a Continue button. Used for intros and important reveals.
- **`toast`** — a small, non-blocking status banner that auto-dismisses (~3.6s).
  Used for light reactions ("Benches and banners return.").
- **`story_reader`** — a full illustrated multi-panel cutscene (the
  prologue/arrival/resolution episodes). **Needs art.** Only Island 1 uses it.

Every beat is **shown once** and then remembered (across devices) so it never
repeats. Beats yield to game modals — they wait for a clear moment to appear.

---

## 3. The narrative system (so a rewrite stays implementable)

### 3.1 The 120-island structure is fixed; stop IDs are fixed
The five stop IDs (`hatchery`, `habit`, `mystery`, `wisdom`, `boss`) and their
order **cannot change** — they're load-bearing gameplay. But each island gives
them **player-facing names** (e.g. on Pebble Bay the Habit stop is "The Turning
Stones"). Rewrites can re-theme freely; they can't add/remove/reorder stops.

### 3.2 Two delivery systems (why some moments exist and others don't)
- **Reaction layer (works on ANY island, content-only):** handles stop-open,
  stop-complete, building-level, majority-restored, boss-eligible, boss-start,
  boss-midpoint. Adding these for a new island is just writing text — no code.
- **Legacy "opening flow" (Island 1 only today):** handles the **arrival
  cutscene, the resolution cutscene, and the travel-ready closing line**. These
  are not yet generalized to islands 2–5.

**Consequence:** Islands 2–5 currently have everything *except* the illustrated
arrival, the illustrated resolution, and the travel closing line. (See §6.)

### 3.3 The meta-arc continuity engine
Each island is a self-contained restoration story, but they chain via a recurring
mystery (the "shaped interruption" — see §4). A rewrite should preserve a
per-island **Wisdom reveal** (the "the guardian isn't evil" beat) and the
**escalating clue** that points to a deliberate, region-wide cause.

### 3.4 Hard constraints (any rewrite must respect these or it won't ship)
- **Story observes, never drives.** No beat may grant rewards, complete stops,
  change economy, or move the player.
- **Dialogue length ≤ 110 characters** per line (mobile). 1–2 lines per beat.
- **Tone stays non-judgmental**, especially on the Habit stop. Guardians are
  *rescued/understood*, never "killed" — boss "defeat" is reframed as freeing.
- **Stop IDs and the 5-stop order are immutable.** Re-theme, don't restructure.
- **Beats are one-shot** (shown once). Keep them short and skippable.
- **Cutscenes (`story_reader`) need produced art** — expensive; default to
  `dialogue_sheet`/`toast` for new content.

---

## 4. The meta-arc — "The Great Drift"

- **The world:** long ago the islands were connected by glowing sea-routes;
  people, creatures, and **guardians** shared knowledge across them.
- **The Great Drift:** a disruption severed the routes and went quiet. Each
  island's **guardian** misread the silence as danger and locked the island into
  a fearful "protection" state — which, over time, became **stagnation/damage**.
- **The player** is a new member of the **Compass Expedition** (led by **Captain
  Ivo**), a restoration crew re-opening routes. The job is framed as *"arrive
  with respect, listen, and help where invited"* — **not conquest**. Every "boss"
  is a frightened guardian to **reach and restore**, not destroy.
- **The recurring clue:** on each island, a **shaped interruption symbol** keeps
  reappearing in the corrupted thing — evidence the Drift may have been
  **deliberate**, not natural. The clue **escalates** island to island.

### The emotional progression (one wellbeing lesson per island)
This is the spine a rewrite should preserve or deliberately re-plan:

| Island | Lesson (the "why this matters to a real person") |
|---|---|
| 1 — Luma Isle | **Trust / connection** — small acts of trust reopen connection. |
| 2 — Pebble Bay | **Consistency** — gentle repeated motion keeps us whole; fearful stillness stagnates. |
| 3 — Coconut Cove | **Generosity / gratitude** — abundance is shared; scarcity-fear starves the grove. |
| 4 — Driftwood Isle | **Resilience** — what breaks can be rebuilt; a lapse is not the end. |
| 5 — Crown of Tides | **Integration** — small restored rhythms, joined together, become a song. |

### The clue escalation (current wording)
- I1: a shaped symbol is found *inside* the guardian's corrupted crystal.
- I2: "This stopped tide was shaped by someone."
- I3: "This silence was planted here on purpose."
- I4: "This was broken by a hand, not the sea."
- I5: "The interruption is being sung from somewhere far." → the Crown is a
  **signal hub** *relaying* a "borrowed song" to the whole region. (MVP cliff-hanger.)

---

## 5. The five islands — full current content

Notation per beat: **ID** · *trigger (when it fires)* · **Speaker** · surface · "copy".
Surfaces: D = dialogue card, T = toast, S = story-reader cutscene.
Beats are listed in the order a player encounters them.

> **Naming note:** Island 1's *narrative* name is "Luma Isle" but its in-game
> *display* name is "First Light Shore" (a legacy inconsistency). Islands 2–5 use
> one name for both. A rewrite may want to unify Island 1.

---

### Island 1 — Luma Isle · The Lumin
- **Identity:** a small restoration-minded harbor people of crystal-craft and
  gentle ritual. Warm crystal glow, lanterns, a dark-crystal cracked center.
- **Imbalance:** the route-guardian dragon **Noctyra** absorbed the Drift's
  corrupted signal and wrapped herself in black-crystal armor, locking the island
  in defense. The Lumin became careful to the point of isolation.
- **Lesson:** small acts of trust reopen connection.
- **Cast:** **Miri** (guide), **Elder Sava** (wisdom), **Poko** (citizen),
  **Noctyra** (guardian dragon), **Captain Ivo** (expedition).
- **Stop framing:** Hatchery · Habit = "Routekeeper Steps" · Mystery = "Gathering
  Grounds" · Wisdom = "Listening Terrace" · Boss = "Island Heart".

| ID | Trigger | Speaker | S | Copy |
|---|---|---|---|---|
| B02 | island arrival | — | S | *(illustrated arrival cutscene)* |
| B03 | arrival closed | Miri | D | "Start small. Help us wake one gentle place." |
| B04 | open Hatchery | Poko | D | "The Hatchery is quiet, not gone. Help me wake one cradle." |
| B05 | Hatchery done | Miri | T | "One cradle light answers — the Hatchery is waking." |
| B24 | Hatchery L1 | Miri | T | "The island noticed." |
| B07 | Hatchery L2 | Poko | T | "Something small is listening." |
| B08 | Hatchery L3 | Miri | D | "The Hatchery feels like a welcome again." |
| B09 | open Habit | Miri | D | "Relight the Routekeeper Steps with one steady action." |
| B10 | Habit done | Miri | T | "One steady action is enough for today." |
| B11 | Habit L1 | Poko | T | "Citizens test the lantern lines again." |
| B12 | Habit L2 | Miri | D | "They are working together again." |
| B13 | Habit L3 | Miri | T | "The route chime rings clearly." |
| B14 | open Mystery | Poko | D | "The Gathering Grounds are ready for a restoration practice." |
| B15 | Mystery done | Poko | T | "Citizens add a lantern to the grounds." |
| B16 | Mystery L1 | Poko | T | "Benches and banners return." |
| B17 | Mystery L2 | Miri | D | "This was never just a plaza." |
| B18 | Mystery L3 | Poko | T | "A festival bell test rings out." |
| B19 | open Wisdom | Sava | D | "The Listening Terrace asks what protection has become." |
| **B20** | **Wisdom done (REVEAL)** | Sava | D | "Noctyra is not calling for battle. She is stuck on warning." / "Aim to free her, not to fight her." |
| B21 | Wisdom L1 | Sava | T | "Dust covers less of the maps now." |
| B22 | Wisdom L2 | Sava | D | "That interruption was shaped by someone." *(clue 1)* |
| B23 | Wisdom L3 | Miri | D | "We stop hiding the map." |
| B25 | 3/5 restored | Poko | T | "People are coming outside again." |
| B26 | boss eligible | Sava | D | "The five lights are speaking again. Now we ask, not attack." / "Aim for the crystal around her, not the heart inside it." |
| B27 | boss start | Miri | T | "Break the corrupted crystal — not the dragon." |
| B28 | boss midpoint | Noctyra | T | "Too much noise. Protect the small lights." |
| B29 | boss defeated | — | S | *(illustrated resolution cutscene)* |
| B30 | travel ready | Miri | D | "The route is open because we opened it together." (CTA: "Follow the restored route") |

---

### Island 2 — Pebble Bay · The Tidefolk
- **Identity:** an unhurried coastal people of pebble-turners and tide-readers;
  creed is *patience as a craft* (pebbles smoothed by many small turns).
- **Imbalance:** the guardian sea-turtle **Maelis the Tideward** heard the Drift
  as a warning of a catastrophic wave and **stopped the tides** to protect the
  bay — the held stillness let everything go stagnant.
- **Lesson:** consistency — gentle repeated motion keeps us whole.
- **Cast:** **Sela** (guide), **Keeper Bryn** (wisdom), **Tobin** (citizen),
  **Maelis the Tideward** (guardian), Captain Ivo.
- **Stop framing:** Hatchery = "Tide-Cradle" · Habit = "Turning Stones" · Mystery
  = "Tide Pools" · Wisdom = "Lantern Walk" · Boss = "Breathing Basin".

| ID | Trigger | Speaker | S | Copy |
|---|---|---|---|---|
| B01 | open Hatchery | Tobin | D | "The Tide-Cradle has gone quiet — help me warm one pool again." |
| B02 | Hatchery done | Sela | T | "One pool stirs. The cradle remembers the water." |
| B03 | Hatchery L1 | Tobin | T | "A little warmth comes back to the stones." |
| B04 | Hatchery L2 | *(island)* | T | "Something in the shallows is listening." |
| B05 | Hatchery L3 | Sela | D | "The Tide-Cradle could welcome a bond again." |
| B06 | open Habit | Sela | D | "Turn one stone with me. Small, but the bay needs the motion." |
| B07 | Habit done | Sela | T | "One steady turn is enough for today." |
| B08 | Habit L1 | Tobin | T | "Folk are drifting back to the Turning Stones." |
| B09 | Habit L2 | Sela | D | "They are keeping the rhythm together again." |
| B10 | Habit L3 | Sela | T | "The shore turns like it used to." |
| B11 | open Mystery | Tobin | D | "The Tide Pools are calm enough to read. Come listen to the water." |
| B12 | Mystery done | Tobin | T | "A pool clears. We added one lantern to the pools." |
| B13 | Mystery L1 | Tobin | T | "The pools are gathering folk again." |
| B14 | Mystery L2 | Sela | D | "These pools were never just for fishing." |
| B15 | Mystery L3 | Tobin | T | "A tide-bell rings over the pools." |
| B16 | open Wisdom | Bryn | D | "The Lantern Walk asks what your stillness is protecting." |
| **B17** | **Wisdom done (REVEAL)** | Bryn | D | "Maelis is not attacking. She is holding her breath." / "Help her let it go, gently." |
| B18 | Wisdom L1 | Bryn | T | "One more lantern lit along the walk." |
| B19 | Wisdom L2 | Bryn | D | "This stopped tide was shaped by someone." *(clue 2)* |
| B20 | Wisdom L3 | Sela | D | "We stop hiding what the water told us." |
| B21 | 3/5 restored | Tobin | T | "Folk are back on the shore, turning stones." |
| B24 | boss eligible | Bryn | D | "The bay is breathing again. The basin will hear us now." / "Help her let go — do not force the tide." |
| B22 | boss start | Sela | T | "Free her breath — do not fight the tide." |
| B23 | boss midpoint | Maelis | T | "...the wave... it never came..." |

---

### Island 3 — Coconut Cove · The Covefolk
- **Identity:** lush palm-cove growers and gatherers; once shared the harvest
  freely.
- **Imbalance:** the canopy guardian **Tamba the Grovekeeper** curled up and
  stopped shaking the trees (which spread seeds), hoarding against a famine that
  never came; the people copied his fear and stopped tending.
- **Lesson:** generosity / gratitude — abundance is shared, not hoarded.
- **Cast:** **Pip** (guide), **Grandmother Liko** (wisdom), **Nuru** (citizen),
  **Tamba the Grovekeeper** (guardian), Captain Ivo.
- **Stop framing:** Hatchery = "Sprout Nursery" · Habit = "Daily Climb" · Mystery
  = "Shade Circle" · Wisdom = "Story Stump" · Boss = "High Canopy".

| ID | Trigger | Speaker | S | Copy |
|---|---|---|---|---|
| B01 | open Hatchery | Nuru | D | "The Sprout Nursery has gone still — help me wake one seedling." |
| B02 | Hatchery done | Pip | T | "A sprout uncurls. The nursery remembers." |
| B03 | Hatchery L1 | Nuru | T | "Green creeps back into the nursery." |
| B04 | Hatchery L2 | *(island)* | T | "Something small rustles in the leaves." |
| B05 | Hatchery L3 | Pip | D | "The nursery could cradle a new bond again." |
| B06 | open Habit | Pip | D | "Climb one tree with me. The grove needs tending, daily." |
| B07 | Habit done | Pip | T | "One tree tended is enough for today." |
| B08 | Habit L1 | Nuru | T | "Folk are climbing the groves again." |
| B09 | Habit L2 | Pip | D | "We are tending the rows together again." |
| B10 | Habit L3 | Pip | T | "The canopy gives like it used to." |
| B11 | open Mystery | Nuru | D | "The Shade Circle is cool and calm. Come sit and breathe." |
| B12 | Mystery done | Nuru | T | "A breeze returns. We hung one lantern in the shade." |
| B13 | Mystery L1 | Nuru | T | "The shade is gathering folk again." |
| B14 | Mystery L2 | Pip | D | "This circle was never just for resting." |
| B15 | Mystery L3 | Nuru | T | "A husk-drum sounds under the palms." |
| B16 | open Wisdom | Liko | D | "The Story Stump asks what your grasping is guarding." |
| **B17** | **Wisdom done (REVEAL)** | Liko | D | "Tamba is not hoarding. He fears the grove will run dry." / "Show him it still gives." |
| B18 | Wisdom L1 | Liko | T | "Dust leaves the old story-carvings." |
| B19 | Wisdom L2 | Liko | D | "This silence was planted here on purpose." *(clue 3)* |
| B20 | Wisdom L3 | Pip | D | "We share what the grove tells us again." |
| B21 | 3/5 restored | Nuru | T | "Folk are back in the groves, sharing the haul." |
| B24 | boss eligible | Liko | D | "The grove is full again. The canopy will listen now." / "Show him it gives — do not take." |
| B22 | boss start | Pip | T | "Show him the grove still gives — do not take." |
| B23 | boss midpoint | Tamba | T | "...so little left... I held it all..." |

---

### Island 4 — Driftwood Isle · The Driftfolk
- **Identity:** builders and menders who make new things from what the sea brings.
- **Imbalance:** the shore-guardian **Garran the Driftwarden** froze mid-build,
  mourning what the sea took; the people stopped rebuilding in sympathy.
- **Lesson:** resilience — what breaks can be rebuilt; a lapse is not the end.
- **Cast:** **Wren** (guide), **Old Fenn** (wisdom), **Bodie** (citizen),
  **Garran the Driftwarden** (guardian), Captain Ivo.
- **Stop framing:** Hatchery = "Nesting Hollow" · Habit = "Mending Bench" ·
  Mystery = "Tide Table" · Wisdom = "Wreck Archive" · Boss = "Standing Heron".

| ID | Trigger | Speaker | S | Copy |
|---|---|---|---|---|
| B01 | open Hatchery | Bodie | D | "The Nesting Hollow has gone cold — help me line one nest again." |
| B02 | Hatchery done | Wren | T | "A nest holds. The hollow remembers warmth." |
| B03 | Hatchery L1 | Bodie | T | "Driftwood settles back into the hollow." |
| B04 | Hatchery L2 | *(island)* | T | "Something stirs among the reeds." |
| B05 | Hatchery L3 | Wren | D | "The Nesting Hollow could hold a bond again." |
| B06 | open Habit | Wren | D | "Mend one piece with me. Small repairs, every day." |
| B07 | Habit done | Wren | T | "One mend is enough for today." |
| B08 | Habit L1 | Bodie | T | "Folk are back at the Mending Bench." |
| B09 | Habit L2 | Wren | D | "We are rebuilding side by side again." |
| B10 | Habit L3 | Wren | T | "The isle holds together like it used to." |
| B11 | open Mystery | Bodie | D | "The Tide Table is dry now. Come gather on the flats." |
| B12 | Mystery done | Bodie | T | "The flats fill. We set one lantern on the table." |
| B13 | Mystery L1 | Bodie | T | "The flats are gathering folk again." |
| B14 | Mystery L2 | Wren | D | "This table was never just for sorting salvage." |
| B15 | Mystery L3 | Bodie | T | "A driftwood chime rings on the flats." |
| B16 | open Wisdom | Fenn | D | "The Wreck Archive asks what your stillness is mourning." |
| **B17** | **Wisdom done (REVEAL)** | Fenn | D | "Garran is not frozen. He mourns what the sea took." / "Help him build again." |
| B18 | Wisdom L1 | Fenn | T | "Sand falls from the old wreck-charts." |
| B19 | Wisdom L2 | Fenn | D | "This was broken by a hand, not the sea." *(clue 4)* |
| B20 | Wisdom L3 | Wren | D | "We stop hiding the charts we salvaged." |
| B21 | 3/5 restored | Bodie | T | "Folk are back on the shore, building again." |
| B24 | boss eligible | Fenn | D | "The isle stands rebuilt. The warden will see us now." / "Build beside him — do not break through." |
| B22 | boss start | Wren | T | "Help him build again — do not break what is left." |
| B23 | boss midpoint | Garran | T | "...all of it... washed away... why rebuild..." |

---

### Island 5 — Crown of Tides · The Reefborn  *(special / milestone — MVP finale)*
- **Identity:** reef-singers who keep a great tidal "crown" reef that once relayed
  safe-route song to the whole region (a signal **hub**).
- **Imbalance:** the crowned guardian **Thalassa the Tide Sovereign** is caught
  **broadcasting a "borrowed song"** — the Crown is relaying the Drift's
  corrupted signal *outward* to the other islands (which is why each had the echo).
- **Lesson:** integration — small restored rhythms, joined together, become a song.
- **Cast:** **Reev** (guide), **Elder Cael** (wisdom, the Tidesinger), **Sprat**
  (citizen), **Thalassa the Tide Sovereign** (guardian), Captain Ivo.
- **Stop framing:** Hatchery = "Coral Cradle" · Habit = "Tide-Keeping" · Mystery =
  "Singing Shallows" · Wisdom = "Crown Archive" · Boss = "Sovereign's Crown".

| ID | Trigger | Speaker | S | Copy |
|---|---|---|---|---|
| B01 | open Hatchery | Sprat | D | "The Coral Cradle has gone dark — help me light one polyp again." |
| B02 | Hatchery done | Reev | T | "A polyp glows. The cradle remembers the song." |
| B03 | Hatchery L1 | Sprat | T | "Color seeps back into the coral." |
| B04 | Hatchery L2 | *(island)* | T | "Something glimmers deep in the reef." |
| B05 | Hatchery L3 | Reev | D | "The Coral Cradle could carry a bond again." |
| B06 | open Habit | Reev | D | "Keep one channel with me. The reef needs daily tending." |
| B07 | Habit done | Reev | T | "One channel kept is enough for today." |
| B08 | Habit L1 | Sprat | T | "Folk are back tending the tide-channels." |
| B09 | Habit L2 | Reev | D | "We are keeping the reef in time together." |
| B10 | Habit L3 | Reev | T | "The channels run clear like they used to." |
| B11 | open Mystery | Sprat | D | "The Singing Shallows are calm. Come hear the water." |
| B12 | Mystery done | Sprat | T | "A note returns. We lit one lantern in the shallows." |
| B13 | Mystery L1 | Sprat | T | "The shallows are gathering folk again." |
| B14 | Mystery L2 | Reev | D | "These shallows were never just for diving." |
| B15 | Mystery L3 | Sprat | T | "A reef-bell rings through the shallows." |
| B16 | open Wisdom | Cael | D | "The Crown Archive asks whose song you are carrying." |
| **B17** | **Wisdom done (REVEAL)** | Cael | D | "Thalassa is not drowning us. She carries a borrowed song." / "Help her find her own again." |
| B18 | Wisdom L1 | Cael | T | "Salt clears from the old song-tablets." |
| B19 | Wisdom L2 | Cael | D | "The interruption is being sung from somewhere far." *(clue 5 — escalation)* |
| B20 | Wisdom L3 | Reev | D | "We stop hiding what the Crown still hears." |
| B21 | 3/5 restored | Sprat | T | "Folk are back on the reef, singing it awake." |
| B24 | boss eligible | Cael | D | "The reef sings in time again. The Crown will answer now." / "Free her voice — do not silence the song." |
| B22 | boss start | Reev | T | "Help her find her own song — do not silence the Crown." |
| B23 | boss midpoint | Thalassa | T | "...not my voice... it sings through me..." |

---

## 6. What exists vs what's missing (the honest gap map)

| Narrative moment | Island 1 | Islands 2–5 | Notes |
|---|---|---|---|
| Global prologue (Great Drift intro) | ✅ live (placeholder art) | — (global, shown once) | `story_reader` |
| Illustrated **arrival** cutscene | ✅ authored | ❌ missing | needs art + legacy-flow generalization |
| Stop intros (open Hatchery/Habit/Mystery/Wisdom) | ✅ | ✅ | dialogue |
| Stop completion reactions | ✅ | ✅ | toast |
| Building L1/L2/L3 reactions | ✅ | ✅ | toast/dialogue |
| 3/5 restored beat | ✅ | ✅ | toast |
| Wisdom **reveal** (guardian isn't evil + clue) | ✅ | ✅ | dialogue |
| Finale setup (boss eligible) | ✅ | ✅ | dialogue |
| Boss start + midpoint framing | ✅ | ✅ | toast |
| Illustrated **resolution** cutscene | ✅ authored | ❌ missing | needs art + legacy-flow generalization |
| **Travel-ready** closing line | ✅ | ❌ missing | timing-sensitive; deferred |

**Cheap to change (content only, ships immediately):** any existing line's copy;
adding/removing `dialogue`/`toast` beats on triggers that already exist (stop
open/complete, building levels, majority, boss eligible/start/midpoint); cast
names; per-island stop framing; the lesson and clue wording.

**Expensive (needs engineering and/or art):** the illustrated arrival/resolution
cutscenes for islands 2–5 (art + a generalization of the legacy controller); the
travel-ready closing line for 2–5 (controller timing work); any **new kind of
trigger moment** not in the list above (e.g. "fires when the player logs a habit
3 days in a row" would need new gameplay signals).

---

## 7. Beat schema (write new/upgraded content in this shape)

Every beat is one object. To propose changes, give them in this format and they
drop straight into the per-island content files.

```ts
{
  id: 'I00N-B##',                 // N = island number; ## = unique 2-digit
  trigger: <one of the triggers below>,
  speakerId: 'miri',              // optional; omit for island-voice narration
  surface: 'dialogue_sheet' | 'toast',   // 'story_reader' needs art (avoid)
  priority: 'major' | 'short' | 'ambient',  // higher shows first if several queue
  repeatPolicy: 'once',           // always 'once'
  text: 'Line one (<= 110 chars).',
  secondaryText: 'Optional second line.',   // dialogue only
  displayCtaText: 'Optional button label.', // dialogue only
}
```

**Triggers currently available (the moments story can hook):**
- `{ kind: 'stop_opened',  islandNumber, stopId }` — stopId ∈ hatchery|habit|mystery|wisdom|boss
- `{ kind: 'stop_completed', islandNumber, stopId }`
- `{ kind: 'landmark_level_completed', islandNumber, stopId, level: 1|2|3 }`
- `{ kind: 'landmarks_restored_majority', islandNumber, threshold: 3 }`
- `{ kind: 'boss_eligible', islandNumber }`
- `{ kind: 'boss_challenge_started', islandNumber }`
- `{ kind: 'boss_midpoint', islandNumber }`
- *(legacy / Island-1-only today: `island_entered`, `arrival_closed`,
  `boss_resolved`, `island_clear_travel_ready`)*

**Cast per island** must be listed with `{ id, displayName, role }`; every
`speakerId` used in a beat must exist in that island's cast.

**A good per-island set** mirrors the tables in §5: one intro per stop, a light
completion reaction, three building-level reactions per landmark, the Wisdom
reveal (the emotional + clue beat), a majority beat, and the three boss-framing
beats — ~24 beats total.

---

## 8. Suggested prompts for an upgrade pass

When handing this to an LLM, useful asks include:
- "Rewrite Island 3's copy to be funnier/warmer while keeping each line ≤110 chars
  and the same triggers."
- "Propose a stronger Wisdom-reveal line (B17/B20) for each island that lands the
  lesson harder."
- "Re-plan the 5-island emotional arc and clue escalation; keep one lesson per
  island and the guardian-rescue framing."
- "Draft Islands 6–10 (names already canonical: Turtle Beach, Coral Garden,
  Whispering Palms, Seaglass Shore, Lagoon Haven) in this exact beat schema."

Bring results back as **beat objects (§7) per island** or **copy edits keyed by
beat ID** and they can be applied directly.

---

## 9. Related source-of-truth docs

- `docs/NEW_PLAYER_GAME_LOOP.md` — full gameplay loop the story wraps.
- `docs/design/island-001-narrative-vertical-slice.md` — the original Island 1 deep design.
- `docs/design/island-002-narrative-proposal.md` — the approved Island 2 design.
- `docs/plans/island-001-narrative-beat-wiring-plan.md` — how the system fires beats.
- `docs/gameplay/island-001-narrative-content-contract.md` — the observe-only rules.
- Content lives in `src/features/gamification/level-worlds/narrative/definitions/island00N*.ts`.
