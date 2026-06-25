# Island 001 Narrative Vertical Slice

Status: Product and content design only  
Date: 2026-06-25  
Scope: Island 1 narrative wrapper, art/content direction, mobile UX, and implementation handoff. No product code, schema, economy, reward, stop-ID, tile-index, or save-format changes.

## Source review and hard constraints

Inspected before design:

- `AGENTS.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `docs/investigations/holistic-island-storytelling-system-audit.md`
- `public/assets/islands/island-001/island-art.json`
- `public/assets/islands/island-001/**`
- `public/storyline/episode-001/manifest.json`
- `src/features/gamification/level-worlds/services/islandRunStops.ts`
- `src/features/gamification/level-worlds/services/islandContentManifest.ts`

Design guardrails:

- The story is a thin layer over canonical Island Run events.
- Canonical stop order remains `hatchery -> habit -> mystery -> wisdom -> boss`.
- Story beats attach to island number, stop IDs, build levels, boss events, island-clear events, and travel selection only.
- No tile-index story triggers.
- No new gameplay persistence, reward economy, egg probability, creature-stat, stop-ID, or save-format requirements.
- Boss mechanics may still say “challenge,” “defeat,” and “completed”; narrative copy frames the result as calming, freeing, or restoring the guardian.
- The pilot should use existing Island 1 art wherever practical: ambient background, board circle, central crystal battle scenery, Black Crystal Dragon idle/defeated art, Hatchery level 3 art, and placeholder/current build-level landmark images.

---

## 1. Island identity

### Name options

| Option | Notes |
|---|---|
| **Luma Isle** | Short, warm, easy to say; suggests light returning to crystal without sounding generic. |
| Dawnmere | Calm and premium; suggests water, dawn, and first-island beginnings. |
| Brightholm | Friendly, sturdy, village-like; slightly more traditional fantasy. |

**Recommended island name: Luma Isle.** It fits a first island, supports the existing crystal/dragon visuals, and leaves later islands room for more specialized identities.

### Civilization name options

| Option | Notes |
|---|---|
| **The Lumin** | Simple, memorable, light/crystal resonance without complex spelling. |
| The Hearthkeepers | Warm and functional, but more occupation than civilization. |
| The Valeans | Smooth and pronounceable, but less directly tied to the Island 1 visuals. |

**Recommended civilization name: The Lumin.**

### Identity definition

- **Island name:** Luma Isle.
- **Civilization:** The Lumin.
- **Cultural identity:** A small restoration-minded harbor civilization built around crystal craft, creature care, gentle rituals, and shared maintenance of island routes.
- **Visual language:** Warm crystal glow, curved stone terraces, small lanterns, shell-like roofs, hatchery alcoves, dark crystal cracks near the center, and cozy workspaces that become brighter as landmarks restore.
- **Architectural style:** Rounded island masonry with polished crystal inlays; buildings feel handmade rather than monumental. Restored structures should glow from within instead of looking militarized.
- **Dominant colours:** Dawn gold, sea-glass teal, pearl stone, soft lavender, and black-violet corruption crystals around the dragon/Island Heart.
- **Natural environment:** A calm island basin with a central crystal arena/heart, softened cliffs, creature paths, hatchery pools, and ambient magical mist.
- **Local music style:** Gentle marimba/celeste patterns, airy pads, hand chimes, soft frame drum pulses; finale adds low cinematic strings and crystalline hits.
- **Symbols and emblems:** A three-ray dawn crystal, a spiral egg cradle, and paired hand/wing motifs representing people and guardian creatures reconnecting.
- **Common professions:** Crystal menders, routekeepers, egg caretakers, lantern makers, tide gardeners, creature path scouts, memory archivists, and festival stewards.
- **Relationship with creatures:** The Lumin once raised and collaborated with creatures as partners in navigation, farming, protection, and celebration. After the Great Drift, many creature paths went quiet and the Hatchery became ceremonial rather than active.
- **What makes this island memorable:** The first guardian is not a monster to conquer but a frightened protector wrapped in black crystal, and every restored landmark helps the island remember how to cooperate again.

---

## 2. The island's central imbalance

### Core problem

Luma Isle once depended on a living resonance between five civic landmarks and its guardian, the Black Crystal Dragon. The Great Drift severed the route network and flooded the Island Heart with a defensive black-crystal signal. The dragon interpreted the silence from neighboring islands as danger and locked the island into protection mode.

### External visible symptoms

- Dim or fractured crystal structures.
- Silent Hatchery and inactive creature paths.
- Landmarks in damaged/dormant build states.
- Citizens avoiding the center.
- Black crystal growth around the central battle scenery.
- The dragon watching, circling, or sleeping in a tense defensive posture.

### Internal social/emotional cause

The Lumin became careful to the point of isolation. They stopped asking for help, stopped sending route signals, and split into small households maintaining only what they could control. Protection became separation.

### Dragon connection

The Black Crystal Dragon, named **Noctyra** in story copy, was the island's route guardian. Before the Great Drift, Noctyra amplified safe passage signals and protected hatchery paths. After the Drift, Noctyra absorbed corrupted route noise and formed black crystal armor to shield the island. The dragon appears hostile because it is guarding against a danger it cannot identify.

### Great Drift relationship

Island 1 reveals that the Great Drift may have included an unnatural disruption of guardian-route bonds. The corrupted crystal is not merely local damage; it contains a repeating interruption pattern that resembles a deliberate signal.

### Life lesson

**Primary lesson: Small acts of trust reopen connection.** The user-facing message is not “fix everyone” or “work harder.” It is: begin with one steady action, accept help, and let connection return in small, safe steps.

---

## 3. The player's mission

- **Who sends the mission:** The Compass Expedition, a small restoration and diplomatic crew rebuilding island routes after the Great Drift.
- **Initial belief:** Luma Isle is unreachable because its central guardian has become aggressive and is blocking navigation.
- **True problem:** The guardian is trapped in defensive resonance, and the Lumin's fear has kept the five landmarks from reconnecting.
- **Why outsiders are needed:** The Lumin cannot safely approach the Island Heart; their old route songs trigger Noctyra's alarm. A new expedition member can bring an outside signal that is not tied to the island's old panic loop.
- **Why the civilization has not solved it alone:** They tried force, silence, and waiting. None worked. They are emotionally invested, afraid of losing the dragon, and divided about whether to restore the old bonds.
- **First request to the player:** Meet the Hatchery caretaker and help restart one gentle creature-care ritual.
- **Gradual discovery:** The dragon is protecting a route message, the landmarks are civic trust anchors, and the final challenge is not domination but reaching the guardian through corrupted crystal defenses.
- **Player role:** A new expedition member who contributes practical effort, listens to local knowledge, and helps the Lumin take the next shared step.

---

## 4. Core cast

### A. Local guide — Miri

- **Name:** Miri.
- **Role:** Young routekeeper and unofficial first-contact guide.
- **Personality:** Alert, warm, a little too responsible, uses humor when nervous.
- **Visual description:** Teen/young adult Lumin routekeeper, sea-glass scarf, crystal lantern satchel, short wind-tossed hair, dawn-gold accents, practical boots.
- **Speaking style:** Short, vivid, lightly teasing; says what she sees.
- **Emotional arc:** Starts protective and skeptical; ends confident enough to ask her own people for help.
- **Initial attitude:** “Glad you came, but please do not make this worse.”
- **End state:** Treats the player as a trusted expedition partner.
- **Visual-generation description:** Cozy magical island guide, sea-glass teal scarf, warm dawn crystal lantern, expressive eyes, premium mobile game portrait, transparent background.
- **Portrait pose suggestion:** Three-quarter view, lantern held at chest height, cautious smile.
- **Example dialogue:**
  1. “Welcome to Luma Isle. Step softly—the crystals listen.”
  2. “That shadow in the center? That used to be our safest place.”
  3. “I want to trust your crew. I am practicing.”
  4. “One light came back. I forgot how bright that felt.”
  5. “Noctyra heard you. I think she heard all of us.”

### B. Wisdom figure — Elder Sava

- **Name:** Elder Sava.
- **Role:** Memory keeper, former dragon-song engineer, keeper of the Wisdom Terrace.
- **Personality:** Dry wit, observant, practical, kind without being soft.
- **Relationship to dragon:** Helped tune Noctyra's route resonance before the Drift; feels responsible for not understanding the corruption sooner.
- **What they know:** The dragon's black crystals pulse in a pattern that resembles interrupted route language.
- **What they initially withhold:** Sava suspects the disruption was deliberate, but withholds that until the player has seen enough to understand without panic.
- **Wisdom framing:** Reflection is treated as listening practice: noticing what we protect, what we avoid, and where a safe request for help can begin.
- **Visual-generation description:** Elder crystal engineer and memory keeper, pearl-stone robe, tiny brass tools, lavender shawl, kind sharp eyes, no guru pose, transparent background.
- **Portrait pose suggestion:** Seated beside a small crystal tuning frame, one eyebrow raised.
- **Example dialogue:**
  1. “Wisdom is not a throne. It is a workbench.”
  2. “Protection can become a locked door if no one checks the hinges.”
  3. “Do not fight the question. Hold it gently.”
  4. “Noctyra is not calling for battle. She is stuck on warning.”
  5. “There. That pattern is older than this fear.”

### C. Black Crystal Dragon — Noctyra

- **Name:** Noctyra, the Black Crystal Dragon.
- **Guardian role:** Route guardian, hatchery protector, amplifier of safe travel signals.
- **Personality before the Drift:** Patient, watchful, playful with hatchlings, proud of guiding travelers safely between islands.
- **Current condition:** Encased in reactive black crystal armor; perceives approach as threat; partially awake, partially trapped in a repeating alarm.
- **Why it appears hostile:** It blocks anything resembling route activation because the last full route signal coincided with the Great Drift.
- **What it protects:** The Island Heart, dormant hatchery pathways, and a damaged message fragment hidden inside corrupted crystal.
- **What it needs:** Enough restored landmark resonance to distinguish help from danger.
- **Restoration meaning:** The dragon remains powerful, but its posture changes from defensive isolation to shared guardianship.
- **Visual-generation description:** Existing black crystal dragon guardian adapted for story pose, cinematic but not evil, dark violet crystal armor, wounded luminous eyes, magical island center.
- **Portrait pose suggestion:** Large head/shoulders crop, one eye visible through cracked black crystal.
- **Example dialogue:**
  1. “...Stay... back...”
  2. “Routes broke. Wings failed. Protect the small lights.”
  3. “Not enemies. Noise. Too much noise.”
  4. “I remember lanterns.”
  5. “The path is not gone.”

### D. Supporting citizen — Poko

- **Name:** Poko.
- **Role:** Hatchery tinkerer and snack-stall repair volunteer.
- **Personality:** Funny, skeptical, generous, speaks before thinking.
- **Purpose:** Provides warmth, ordinary citizen stakes, and a less reverent view of local tradition.
- **Visual-generation description:** Cheerful Lumin tinkerer, apron full of crystal tools, round snack basket, anxious grin, cozy magical village portrait, transparent background.
- **Portrait pose suggestion:** Half turn with a repair tool in one hand and a pastry in the other.
- **Example dialogue:**
  1. “If bravery had instructions, I misplaced them.”
  2. “Good news: the Hatchery coughed. Bad news: buildings should not cough.”
  3. “I doubted you politely. That counts, right?”
  4. “The dragon blinked. I blinked back. Diplomacy!”
  5. “Please tell Island 2 we are normal here.”

### E. Travelling expedition voice — Captain Ivo

- **Decision:** Use one light travelling voice for the pilot, but keep them mostly in prologue/transition copy so the local cast can carry Island 1.
- **Name:** Captain Ivo.
- **Role:** Compass Expedition leader who assigns the first field mission.
- **Personality:** Calm, premium, concise, respectful of local sovereignty.
- **Visual-generation description:** Calm expedition captain, warm travel coat, compass insignia, soft premium UI portrait, transparent background.
- **Portrait pose suggestion:** Front-facing with hand near compass pin, reassuring expression.
- **Example dialogue:**
  1. “You are here to listen first.”
  2. “Restoration is not conquest.”
  3. “The first route signal points to Luma Isle.”
  4. “Bring back what they choose to share.”
  5. “When the route opens, we follow it together.”

---

## 5. Opening prologue

Target: 8 panels. Suitable for `IslandStoryReader`. No story reward.

| # | Type | Image description | Text/caption | Sound/music | Movement | Transition |
|---:|---|---|---|---|---|---|
| 1 | Image panel | A chain of bright islands connected by glowing sea routes; tiny ships, flying creatures, and lanterns move between them. | “Long ago, the islands were connected.” | Warm celeste, soft waves. | Slow parallax drift across route lines. | Fade in from white. |
| 2 | Image panel | Markets, libraries, hatcheries, and guardians sharing routes; a dragon silhouette guides travelers. | “People, creatures, and guardians shared what each island knew.” | Add hand chimes. | Gentle sparkle on route lights. | Crossfade. |
| 3 | Animated panel | Route lights flicker; a dark ripple crosses the map. | “Then came the Great Drift.” | Low crystal swell. | Route lines snap out one by one; reduced motion uses still before/after. | Hard dim, then dissolve. |
| 4 | Image panel | Islands separated by mist; guardian silhouettes withdraw; creatures look toward broken paths. | “Routes vanished. Bonds went quiet.” | Sparse piano notes. | Minimal mist movement. | Fade through fog. |
| 5 | Image panel | Compass Expedition ship/air-skiff preparing: maps, supply crates, creature-care tools, Compass Book. | “Now, a restoration expedition follows the lost signals.” | Hopeful pulse enters. | Camera pushes toward Compass Book. | Page-turn wipe. |
| 6 | Text panel with emblem | Compass emblem over a dark sea route, one point glowing. | “Your first assignment is simple: arrive with respect, listen closely, and help where invited.” | Calm captain motif. | None. | Tap-to-continue. |
| 7 | Image panel | Luma Isle appears ahead, beautiful but dim; black crystal glints at the center. | “The first signal leads to Luma Isle.” | Music shifts to mysterious island ambience. | Slow approach. | Crossfade. |
| 8 | Image panel | The Black Crystal Dragon opens one luminous eye from the center. | “Something there is still protecting the light.” | Low dragon breath, no jump scare. | Eye glow only; reduced motion still glow. | Fade to Island 1 arrival. |

---

## 6. Island arrival sequence

Target: 6 panels, 10-25 seconds if tapped quickly, skippable after first viewing, replayable from future archive.

| # | Type | Image description | Text/caption | Sound/music | Movement | Transition |
|---:|---|---|---|---|---|---|
| 1 | Image panel | Expedition craft reaches Luma Isle at dawn; ambient background style with muted glow. | “Luma Isle should be shining by now.” | Soft wind, subdued chimes. | Slow horizontal drift. | Fade up from prologue/map. |
| 2 | Image panel | Empty creature paths and a silent Hatchery entrance; egg cradles unlit. | No caption. | Hatchery ambience absent; one hollow chime. | Tiny dust motes. | Cut on chime. |
| 3 | Image panel | Dim landmark silhouettes around the board circle; crystals fractured but not ruined. | “The landmarks are standing... but quiet.” | Low warm pad. | Gentle camera tilt across landmarks. | Crossfade. |
| 4 | Image panel | Miri watches from behind a lantern post, lowering a warning hand. | Miri: “Careful. The center hears fear faster than footsteps.” | Lantern click, soft cloth movement. | Character blink optional. | Dialogue bubble slides in. |
| 5 | Animated panel | Central battle crystal scenery with black-violet pulses; dragon silhouette/idle art visible in distance. | “At the Island Heart, Noctyra waits.” | Dragon breath, distant crystal rumble. | Pulse glow; reduced motion uses static with sound only if enabled. | Slow dark vignette, then release. |
| 6 | Image panel | Miri and player viewpoint face the Hatchery path; a small safe lantern glows. | Miri: “Start small. Help us wake one gentle place.” | Hope motif returns. | Lantern glow brightens. | Fade to board ready / Hatchery prompt. |

---

## 7. Complete story-beat map

Story-beat count: **30 beats**. Beats are content wrappers only and do not create gameplay authority.

| Beat ID | Trigger | First-time or repeatable | Story purpose | Character | Surface | Content summary | Player action required | Canonical gameplay dependency | Suppression rule | Failure/fallback behaviour |
|---|---|---|---|---|---|---|---|---|---|---|
| I001-B01 | App/Island Run prologue needed before first Island 1 entry | First-time | Establish world and expedition | Captain Ivo | Story reader | Great Drift and first assignment prologue | Tap/skip/close | Existing prologue auto-launch pattern | Suppress after `storyPrologueSeen` or local fallback | If media fails, text-only prologue card |
| I001-B02 | Prologue closed, first Island 1 entry | First-time | Show Luma Isle is beautiful but wrong | Miri | Story reader | Arrival sequence | Tap/skip | Island number 1 | Suppress after arrival-seen local story flag when implemented | If unavailable, show one dialogue modal summary |
| I001-B03 | Arrival closed / board ready | First-time | Give first objective | Miri | Dialogue modal | “Start with the Hatchery.” | Tap Continue | Active stop `hatchery` | Once per island/user | If closed, objective remains canonical |
| I001-B04 | Stop opened: `hatchery` | First-time | Explain creature bond | Poko | Dialogue modal | Hatchery is quiet, not dead | Engage existing Hatchery flow | Active stop `hatchery` | Once per stop first open | If skipped, standard Hatchery UI |
| I001-B05 | Stop completed: `hatchery` | First-time | Show first trust signal | Miri/Poko | Construction reaction/audio cue | One cradle light answers | Continue | Hatchery completion event | Once | Use toast: “A Hatchery light returns.” |
| I001-B06 | Landmark `hatchery` level reached 1 | First-time | Build meaning | Poko | Construction reaction | “It remembers warmth.” | None | Build level 1 for hatchery | Once | No-op if missed |
| I001-B07 | Landmark `hatchery` level reached 2 | First-time | Creature paths stir | Companion optional | Companion bubble | “Something small is listening.” | None | Build level 2 | Once | Suppress if no companion |
| I001-B08 | Landmark `hatchery` level reached 3 | First-time | Restored Hatchery civic function | Miri | Dialogue modal | Hatchery can welcome bonds again | Tap | Build level 3 | Once | Toast fallback |
| I001-B09 | Stop opened: `habit` | First-time | Connect real effort safely | Miri | Dialogue modal | Help relight the Routekeeper Steps through one healthy action | Complete existing habit/action flow | Active stop `habit` | Once | Standard Habit Landmark UI |
| I001-B10 | Stop completed: `habit` | Repeatable short first completion; full once | Reinforce action without guilt | Miri | Celebration copy | “One steady action is enough for today.” | Continue | Habit stop completion | Full once; short copy may repeat | Standard completion copy |
| I001-B11 | Landmark `habit` level reached 1 | First-time | Work crews return | Poko | Construction reaction | Citizens test lantern lines | None | Habit build level 1 | Once | Silent art swap |
| I001-B12 | Landmark `habit` level reached 2 | First-time | Cooperation expands | Miri | Dialogue modal | “They are working together again.” | Tap | Habit build level 2 | Once | Toast fallback |
| I001-B13 | Landmark `habit` level reached 3 | First-time | Restore routekeeper trust | Miri | Audio cue + dialogue | Route chime rings clearly | Tap | Habit build level 3 | Once | Audio omitted if disabled |
| I001-B14 | Stop opened: `mystery` | First-time per mystery variant | Frame flexible activity | Poko | Minigame framing | Gathering Grounds host a restoration practice | Launch existing activity | Active stop `mystery`; content kind | Once per variant | Use generic “Try a restoration practice.” |
| I001-B15 | Mystery activity completed | Repeatable short; story once | Show culture returning | Poko/companion | Celebration copy | Citizens add one lantern to the grounds | Continue | Mystery stop completion or activity result | Story once | Standard result screen |
| I001-B16 | Landmark `mystery` level reached 1 | First-time | Public space reopens | Poko | Construction reaction | Benches and banners return | None | Mystery build level 1 | Once | Silent art swap |
| I001-B17 | Landmark `mystery` level reached 2 | First-time | Shared rituals resume | Miri | Dialogue modal | “This was never just a plaza.” | Tap | Mystery build level 2 | Once | Toast fallback |
| I001-B18 | Landmark `mystery` level reached 3 | First-time | Island majority morale | Poko | Audio cue | Festival bell test | None | Mystery build level 3 | Once | No-op if audio disabled |
| I001-B19 | Stop opened: `wisdom` | First-time | Introduce Sava and reflection | Elder Sava | Wisdom wrapper | Listening Terrace asks what protection has become | Complete existing Wisdom/Compass flow | Active stop `wisdom` | Once | Existing Wisdom UI without wrapper |
| I001-B20 | Wisdom response submitted/completed | First-time | Reveal dragon not evil | Elder Sava | Dialogue modal | Noctyra is stuck on warning | Tap | Wisdom stop completion | Once | Toast: “Sava shares a route clue.” |
| I001-B21 | Landmark `wisdom` level reached 1 | First-time | Archive reopens | Elder Sava | Construction reaction | Dust covers less of the maps | None | Wisdom build level 1 | Once | Silent art swap |
| I001-B22 | Landmark `wisdom` level reached 2 | First-time | Clue pattern appears | Elder Sava | Visual overlay/dialogue | Interrupted route rhythm | Tap | Wisdom build level 2 | Once | Text-only clue summary |
| I001-B23 | Landmark `wisdom` level reached 3 | First-time | Knowledge shared publicly | Miri/Sava | Dialogue modal | “We stop hiding the map.” | Tap | Wisdom build level 3 | Once | Toast fallback |
| I001-B24 | First restored structure among any landmark | First-time | Island-wide momentum | Miri | Construction reaction | “The island noticed.” | None | Any build reaches level 3 | Once | No-op |
| I001-B25 | Majority landmarks restored | First-time | Show civic confidence | Poko | Companion bubble/dialogue | “People are coming outside.” | None | 3 of 5 landmark build tracks level 3 or equivalent | Once | Toast fallback |
| I001-B26 | All required builds complete / boss eligible | First-time | Trigger finale setup | Miri/Sava | Finale introduction | Center opens; dragon wakes | Tap Start/Continue | Boss eligible through canonical rules | Once until boss resolved | If skipped, boss challenge available |
| I001-B27 | Boss challenge started | Repeatable | Frame mechanics symbolically | Noctyra/Miri | Audio cue/visual overlay | Break corrupted crystal, not the dragon | Play boss challenge | Canonical boss challenge start | Intro full once; short retry repeats | Standard boss challenge |
| I001-B28 | Boss challenge mid-state if supported, else pre-resolution | First successful run preferred | Reveal motive | Noctyra | Dialogue/overlay | “Protect the small lights.” | Continue/play | Boss challenge progress or resolved pending | Once | Include reveal in victory if no mid hook |
| I001-B29 | Boss resolved / boss stop completed | First-time | Convert “defeat” to restoration | Noctyra/Sava/Miri | Resolution scene | Armor cracks; guardian bond renews | Tap through | Boss resolved, stop completed | Once | Text-only victory modal |
| I001-B30 | Island cleared then travel selected | First-time for clear; travel repeatable CTA | Earn transition to Island 2 | Miri/Noctyra/Captain Ivo | Celebration copy/travel CTA | Route opens; next signal answers | Tap canonical Travel | Island cleared and travel selected | Clear scene once; CTA can repeat | Standard travel action unchanged |

---

## 8. Five-landmark narrative integration

### Hatchery

The Hatchery is the Lumin's oldest trust house: not a pet shop, but a quiet civic space where creature eggs, caretakers, and families learned each other's rhythms. It became inactive because creature paths shut down after Noctyra entered defense mode. Existing egg placement/incubation is framed as tending warmth, patience, and safe welcome. If an egg ceremony occurs, it celebrates an existing acquired egg or diplomatic promise only; it never creates a reward by itself.

### Habit Landmark — Routekeeper Steps

Player-facing name: **Routekeeper Steps**. This landmark represents daily maintenance: lanterns trimmed, paths swept, signals checked. The player's real-world effort contributes a symbolic “steady light,” but dialogue must avoid pressure. Citizens are not helplessly dependent on the user; the user's action simply lets the expedition match local effort for the day.

Recommended tone: “One steady action helps us tune the route,” not “If you fail, the island suffers.”

### Mystery Landmark — Gathering Grounds

Canonical ID remains `mystery`. Recommended player-facing identity: **Gathering Grounds**.

The Gathering Grounds can naturally host breathing, check-ins, habit actions, Vision Quest, and event minigames as public restoration practices: quiet breath circles, lantern check-ins, route trials, and festival games. The content kind can rotate without the place feeling random.

### Wisdom Landmark — Listening Terrace

The Wisdom landmark is a cliffside crystal terrace and archive where Elder Sava keeps route memories. Existing Wisdom Tree or Compass content is introduced as a listening practice: “What are you protecting, and where could help safely enter?” The wrapper must not override Compass persistence; it only frames the encounter and reacts to completion.

### Boss Landmark / Island Heart

Canonical ID remains `boss`. Player-facing name: **Island Heart** or **Heart Crystal**. It is inaccessible at first because Noctyra's defensive black crystal rejects route activation. Building the Boss Arena to Level 3 is narratively interpreted as restoring resonance pylons around the Heart—not constructing a combat arena. The dragon awakens because the restored landmarks finally create a signal clear enough to reach it. The finale resolves the island story by breaking the corrupted alarm loop.

---

## 9. Building progression

| Landmark | Level | Visible change | Narrative meaning | Character reaction | Optional sound cue | Existing art likely supports it? |
|---|---:|---|---|---|---|---|
| Hatchery | 0 | Dormant cradle, unlit paths | Creature bond is quiet | Poko: “It is sleeping with one eye open.” | Hollow chime | Partly; L1/L2 placeholders, L3 specific art |
| Hatchery | 1 | Small repaired cradle light | Safe warmth returns | Poko: “It remembers warmth.” | Soft egg-shell tap | Placeholder supports swap |
| Hatchery | 2 | More lanterns/paths implied | Creature paths begin listening | Companion: “Something small is listening.” | Tiny chirp | Placeholder supports swap |
| Hatchery | 3 | Restored Hatchery art | Civic creature-care space reopens | Miri: “The Hatchery feels like a welcome again.” | Warm chime | Yes: `hatchery-l3.webp` |
| Routekeeper Steps | 0 | Damaged/dim step landmark | Daily maintenance abandoned | Miri: “The path is here. The habit is missing.” | Wind | Placeholder only |
| Routekeeper Steps | 1 | First lantern line | One steady action anchors effort | Miri: “One light is enough to begin.” | Lantern tick | Placeholder supports swap |
| Routekeeper Steps | 2 | Work crews/banners implied | Cooperation becomes visible | Miri: “They came back together.” | Two chimes | Placeholder supports swap |
| Routekeeper Steps | 3 | Fully bright route steps | Habit becomes shared rhythm | Poko: “I can find my own feet again.” | Clear route chime | Placeholder supports swap |
| Gathering Grounds | 0 | Empty plaza/trial ground | Community rituals paused | Poko: “Festivals are awkward with no festival.” | Distant bell | Placeholder only |
| Gathering Grounds | 1 | Benches/lanterns return | Public space feels safe | Poko: “A bench! Civilization returns.” | Small bell | Placeholder supports swap |
| Gathering Grounds | 2 | Banners/practice circles | Shared practices resume | Miri: “People are breathing out.” | Crowd murmur | Placeholder supports swap |
| Gathering Grounds | 3 | Restored pavilion/grounds | Culture is active again | Poko: “I call this a cautious party.” | Festival bell | Placeholder supports swap |
| Listening Terrace | 0 | Closed archive, dim crystal | Knowledge is held privately | Sava: “Dust is also a decision.” | Page rustle | Placeholder only |
| Listening Terrace | 1 | Map table visible | Remembering begins | Sava: “Good. The old lines still answer.” | Paper + chime | Placeholder supports swap |
| Listening Terrace | 2 | Crystal tuning frame glows | Clue pattern becomes readable | Sava: “That interruption was shaped.” | Low resonance | Placeholder supports swap |
| Listening Terrace | 3 | Open archive terrace | Wisdom returns to public care | Miri: “We stop hiding the map.” | Bright page turn | Placeholder supports swap |
| Island Heart | 0 | Black crystal center, dragon tense | Guardian locked in defense | Noctyra: “Stay back.” | Low rumble | Yes: scenery + idle dragon |
| Island Heart | 1 | First resonance pylon implied | Center can hear one landmark | Sava: “The warning softened.” | Deep pulse | Existing scenery, no separate boss levels confirmed |
| Island Heart | 2 | Cracks of warm light implied | Dragon distinguishes help from threat | Miri: “She looked at us, not through us.” | Crystal crackle | Existing scenery, optional overlay may help |
| Island Heart | 3 | Heart circle ready | Finale can begin | Sava: “Now we ask, not attack.” | Cinematic swell | Existing scenery + boss idle |

### Island-wide construction reactions

1. **First restored structure:** Miri: “The island noticed.” Optional one-screen shimmer over restored landmark.
2. **Majority restored:** Poko: “People are coming outside. I should have worn my brave apron.” Optional tiny ambient crowd murmur.
3. **All required builds complete:** Sava: “The five lights are speaking again. The center will answer.” Cinematic but skippable finale prompt.

---

## 10. Wisdom encounter design

- **Introduced by:** Elder Sava at the Listening Terrace.
- **Story context:** The Lumin have protected themselves by closing routes, but protection without review has become isolation.
- **Primary lesson:** Small acts of trust reopen connection.
- **Reflection question type:** “Where could a small, safe request for help make something lighter?” or “What are you protecting that may need a little air?”
- **Possible player choices:**
  - “Ask for help with one small thing.”
  - “Restart one routine gently.”
  - “Listen before deciding.”
  - “Set one boundary, then open one window.”
- **Non-judgmental response style:** Sava validates any choice as a tuning note, not a diagnosis.
- **Story reveal after completion:** Sava shows that Noctyra's black crystal pulses in an interrupted route pattern. The guardian is not evil; it is stuck repeating a warning from the day of the Drift.

### Content classification

- **Existing content to reuse:** Wisdom Tree cards; Compass Book island fragments and persistence; existing Wisdom stop completion flow.
- **New writing needed:** Sava intro/outro wrapper, short non-judgmental response lines, Great Drift clue reveal copy.
- **Must not create new persistence:** Player choices beyond current Wisdom/Compass systems; story-specific “lesson selected” state; permanent branching outcomes.

---

## 11. Mystery/event framing

| Activity | Local cultural explanation | Introduction dialogue | Completion reaction | Restoration contribution |
|---|---|---|---|---|
| Breathing | Lumin routekeepers calm crystal signals through paced breath before sending routes. | Miri: “The crystals copy our hurry. Let us slow the signal.” | Poko: “The plaza stopped buzzing. I did too, mostly.” | Lowers narrative noise around the Gathering Grounds. |
| Quick check-in | Citizens use lantern tokens to name what is steady and what needs care. | Poko: “Tiny question, tiny lantern. Very official.” | Miri: “A named worry is easier to carry together.” | Helps citizens return to shared awareness. |
| Habit action | A route trial where one concrete action lights one public marker. | Miri: “No grand vow. One action we can actually keep.” | Miri: “That light is honest because it was earned gently.” | Shows restoration through sustainable effort. |
| Vision Quest | A quiet look toward the next route, framed as imagining what connection could become. | Sava: “Do not predict the future. Invite it to sit nearby.” | Sava: “A route begins as a direction, not a guarantee.” | Connects Luma Isle to the broader expedition. |
| Event minigame | Festival rehearsal or route-signal game hosted in the Gathering Grounds. | Poko: “If this is a test, why are there snacks? Never mind. I approve.” | Poko: “That looked important. Also loud. Good loud.” | Reintroduces play as civic bonding without changing event logic. |

Underlying activity logic, launch requirements, completion, rewards, tickets, and persistence remain unchanged.

---

## 12. Companion commentary

Companion commentary is optional, non-blocking, and generic for any active companion. If no companion is active, omit the bubble or replace only critical guidance with Miri/Poko copy.

1. Arrival: “This place is quiet in the wrong way.”
2. Arrival: “I smell old lightning near the center.”
3. Hatchery: “Egg-warmth. Safe warmth.”
4. First build: “It heard us!”
5. Majority restored: “More footsteps. Less hiding.”
6. Wisdom: “Listening feels like tracking a soft sound.”
7. Boss eligible: “Big wings. Big fear. Stay kind.”
8. Mid-finale: “The dragon is guarding something.”
9. Resolution: “Her breath changed.”
10. Travel: “The next path is awake.”

Fallback when no companion is active: no bubble by default. For required comprehension, use Miri/Sava one-line dialogue instead. Companion commentary must never block buttons, stop completion, boss launch, or travel.

---

## 13. Finale design

### A. Finale setup

The player understands that Noctyra is not evil. Restored landmarks create a clean resonance around the Island Heart. The Lumin initially fear the dragon will attack when the center opens. The player and Sava suspect the challenge is to break black crystal corruption and reach the guardian's true signal.

### B. Encounter framing

If gameplay remains conventional score/combat-like boss play, every successful action symbolically means one of:

- breaking corrupted black crystal around Noctyra,
- reaching the guardian through defensive energy,
- restoring resonance from the five landmarks,
- disrupting the Great Drift alarm signal,
- proving calm persistence rather than aggression.

UI copy can still call the canonical action “challenge” while narrative bubbles say “reach,” “clear,” “steady,” or “restore.”

### C. Mid-finale reveal

Noctyra's crystal armor briefly opens and the player sees a memory: hatchlings sheltering under her wings as route lights fail. She was protecting the smallest lives when the Drift hit.

### D. Resolution

Mechanical “defeat” means the corrupted defense shell breaks. Noctyra lowers her head, the defeated art can be interpreted as exhausted/restored rather than killed, and warm light returns through cracks in the black crystal.

### E. Emotional payoff

- **Miri:** Lets herself approach the center for the first time.
- **Sava:** Admits the dragon was carrying a warning, not a curse.
- **Noctyra:** Changes from alarm to guardianship, offering a route spark.
- **Civilization:** Citizens emerge with lanterns and restore the bond publicly.

### Dialogue

**Intro:**

- Miri: “The center is opening. I am scared. I am coming anyway.”
- Sava: “Aim for the crystal around her, not the heart inside it.”
- Noctyra: “Routes broke. Protect the small lights.”

**Mid-finale:**

- Noctyra: “Too much noise. Cannot find home.”
- Miri: “She is not pushing us away. She is holding the door shut.”
- Sava: “There—the signal repeats. Break the interruption.”

**Victory:**

- Noctyra: “I remember lanterns.”
- Miri: “Noctyra... we are still here.”
- Sava: “Not defeated. Reached.”

**Failure/retry:**

- Miri: “She is still listening. We can try again.”
- Sava: “Rest. Then return with a steadier signal.”
- Noctyra: “Stay... safe...”

### Accessibility-safe reduced-motion presentation

- Replace rapid shakes/flashes with still-panel swaps and gentle opacity changes.
- Use non-flashing crystal crack states.
- Keep dialogue readable with manual tap progression.
- Audio/haptics respect user consent and preferences.
- Failure/retry copy stays calm; no shame language.

---

## 14. Resolution episode

Target: 7 panels. No new reward claims.

| # | Type | Image description | Text/caption | Sound/music | Movement | Transition |
|---:|---|---|---|---|---|---|
| 1 | Image panel | Black crystal shell cracks; warm dawn light spills around Noctyra. | “The warning breaks.” | Crystal release, music softens. | Slow glow; reduced motion still. | Fade from boss result. |
| 2 | Image panel | Noctyra lowers her head near Miri; Miri reaches but does not grab. | Miri: “We are still here.” | Dragon breath turns gentle. | Small eye blink. | Crossfade. |
| 3 | Image panel | Hatchery cradles and creature paths glow; citizens place lanterns. | “The Hatchery wakes to welcome, not alarm.” | Warm chimes, soft creature chirps. | Lanterns appear one by one. | Lantern wipe. |
| 4 | Image panel | Five landmarks visible around the island with restored lights. | “Luma Isle remembers how to work together.” | Celebration loop low volume. | Slow camera pullback. | Crossfade. |
| 5 | Image panel | Sava reveals a shard with an unfamiliar symbol inside black crystal. | Sava: “This interruption was shaped by someone.” | Low mystery motif. | Symbol glows once. | Cut to close-up. |
| 6 | Text/image panel | Compass Book records a route fragment; next island signal pulses faintly. | “One route opens. Another answers.” | Compass ping. | Map line extends. | Page-turn. |
| 7 | Image panel | Miri, Poko, Sava, Noctyra, and expedition lantern face the horizon. | Miri: “Follow it. And come back with stories.” | Hopeful travel motif. | Gentle horizon shimmer. | Fade to travel CTA. |

---

## 15. Egg or diplomatic-bond ceremony

### Version A — Existing egg acquisition occurs

If the canonical gameplay path awards or surfaces an egg through existing systems, the ceremony frames it as a diplomatic creature bond.

- Poko presents the egg as “already yours by the Hatchery's choosing,” not a new story reward.
- Miri says the egg represents future cooperation between the expedition and Luma Isle.
- Noctyra warms the cradle with a small breath of restored light.
- Rarity, egg type, incubation, collection, and economy remain entirely controlled by existing systems.

Sample copy: “This egg came through the old rules of the Hatchery. We will honor those rules—and the bond it begins.”

### Version B — No egg is awarded during this flow

If no egg is awarded, the ceremony becomes a diplomatic bond without item grant.

- The Lumin relight the Hatchery crest.
- Poko promises the Hatchery will recognize future creature-care visits.
- Noctyra offers a route spark, not an egg.
- No inventory, rarity, economy, or collection state changes occur.

Sample copy: “No egg is ready today. But the Hatchery is listening again, and that is a real beginning.”

---

## 16. Great Drift clue

| Alternative | Description | Pros | Cons |
|---|---|---|---|
| **Recommended: Unfamiliar symbol inside corrupted crystal** | A small black crystal shard from Noctyra contains a clean, repeated mark that does not match Lumin craft. | Visual, simple, suggests deliberate disruption, reusable clue motif. | Needs one clue image. |
| Interrupted diplomatic transmission | Sava recovers a partial message: “Do not open the eastern—” before static. | Directly ties to travel routes and Island 2. | More exposition-heavy. |
| Fragment of navigation mechanism | The dragon protected a broken route compass gear that should not exist on Luma Isle. | Strong mystery object. | May imply tech/lore decisions not yet made. |

**Recommended clue:** unfamiliar symbol inside corrupted crystal.

Casual player understanding: “Someone or something may have interfered with the guardian bonds.” It points forward without naming a faction.

---

## 17. Travel to Island 2

- **Why route becomes available:** Noctyra's restored route spark reconnects one outbound path from the Island Heart.
- **New mission/signal:** The Compass Book receives a faint answer from Island 2, carrying the same interruption rhythm at lower strength.
- **Guide line:** Miri: “The route is open because we opened it together.”
- **Dragon contribution:** Noctyra breathes a protective crystal spark into the route line, stabilizing travel.
- **Emotional note:** Hopeful beginning, not final triumph. Luma Isle is safer, but the Great Drift mystery is larger.

CTA copy options:

1. **Follow the restored route** — recommended; specific, earned, and poetic.
2. Set course for Island 2 — clear and functional.
3. Continue the Reconnection — thematic but slightly abstract.
4. Answer the next signal — mystery-forward.

Underlying canonical travel action remains unchanged.

---

## 18. Repeat visits and skipped content

| Scenario | Behaviour | Graceful fallback copy |
|---|---|---|
| Player skips prologue | Close immediately and mark seen through existing prologue flow if supported; gameplay continues. | “The expedition briefing is saved for later.” |
| Player skips arrival | Board opens; Hatchery prompt may show as short dialogue. | Miri: “Short version: the island needs careful help.” |
| Player closes dialogue | Dialogue suppresses or can be reopened later; no gameplay blocking. | “Story closed. Your landmark is still ready.” |
| Returns before completion | Show short optional status line based on active stop/build state. | “Luma Isle is still waking, one landmark at a time.” |
| Returns after completion | Show restored-island greeting, no full replay unless archive selected. | Miri: “Welcome back. The route lights held.” |
| No companion | Omit companion bubbles; key story stays with local cast. | None unless needed: “Miri walks beside you.” |
| Media fails to load | Text-only panel with alt summary and Continue. | “A dim island appears, its center wrapped in black crystal.” |
| Audio disabled | Visuals and captions carry the beat; no prompt to enable audio. | “Audio is off. Story continues silently.” |
| Reduced motion enabled | Use stills, fades, no rapid zoom/shake/flash. | “Reduced-motion story mode.” |
| Local story suppression unavailable | Default to non-blocking; avoid repeated auto-launch loops by requiring player tap for optional scenes. | “Story moment available.” |

The story must never prevent stop opening, stop completion, build progression, boss challenge, island clear, or travel.

---

## 19. Mobile UX specification

### Limits

- **Dialogue bubble length:** 75 characters ideal, 110 maximum.
- **Bubbles per interruption:** 1-2 routine; 3 maximum for major beats; finale may use 4 if user-tapped.
- **Panel text length:** 1 short sentence, 2 only when necessary; 120 characters max per panel.
- **Modal height:** Use viewport-safe top-level portal; target max 82vh with internal scroll only if needed.
- **Tap targets:** 44x44 CSS px minimum.
- **Skip controls:** Always visible after first panel for prologue/arrival/resolution; never hidden behind animation.
- **Replay controls:** Future archive entry; not auto-replayed except first-time major scenes.
- **Audio controls:** Respect existing music/SFX preferences and mobile autoplay rules; never require sound.
- **Reduced motion:** Prefer stills/fades; no flashing crystal pulses.
- **Loading states:** Skeleton panel or blurred still with “Loading story...” and Continue if timeout occurs.
- **Modal stacking:** One story modal at a time; no nested stop modal behind full-screen story without a clear return path.

### Launch recommendations

| Beat type | Recommendation |
|---|---|
| Opening prologue | Auto-launch first time only; skippable. |
| Island arrival | Auto-launch immediately after prologue/first entry; skippable after first panel. |
| Routine stop wrappers | Wait for player tap on stop; short modal/bubble. |
| Build reactions | Small notification or one bubble; never full-screen except all-builds-complete. |
| Companion comments | Optional small bubble; auto-dismiss; non-blocking. |
| Wisdom wrapper | Open when Wisdom stop is opened; can be skipped to existing Wisdom UI. |
| Finale intro | Player-tap confirmation before boss challenge. |
| Resolution | Auto after boss resolved/island cleared first time; skippable. |
| Repeat visits | Optional archive/status notification only. |

---

## 20. Asset production list

### Required for MVP

| Asset | Proposed filename | Format | Transparency | Orientation / dimensions | Usage |
|---|---|---|---|---|---|
| Prologue panel 1 connected islands | `story/prologue/prologue-001-connected-islands.webp` | WebP | No | 16:9 or 4:5 mobile-safe | Story reader panel |
| Prologue panel 2 shared world | `story/prologue/prologue-002-shared-knowledge.webp` | WebP | No | 16:9/4:5 | Story reader |
| Prologue panel 3 Great Drift | `story/prologue/prologue-003-great-drift.webp` | WebP | No | 16:9/4:5 | Story reader |
| Prologue panel 4 separated islands | `story/prologue/prologue-004-separated-islands.webp` | WebP | No | 16:9/4:5 | Story reader |
| Prologue panel 5 expedition | `story/prologue/prologue-005-compass-expedition.webp` | WebP | No | 16:9/4:5 | Story reader |
| Prologue panel 7 Luma approach | `story/prologue/prologue-007-luma-approach.webp` | WebP | No | 16:9/4:5 | Story reader |
| Arrival panels 1-6 | `story/arrival/arrival-001-approach.webp` etc. | WebP | No | 4:5 recommended | Arrival sequence |
| Miri portrait | `characters/miri-routekeeper.png` | PNG/WebP | Yes | 1024x1024 source; portrait crop | Dialogue |
| Elder Sava portrait | `characters/sava-memory-keeper.png` | PNG/WebP | Yes | 1024x1024 | Wisdom wrapper |
| Poko portrait | `characters/poko-hatchery-tinkerer.png` | PNG/WebP | Yes | 1024x1024 | Dialogue |
| Captain Ivo portrait | `characters/captain-ivo.png` | PNG/WebP | Yes | 1024x1024 | Prologue/transition |
| Noctyra story close-up if existing idle is insufficient | `characters/noctyra-crystal-closeup.webp` | WebP | Optional | 16:9 or transparent portrait | Finale/reveal |
| Resolution panels 1-7 | `story/resolution/resolution-001-warning-breaks.webp` etc. | WebP | No | 4:5 | Completion scene |
| Great Drift clue shard | `story/clues/clue-001-black-crystal-symbol.webp` | WebP | No or transparent PNG | 1:1 and panel crop | Clue close-up |
| Dialogue background frame | `ui/dialogue/luma-dialogue-backdrop.webp` | WebP | No | 9:16 safe | Optional modal background |

### Reuse existing

| Existing asset | Likely use |
|---|---|
| `public/assets/islands/island-001/background/ambient-background.webp` | Arrival backgrounds, normal island ambience, restored-island base. |
| `public/assets/islands/island-001/board/board-circle-inner.webp` | Board identity and route-circle shots. |
| `public/assets/islands/island-001/board-outer/PLACEHOLDER__board-circle-outer.webp` | Board framing if needed, but marked placeholder. |
| `public/assets/islands/island-001/scenery/battle-arena-crystal.webp` | Island Heart / corrupted center / finale setup. |
| `public/assets/islands/island-001/bosses/black-crystal-dragon-idle.webp` | Noctyra watching, boss/finale intro. |
| `public/assets/islands/island-001/bosses/black-crystal-dragon-defeated.webp` | Restored/exhausted post-finale state. |
| `public/assets/islands/island-001/landmarks/hatchery/hatchery-l3.webp` | Restored Hatchery moment. |
| `public/assets/islands/island-001/landmarks/**/PLACEHOLDER__*.webp` | MVP build-state swaps where final art is not yet available; do not over-spec custom overlays. |
| `public/assets/audio/music/Island dreamy relaxing night islands.mp3` | Calm island ambience candidate. |
| `public/assets/audio/music/new-island-celebration-loop-v1.mp3` | Resolution/travel celebration candidate. |
| `public/assets/audio/sfx/sfx_island_clear.mp3` | Island clear/resolution cue candidate. |

### Optional polish

- Parallax layers for prologue maps.
- Blink/glow variants for Miri, Sava, and Noctyra.
- Environmental NPC overlays at restored landmarks.
- Additional dragon expressions: alarmed, listening, restored.
- Custom finale track with crystal percussion.
- Short video/animated panel for Great Drift route collapse.
- Particle overlays for restored landmarks.
- Archive thumbnail set for replay.

---

## 21. Audio plan

| Moment | Mood | Recommendation | Notes |
|---|---|---|---|
| Prologue | Wonder to mystery | Reuse existing calm track or optional new prologue cue | Must start only after allowed by user/browser. |
| Arrival | Quiet, beautiful, uneasy | Reuse with timing change | Lower high frequencies; no jump scares. |
| Normal island ambience | Cozy magical | Reuse existing island dreamy track | Respect music preference. |
| Construction cue | Short warm confirmation | Reuse SFX if available or optional new chime | SFX preference applies. |
| Wisdom cue | Calm listening | Reuse soft ambience; optional new terrace chime | No therapy-clinic feel. |
| Guardian awakening | Cinematic low crystal swell | Optional new cue or reused boss/event track | Avoid harsh stingers. |
| Finale track | Epic but restorative | Optional new track | Can reuse existing boss music if present; copy carries reinterpretation. |
| Resolution track | Warm relief | Reuse `new-island-celebration-loop-v1.mp3` | Keep volume modest. |
| Egg ceremony | Gentle hatchery sparkle | Optional new short cue | Only if existing egg event occurs or bond ceremony plays. |

Respect user-consented audio, mobile autoplay restrictions, music preferences, SFX preferences, and reduced-motion/accessibility settings.

---

## 22. Content package proposal

Concept only; do not move files in this design task.

```text
public/islands/001/
  island.json
  narrative.json
  characters/
    miri-routekeeper.png
    sava-memory-keeper.png
    poko-hatchery-tinkerer.png
    captain-ivo.png
    noctyra-crystal-closeup.webp
  story/
    prologue/
    arrival/
    resolution/
  finale/
  clues/
  archive/
  audio/
