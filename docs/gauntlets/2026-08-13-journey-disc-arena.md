# Journey Disc Arena — Playable 3D Vertical Slice

Status: **Approved for mobile HabitGame event integration** on
`codex/journey-disc-arena`. Merge, push, and deployment remain unapproved.

## Mission

Build an original full-screen 3D HabitGame event exhibition in which the
player's existing relic pieces awaken their shared Journey Discs, spin across a
floating arena, collide, lose shields, and knock rivals out. The first slice
must prove the game feel, readable rank progression, phone-safe presentation,
and deterministic rules without creating a second gameplay authority.

## 2026-08-13 production-integration amendment

Eivind approved continuing beyond the local slice with these clarified rules:

- Journey Disc Arena is a mobile-only HabitGame Arena exhibition inside the
  one active timed event—not a separate event or clock.
- The active event's canonical tickets mean deployed weapon discs: choosing
  three discs for a round atomically spends three event tickets.
- Battle score must be a real per-round result, persist by active event, and
  feed a dedicated visible multi-milestone Journey Disc reward track.
- The nested Journey Disc track may have its own milestone presentation and
  claims, but remains keyed to the active event runtime id and stored in the
  canonical Island Run record. It must not create another wallet or global
  reward-bar authority.
- Production launch, round spending, score banking, and milestone claims must
  use canonical action services. The React game may call injected callbacks
  and present returned state only.
- The Arena catalog/choice surface must expose Journey Disc Arena on mobile;
  desktop remains an unsupported development/QA surface.

### Added acceptance evidence

- A 2-, 3-, and 4-disc round creates exactly the selected number of player and
  rival fighters, remains readable at a 390×844 viewport, and terminates.
- A round cannot start when canonical event tickets are fewer than the chosen
  disc count; a successful launch spends exactly one ticket per deployed disc.
- Score is deterministic from the terminal battle report and never depends on
  cumulative React-local wins.
- Score banks once per completed round into an event-keyed canonical progress
  entry; repeated result submission cannot double-bank.
- The Journey Disc reward track shows multiple milestones, claimability, and
  claimed state; claims flow through a canonical action and award the declared
  wallet item exactly once.
- Journey Disc Arena participates in the Arena catalog, preference rotation,
  lazy launcher, and active-event completion contract.
- Mobile browser playtesting covers formation choice, insufficient tickets,
  multi-disc combat, score banking, reward claim, rematch, and background-tab
  pacing.

## 2026-08-13 clarity-and-powerup amendment

Eivind's next hands-on critique sets a clearer visual and combat target:

- Ordinary battles use a bright white/pearl daytime theme. Eclipse is reserved
  for the high-prize Guardian gate and never changes collision or reward math.
- Every active disc has its own world-following life bar. Player bars are green,
  rival bars are red, and the ratio comes only from deterministic fighter state.
- Formation preparation is reduced to one spatial 2×2 pad. One ticket equals
  one occupied fighter; only occupied slots are previewed in 3D.
- A permanent lime speed field provides a readable acceleration opportunity.
- A collectible ice weapon freezes one nearest opponent for a bounded time.
- A collectible echo beacon temporarily spawns one helper disc. Echoes are
  deterministic, expire, cannot increase ticket-owned fighter count, and do not
  inflate terminal survivor/knockout scoring.
- Field, freeze, and echo rules belong to the pure arena service. Three.js and
  React present returned state and events only.
- Arena topology is profile-driven. The shipped profile remains a circular
  pearl arena; the contract reserves rectangular bounds and deterministic
  obstacle descriptors without implementing a second arena in this slice.
- Theme is also presentation metadata on the arena profile/round. Standard
  prize territory is bright pearl; high-prize milestone territory may use an
  Eclipse dark presentation. Theme cannot alter collision rules or reward math.

### Clarity-and-powerup evidence gates

- At 390×844, preparation shows the enlarged reward track, the 1-ticket=1-disc
  rule, four spatial slots, and one deploy action without a stat wall.
- Toggling spatial slots changes the visible 3D preview to exactly those player
  discs; rivals remain deliberately asymmetric.
- In battle, every active fighter—including an echo—has a following life bar;
  bars visibly shrink from shield damage and disappear on knockout/expiry.
