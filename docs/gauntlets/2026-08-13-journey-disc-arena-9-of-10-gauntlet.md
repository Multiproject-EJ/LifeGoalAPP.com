# Journey Disc Arena — 9/10 Quality Gauntlet

Status: **Implementation pass complete; release/device QA remains**, approved by
Eivind on 2026-08-13 after rating the previous slice 4/10 and instructing Codex
to proceed.

## Mission

Turn the functional Journey Disc Arena slice into a premium, replayable,
mobile-first HabitGame event battle. The target is not feature count: it is a
clear leap in moment-to-moment readability, player agency, impact, audiovisual
cohesion, and desire to rematch.

## Current critique (4/10 baseline)

- Arena floor looks like simple prototype geometry and carries no authored
  HabitGame identity.
- Fighters occupy too few pixels, bunch together, and are difficult to identify
  during motion.
- Large portions of the phone are visually inert while the fight happens in a
  small cluster.
- One six-second Surge button is insufficient agency for an “addictive” battle.
- Hits have state feedback but weak anticipation, trails, hit-stop, particles,
  spatial separation, and reward crescendo.
- Preparation is functionally clearer, but lacks an exciting opponent preview,
  comparative strength read, and immediate weapon identity.
- Procedural audio proves the channel but lacks a continuous energy bed and
  enough event layering to make the arena feel alive.

## 9/10 observable outcome

At 390×844, a first-time player can identify their green team, the red rival,
health, weapon identity, the arena hazards, and the next meaningful action in
under two seconds. The first collision happens quickly, strong hits visibly
move fighters, the player can intervene frequently, knockouts create a readable
three-beat crescendo, and the result makes a rematch feel immediately tempting.

## Non-negotiables

- Mobile only and inside canonical HabitGame Island Run.
- Complete arena lip remains visible; no fighter or core control is hidden.
- Existing deterministic service remains gameplay authority.
- Ticket spend, score, armory, reward claims, and cadence remain canonical.
- Original visual/audio expression; no copied assets, layouts, timing, names,
  characters, progression values, or level design from the reference game.
- Feature remains default-off. No merge, push, deployment, or migration apply.
- Reduced-motion and HabitGame sound/haptic preferences remain respected.

## Quality milestones

### Q1 — Authored arena identity

- Replace flat rings with an original HabitGame cobalt/cyan/gold/magenta arena
  material and structural rim.
- Add animated energy sweep, boundary hazard and visible speed-lane language.
- Evidence: phone capture reads as a premium game surface rather than a test lab.

### Q2 — Fighter readability

- Increase fighter screen size and visual hierarchy.
- Add team-color body plates, pronounced weapon silhouettes, thicker energy
  rails, readable health bars, shadows and motion trails.
- Reduce unintentional pileups through deterministic steering/separation tuning.
- Evidence: green and red fighters remain countable during four-versus-five play.

### Q3 — Active combat loop

- Give the player a meaningful action at least every 2–3 seconds through a
  deterministic multi-charge or faster-recharging intervention loop.
- Add targeting/readiness communication without creating React gameplay state.
- Evidence: action input changes a battle visibly and cannot be spammed without
  bounded charge rules.

### Q4 — Impact and payoff

- Add directional trails, sparks, hit-stop/presentation pause, damage flash,
  shield-break burst, KO launch/shrink, camera punch and crowd response.
- Result card exposes victory quality, reward progress, survivor state and one
  prominent rematch action.
- Evidence: critical hit and KO are legible in still capture and slow-motion QA.

### Q5 — Mobile UX and sensory coherence

- Collapse passive chrome during battle so the arena owns the screen.
- Preparation shows opponent class, power comparison, formation, weapons and
  ticket cost without vertical scroll.
- Layer an original procedural energy bed, collision transients, weapon cues,
  countdown/result stings and preference-aware haptics.
- Evidence: 390×844 and shorter-phone captures, DOM fit, reduced-motion spot
  check, full round playtest and rematch.

## Acceptance evidence

- Pure deterministic replay and scoring tests remain green.
- New tests cover action recharge/charges, separation and any new effect timing.
- Typecheck, production build and Island Run architecture guard pass.
- Full Island Run suite has no new failures beyond the recorded unrelated
  Island 1 camera/plot baseline.
- Captures: formation, opening clash, critical hit, KO, result, Guardian.
- Browser playtest: arbitrary spatial slots → correct ticket spend → active
  interventions → terminal bank → reward progress → rematch.

## 2026-08-13 completed Gauntlet pass

- Integrated an original generated 1024² WebP arena-floor asset (273KB) as the
  actual Three.js floor material, with code-native rotating energy sweeps.
- Increased fighter visual scale, team plates, weapon silhouettes and health
  bars; added shadows, speed trails, damage flashes and KO camera punch.
- Added deterministic ally separation steering so multi-disc formations remain
  countable instead of collapsing into one pile.
- Reworked Surge into a charge decision: it becomes actionable at 70% in about
  2.1 seconds; holding to 100% produces a stronger impulse and spin refill.
- Simplified the prep card, added a formation-versus-rift power comparison, and
  preserved no-scroll 390×844 fit with the entire arena lip visible.
- Added a low-volume original procedural battle energy bed plus layered event
  cues; existing HabitGame haptics remain the tactile authority.
- Added victory-quality stars, survivors, shield remaining and next-reward
  information to the result payoff.

### Captured evidence

- `evidence-journey-disc-arena-9of10-phone-prep.jpg`
- `evidence-journey-disc-arena-9of10-phone-battle.jpg`
- `evidence-journey-disc-arena-9of10-phone-result.jpg`

### Verification

- `tsc --noEmit`: pass.
- Production Vite build: pass (existing chunk-size warnings only).
- Island Run architecture guard: pass, 0 violations; 3 pre-existing allowlisted
  warnings.
- Live browser playtest at exact 390×844: prep fits without scroll, full board
  lip visible, health bars follow fighters, tickets drop 6→4 for two deployed
  discs, combat terminates, results bank, and rematch launches.
- Live cooldown check after a max strike: `STRIKE READY` at 79% after 2.08s.
- Full Island Run service suite: 1771 passed, with only the recorded three
  unrelated Island 1 camera/plot baseline failures.

## Budgets

- One Three.js renderer and one simulation loop.
- Portrait DPR cap 1.75; target 60fps, acceptable floor 45fps on representative
  physical device before release.
- Maximum 16 fighters, 160 draw calls and 140k triangles.
- Generated arena texture optimized to 1024² WebP, under 700KB target.
- Battle HUD controls stay inside safe-area and above bottom gesture region.

## Rollback and stop conditions

The quality pass remains on `codex/journey-disc-arena`. Generated assets are
isolated under `public/assets/event-games/journey-disc-arena/`. Roll back any
slice that reduces phone readability, deterministic replay, canonical state
ownership, performance budget or accessibility. Stop for Eivind only if a
material product choice cannot be made reversibly, or release authority is
required.