```

### Conceptual manifest examples, not production-ready code

```json
{
  "id": "i001-arrival",
  "islandNumber": 1,
  "surface": "story_reader",
  "trigger": { "kind": "island_entered", "firstVisitOnly": true },
  "episodeRef": "story/arrival/manifest.json",
  "skipPolicy": "skippable_after_first_panel"
}
```

```json
{
  "id": "i001-hatchery-open-intro",
  "trigger": { "kind": "stop_opened", "islandNumber": 1, "stopId": "hatchery" },
  "surface": "dialogue_modal",
  "speaker": "poko",
  "text": "The Hatchery is quiet, not gone. Help me wake one cradle."
}
```

```json
{
  "id": "i001-first-restored-structure",
  "trigger": { "kind": "landmark_level_reached", "islandNumber": 1, "anyStop": true, "level": 3 },
  "surface": "construction_reaction",
  "speaker": "miri",
  "text": "The island noticed."
}
```

```json
{
  "id": "i001-finale-intro",
  "trigger": { "kind": "boss_eligible", "islandNumber": 1 },
  "surface": "finale_introduction",
  "speaker": "sava",
  "text": "Aim for the crystal around her, not the heart inside it."
}
```

```json
{
  "id": "i001-resolution",
  "trigger": { "kind": "boss_resolved", "islandNumber": 1 },
  "surface": "story_reader",
  "episodeRef": "story/resolution/manifest.json",
  "completionCompatibility": "canonical_boss_completion_unchanged"
}
```

---

## 23. Implementation handoff map

| PR | Exact scope | Dependencies | Files likely touched | Validation | Explicit non-goals |
|---|---|---|---|---|---|
| PR 1 — Island 1 content definitions and feature flag | Add content definitions/manifests behind feature flag; no runtime orchestration beyond safe loading. | Approved design; asset naming decision. | `public/islands/001/**` or chosen content path; feature flag config; tests for manifest validity. | Manifest schema/check script; no product behaviour unless flag enabled. | No stop logic changes, no rewards, no persistence migration. |
| PR 2 — Reusable lightweight dialogue surface | Build viewport-safe mobile dialogue modal/bubble component. | Modal UX guardrail; design copy. | Level-world UI components/CSS; story UI directory. | Accessibility checks, reduced motion, scroll lock, keyboard/touch targets. | No gameplay writes, no story engine, no economy. |
| PR 3 — Island 1 arrival and stop wrappers | Observe canonical first entry/stop-open events and show prologue/arrival/intro wrappers. | PR 1-2; content assets. | Narrative orchestrator/content adapter; IslandStoryReader config seam. | Existing Island Run tests; manual first-entry/skip/replay QA. | No tile-index triggers, no stop completion changes. |
| PR 4 — Build milestone reactions and companion commentary | Add non-blocking construction reactions and optional active-companion bubbles. | PR 2-3; active companion read path. | Narrative observer; companion bubble UI. | Build level event QA; no companion fallback QA. | No creature stats/acquisition changes, no build cost changes. |
| PR 5 — Finale framing and resolution episode | Add finale intro, boss challenge framing copy, boss-resolved resolution scene, Great Drift clue visual. | PR 1-4; final clue asset. | Boss wrapper content seam; story reader resolution manifest. | Boss success/failure/retry QA; island clear/travel regression. | No boss reward/completion-condition changes. |
| PR 6 — Mobile polish, replay, fallback, and validation | Archive/replay entry, media fallback, audio preference handling, reduced-motion polish. | PR 1-5. | Story archive UI if approved; validation scripts; fallback copy. | Offline/media-fail QA; audio disabled QA; reduced-motion QA. | No permanent branching system, no durable clue ledger unless separately approved. |

---

## 24. Success criteria

A player should clearly understand:

- They arrived because the Compass Expedition followed the first lost route signal.
- The Lumin live on Luma Isle.
- The island's problem is protective isolation caused by the Great Drift and reinforced by corrupted guardian resonance.
- They are helping as a respectful new expedition member, not conquering.
- Hatchery, Routekeeper Steps, Gathering Grounds, Listening Terrace, and Island Heart are all parts of one civic/guardian bond.
- Real-world actions matter as small, sustainable contributions, not guilt pressure.
- The Wisdom encounter teaches that protection sometimes needs help and air.
- The dragon encounter happens because restored landmarks make it possible to reach Noctyra.
- Noctyra is restored, not killed.
- Luma Isle changes through visible landmark restoration, reawakened creature paths, and renewed civic trust.
- The Great Drift may not have been purely natural.
- Travel to Island 2 feels earned because a restored route answers.

The pilot also demonstrates that:

- Story does not replace gameplay.
- Story does not block gameplay.
- Existing systems remain authoritative.
- Island 1 can template later islands without forcing identical plots.

## Final verdict

**PASS WITH CONDITIONS**

Conditions before implementation:

1. Confirm final asset dimensions and visual contents for existing Island 1 WebP assets with the art team or an image-capable asset audit, because current file names confirm availability but not full visual detail.
2. Decide whether Island 1 content should live under existing `public/storyline` conventions or a new `public/islands/001` package path.
3. Approve whether “Noctyra” is the final player-facing name for the Black Crystal Dragon.
4. Approve whether the clue symbol should become a recurring Great Drift motif across later islands.
5. Confirm which existing audio tracks are available for boss/finale reuse before promising final audio timing.