- Player life bars are green and rival life bars are red against the white
  arena theme.
- The speed field increases drive/max-speed only while its bounded effect is
  active and cannot create invalid velocity.
- Freeze deterministically targets one nearest opponent, visibly lasts for a
  bounded interval, and always releases.
- Echo spawn is capped by the global fighter budget, expires deterministically,
  and is ignored by permanent-fighter score counts.
- Identical seeds and inputs reproduce pickup ownership, effect timing, echo id,
  and terminal result.
- A future rectangle/obstacle profile can be added without branching React UI
  or inventing another simulation authority; obstacle collision tests are
  required before that profile is admitted.

## 2026-08-13 Island Concourse and encounter amendment

The battle surface is now staged over the center of the existing Island Run
view instead of replacing the island with another full-screen world:

- The minigame canvas and launcher shell are transparent. A bounded tint keeps
  the existing island visible around and beneath the raised circle.
- The circular ring targets roughly 94% of a 390-pixel phone width; the full
  physical lip remains visible and decorative spectators may approach, but not
  cross, the safe edge.
- Lightweight island spectators stand outside the simulation boundary. They
  have no gameplay state, collision, targeting, or reward authority.
- The development route uses a synthetic island-colored backdrop only because
  it has no live Island Run scene beneath it. Production must show the actual
  board scene through the same transparent overlay.
- This transparent two-layer vertical slice must be profiled on a physical
  phone before release. If keeping the underlying Island renderer active fails
  the performance budget, the final integration must mount the arena group in
  the canonical island renderer rather than ship two hot render loops.

Encounter size is deliberately asymmetric and class-driven:

- **Scout** battles deploy one fewer rival than the chosen player formation
  (minimum one).
- **Challenger** battles vary between equal and +1 rival formations.
- **Elite** battles deploy one additional, rank-bounded rival.
- At 900 Disc Points, the **Island Guardian** boss gate begins. Guardian I
  (900), II (1050), and III (1200) escalate from one enlarged guardian to two
  final bosses, with capped shield/mass/stability modifiers and victory score
  multipliers of ×1.4, ×1.6, and ×1.8 toward the existing 1350-point end prize.
- Tickets still buy only the player's permanent discs. Encounter class controls
  rivals and never spends additional tickets or creates a second prize track.

### Island Concourse and encounter evidence gates

- The actual production Island Run scene remains visible behind the overlay;
  the minigame does not ship a replacement island image.
- At 390×844, the entire circular lip fits, approaches edge-to-edge width, and
  no preparation or battle control covers an active fighter by default.
- Spectators stay outside the ring, add no draw-call spikes beyond the declared
  budget, and cannot affect deterministic replay.
- Given identical progress, deployed count, round count, and seed, encounter
  class, enemy count/rank, boss tier, score multiplier, and theme are identical.
- Winning a Guardian round banks its multiplied deterministic score once into
  the same event-keyed Journey Disc reward track; loss/draw does not receive
  the victory multiplier.

## 2026-08-13 Formation, armory, and game-feel amendment

- Arena exhibitions recur in HabitGame on Islands 6, 11, 16, 21, and onward:
  the island immediately after each five-island chapter boss.
- Preparation uses a spatial 2×2 formation pad. Each slot is independently
  occupied or empty, and each occupied fighter spends exactly one canonical
  active-event ticket when the round starts.
- The six reward nodes are approximately 2.4× their former visual area and fit
  as one mobile row. The proportional reward line remains beneath them.
- Comet Fin, Aegis Ring, and Pulse Vane unlock and level through idempotent
  milestone claims. Weapon level affects the equipped module's bounded combat
  modifier and visible energy pips.
- Permanent armory and highest Guardian clearance live in the owner-scoped
  Island Run runtime record (`journey_disc_armory`). Event points, rank, and
  claimed reward nodes remain event-scoped.
- Every impact flashes both discs hot red. At zero shield, a disc emits a
  six-part burst, launches above/out of the ring, spins, shrinks, and disappears.
- The visual target is saturated arcade contrast: deep blue ring, neon green
  player energy, hot red rivals, electric cyan/acid-lime pickups, and strong
  gold rewards while the island stays visible.
