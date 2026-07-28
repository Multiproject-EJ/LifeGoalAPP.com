# HabitGame chat roadmap status

**Audit date:** 2026-07-28

**Audited through:** Arena preferences + Adventure League implementation branch

This document records the difference between ideas discussed in the product
conversation, work represented by story/design artifacts, and behavior that is
actually wired into the application.

## Status vocabulary

- **Done:** live runtime behavior or a complete production asset.
- **Partial:** a meaningful foundation exists, but the full experience described
  in the conversation is not shipped.
- **Planned:** documented or represented by a concept/placeholder only.

## Done

### Championship presentation foundation

- Three championship host levels are mapped at Islands 30, 72, and 117.
- Each Arena receives a wide cinematic banner and animated ceremony CTA.
- Each championship opens through the existing Story Mode reader and returns to
  the Arena cleanly.
- All three ceremonies have separately authored 9:16 portrait artwork for phone
  Story Mode. The wide banner art is not automatically cropped into the story.
- Portrait micro-film presentation includes full-height framing, a slow
  cinematic camera move, caption entrance, vignette, and reduced-motion
  fallback.

### Early diplomatic framing

- The opening prologue starts aboard the spaceship and does not reveal or name
  the Great Drift.
- Island 1 introduces the Reconstruction Accord and frames Arena participation
  as diplomatic reciprocity.
- The reward channel is hidden for a fresh Island 1 expedition until Hatchery
  Level 1. Its progress authority is unchanged while the presentation is hidden.
- Hatchery Level 1 triggers the PA explanation of reciprocal supplies.

### Audio direction

- Quiet island ambience is the default board score.
- The former energetic opening/luxury track is assigned to the Dormant Door
  three-equals matching event.
- Celebration and shop music retain higher-priority context routing.

### Existing event-game foundation

- Four canonical timed events rotate through the event engine:
  Island Workshop, Fortune Engine, Space Excavator, and Companion Feast.
- These games use event-scoped tickets and canonical event progress/reward
  actions.
- Event progress and tickets are represented in the Supabase-backed Island Run
  runtime persistence path.
- Additional registered game surfaces exist for Shooter Blitz, Boss Rhythm, and
  Vision Quest.

### Arena preference and pacing system

- Players can rank all four canonical Arena games.
- At most one of the four games can be paused, enforcing the 25% cap in the UI,
  normalization layer, and Supabase constraint.
- The favourite active game is a full mission, middle games are 45-second quick
  fights, and the lowest active game is a 15-second flash fight.
- Preferences save locally for immediate/offline use and sync privately through
  Supabase.

### Adventure League

- The former leaderboard is now an explicit, private-by-default League opt-in.
- Only a player-selected public identity, archetype, level, and Combined Journey
  XP are placed in the public League row; private profile fields are not exposed.
- The destination remains named **Leaderboard** until the player joins, then
  becomes **Adventure League**.
- Joining grants the cosmetic Founding Explorer crest and plays scan, zoom,
  snap, glow, confetti, and “Well done” beats with reduced-motion support.
- Players can leave at any time, which deletes their public League row.
- Top 50 and the current player’s nearby rank window use canonical Combined
  Journey XP/level ordering.
- Joined League scores refresh when canonical Combined Journey progress is
  persisted, as well as when the League opens.

### Mobile image release gate

- Newly added or modified runtime raster images must be WebP/AVIF and no larger
  than 550 KB.
- Championship micro-film images are always enforced by the automated check.
- The current six championship frames are 391–473 KB each.

## Partial

### Championship experience

- The three ceremony shells and Story Mode chapters are live.
- The 120 Worlds “one host broadcasts to every island” behavior is story copy,
  not a networked championship mode.
- Island 117’s synchronized 120-Arena spectacle is visual/story presentation,
  not synchronized multiplayer gameplay.
- The portrait chapters currently use one hero micro-film frame followed by
  authored story beats. Multi-shot animation/video production remains open.

### Story architecture

- Creation Halls, diplomatic reciprocity, reconstruction side effects, and
  attack-then-rebuild chapters have manifests and image briefs.
- These supporting chapters are mostly display-content foundations and are not
  yet all triggered by the runtime narrative controller.
- The later Great Drift direction is extensively documented, but its reveal
  state, durable branching, and Islands 118–120 runtime gates are not built.
- Older design documents still reveal the Great Drift early and need canon
  reconciliation even though the live opening no longer does.

### Builder robots and PA

- PA/Chief Builder/builder-family visual concepts and identity rules exist.
- The PA speaks in the live Island 1 diplomatic reveal.
- The menu mascot does not yet equip the glassworker helmet in runtime.
- Bot Bay, individual robot identity cards, Chief Builder dialogue, and Creation
  Halls fabrication animations are not built.

### Event games

- The four canonical event games are playable foundations with ticket/progress
  contracts.
- Quality, balance, final icon coverage, per-event audio, and full edge-device
  QA remain uneven across games.
- The much larger “build every proposed clone/adaptation” request is not
  complete.

### Ambient island audio

- One quiet environmental board track is wired.
- Per-island nature beds, biome transitions, and localized environmental layers
  are not yet authored.

## Planned / still left

### Momentum Matrix / Block Blast-inspired habit game

- A visual concept exists.
- No production grid logic, habit-powered pieces, scoring, tickets, Supabase
  progress, reward contract, or Arena integration exists yet.
- The final game must remain an original mechanic and visual treatment rather
  than copying third-party branding, assets, sounds, or UI.

### Event-game library and modal

- Recover and lock the exact proposed game list; the current repository has no
  single canonical list matching every game discussed in chat.
- Produce each approved game end to end: name, icon, gameplay, ticket lifecycle,
  natural start/stop, persistence, rewards, animation/audio polish, QA, and edge
  testing.
- Expand the minigame modal into additional rows of four.
- Add preference controls and duration labels without making the catalog feel
  like a settings screen.

### 120-island story production

- Lock the first two championship host-island placements.
- Reconcile all 120 island briefs with the diplomatic escalation curve.
- Build the Island 50-area “restoration causes damage” turning point.
- Build carefully reviewed attack-then-rebuild islands and their consequences.
- Give each Arena a host-culture identity.
- Implement delayed Drift foreshadowing and the Islands 118–120 reveal/capstone.

### Story micro-film production standard

- Treat 9:16 portrait as the master Story Mode format.
- Author establishing, transformation, reaction, and handoff shots for each
  important chapter.
- Keep landscape art as banners/marketing derivatives, not Story Mode masters.
- Add real short video or layered motion only after poster/reduced-motion assets
  exist.

## Recommended delivery order

1. Momentum Matrix as the first new preference-aware event game.
2. Minigame modal expansion and the next four-game production batch.
3. Creation Halls/Bot Bay runtime shell and mascot equipment.
4. 120-island story-map reconciliation and later Drift reveal.
