# Island 2 Narrative Proposal — "Pebble Bay"

Status: **Proposal for approval.** Content/design only. No code in this document.
Date: 2026-06-28
Author: gameplay/narrative

> **How to read this.** This is a proposal to extend the Island narrative system
> to its second island. **Nothing here is built yet.** Once the decisions in
> §10 are approved, the **reaction beats in §7 are implementable immediately as
> content-only** (the reaction layer is already island-agnostic — see
> `docs/plans/island-001-narrative-beat-wiring-plan.md` §3.4). The illustrated
> arrival/finale/resolution episodes (§8) are **deferred** until per-island
> StoryReader manifests + art exist.
>
> **Authority.** Subordinate to `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
> and the read-only rules in
> `docs/gameplay/island-001-narrative-content-contract.md`. Story observes; it
> never drives gameplay. Beat ids follow `I002-B##`; triggers carry
> `islandNumber: 2`.

---

## 1. Continuity from Island 1

Island 1 ("First Light Shore" / story name *Luma Isle*) ended with two hooks the
expedition follows here:

1. **A shaped interruption.** Elder Sava found an *unfamiliar symbol* pressed
   into the guardian's corrupted crystal — evidence the Great Drift's disruption
   may have been **deliberate**, not natural.
2. **A weaker echo.** The restored route to Island 2 carried the *same
   interruption rhythm at lower strength*.

Pebble Bay is where the expedition first sees that the interruption isn't a
one-island wound — it recurs, in a different disguise. This is the **second clue**
in a slow mystery that should pay off across the Awakening arc (islands 1–24).

---

## 2. Island identity — Pebble Bay

Canonical display name (already in `getIslandDisplayName()`): **Pebble Bay**.
Arc: **Awakening / Calm & Nature (1–24)**.

> **Naming decision (see §10-D).** Island 1's narrative used a separate story
> name ("Luma Isle") from its display name ("First Light Shore"). **Recommendation:
> use "Pebble Bay" as both** the display and narrative name to stop the dual-name
> drift. The proposal below assumes this.

- **Civilization:** **The Tidefolk** — a small, unhurried coastal community of
  pebble-turners, net-menders, tide-readers, and lantern-keepers who live by the
  rhythm of the water.
- **Cultural identity:** Patience as a craft. The Tidefolk believe nothing good
  is rushed — pebbles are smoothed by the tide over a thousand small turns, and
  so are people. Their rituals are gentle and repeated rather than grand.
- **Visual language:** Smooth grey-and-rose pebbles, tide pools, weathered jetties,
  hanging fishing lanterns, salt-bleached wood, rope and net textures, soft foam
  lines. Restored landmarks glow with warm lantern light and *moving water*.
- **Dominant colours:** Sea-foam green, wet-pebble grey, driftwood tan, dawn rose,
  deep tide-blue. The "stuck" center is a flat, glassy, *too-still* dark teal.
- **Natural environment:** A sheltered crescent bay. At the center, a great tide
  basin that should breathe in and out with the sea — but has gone glassy and
  still since the Drift.
- **Music:** Soft tide loops, brushed hand-percussion, low strings, a single
  recurring lantern-bell motif. The finale adds a slow swell that "returns the
  tide."
- **Common professions:** Pebble-turners, tide-readers, net-menders,
  lantern-keepers, shell-archivists, hatch-tenders.
- **Relationship with creatures:** The Tidefolk once raised tide-creatures that
  rode the daily currents; when the tides stopped, the creature-paths stranded
  and the Hatchery quieted.
- **What makes it memorable:** The "boss" is not a monster — it is the bay's
  ancient guardian who **stopped the tides on purpose**, out of fear, and in
  doing so let the bay go stagnant. Restoration = teaching it that *gentle motion
  is safer than perfect stillness.*

---

## 3. Central imbalance + life lesson

### Core problem
Pebble Bay's guardian, **Maelis the Tideward** (an immense ancient sea-turtle),
once pulled the tides in and out with her breathing. When the Great Drift's
broken signal reached the bay, Maelis heard it as a warning of a catastrophic
wave — so she **held her breath and stopped the tide** to "protect" the bay. The
wave never came. But the held stillness has let the basin go stagnant: pebbles
no longer turn, creature-paths stranded, the Tidefolk's gentle routines lost
their rhythm.

### External symptoms
Glassy, motionless center water; stranded tide-pools; a silent Hatchery; pebbles
gone rough and dull; lanterns unlit; citizens who've stopped their daily turning.

