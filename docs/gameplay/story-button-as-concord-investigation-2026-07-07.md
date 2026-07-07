# Story Button as Concord Entry Investigation (2026-07-07)

Status: investigation with initial implementation slice. This document records the design decision; the first implementation keeps the pre-build button as Story and only switches it to The Concord after the canonical technology unlock is active.

## Question

Can the current **Story** button in the 120-island Island Run game become a combined **Story + Concord** entry, where story reading is a side function of The Concord rather than a separate top-level affordance?

## Short verdict

Yes — this is directionally strong, but it should be implemented as a **Concord hub that contains Story/Archive access**, not as a pure rename of the existing Story button.

The safest product shape is:

- Before The Concord is built: keep the affordance readable as **Story** or **Signal Log**, with locked/dormant Concord copy.
- During Island 1 assembly: evolve it into **Concord** / **Restore Concord**, showing fragment progress and available story logs.
- After The Concord is active: the same button becomes **The Concord**, with story episodes, caretaker/creature channels, translated memories, and archive/replay functions inside it.

This preserves story access while making The Concord the player-facing meaning/communication layer.

## Current repository evidence

### Existing Story button behavior

The board currently exposes Story in at least two board-control locations. Both directly open the global prologue manifest through `setActiveStoryEpisode({ kind: 'global_prologue', manifestPath: '/storyline/episode-001/manifest.json' })`.

This means the button is currently not a dynamic island archive, Concord panel, or episode picker. It is a shortcut to the global prologue reader.

### Existing StoryReader surface

`IslandStoryReader` is already a modal reader surface that loads a manifest path, displays panels, closes through a board-level handler, and can optionally award the global-prologue reward. That makes it a good candidate to remain the **reader component** inside a future Concord hub rather than being replaced.

### Existing Concord content and access model

The Concord already has a real content/access direction:

- `getIslandCaretakerConcordContent` resolves caretaker Concord conversation content for every valid island number.
- `getIslandCommunicationAccess` gates inhabitant and creature channels on active `the-concord` technology state.
- The Concord docs define it as the device that translates meaning, not just words, and as the explanation for retro communication.

So the lore and code already support treating story/memory/logs as Concord-adjacent.

## Recommendation

Create a new top-level presentation concept: **Concord Hub**.

The current Story button should eventually open this hub instead of immediately opening the prologue. Inside the hub:

1. **Story / Archive**
   - Continue to use `IslandStoryReader` for global prologue, island arrival, island resolution, and future authored episodes.
   - Reframe these as recordings, translated memories, expedition logs, or Concord archive entries.

2. **Caretaker Channel**
   - Route to the existing Concord caretaker content when `getIslandCommunicationAccess(record, 'inhabitant')` allows it.
   - Before unlock, show partial/distorted communication copy rather than full conversation.

3. **Creature Channel**
   - Route to creature communication when `getIslandCommunicationAccess(record, 'creature')` allows it.
   - Before unlock, show locked channel copy.

4. **Concord Status**
   - Show dormant/restoring/active state and the nine-fragment model.
   - Do not mutate technology state from this UI. The hub should read canonical state and call canonical actions only through service-owned handlers if future buttons need mutation.

## Naming options

Recommended final label:

- **🜁 Concord** or **📡 Concord**

Good transitional labels:

- **📖 Story** before discovery.
- **📖 Signal Log** when communication is still broken.
- **🧩 Restore Concord** during Island 1 assembly.
- **📡 The Concord** after activation.

Avoid permanently labeling the button **Story + Concord**. It is clear for design discussion but too bulky for the controller/footer UI. Instead, make Story a tab inside the Concord hub.

## Architecture constraints

This should be a UI/navigation migration, not a gameplay-authority migration.

Do not:

- add gameplay writes directly inside the React button or hub;
- call runtime patch APIs from the hub for gameplay fields;
- create new runtime mirrors for story/concord unlock state;
- let story content grant Concord technology unlocks;
- tie Concord/story access to board tile indices.

Do:

- read Island Run state through canonical store/hook paths;
- use existing pure access helpers for communication gating;
- keep StoryReader as a display-only reader;
- let canonical technology/collection services remain the authority for Concord build/activation;
- add tests around button-label resolution and hub access resolution when implemented.

## Suggested implementation slices

### Slice 1 — Pure resolver, no UI redesign

Add a pure resolver such as `resolveConcordHubEntryState(record)` that returns:

- button label;
- icon;
- primary tab;
- whether Concord channels are locked;
- which story entries are available.

Test pre-Concord, assembling, active, no-companion, and active-companion states.

### Slice 2 — Replace Story button target with a hub shell

Change the existing Story button click to open a lightweight Concord hub after The Concord is active. Before the canonical technology unlock is active, the same affordance remains Story and still opens the prologue directly, preserving current behavior.

### Slice 3 — Add Concord status and channels

Add status cards and locked/available channel CTAs backed by existing access helpers.

### Slice 4 — Expand story archive

Register island arrival/resolution episodes and future 120-island story fragments as Concord archive entries.

## Product rationale

This reduces top-level UI clutter and makes the world feel more coherent:

- The Concord becomes the player’s interface for meaning, memory, translation, and relationship.
- Story stops feeling like a disconnected cinematic button.
- The same entry can grow from simple prologue replay into a long-term 120-island archive.
- The retro communication, caretaker conversations, creature channel, and story reader all gain one unifying fiction.

## Risks

1. **New-user clarity risk** — if Story disappears too early, players may not know where the prologue went. Mitigation: preserve Story wording until Concord is discovered/introduced.
2. **Unlock confusion risk** — if the hub opens before Concord is active, players may think communication should work. Mitigation: show locked/dormant channel cards with clear copy.
3. **Architecture risk** — a hub could become a tempting place to mutate technology/story state. Mitigation: keep it display-first and route mutations through canonical services.
4. **Scope risk** — a full hub can balloon into workshop, archive, dialogue, companion chat, and codex all at once. Mitigation: start with current prologue behavior plus status/locked cards.

## Final recommendation

Proceed, but as a staged migration:

> Turn the current Story affordance into a Concord Hub entry, and make Story/Archive one tab inside it.

For MVP, keep the existing prologue reader one click away from the hub so player-facing behavior is preserved while the conceptual model shifts toward The Concord.