- Procedural SFX layer placement ticks, a rising launch sweep, collision noise,
  shield crack, Surge, freeze/echo cues, a bass-heavy knockout, and result
  stings. UI and battle haptics route through HabitGame's existing audio/haptic
  preference and reduced-motion guard.

### Formation and persistence evidence gates

- Removing a formation slot reduces preview and ticket cost by one; adding a
  slot above the available ticket balance is rejected without a gameplay write.
- Player seeds use the selected spatial slots rather than reordering into a
  generic line, and enemy count remains encounter-class-driven.
- Reopening the Arena on a later eligible island hydrates the same weapon levels
  and Guardian clearance; conflict merges preserve maximum progress per field.
- Repeating a milestone claim cannot add another weapon level, and a lower-tier
  Guardian win cannot reduce saved clearance.
- A 390×844 capture includes all six enlarged reward nodes, four formation slots,
  the powerup guide, and the deploy action without page scrolling.

## Intent and inspiration

- Eivind's direction in the 2026-08-13 Codex conversation: use the existing
  player-piece bottom disc as the fighter base; energy, optional weapon modules,
  rank, power, shield health, event tickets, upgrades, and additional fighter
  discs should all be legible parts of the fantasy.
- The linked YouTube playable is an interaction reference for the broad
  spinning-arena and combine/upgrade appeal only.
- Existing HabitGame player-piece and Journey Disc registry in
  `islandRunPlayerPieces.ts` is the identity source.
- Island Run gameplay, architecture, visual, and minigame contracts remain
  authoritative.
- The existing Creature Arena remains the canonical every-fifth-island Boss
  system. Journey Disc is a post-chapter exhibition on the following island.

## Originality boundary

The slice may reuse genre-level ideas such as spinning bodies, collisions,
ring-outs, ranks, team preparation, and upgrades. It must not copy the
reference game's name, characters, art, arena layout, UI composition, text,
  progression values, sounds, animation timing, or level designs. HabitGame's
distinctive expression is:

- relic identities mounted on the established Journey Disc;
- elemental energy wakes and readable shield halos;
- a floating restoration-era arena with a central energy heart;
- rank expressed through disc construction, orbiting energy rails, and module
  sockets rather than another game's tops;
- event-local tickets and exhibition rewards routed through HabitGame's single
  active timed-event contract.

No reference-game asset is downloaded, traced, embedded, or shipped.

## Non-negotiables

- This is an alternate exhibition surface for the one active timed event. Its
  nested milestone track is keyed to that event and does not add a global
  reward bar, event clock, or ticket wallet.
- The production feature remains default-off. The initial executable surface
  is a development-only route.
- The existing Journey Disc tier stays cosmetic in board movement and rewards.
  Arena combat stats are event-local and must never alter canonical Island Run
  movement, tiles, landmarks, or global reward math.
- Combat rules live in a pure deterministic service. React owns presentation
  and input wiring only; it does not write canonical gameplay state.
- Production persistence, ticket spending, and reward grants use canonical
  action services. The development route may use an in-memory adapter with the
  same shape, but must not invent a production save path.
- Player-piece ownership and premium entitlements are respected. The preview
  may use named procedural stand-ins but must not grant ownership.
- Phone readability, reduced-motion behavior, and WebGL cleanup are required.
- The scene uses original procedural geometry only in this slice. Generated or
  authored final assets require their own admission and manifest review.

## Vertical-slice scope

### Included

1. Pure fixed-step arena simulation with team targeting, acceleration,
   collision impulses, shield damage, spin energy, boundary pressure,
   ring-outs, timeout scoring, and deterministic terminal results.
2. Player-fired Resonance Surge with deterministic target selection, a bounded
   six-second recharge, and presentation-only critical/combo feedback.
3. Three event-local disc ranks with explicit shield, mass, speed, impact,
   stability, and module-slot differences.
4. A small original module set that visibly changes the disc silhouette and
   has one bounded mechanical modifier per module.
5. Pure ticket deployment, terminal scoring, and reward-track progression.
6. A full-screen Three.js development route with a floating arena, procedural
   Journey Discs, recognizable procedural relic stand-ins, energy trails,
   shield rings, formation-size controls, reward claims, reset, and battle HUD.