### Internal/emotional cause
Fear turned protection into **stagnation**. The Tidefolk, taking the guardian's
cue, stopped their small daily motions ("why turn the pebbles if the tide won't
come?"). They mistook stillness for safety.

### Life lesson (primary)
**Gentle, repeated motion keeps us whole; stillness from fear becomes stagnation.**
The user-facing message — and the seam to the real app — is *consistency*: small
actions repeated like the tide (a habit) are what smooth and renew us. Not one
big effort; the daily turn.

### Great Drift connection (the clue)
The same shaped symbol from Island 1 reappears here — this time found etched into
a **tide-stone** at the bottom of the still basin, in the place the held breath
keeps the water from reaching. The interruption rhythm is fainter but unmistakably
the same craft. Elder of Pebble Bay confirms: *someone is sending this on purpose.*

---

## 4. The player's mission

- **Sent by:** the Compass Expedition (Captain Ivo, reused from Island 1).
- **Initial belief:** the route to Pebble Bay is dead because the bay's tides —
  and thus its currents — have simply stopped.
- **True problem:** the guardian is holding her breath out of fear; the Tidefolk
  have stopped their daily rhythm in sympathy.
- **Why outsiders are needed:** the Tidefolk can't bear to "wake" Maelis (they
  fear the wave she fears). A new expedition member can restart the small motions
  without that history of fear.
- **First request:** help a hatch-tender restart one gentle tide-pool ritual.
- **Gradual discovery:** the stopped tide is a fear-response to the Drift signal,
  and the same shaped interruption is here too.
- **Player role:** a respectful expedition member who restores rhythm through
  small, sustainable actions — never force.

---

## 5. Core cast (proposed)

| Role | Name | Sketch | Speaking style |
|---|---|---|---|
| Local guide (≈ Miri) | **Sela** | A young tide-reader, quick and warm, reads the water like a book; impatient with stillness but learning patience. | Short, vivid, a little wry. |
| Wisdom figure (≈ Elder Sava) | **Keeper Bryn** | The bay's lantern-and-tide keeper; kind, dry, believes in small repeated care over grand gestures. | Calm, plain, practical. |
| Supporting citizen (≈ Poko) | **Tobin** | A net-mender who jokes to cover worry; the heart/comic-relief of the bay. | Funny, blurts, generous. |
| Guardian / boss (≈ Noctyra) | **Maelis the Tideward** | Ancient sea-turtle guardian; not hostile, just *holding her breath*; barnacle-and-salt crust over a slow, frightened heart. | Few words, tidal, weary. |
| Expedition voice | **Captain Ivo** | Reused from Island 1; prologue/transition only. | Calm, premium, concise. |

> **Sample voice (for tone approval):**
> - Sela: *"The water's gone polite. That's not calm — that's holding its breath."*
> - Keeper Bryn: *"A pebble isn't smoothed by one wave. Neither are we."*
> - Tobin: *"I mended a net for a tide that hasn't shown up in weeks. Optimism, I think it's called."*
> - Maelis: *"...the wave... I am still... watching for it..."*

---

## 6. Five-landmark narrative framing

Canonical stop ids are unchanged (`hatchery → habit → mystery → wisdom → boss`);
only player-facing framing differs.

| Stop | Player-facing name | Pebble Bay meaning |
|---|---|---|
| Hatchery | **The Tide-Cradle** | Where tide-creature eggs are warmed by the in-and-out water. Quiet because the tide stopped. |
| Habit (Stop 2) | **The Turning Stones** | A shore of pebbles citizens turn daily; "one steady turn" = the real-life action seam. |
| Mystery (Stop 3) | **The Tide Pools** | Gathering pools for breathing/check-in/reflection practices, framed as "reading the water." |
| Wisdom (Stop 4) | **The Lantern Walk** | Keeper Bryn's jetty of tide-memory lanterns; reflection as "tending one light at a time." |
| Boss (Stop 5) | **The Breathing Basin** | The central tide basin where Maelis holds her breath. "Defeat" = she breathes; the tide returns. |

---

## 7. Reaction beat set — IMPLEMENTABLE NOW (content-only)

These map 1:1 to the data-driven reaction triggers already live
(`islandNarrativeReactionDispatch.ts`). On approval, this becomes a single
content PR: a new `island002Narrative.ts` + registry entry + tests, no
controller code. All copy ≤110 chars (mobile limit). Surfaces: `toast` =
non-blocking, `dialogue_sheet` = modal.

> Because the legacy opening-flow controller is Island-1-only, Island 2 routes
> **all** of these — including the Hatchery beats — through the reaction layer.

