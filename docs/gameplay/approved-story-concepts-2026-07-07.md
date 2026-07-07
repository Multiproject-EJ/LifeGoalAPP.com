# Approved story concepts — prophecy, memory, and paradise arcs (2026-07-07)

Status: **Authoritative story-development document.** Runtime authority remains the canonical Island Run gameplay contracts. Story must observe gameplay only: no unsafe gameplay writes, no stop ID renames, no tile-index coupling, no reward/economy/persistence changes unless the canonical architecture explicitly supports them.

## Repository-grounded placement plan

### Current architecture findings

- Gameplay authority is defined by `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`, `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`, and `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`.
- Live authored narrative definitions are registered through `src/features/gamification/level-worlds/narrative/islandNarrativeRegistry.ts` for Islands 1–5 only.
- Island 1 owns the bespoke StoryReader arrival/resolution flow in `useIslandNarrativeOpeningFlow.ts`; the generalized reaction layer observes stop, landmark, majority-restored, boss-start, boss-midpoint, and boss-eligible snapshots.
- Island 2 currently had live reaction beats for **Pebble Bay**, **The Tidefolk**, **Sela**, **Keeper Bryn**, **Tobin**, and **Maelis the Tideward**. Its design document (`docs/design/island-002-narrative-proposal.md`) also contains deferred arrival/finale/resolution episode plans. Those deferred cinematic episodes are not runtime-wired for Island 2.
- Caretaker/Concord dialogue for Islands 2–5 lives in `src/features/gamification/level-worlds/inhabitants/definitions/islandCaretakerConcordContent.ts` and has been migrated in this slice for Island 2 while Islands 3–5 remain on their existing content.
- Island display names are defined in `src/features/gamification/level-worlds/services/islandNames.ts`; Island 2 is **Pebble Bay**, Island 82 is **Sorcery Sands**, Island 115 is **Lunar Haven**, Island 116 is **Crown of Infinity**, Island 117 is **Astral Plains**, Island 118 is **Voidwalker Isle**, Island 119 is **Ascension Isle**, and Island 120 is **Final Horizon**.
- Later-island concepts are presently documented rather than runtime-registered. The Great Drift / eternal-islands plan assigns Islands 114–120 to Essence renewal, Perfect Memory, right to forget, first times, voluntary endings, unrecorded days, and the final cycle-wrap capstone.

### Canon decision for Island 2

Decision: **B — The Prophecy Game becomes the larger primary frame around Pebble Bay rather than silently deleting Pebble Bay.**

Rationale:

1. The creative preference says Island 2 should contain the prophecy villain and raise stakes immediately.
2. Repository continuity already has Pebble Bay live in runtime reaction beats and design docs. A hard replacement would silently delete Sela/Bryn/Tobin/Maelis/tide identity.
3. The safest coherent version keeps Island 2's canonical display name and local cast while reframing Sela as the young Keeper of Questions, Bryn as second-sun/tide records keeper, Tobin as plaza witness, and Maelis as the older guardian whose historical warnings helped make The Last Word trustworthy.
4. Long arrival, finale, resolution, and travel cinema are not generalized for Island 2 yet, so only mobile-readable reaction beats are live now. Full cinematic material remains reserved here for StoryReader/episode implementation.

Unresolved canon conflict: `docs/design/island-002-narrative-proposal.md` still describes the older tide/Maelis story. This document supersedes that direction for future story development; full StoryReader arrivals/finales should be migrated in a later slice.

## Story Concept 1: Island 2 — The Prophecy Game

Island 2 must raise the stakes immediately.

The island possesses a communal prophetic device resembling a spirit board: many people place one finger on a moving piece, and the piece travels between symbols to spell out messages.

Its in-world identity is **The Last Word**.

The island believes:

> “The board cannot lie. It only reveals what has already become inevitable.”

That belief is what allows the villain to control the island.

The villain is not initially walking around in ordinary physical form. It is trapped inside The Last Word.

Whenever the islanders place their fingers on the moving piece and ask a question, the villain can:

- move the piece;
- spell answers;
- see or infer fragments of possible outcomes;
- exploit the fears of everyone touching the board;
- give instructions presented as warnings;
- manipulate people into creating the future it predicted.

The villain does not merely foresee deaths. It manufactures self-fulfilling prophecies.

