# Island Run Living-World Experience Backlog

## Status

Durable user-approved backlog recorded on 2026-08-11. These items are not part
of the active Compass Book 3D vertical slice and must not silently expand that
implementation. Execute them as separate reversible Gauntlet slices.

## Priority and dependency order

1. Island 001 Concord fragment presentation.
2. Island 001 celestial banner fauna replacement.
3. Island 005 rare creature follow-and-return sequence.
4. Reusable island-to-island arrival director with five variants.
5. Three-way helpfulness feedback on appropriate generated/advisory surfaces.

## A — Island 001 Concord fragments in the 3D world

### Product truth

- The Concord and its nine fragments exist only on Island 001.
- Collection positions, pacing, resonance assists, persistence, line rewards,
  completion, and Concord activation remain owned by the existing canonical
  technology collection and Island Run action services.
- This task changes presentation only. It must not create a second collection
  ledger or recover fragments from renderer-local state.

### Desired presentation

- Replace generic-looking pickups with nine coherent 3D Concord fragments
  sized for the canonical tiles.
- An uncollected fragment floats slightly above its tile, with a slow readable
  turn and restrained violet/gold signal light.
- When the player token passes a fragment, the fragment performs a brief
  anticipatory spin/tilt or resonance response. Merely passing it does not
  collect it unless the canonical roll result reports an eligible resonance or
  signal-lock pickup.
- Exact landing and canonical assist collection use one shared pickup burst,
  then the fragment travels toward its 3x3 Concord slot.
- Collected fragments remain absent after reload/device sync.

### Acceptance evidence

- Phone screenshots: all nine visible placements, close pass, exact landing,
  resonance assist, and completed Concord.
- Island 002+ proof that no Concord fragments or Concord affordance appear.
- Existing Concord pacing/action tests remain green.
- Low/High quality and reduced-motion proofs.

## B — Island 001 flying banner fauna

Replace the small circling blue-winged, snowman-like silhouettes with two
alternating miniature ceremonial banner designs:

- warm ivory or sapphire fabric;
- beautiful gold drape, trim, tassels, and a readable crest/flag symbol;
- two clearly different crest silhouettes alternating around the flight path;
- gentle fabric billow and banking, with no creature/snowman reading;
- scenery-only, non-clickable, outside the playable tile and HUD corridors;
- Low retains the banner silhouette; reduced motion holds them in a composed
  formation.

## C — Island 005 creature: rare follow-and-return behavior

Add two new presentation states to the center creature without changing the
Boss/Arena progression contract.

1. **Companion follow:** on a deliberately rare trigger, the creature leaves
   the center and hovers beside the moving player token for up to 20 seconds.
2. **Full-lap return:** if the token completes a full board wrap within that
   follow window, the creature barrel-rolls toward the arena, emits a readable
   glow/flash, catapults upward, then floats safely back to its center idle
   while its spin decelerates.

The renderer may derive a transient animation cue from canonical roll/movement
events. It may not write token index, completion, rewards, or creature state.
Use a cooldown and deterministic rarity gate so the sequence remains special
and never interrupts a landmark modal, build mode, boss fight, or travel.

## D — Five reusable island-arrival sequences

Create one arrival director shared by all islands, with five authored camera
variants chosen deterministically so arrival feels varied but testable.

Required example variant:

1. begin in a high top-down overview;
2. descend slowly while drifting toward one side;
3. roll the point of view upright;
4. circle into the canonical start/dock camera;
5. trigger the welcome celebration only after the camera is safely settled.

The five variants may change approach direction, altitude, orbit direction,
cloud/sea reveal, and final flourish, but must converge on the same locked
start camera and preserve HUD readability.

Celebration system:

- reuse the existing fireworks presentation;
- add quality-scaled 3D fireworks in world space;
- one variant includes a restrained trumpet fanfare;
- slide in an elegant animated `Welcome!` island header, potentially as a 3D
  sign, which auto-clears and does not block play;
- support skip, reduced motion, interruption recovery, background/resume, and
  Low quality;
- travel state remains owned by the canonical island travel action. The
  arrival director consumes the completed travel event; it never performs it.

## E — Three-way helpfulness feedback

Use **Helpful / Okay / Not helpful** instead of only thumbs up/down when the
player is evaluating generated advice or interpretation. `Okay` is important:
it captures “fine, partly useful, or I am not sure” without forcing approval or
rejection.

Best initial surfaces:

- Compass AI suggestions and generated Compass summaries;
- Caretaker interpretations or suggested next steps after a Wisdom answer;
- AI-suggested habits, goals, quest wording, and recovery ideas;
- generated daily coaching or environment recommendations;
- story/caretaker responses where the question is “Was this useful?” rather
  than “Did you like the character?”

Do not place this rating on:

- personality or reflection answer choices, where it could feel like rating
  the player;
- random rewards, creature affection, moral choices, or objective gameplay
  outcomes;
- every screen by default.

Recommended labels and semantics:

- `Helpful` — keep this style/direction;
- `Okay` — acceptable or partially useful; improve quietly;
- `Not helpful` — offer a short optional reason and a safer alternative.

Store feedback as product-improvement telemetry with surface, suggestion type,
model/version where applicable, and optional reason. Never change a player's
Compass score, personality result, rewards, or progression because of the
rating. The first implementation should be one reusable component on one
Compass suggestion surface, followed by an evidence review before rollout.

## Shared guardrails

- Read Island Run state from the canonical store and mutate only through
  canonical action services.
- No renderer-local gameplay mirrors or direct persistence writes.
- All new scenery respects the 390x844 phone corridor, quality tiers, reduced
  motion, WebGL fallback, and performance budgets.
- No deployment is implied by this backlog. Each slice receives its own QA and
  explicit publish decision.
