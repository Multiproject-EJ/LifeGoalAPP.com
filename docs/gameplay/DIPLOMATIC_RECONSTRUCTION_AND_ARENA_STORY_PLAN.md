# Diplomatic Reconstruction and Arena Story Plan

Status: **authoritative narrative direction, implementation staged**

Date locked: 2026-07-28

This document records the product owner's current story direction. It is
subordinate to `CANONICAL_GAMEPLAY_CONTRACT.md` for gameplay authority. Where
older story proposals expose the Great Drift during the opening or describe the
expedition as an investigation from the beginning, this direction supersedes
them.

## Narrative promise

The player begins aboard an extraordinary, fully capable diplomatic spaceship.
The opening is primarily discovery and delight: rooms, fabrication technology,
robots, windows, games, and the scale of the ship. There is no early disaster
exposition and no mention of the Great Drift.

The official mission is to visit the 120 islands under the Reconstruction
Accord. The expedition receives a clear assignment on each island, normally:

1. meet the host civilization;
2. accept its reconstruction brief;
3. deploy the super-builder robots;
4. restore the five landmarks;
5. participate in the host Arena as a diplomatic gesture;
6. resolve the local guardian/Arena challenge;
7. leave the island stronger than it was found.

The early assignments should feel morally legible and easy to accept. The player
is not initially asked to distrust the mission, the ship, or their instructions.

## Opening spaceship sequence

The first playable impression is “wow, this is my spaceship,” not a lore dump.

The opening begins from the main player's understated point of view. The
provisional presentation is a younger boy looking out from the Observation
Deck:

> “Yeah… it’s not that bad, really.”

The camera then reveals how extraordinary “not bad” is in this society:

- cancer belongs mostly to history lessons;
- ageing has slowed dramatically;
- the last war ended 247 years ago and nobody living remembers war firsthand;
- the Creation Halls feel like an unlimited universe in the basement;
- the player's daily life is almost Santa-like: travel, repair, invent, join
  local games, and leave something wonderful behind.

This is a tonal contrast, not a claim about the real world. The player sounds
casual because abundance, peace, long life, and universe-scale fabrication are
normal to him.

Required opening spaces:

- **Observation Deck:** establishes scale and the 120-island route.
- **Creation Halls:** the player may request objects, tools, prototypes, visual
  ideas, games, and fabrication support.
- **Bot Bay:** introduces the shared robot family and distinct robot identities.
- **Diplomatic Bridge:** shows the official Reconstruction Accord and first
  assignment.
- **Arena Gallery:** explains that local games are part of diplomacy, but does
  not yet expose competitive endgame championships.

Opening line direction:

> Welcome aboard. The ship is ready, the Creation Halls are listening, and 120
> islands have accepted the Reconstruction Accord.

Avoid:

- naming the Great Drift;
- saying that the ship is lost, damaged, or under attack;
- implying the mission is false;
- showing the reward bar before its diplomatic explanation;
- presenting the player as a predestined savior.

The player's exact age, name, and avatar presentation remain customizable. The
young-boy framing is the current default cinematic voice, not a restriction on
the player's chosen identity.

## Creation Halls

The Creation Halls are the fiction for player-requested content and generative
features. A request enters as an idea, becomes a holographic prototype, and is
fabricated by specialist builder bots.

Requests may include:

- a useful item;
- a room decoration;
- island equipment;
- a minigame or Arena variant;
- a visual concept;
- a plan or idea;
- a cosmetic bot part;
- a story-safe prototype.

Creation Hall output must still obey real product safety, economy, moderation,
and asset-review rules. Story fiction does not grant unrestricted gameplay
authority.

## Robot family

All builder robots share a recognizable manufacturing lineage, but they are not
copies of one personality.

### Player's PA

- Existing circular white-and-blue floating mascot.
- Friendly circular blue eyes and small smile remain identity invariants.
- Acts as personal assistant, diplomatic liaison, and first Creation Hall guide.
- Wears a transparent glassworker safety helmet/visor during construction work.
- Helmet is equipment layered over the recognizable mascot, not a redesign.

### Chief Builder

- Separate identity and face display.
- Larger, stockier body and reinforced fabrication parts.
- Amber/cyan accents, angular confident eyes, blueprint projector, specialist
  tool arms, and a distinct helmet silhouette.
- Leads construction and explains what the builder teams are doing.

### Super-builder units

- Shared family resemblance but variable eyes, work lights, tools, limbs, shell
  panels, proportions, and personalities.
- Builder units can recur across islands without implying that they are the PA.
- Unit identity should be readable through face, equipment, movement, sound, and
  name/call sign.