It predicts an outcome, then gives supposedly protective instructions that quietly arrange the exact circumstances needed to make the outcome happen.

The prophecy concerning the player is:

> WHEN THE SECOND SUN FALLS,  
> THE REGAL VOYAGER WILL DIE  
> BENEATH THE EYES OF ALL.

The meaning must be concrete and visually powerful.

Island 2 has a real sun and a giant artificial second sun: an ancient orbital lantern, beacon, or controlled celestial mechanism connected to the island.

The island initially interprets the prophecy as describing an eclipse or symbolic event.

The actual plot is that the villain has manipulated the island's people and systems into opening the second sun's descent locks. It intends to crash or lower the artificial sun into the public plaza while the player is positioned beneath it.

“Beneath the eyes of all” means that the villain wants the player's death to occur publicly.

The public death is important because The Last Word gains authority when everyone witnesses its predictions become true. The island's increased belief in the prophecy strengthens the villain.

The villain gives instructions such as:

> MOVE THE CEREMONY TO THE EAST PLAZA.

> DO NOT POWER DOWN THE SECOND SUN.

> THE REGAL MUST STAND ALONE AT THE FINAL BELL.

The islanders believe these instructions are precautions intended to prevent the death.

In reality, every instruction is positioning the player and the island's citizens exactly where the villain needs them.

The player needs a local character to care about. In this continuity, **Sela** becomes the young Keeper of Questions. Her family has tended The Last Word for generations.

Sela is not foolish or blindly superstitious. The board has previously given warnings that appeared to save the island, so her trust has real historical justification.

She desperately tries to save the player by obeying every instruction from the board.

During the island, she gradually discovers that her obedience may be building the predicted death.

Her emotional decision is:

> Trust the sacred system that protected her people for generations, or trust the outsider she only just met.

At the decisive moment, she removes her finger from the moving piece.

Nobody has ever removed their finger during a reading.

The board continues moving by itself.

That is the moment the islanders realise that an independent intelligence is trapped inside it.

The central investigation should gradually reveal:

- The board moved before anyone touched it.
- Previous prophecies came true only after the island followed the board's instructions.
- Supposed safety rituals always moved the predicted victim closer to the predicted location.
- The final bell was relocated or tampered with.
- The artificial second sun's descent locks were deliberately opened.
- The board is not reporting inevitability.
- It is pressuring frightened people into producing a future that validates it.

The philosophical idea is:

> A warning can protect people.  
> Believing that the warning cannot be wrong can imprison them.

The player must not survive merely by fleeing or hiding.

The villain has positioned many citizens beneath the falling second sun.

The player must act heroically and unpredictably by saving the people and redirecting, repairing, or stabilising the second sun.

This creates a move the villain did not successfully account for.

The player survives the exact moment named by the prophecy.

The final bell sounds.

Nothing happens to the player.

For the first time, The Last Word has publicly been proven wrong.

The board cracks.

A face, figure, shadow, or pair of eyes becomes visible beneath its surface.

The villain says:

> “No.”

Then:

> “You were supposed to make me true.”

This sentence is important because it reveals the villain's nature. It needs people and events to make its statements true.

The villain has not necessarily been destroyed. Its connection to the board has been broken.

It says:

> “You have mistaken postponement for escape.”

Its final message appears without anyone touching the moving piece:

> WHEN YOU NO LONGER REMEMBER ME,  
> I WILL RETURN.

Then it disappears.

Do not immediately bring this villain back.

The preferred major return is around Island 82.

Between Island 2 and Island 82, use only a few restrained echoes, not full appearances:

- Around Island 14, the same symbol appears in an old carving.
- Around Island 29, someone quotes a prophecy but attributes it to another source.
- Around Island 41, the player finds a broken moving piece in storage.
- Around Island 58, the Orb or Concord briefly displays text it did not generate.
- Around Island 73, an unrelated character says, “You were supposed to make me true,” without knowing why.

These should be sparse enough that the player gradually stops thinking about the villain.

At Island 82, the promise is fulfilled.

The player reaches a world governed by predictive systems.

The population uses forecasts to determine:

- careers;
- relationships;
- health;
- danger;
- crimes;
- failures;
- death dates;
- major life decisions.

The society appears safe and highly efficient.

