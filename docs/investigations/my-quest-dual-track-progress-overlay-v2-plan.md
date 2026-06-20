# My Quest & Game Progress Overlay v2 Plan

Date: 2026-06-20  
Scope: Documentation-only product/design plan for the next overlay implementation slice.

## Relationship to earlier plan

This plan supersedes the layout assumptions in `docs/investigations/dual-journey-ladder-game-overlay-plan.md` where the middle column was treated as a larger Combined Journey Level panel.

The updated direction is:

- Keep the current controller/menu/PLAY button untouched.
- Move the title into a real header area.
- Use two equal progress tracks:
  - left 50%: Real Life Journey ladder
  - right 50%: Game Journey ladder
- Use a very thin center divider/progress spine between them.
- Make both tracks use roughly the same visual/mechanical rules.

## Non-negotiable constraints

1. Do not change the current controller shell, menu slots, or PLAY button placement.
2. Do not change the existing `onPlayClick` behavior.
3. Do not move gameplay launch logic into new ladder components or adapters.
4. Do not add gameplay writes from overlay UI.
5. Do not call Island Run mutation services from the overlay.
6. Do not introduce schema changes in the first implementation slice.
7. Do not add dice, token, reward, stop-completion, or economy logic to the overlay.
8. Treat the overlay ladders as read-only/projection UI until a later product plan defines persistence.

## Proposed overlay structure

```text
GameBoardOverlay
├─ Ambient background / island scene
├─ Header band
│  ├─ Title: My Quest & Game Progress
│  └─ Subtitle: Life growth and adventure progress rise together.
├─ Dual-track stage
│  ├─ Left 50%: Real Life Journey ladder
│  ├─ Thin center divider / shared progress spine
│  └─ Right 50%: Game Journey ladder
└─ Existing controller/menu/PLAY button
   └─ Locked for this slice; do not alter.
```

## Header direction

### Primary title

`My Quest & Game Progress`

### Subtitle options

Preferred:

`Life growth and adventure progress rise together.`

Alternatives:

- `Two tracks. One journey.`
- `Real goals on the left. Adventure progress on the right.`
- `Build your life. Build your world.`

### Header behavior

- The header should sit near the top of the overlay content, not in the visual center.
- It should remain outside the controller/menu composition.
- It may include compact read-only chips later, but Slice 1 should prioritize clarity and layout.

## Core ladder mechanic

Both tracks should share the same progression grammar.

Each track is a vertical series of milestone boxes with visible spacing between boxes. The boxes should feel like a ladder, rail, or carousel moving upward as progress advances.

### Required box positions

At any moment, each track should visually emphasize three zones:

1. **Below center: achieved boxes**
   - Completed milestones sit below the center/current box.
   - They are tinted, dimmed, checked, or softly glowing to show they are done.
   - They should still be readable enough to create pride and history.

2. **Center: current box**
   - The current milestone sits in the visual center of the track.
   - It is the largest/clearest box and contains the most useful info.
   - This is the box the user is working on now.

3. **Above center: next/locked boxes**
   - The next target sits above the center box.
   - It may be partially hidden, fogged, or marked with `?`.
   - It should tease the next level without over-explaining it.

### Movement behavior

When a milestone is completed:

1. The ladder animates upward.
2. The completed center box moves down into the achieved zone.
3. The next `?`/preview box moves into the center position.
4. A new future `?` box appears above.
5. The center box updates from preview/locked styling to current styling.

The effect should feel like the player is climbing toward the next box rather than opening a static list.

### Animation principles

- Use transform/opacity animations rather than layout-heavy animation.
- Respect `prefers-reduced-motion`.
- Keep the animation purely presentational; it must not drive gameplay state.
- The animation should be triggered by changed read-model state, not by direct gameplay writes.
- In Slice 1, a static arrangement with CSS-ready class states is acceptable; live milestone-complete animation can be a later slice.

## Shared track model

Both the Real Life and Game ladders should render from the same display card shape.

```text
DualTrackMilestoneCard
- id
- track: real_life | game
- position: previous | achieved | current | next | locked
- title
- subtitle
- progressLabel
- rewardPreviewLabel
- visualState: achieved | current | preview | locked
- icon
- imageSrc? / silhouette?
- source: placeholder | goal | habit | island | profile | other
```

The two tracks can have different art direction, but their mechanics should match.