Visual reference:

- `docs/design/story-concepts/builder-robot-family-concept-2026-07-28.png`

## Delayed reward channel

The reward bar is not visible at the beginning of Island 1.

The system may accumulate progress invisibly so no legitimate reward progress is
lost. It becomes visible after the first Hatchery landmark reaches Level 1.
That moment represents the player asking why a diplomatic mission is receiving
supplies in return.

PA explanation:

> You asked why Luma is sending supplies back. The Reconstruction Accord keeps
> every mission reciprocal.

Supporting explanation:

> Hosts return surplus energy, game tickets, and keepsakes so visiting crews can
> continue helping the next island.

Presentation requirements:

- reveal the existing bar; do not create a second reward system;
- preserve accumulated progress;
- use a restrained “channel connected” animation;
- do not frame the exchange as payment for saving helpless people;
- repeat cycles and later islands show the bar normally.

## Arena diplomacy

Every island has an Arena tradition. Participation is part of respectful first
contact: the visiting crew accepts the host's rules, experiences what that
culture values, and contributes a personal score.

Arena participation may be:

- playful;
- ceremonial;
- tactical;
- collaborative;
- athletic;
- creative;
- puzzle-based;
- a guardian trial;
- an apparent military exercise on later islands.

It must not always mean combat.

### Player preference contract

Players rank the Arena games. The Arena adapts duration, not reward fairness:

| Preference | Arena treatment | Target duration |
| --- | --- | --- |
| Disabled (maximum 25%) | Never selected | 0 |
| Least-liked enabled games | Curated flash encounter | 10–20 seconds |
| Middle-ranked games | Fast Arena fight | 30–60 seconds |
| Favourites | Full or naturally ending run | 2–4+ minutes |

New games receive enough normal exposure to be judged before the system shortens
them. Competitive submissions compare equivalent full-run modes; flash duration
must never create an unfair leaderboard advantage.

## Championship super-levels

There are three proposed championship super-levels. The first two placements are
provisional until the full 120-island beat map is reconciled. Island 117 is
locked by product direction.

1. **First Circuit Championship — provisional Island 30**
   - One host island.
   - Celebrates the first diplomatic circuit.
   - Introduces formal brackets and island teams.

2. **120 Worlds Championship — provisional Island 72**
   - One of the 120 islands is selected as host.
   - All 120 cultures are represented.
   - The player participates in a curated series of favourite, middle, and flash
     games.
   - Establishes the network protocol later reused by Island 117.

3. **Universal Championship — Island 117**
   - Hosted by Astral Plains under the current island roster.
   - Every one of the 120 island Arenas runs simultaneously.
   - Scores, celebrations, broadcasts, and route signals synchronize across the
     entire network.
   - This synchronization creates the first trustworthy system-wide navigation
     measurement.
   - At the end, the star map proves that the destination did not move: the
     expedition has been drifting.

The Island 117 reveal should land after celebration, not interrupt the final
match. Joy becomes silence, the synchronized Arena lights become navigation
points, and the accumulated route resolves into a spiral.

## 120-island escalation

This is a pacing framework, not a replacement for per-island authored briefs.

| Range | Player understanding | Assignment character |
| --- | --- | --- |
| 1–12 | The Accord works | Clear, welcoming rebuilds and cultural Arena games |
| 13–29 | Cultures disagree about restoration | Still constructive; multiple valid local perspectives |
| 30 | First championship | Diplomatic celebration and shared rules |
| 31–49 | Orders become more standardized | Builder efficiency rises; local nuance sometimes gets lost |
| 50–71 | Reconstruction has side effects | Ruins appear; building one system can damage another |
| 72 | 120 Worlds Championship | Large celebration masks growing route inconsistencies |
| 73–90 | Some missions begin with sanctioned attacks | Disable defenses or remove a structure, then rebuild |
| 91–108 | Military instructions become harder to interpret | Evidence shows that briefings omit context |
| 109–116 | Mission and route records conflict | The ship still appears functional; Drift remains unnamed |
| 117 | Universal Championship | All 120 Arenas synchronize; trajectory truth is exposed |
| 118–120 | Course correction | The player and islands decide what the mission becomes |

## Attack-then-rebuild islands

Later islands may instruct the player to attack before building. These episodes
must preserve player trust and avoid casual harm:

- the apparent target is a defense system, automated structure, hostile machine,
  corrupted arena, or evacuated military installation;
- the briefing gives a morally simple reason at first;
- reconstruction follows through the canonical building loop;
- later evidence may show the instructions were incomplete, outdated, or
  optimized for the wrong objective;