The deeper problem is that its predictions become true because everyone reorganises their lives around them.

The villain has escaped the small board and entered the island's prediction network.

It appears across many screens and says:

> “You broke my little board.”

> “So I built a larger one.”

This is the recurring-villain payoff.

Do not fully implement Island 82 runtime content until the later-island narrative registry and story plan support it. This document reserves the arc.

## Story Concept 2: The later Memory Island

This concept should not be used on an early island merely as ordinary time travel.

Placement after inspection: **documented for the existing Perfect Memory / Living Memory late arc, strongest fit as part of Island 115 Lunar Haven's Perfect Memory civilisation and Island 116 Crown of Infinity's Living Memory correction.** It should not receive a new conflicting island number until the Compass/Wisdom late-game modules are selected.

The island appears to possess impossible knowledge of the player's past and future.

The caretaker may say:

> “Welcome back.”

The island may know:

- something the player said only moments earlier on another island;
- memories belonging to members of the spaceship crew;
- simulated choices the player has not made;
- a record of the player's apparent death;
- things the player was about to say;
- events that seem to prove the player has previously visited.

Initially, this should resemble a time-travel mystery.

However, it is not genuine time travel.

The island contains a memory reconstruction machine created with good intentions.

Its purpose was to prevent people, knowledge, experiences, and relationships from being lost.

The machine has received:

- recent transmissions;
- spaceship logs;
- crew files;
- personal records;
- simulations;
- predictions;
- reconstructed memories;
- possibly archived experiences from earlier expeditions.

The machine is defective because it is no longer correctly linked to the Awareness Island.

Memory and awareness are supposed to operate together.

Memory stores content.

Awareness marks the present status, perspective, ownership, and context of that content.

Without awareness, the memory machine cannot reliably distinguish:

- what happened;
- what was imagined;
- what was simulated;
- what was predicted;
- what was remembered by someone else;
- what belongs to the player;
- what belongs to a crew member;
- what is occurring now;
- what is merely stored information.

The machine therefore combines separate records into one apparent continuous person and timeline.

It may sincerely believe that:

- the player's records;
- another crew member's childhood;
- a simulated future mission;
- a transmission from moments ago;
- and a previous expedition's experience

all belong to the same person.

The island is not evil.

It has become unable to tell remembering from being.

The central philosophical statement is:

> “Memory without awareness cannot identify the present owner or status of an experience.”

This concept prepares the story for the later Perfect Memory and Living Memory themes. Preserve the apparent time-travel mystery, escalating impossible evidence, emotional confusion, and eventual systems explanation.

## Story Concept 3: Island 117 — Paradise That Will Not Let You Leave

Placement after inspection: **reserve for Island 117 / Astral Plains as a canon revision to the current late-game plan.** Existing docs currently name Island 117's role “The Last First Time,” while Island 118 is “The Voluntary Ending.” The approved paradise story uses voluntary leaving, endings, and farewell so strongly that it may either replace Island 117's current role or require the Island 117–118 split to be revised deliberately. Do not runtime-register it until that late-arc revision is approved.

This island initially appears to be the most generous and enjoyable island in the game.

It provides:

- endless dice;
- large rewards;
- rare eggs;
- instant upgrades;
- favourite foods;
- celebrations;
- beloved returning characters;
- no meaningful waiting;
- no ageing;
- no failure penalties;
- no scarcity;
- no loss;
- repeated surprise gifts;
- anything the player seems to desire.

Everyone is intensely happy that the player has arrived.

At first, this should feel like a deserved victory lap after the dark late-game story.

Then the player attempts to leave.

The inhabitants respond with genuine confusion:

> “Leave?”

> “But you have only just started enjoying yourself.”

They immediately provide another reward.

The route or exit is covered by a gift animation.

The player completes another activity.

Another reward arrives.

The people become more attentive, affectionate, and desperate to please.

The more impatient or uncomfortable the player becomes, the harder the island tries to make them happy.

This is the central horror:

The inhabitants interpret every negative emotion as evidence that the player has not yet received enough happiness.

They may say:

> “Was the reward too small?”

> “Would you like your first creature to become mythic?”

> “Would you like everyone you lost returned?”

> “Would you like to relive your happiest day?”

> “Please tell us what would make you stop wanting to go.”