## Left track: Real Life Journey ladder

### Purpose

Show personal growth as a progression path, not as a task list.

### Visual style

- Warm green/gold palette.
- Organic growth motifs: leaf, sprout, path stones, sunrise, tree, mountain.
- Achieved boxes: tinted green/gold, checkmark, subdued glow.
- Current box: brighter, readable, actionable.
- Future boxes: fogged silhouettes or `?` cards.

### Candidate milestone ladder

Initial placeholder-safe sequence:

1. Clarity & Focus
2. Consistent Habits
3. Healthy & Strong
4. Dream Career
5. Financial Freedom
6. Legacy Builder
7. Impact & Giving
8. Ultimate Freedom

These are presentation milestones for Slice 1. They should not imply that the app has already validated real-world completion unless connected to clear user data in a later slice.

### Slice 1 data rule

Use curated placeholder-safe cards only, or already-loaded read-only information if available without new fetch complexity.

### Later data sources

Later slices may derive cards from:

- goals
- active habits
- habit logs
- check-ins
- profile strength
- life wheel categories
- journal/reflection milestones

But future integration must remain read-only unless a separate product/data plan defines writes.

## Right track: Game Journey ladder

### Purpose

Show the game-side progression as a collectible ladder/gallery, similar in emotional role to a Monopoly GO-style net-worth/gallery progression surface, but adapted to Island Run.

The right track should feel like:

- islands collected/unlocked
- adventure progress made visible
- next island teased
- future islands hidden with mystery

### Visual style

- Blue/cyan/gold palette.
- Floating islands, map fragments, shields, compass, stars, water, portal glow.
- Achieved boxes: completed island cards, tinted blue, checkmark or completed badge.
- Current box: active island card with strongest artwork/readability.
- Future boxes: grey/blue silhouettes or `?` cards.

### Candidate card content

- Island number
- Island display name
- Completion/progress label
- Preview reward copy, if clearly display-only
- Thumbnail/silhouette

### Slice 1 data rule

Use existing overlay island display props and island names only.

Do not read or write:

- dice pool
- token index
- stop state
- reward grants
- economy balances
- active reward actions

## Thin center divider / shared progress spine

### Purpose

Connect the two tracks without becoming a third content column.

### Visual design

- Very thin vertical rail between the two 50% tracks.
- Left edge can glow green/gold.
- Right edge can glow blue/cyan.
- Optional small shared-level badge near the center or top.
- Optional progress pulse traveling upward when either side advances.

### Content limits

The divider should not contain long copy. It can show compact labels such as:

- `Lv 12`
- `Together`
- `Next`
- a compass/star/tree icon

### Data rule

If a shared level is displayed, it should use the existing app gamification level/XP read model. Do not create a new combined-level formula in Slice 1.

## Layout and responsiveness

### Primary layout

```text
┌───────────────────────────────────────────┐
│ My Quest & Game Progress                  │
│ Life growth and adventure progress rise...│
├─────────────────────┬───┬─────────────────┤
│ Real Life Journey   │ │ │ Game Journey    │
│ [next / ?]          │ │ │ [next / ?]      │
│ [current]           │ │ │ [current]       │
│ [achieved]          │ │ │ [achieved]      │
│ [achieved]          │ │ │ [achieved]      │
├─────────────────────┴───┴─────────────────┤
│ Existing controller/menu/PLAY button       │
└───────────────────────────────────────────┘
```

### Mobile behavior

- Preserve the two-track split as long as readable.
- Reduce card density before collapsing the concept.
- On small heights, show one achieved card, one current card, and one next/locked card per track.
- If width becomes too tight, allow a follow-up fallback mode with segmented tabs, but do not start there unless testing proves the split is unreadable.

## Read-only adapter direction

Create a display adapter that outputs the two tracks and the center spine.

```text
DualTrackOverlayViewModel
- title
- subtitle
- realLifeTrack: DualTrackMilestoneCard[]
- gameTrack: DualTrackMilestoneCard[]
- centerSpine:
  - sharedLevelLabel?
  - progressPercent?
  - icon?
- animationState?
```

Adapter rules:

1. Produce deterministic output for tests.
2. Return placeholder cards when real data is missing.
3. Never throw in a way that prevents PLAY from working.
4. Never mutate gameplay, goal, habit, reward, or gamification state.
5. Never import Island Run mutation/action services.
6. Keep Island Run reads to display-safe props or read-only name helpers in Slice 1.