7. Automated service tests, architecture guard, TypeScript/build validation,
   and phone/desktop visual inspection.

### Excluded

- Commerce, telemetry expansion, final audio production, matchmaking,
  multiplayer, leaderboards, and deployment of the included migration.
- Replacement of Creature Arena or Boss progression.
- Final GLB/image assets, player-piece art entitlement work, and app-store/PWA
  release.

## Authority map

| Concern | Authority in this slice |
| --- | --- |
| Arena rules and rank stats | `journeyDiscArenaGame.ts` pure service |
| Visual geometry and animation | Journey Disc Arena Three.js scene |
| Preview wallet/lineup | In-memory development adapter mirroring production callbacks |
| Production event wallet | Existing `minigameTicketsByEvent[eventId]` via canonical actions |
| Permanent weapon armory | `journeyDiscArmory` on canonical Island Run runtime state |
| Production completion/rewards | Existing timed-event launcher/reward contract plus event-keyed nested track |
| Creature Boss arenas | Existing Creature Arena services, unchanged |

## Milestones

1. **M0 — Contract and isolation:** clean worktree from latest `origin/main`,
   originality boundary, default-off feature boundary, explicit exclusions.
2. **M1 — Deterministic core:** rank/module contracts, fixed-step physics,
   collisions, shields, ring-outs, timeout result, and replay tests.
3. **M2 — 3D scene:** full-screen floating arena, readable relic/disc fighters,
   energy/shield/rank language, responsive camera, and resource cleanup.
4. **M3 — Preparation loop:** preview tickets, add fighter, rank selection,
   launch/reset, and clear player/enemy team readability.
5. **M4 — Evidence:** targeted tests, Island Run suite, architecture guard,
   typecheck/build, 390×844 phone review, desktop review, reduced-motion check.

## Acceptance evidence

- Identical initial seed and lineup produce identical simulation states and
  ordered events for the same number of fixed steps.
- Rank increases are explicit and bounded; no rank can create invalid health,
  spin, velocity, or arena position values.
- Equal-rank upgrade eligibility and ticket costs reject invalid/max-rank
  combinations without mutating inputs.
- A fighter can lose shields and be knocked out only through service rules;
  React cannot award a win or mutate canonical Island Run state.
- The development route clearly reads as two teams of energized spinning
  Journey Discs at 390×844 and desktop width.
- Rank changes visibly affect disc construction and HUD stats, while each relic
  remains identifiable.
- Reduced motion preserves gameplay information and stops decorative camera/
  ambient motion without stopping the deterministic combat clock.
- No new architecture-guard violations, TypeScript errors, build errors, or
  relevant test failures.

## Budgets

- High-quality preview target: at most 16 simultaneous fighters, 160 draw
  calls, and 140k triangles; the first demo lineup targets 8 fighters.
- Cap device pixel ratio at 1.75 on phone and 2 on desktop.
- One renderer, one animation loop, shared geometries/material families where
  practical, and complete disposal on unmount.
- No runtime network asset dependency in the vertical slice.

## Stop conditions

Stop and redesign if the slice adds a React gameplay write, another event
wallet/clock, a second Creature Arena authority, copied reference expression,
unreadable phone framing, nondeterministic terminal outcomes, resource leaks,
or a rank advantage outside this event-local simulation.

## Rollback

The feature is isolated behind a default-off flag and a development-only route.
Removing that route, manifest entry, service, and preview folder restores the
prior app. The unapplied Journey Disc JSONB migration must also be omitted or
reverted before deployment; because the feature flag remains off, no production
player data depends on it yet.

## Handoff definition

The local branch may be presented for review when the amended evidence gates
pass. Merge, migration application, telemetry, final asset admission, physical-
device performance, and release sequencing remain separate decisions.

## Local implementation evidence — 2026-08-13

The mobile event integration is implemented on the isolated branch and remains
default-off:

- Refreshed 390×844 evidence:
  `evidence-journey-disc-arena-phone.jpg` (full preparation and deploy action),
  `evidence-journey-disc-arena-battle.jpg` (asymmetric combat and following
  life bars), `evidence-journey-disc-arena-playtest-result.jpg` (score banking),
  and `evidence-journey-disc-arena-guardian.jpg` (Eclipse end-prize boss gate).
- Browser playtest: four selected discs spent exactly four of six preview
  tickets, spawned four player discs versus three Scout rivals, accepted
  repeated bounded Surges after recharge, reached a terminal victory, and
  banked 150 Disc Points into the visible nested track.
- The Island Run service runner passed every Journey Disc classification,
  boss, camera-fit, powerup, formation, scoring, cadence, armory merge,
  progression, and canonical action test. The repository-wide result was
  1770 passed / 3 pre-existing
  Island board guard failures outside Journey Disc files; these remain an
  unrelated baseline issue and were not modified as part of the event game.

- `journeyDiscArenaGame.ts` owns deterministic fixed-step steering, collision
  impulses, module modifiers, shield damage, spin drain, ring-outs, timeout
  scoring, rank stats, and bounded module effects.
- Focused tests cover deterministic scoring/replay, 1:1 disc-ticket spending,
  event-keyed idempotent score banking, milestone claims, collision damage,
  elimination, timeout resolution, and catalog/launcher inclusion.
- `journey-disc-arena/` supplies a lazy minigame manifest, full-screen Three.js
  renderer, development-only controller, responsive HUD, preparation bay,
  1–4 weapon-disc formation controls, nested reward track, and result contract.
- Canonical actions now start rounds, spend one active-event ticket per deployed
  disc, bank deterministic terminal scores once, and claim milestone rewards.
- Progress is stored under the active event runtime id in
  `journeyDiscArenaProgressByEvent`; the included migration has not been applied.
- The Island 006 integration pass later enabled `journeyDiscArenaEnabled` after the event-scoped persistence, centre-landmark ownership rule, and mobile QA gates were in place.
  The explicit local QA route is `/dev/journey-disc-arena`.
- TypeScript, production Vite build, `git diff --check`, and the Island Run
  architecture guard pass. The full Island Run service suite passes after its
  catalog-size expectations were updated for the tenth game.
- Browser QA confirmed exact 2-, 3-, and 4-disc formation counts; 6→3 and 6→2
  ticket spending; a terminal +76 score; a 76-point claimable node; disabled
  unaffordable formations; 320-point multi-claim state; Rank 2 propagation; and
  a +2 weapon-disc reward reaching the same wallet. Captured evidence:
  - `docs/gauntlets/evidence-journey-disc-arena-phone.jpg`
  - `docs/gauntlets/evidence-journey-disc-arena-battle.jpg`

### Reference and hands-on playtest pass

- Launched the linked Spinner Merge playable and inspected its live opening,
  reward claim, bright currency language, and merge/upgrade framing. Browser
  automation could not dismiss the Unity daily-bonus overlay, so this is not
  represented as a complete reference-game playthrough.
- Played Journey Disc Arena through 2-, 3-, and 4-disc launches, score banking,
  Formation Bay return, insufficient-ticket handling, rank and weapon-disc
  milestone claims, charged Surge feedback, and rematch/result affordances.
- The first build felt like a passive spectator demo. This pass added a direct
  Resonance Surge, shield bars, impact/critical/combo feedback, shock rings,
  original procedural impact/result audio, light haptics, 24-second rounds,
  instant rematches, and explicit spend-or-retry choices.
- Opening velocities and collision damage were retuned after live play showed
  the first clash deciding too much before input. The final opening preserves a
  beat for the player-fired Surge while higher-speed impacts remain dramatic.
- Fixed a real-time pacing defect found by switching browser tabs: short
  requestAnimationFrame throttling now catches up safely without allowing an
  unbounded catch-up after device sleep.
- The four-disc pass exposed an inflated ×28 contact chain; feedback now counts
  only spaced, meaningful impacts and caps the visible chain at ×9.

Known next-pass work before release: replace procedural relic stand-ins through
the approved player-piece asset pipeline, replace procedural audio with a
production mix, apply/verify the migration in a staging backend, add telemetry,
and capture physical-phone GPU/thermal/touch evidence.