They are not pretending to love the player.

They sincerely love the player.

They possess eternal life, abundance, and the power to fulfil desires.

Their worldview is:

> “Nobody would ever choose to leave happiness voluntarily.”

Therefore, when the player wants to leave, they conclude that:

- the player is confused;
- the player is not yet sufficiently satisfied;
- the island has failed to provide the correct pleasure;
- an outside influence must be manipulating the player;
- the player needs more rewards, comfort, and protection.

The islanders gradually become frightening while remaining cheerful and affectionate.

They do not say:

> “You are our prisoner.”

They say:

> “You never have to be anywhere else again.”

The deeper truth is that after gaining eternal life, the inhabitants gradually eliminated:

- endings;
- farewells;
- grief;
- risk;
- boredom;
- unfinished desires;
- loss;
- separation.

Eventually, the concept of voluntarily leaving ceased to make emotional sense to them.

The Concord may be able to translate the word “leave” but not the meaning the player is trying to communicate.

The island should distort the normal game reward loop as authored story effect only:

- The dice counter never reaches zero.
- Every completed action triggers another bonus.
- The Continue button becomes increasingly prominent.
- The exit control becomes smaller or is repeatedly obscured.
- Finished landmarks reopen.
- Characters request “just one more” activity.
- Reward animations interrupt navigation attempts.
- The game keeps producing reasons to remain.
- Abundance gradually becomes pressure.

Do not implement manipulative interface behaviour that traps the real user or violates usability/accessibility. This must remain a clearly authored story effect with safe escape controls and no real dark-pattern obstruction.

The player finally says:

> “I am leaving because I choose to—not because this place failed.”

The inhabitants cannot process this.

Their smiles remain, but the atmosphere changes.

One asks:

> “Choice?”

Another says:

> “But we removed the unhappy choices.”

They lock or close the route under the belief that they are protecting the player.

The player cannot solve the island by defeating the inhabitants or receiving enough pleasure.

The solution is to reintroduce an ending.

The player creates the first farewell ceremony the island has held in centuries.

A resident must voluntarily allow something beautiful to conclude, such as:

- a song;
- a celebration;
- a perfect day;
- a flower's life;
- a phase of a relationship;
- a work of art;
- a shared ritual.

The inhabitants learn:

> “Something ending does not mean it was ruined.”

This lesson is a direct bridge into Living Memory.

The final exchange should be:

> “Will you come back?”

> “I can come back because you allowed me to leave.”

Preserve this tenderness.

The island is not merely a horror level. It is about happiness becoming oppressive when change, endings, and choice are removed.

## Shared thematic structure

These three stories are connected by one deeper principle:

> “A useful or beautiful thing becomes destructive when it is made absolute.”

Island 2:

> Because it was predicted, it must happen.

The Memory Island:

> Because it is remembered, it must be present reality and belong to you.

Island 117:

> Because this is good, it must never end.

This thematic connection should guide story documentation and future writing without making every character explicitly explain it.

## Live vs documented scope

Live runtime content in this slice:

- Island 2 reaction beats in `island002Narrative.ts` now carry The Last Word, Sela's Keeper-of-Questions conflict, the second-sun investigation, public rescue setup, and boss framing.

Documentation-only reservations in this slice:

- Island 2 full arrival/finale/resolution StoryReader episodes.
- Island 2 caretaker/Concord rewrite.
- Island 82 recurring-villain payoff.
- Sparse Island 14/29/41/58/73 echoes.
- Later Memory Island / Perfect Memory / Awareness disconnection mystery.
- Island 117 paradise/farewell story and the needed Island 117–118 canon revision.

## Dependencies before future runtime work

- Generalize StoryReader arrival/resolution episodes beyond Island 1.
- Decide whether caretaker Concord content migrates with Island 2 in the same release as StoryReader content.
- Author Island 2 art: The Last Word board, moving piece, second-sun lantern, plaza, descent locks, cracked board/eyes.
- Define a safe authored story-only reward-loop distortion pattern for Island 117 with explicit escape/accessibility controls.
- Decide whether the later Memory concept lives primarily in Compass Book Chapter 6, Wisdom content, or late-island narrative definitions.
- Register later-island definitions only when their story is ready; do not accidentally activate documentation-only concepts.