## Implementation slices

### Slice 0 — plan update

- Add this plan.
- No runtime code changes.

### Slice 1 — static dual-track shell

Goal: render the header, two equal tracks, thin center spine, and placeholder cards while leaving the controller/menu/PLAY button untouched.

Tasks:

- Add read-only adapter with placeholder-safe output.
- Render header above the dual-track body.
- Render left Real Life track and right Game track using the same card component.
- Render thin center spine.
- Keep current controller/menu/PLAY button exactly where it is.
- Add CSS classes for achieved/current/next/locked card states.
- Add `prefers-reduced-motion` handling for any initial animations.
- Add adapter unit tests.

Out of scope:

- Real goal/habit fetches.
- Gameplay writes.
- Island Run action-service calls.
- Schema changes.
- New reward grants.
- Moving/restyling the controller shell.

### Slice 2 — current island read integration

Goal: make the right Game track reflect current island number/name safely.

Tasks:

- Build game track cards from existing island display props and island name helper.
- Show achieved/current/next/locked island states.
- Handle island 1 and island 120 safely.
- Keep all reward text display-only.

### Slice 3 — real-life read integration

Goal: make the left Real Life track lightly personal without writes.

Tasks:

- Load goals only when overlay opens and user is authenticated.
- Load active habits only when overlay opens and user is authenticated.
- Map clear statuses to achieved/current/next only when data supports it.
- Keep placeholders where data is missing or ambiguous.
- Ensure data loading cannot block PLAY.

### Slice 4 — ladder motion

Goal: add the upward ladder motion when read-model state advances.

Tasks:

- Add CSS transform states for cards moving from next to current and current to achieved.
- Trigger animation from changed view-model state only.
- Respect `prefers-reduced-motion`.
- Ensure no animation changes gameplay/account state.

### Slice 5 — polish and accessibility

Goal: make the overlay robust across phone sizes and assistive technologies.

Tasks:

- Verify readable card density on small screens.
- Add accessible labels for `?`/locked cards.
- Confirm focus order keeps PLAY reachable.
- Confirm opening/closing overlay does not mutate Island Run state.
- Confirm long goal/island names do not break layout.

## Testing strategy

### Automated

- Adapter returns placeholder Real Life cards with no user data.
- Adapter returns deterministic Game cards for island 1.
- Adapter handles island 120 without invalid future labels.
- Both tracks use the same card state vocabulary.
- Locked cards expose safe `?`/hidden copy only.
- Missing data does not throw.
- Component test confirms PLAY callback still fires exactly once.

### Manual QA

1. Open the game overlay.
2. Confirm the existing controller/menu/PLAY button appears and behaves unchanged.
3. Confirm title appears in the top header area, not the visual center.
4. Confirm left and right tracks each show boxes with spacing.
5. Confirm achieved boxes are below center and tinted/done.
6. Confirm current boxes are centered and most prominent.
7. Confirm next/locked boxes are above center and partially hidden or marked `?`.
8. Press PLAY and confirm Island Run launches exactly as before.
9. Close Island Run and confirm previous overlay reopen behavior still works.
10. Open/close overlay without pressing PLAY and confirm Island Run state does not change.

## Open product questions

1. Should the Real Life ladder start as a fixed narrative ladder, or should it immediately derive from user goals/habits?
2. Should the center spine show the existing app level, or remain purely decorative in Slice 1?
3. How many cards per track should be visible on the smallest supported phone height?
4. Should future boxes show only `?`, or should they reveal a generic title such as `Future milestone` / `Future island`?
5. Should the Game ladder eventually represent islands only, or also include album/gallery-style collectible progress?

## Recommended first PR after this plan

Title: `Add My Quest dual-track overlay shell`

Scope:

- Display-only adapter.
- Header band with `My Quest & Game Progress`.
- Two equal ladder tracks with placeholder cards.
- Thin center spine.
- No controller/menu/PLAY changes.
- Adapter tests.

Success criteria:

- Existing controller/menu/PLAY behavior is unchanged.
- Dual tracks share the same box/ladder mechanics.
- Header is visually above the tracks.
- Opening/closing the overlay does not mutate gameplay state.
- Build and relevant tests pass.