- the player is allowed to question, repair, and change future procedure;
- civilians are never treated as disposable spectacle.

The point is not “the player was evil.” The point is that obedience, momentum,
and good intentions can still move in the wrong direction when context is lost.

## Great Drift reveal

The Drift is a later story diagnosis, not opening terminology.

Before Island 117:

- show route recalculations;
- allow small map mismatches;
- let orders become increasingly context-poor;
- show reconstruction causing unexpected destruction;
- preserve plausible non-Drift explanations.

At Island 117:

> The stars did not move. We did.

The player's work remains meaningful. The new mission is not to erase progress,
but to align accumulated momentum with a consciously chosen direction.

## Momentum Matrix story position

The block-placement game is shipboard navigation technology:

- system name: **Momentum Matrix**;
- peaceful game mode: **Chart the Course**;
- blocks: route fragments;
- line clears: stable corridors;
- Mission Beacon: chosen direction;
- Arena score: diplomatic performance;
- League contribution: shared route energy.

Runtime status (2026-07-28): the first playable exhibition slice now implements
the 8×8 matrix, route fragments, stable corridors, Mission Beacon, Arena
preference pacing, active-event ticket lifecycle, canonical resume state, and
reward-bar completion handoff. The Drift interpretation remains deliberately
absent from early-game copy and visuals.

Visual reference:

- `docs/design/story-concepts/momentum-matrix-arena-concept-2026-07-28.png`

The same visual language may become unsettling after the reveal, but opening and
early-island assets must not contain Drift corruption.

## Story asset placeholders

The following manifests are stored as display-only story content:

- `/storyline/episode-001/manifest.json` — spaceship welcome;
- `/storyline/creation-halls/manifest.json` — Creation Halls tour;
- `/storyline/diplomatic-reciprocity/manifest.json` — delayed reward explanation;
- `/storyline/championship-120-worlds/manifest.json` — mid-game championship;
- `/storyline/island-117-universal-championship/manifest.json` — synchronized
  championship and trajectory reveal.

Each folder includes an `IMAGE_BRIEF.md`. Placeholder manifests must not grant
rewards, mutate gameplay, complete stops, or travel the player.

## Delivery plan

### Phase 1 — foundation (this slice)

- Store this narrative direction.
- Preserve visual concepts in the repository.
- Replace placeholder opening copy with the spaceship/Accord framing.
- Remove premature Great Drift language from Island 1 resolution.
- Explain Arena participation as diplomacy in the live Arena card.
- Hide the Island 1 reward channel until Hatchery Level 1.
- Reframe the Hatchery L1 toast as the reciprocity explanation.
- Move the current energetic board-opening track to the three-equals Dormant
  Door game.
- Use quiet island/environment ambience as the default board score.

### Phase 2 — spaceship surfaces

- Build the Creation Halls room and request flow shell.
- Add Bot Bay/robot identity cards.
- Add PA helmet as a non-destructive character equipment asset.
- Add Chief Builder portrait, name/call sign, dialogue, and fabrication
  animations.

### Phase 3 — Arena preferences

- Add explicit ranking/tuning screen.
- Enforce the 25% disable cap.
- Implement flash, fast, and full duration contracts.
- Normalize mixed-Arena scores and keep full-run leaderboards comparable.

### Phase 4 — 120-island narrative map

- Reconcile all island briefs against the escalation table.
- Lock the first two championship host islands.
- Add attack-then-rebuild islands with safety/content review.
- Add per-island Arena cultural identity and image briefs.

### Phase 5 — championships

- Implement the three championship shells.
- Add one-host broadcast behavior for the 120 Worlds Championship.
- Add synchronized all-Arena presentation for Island 117.
- Add ranking fly-to-player, snap, glow, and celebration sequences.

### Phase 6 — late reveal

- Add foreshadowing without naming the Drift.
- Use the Island 117 network synchronization to prove the trajectory.
- Gate post-reveal story to Islands 118–120.
- Preserve Island 120 technical wrap and canonical progression.

## Acceptance criteria

- A new player sees a wonderful spaceship before a crisis narrative.
- No opening or Island 1 resolution text names or directly reveals the Drift.
- The reward bar is absent at the start of Island 1 and appears after Hatchery
  Level 1 without losing progress.
- The live Arena describes participation as diplomatic.
- The PA and Chief Builder are visibly distinct identities.
- Island 117 is documented as the Universal Championship.
- Championship and late-story content cannot mutate gameplay from story files.
- Canonical Island Run state and action authority remain unchanged.