| Beat | Trigger | Speaker | Surface | Copy |
|---|---|---|---|---|
| I002-B01 | stop_opened: hatchery | Tobin | dialogue | "The Tide-Cradle's gone quiet — help me warm one pool again." |
| I002-B02 | stop_completed: hatchery | Sela | toast | "One pool stirs. The cradle remembers the water." |
| I002-B03 | landmark L1: hatchery | Tobin | toast | "A little warmth comes back to the stones." |
| I002-B04 | landmark L2: hatchery | — (companion) | toast | "Something in the shallows is listening." |
| I002-B05 | landmark L3: hatchery | Sela | dialogue | "The Tide-Cradle could welcome a bond again." |
| I002-B06 | stop_opened: habit | Sela | dialogue | "Turn one stone with me. Small, but the bay needs the motion." |
| I002-B07 | stop_completed: habit | Sela | toast | "One steady turn is enough for today." |
| I002-B08 | landmark L1: habit | Tobin | toast | "Folk are drifting back to the Turning Stones." |
| I002-B09 | landmark L2: habit | Sela | dialogue | "They're keeping the rhythm together again." |
| I002-B10 | landmark L3: habit | Sela | toast | "The shore turns like it used to." |
| I002-B11 | stop_opened: mystery | Tobin | dialogue | "The Tide Pools are calm enough to read. Come listen to the water." |
| I002-B12 | stop_completed: mystery | Tobin | toast | "A pool clears. We added one lantern to the pools." |
| I002-B13 | landmark L1: mystery | Tobin | toast | "The pools are gathering folk again." |
| I002-B14 | landmark L2: mystery | Sela | dialogue | "These pools were never just for fishing." |
| I002-B15 | landmark L3: mystery | Tobin | toast | "A tide-bell rings over the pools." |
| I002-B16 | stop_opened: wisdom | Keeper Bryn | dialogue | "The Lantern Walk asks what your stillness is protecting." |
| I002-B17 | stop_completed: wisdom | Keeper Bryn | dialogue | "Maelis isn't attacking. She's holding her breath." (2nd: "Help her let it go, gently.") |
| I002-B18 | landmark L1: wisdom | Keeper Bryn | toast | "One more lantern lit along the walk." |
| I002-B19 | landmark L2: wisdom | Keeper Bryn | dialogue | "This stopped tide was shaped by someone." |
| I002-B20 | landmark L3: wisdom | Sela | dialogue | "We stop hiding what the water told us." |
| I002-B21 | landmarks_restored_majority (3/5) | Tobin | toast | "Folk are back on the shore, turning stones." |
| I002-B22 | boss_challenge_started | Sela | toast | "Free her breath — don't fight the tide." |
| I002-B23 | boss_midpoint | Maelis | toast | "...the wave... it never came..." |

**Wisdom reveal (B17)** carries the island's lesson seam and the Great-Drift clue
hand-off, mirroring Island 1's B20.

---

## 8. Deferred: illustrated episodes (need art + legacy-flow generalization)

These mirror Island 1's legacy beats and are **out of scope for the first
Island 2 content PR**. They need (a) the legacy opening-flow controller
generalized beyond Island 1 (a small follow-up to add `boss_eligible`,
`boss_resolved`, `island_clear_travel_ready`, and `island_entered`/`arrival_closed`
handling per-island), and (b) authored StoryReader panels + Pebble Bay art
(currently placeholders).

- **Arrival** (6 panels): expedition reaches a too-still Pebble Bay; Sela warns
  not to wake Maelis.
- **Finale intro** (boss_eligible): Keeper Bryn frames the basin — "help her
  breathe."
- **Resolution** (7 panels): Maelis exhales, the tide returns, pebbles turn, the
  shaped tide-stone is revealed (clue 2), a route opens to Island 3 (Coconut Cove).
- **Travel-ready** line: Sela — "The tide's moving because we kept turning."

---

## 9. Art / asset status

| Asset | Status | Implication |
|---|---|---|
| `island-002/background/ambient-background.webp` | ✅ real | Usable now. |
| `island-002/board/board-circle-inner.webp` | ✅ real | Usable now. |
| boss idle/defeated, scenery, all landmark L1–L3 | ⛔ placeholders | Reaction beats (§7) need **no art** and ship now; illustrated episodes (§8) wait on art. |

The §7 reaction beats are **art-independent** (text dialogue/toast), so Island 2
gets a full reactive narrative layer immediately, with the cinematic episodes
following as art lands.

---

## 10. Decisions to approve

Please confirm (or adjust) before implementation:

- **A. Lesson.** "Gentle repeated motion keeps us whole; stillness from fear
  becomes stagnation" (consistency/habit seam). ✔ / change?
- **B. Cast names.** Sela (guide), Keeper Bryn (wisdom), Tobin (citizen),
  **Maelis the Tideward** (guardian sea-turtle). ✔ / rename?
- **C. Finale framing.** Guardian-rescue (help Maelis breathe), not combat;
  mechanics unchanged, copy reframes "defeat" as "she breathes." ✔ / change?
- **D. Naming.** Use canonical **"Pebble Bay"** as both display and narrative
  name (drop the dual-name pattern). ✔ / keep a separate story name?
- **E. Scope of first PR.** Ship the §7 reaction beats now (content-only);
  defer §8 illustrated episodes until art + legacy-flow generalization. ✔ /
  different scope?
- **F. Meta-arc.** Pebble Bay is "clue 2" — the shaped interruption recurs,
  pointing toward a deliberate cause revealed later in the arc. ✔ / change?

On approval I'll implement §7 as a single content PR (new
`island002Narrative.ts` + registry registration + validation/round-trip tests),
exactly mirroring the Island 1 pattern.

---

## 11. Related documents

- `docs/design/island-001-narrative-vertical-slice.md` — the Island 1 template this mirrors.
- `docs/plans/island-001-narrative-beat-wiring-plan.md` — reaction-layer architecture (§3.4 generalization).
- `docs/gameplay/island-001-narrative-content-contract.md` — read-only authority rules.
- `docs/ISLAND_RUN_120_ISLAND_NAMES_CANONICAL.md` — canonical island names / arcs.
