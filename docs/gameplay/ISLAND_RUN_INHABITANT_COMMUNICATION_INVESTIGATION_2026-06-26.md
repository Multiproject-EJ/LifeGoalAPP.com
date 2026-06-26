# Island Run Inhabitant Communication System Investigation (2026-06-26)

Status: **Investigation and implementation plan only. No runtime implementation.**

## Verdict

**PASS WITH CONDITIONS — proceed with a two-stage flow.**

Recommended model: **Option 2, Two-stage flow**.

> Premium inhabitant encounter screen → player chooses a topic → retro conversation mode opens → conversation ends → return to encounter or board.

This gives Island Run a premium first impression while keeping the actual conversation compact, testable, accessible, and reusable. It also respects current architecture: gameplay remains owned by canonical Island Run services, narrative beats remain owned by the existing narrative registry/opening flow, and the new system becomes a sibling conversational presentation model instead of a second story engine.

## Repository findings that shape the recommendation

- Island Run reads should use `useIslandRunState` and gameplay writes must go through canonical action services; UI-only transient state is allowed. The communication system must therefore keep dialogue UI state local and route any future gameplay effects through existing canonical services, not through content callbacks or component writes.
- The current Island 1 narrative content contract is read-only and explicitly forbids rewards, action IDs, gameplay callbacks, mutation fields, tile indices, build/travel/boss/stop action fields, and other gameplay-authority fields in narrative content.
- Existing Island narrative definitions already model characters, beat triggers, repeat policy, priority, and surfaces (`story_reader`, `dialogue_sheet`, `toast`). They are intentionally small and validated.
- `IslandNarrativeDialogue` already provides a viewport portal, fixed overlay/backdrop, focus restoration, Escape close, scroll locking, and a concise dialogue-sheet pattern.
- `IslandNarrativeToast` is a lightweight portal status surface and should remain for ambient narrative notes, not interactive inhabitant conversations.
- `IslandStoryReader` loads JSON story episode manifests and is appropriate for major story sequences, not for short choice-driven inhabitant conversations.
- `useIslandNarrativeOpeningFlow` already owns queued story/dialogue/toast surfacing and blocks narrative surfaces while higher-priority gameplay overlays are active.
- `IslandRunBoardPrototype` currently owns many overlay booleans and local modal states, including story reader, narrative dialogue, active stop, shop/market/build panels, sanctuary, minigames, encounter modal, claim modal, travel overlay, and win celebration. Any inhabitant MVP integration should add one coordinator entry point, not scattered modal booleans.
- Existing audio/haptic utilities are typed, preference-gated, lazy, throttled, and reduced-motion aware. New conversation SFX should extend that service later, not create a parallel audio system.

## 1. Recommended UX model

Use **Option 2 — Two-stage flow** for MVP.

### Layer A: premium encounter presentation

A viewport-fixed, phone-first encounter surface introduces the inhabitant. It shows:

- island/biome background art,
- large servant-wizard full-body art,
- name and role plate,
- short greeting,
- two to four topic buttons,
- optional close/return control,
- biome accent color and shared inhabitant emblem.

### Layer B: retro conversation mode

Selecting a topic opens a separate retro conversation view. It shows:

- compact pixel scene with a generic player back-facing sprite and the inhabitant sprite,
- speaker name plate,
- large readable dialogue box,
- optional typewriter reveal with immediate tap-to-reveal,
- simple response choices,
- continue indicator,
- deterministic close.

### Return behavior

For MVP, conversations should usually close back to the **encounter screen** if launched from the premium surface, with a prominent “Return to island” / “Done” action. Critical one-off auto launches may close straight to board after the final page.

## 2. Why this is best

Two-stage flow is the strongest fit because it:

1. **Preserves both fantasies.** The premium surface delivers mobile-game polish and biome identity. The retro surface delivers nostalgic conversation without compromising the modern hero composition.
2. **Keeps implementation small.** Each component can be built and tested in isolation before integration.
3. **Reduces modal collision risk.** A coordinator can treat the pair as one inhabitant flow with one active overlay token.
4. **Improves accessibility.** The retro dialogue can optimize text size and interaction separately from the large premium art surface.
5. **Avoids a second story engine.** Conversations can reuse existing narrative character/metadata concepts and validation guardrails while remaining a small sibling content type.
6. **Scales across 120 islands.** The premium layer can share frames and palette tokens; the retro layer can use small sprites and palette swaps.
7. **Avoids style confusion.** A deliberate transition from premium to retro makes the retro mode feel like “conversation focus” rather than a mismatched dialogue box pasted onto premium art.

## 3. Rejected alternatives and tradeoffs

### Option 1 — One hybrid screen

Rejected for MVP.

- **Pros:** fewer screens; premium background remains visible.
- **Cons:** retro dialogue competes with high-fidelity art, reduces readability, and risks looking like two unrelated styles. The premium composition has less room for readable choices and long text on small phones.

### Option 3 — Progressive transformation

Rejected for MVP; possible later polish.

- **Pros:** memorable transition; strongest art direction if executed well.
- **Cons:** higher animation complexity, more device testing, greater reduced-motion burden, and more ways to break safe-area/focus behavior.

### Option 4 — Context-dependent surfaces

Rejected as the primary model for MVP, but useful as a rule inside Option 2.

- **Pros:** short encounters can stay quick.
- **Cons:** if users cannot predict whether a choice opens premium text or retro mode, the system feels inconsistent. For MVP, use premium for topic selection and retro for actual back-and-forth. Very short one-line ambient notes should continue using existing toast/dialogue systems.

## 4. Detailed phone-first player flow

### First meeting

1. Player lands on an eligible inhabitant tile or opens an eligible encounter.
2. Board roll/auto-roll pauses because an overlay is active.
3. Premium encounter opens in a top-level portal with fixed full-screen backdrop and scroll lock.
4. The island background fills the screen; the servant wizard appears large with name, role, and a one-sentence greeting.
5. Three topic buttons appear, for example:
   - “What should I do next?”
   - “Tell me about Luma Isle.”
   - “Who are you?”
6. Player chooses a topic.
7. Premium screen crossfades or slides down into retro conversation mode. Under reduced motion, the transition is instant.
8. Retro scene shows the generic player back sprite facing the inhabitant.
9. NPC text reveals by page. Tap once reveals all text on the current page; tap again advances.
10. Player chooses one response if present.
11. NPC gives one short follow-up and a deterministic close.
12. Player taps “Continue”.
13. Return to the premium encounter if more topics remain, or close to board if the launch intent was one-and-done.

### Guidance

Manual “Talk” or “Ask for guidance” opens the premium encounter without forcing it on landing. Guidance topics may read current canonical gameplay state to choose display copy, but they must not mutate gameplay.

### Wisdom encounter

The inhabitant may ask a reflective question in retro mode. MVP should support choice responses and optional text-response capture only as presentation output. Any later Compass/goals/habits/reflection write must be routed to the canonical owner for that system in a separate integration PR.

### Landmark communication

A landmark modal may include a “Talk to caretaker” button. That button should request the inhabitant flow through the overlay coordinator after the landmark modal is closed or suspended. It should not stack a second modal over the landmark modal.

### Repeat visits

MVP repeat behavior:

- first visit auto-opens only for a tightly scoped trigger,
- repeat landings show no automatic interruption by default,
- manual Talk remains available,
- locally suppressible “seen” state may shorten greeting/topic list,
- no database migration for MVP.

### Skip and close

- Premium surface: close returns to board or previous modal context without marking gameplay complete.
- Retro surface: close asks “Leave conversation?” only if there is typed input; otherwise close returns to encounter/board.
- Escape closes when safe. If a story-critical conversation later disallows dismissal, that must be explicitly modeled and accessibility-reviewed.

## 5. Relationship to existing narrative systems

Recommendation: **introduce sibling components backed by a shared presentation/content model, and reuse existing narrative metadata/validation guardrails. Do not extend `IslandNarrativeDialogue` into a large engine.**

- Keep `IslandStoryReader` for major story beats and cinematic episodes.
- Keep `IslandNarrativeDialogue` for one-shot story dialogue sheets.
- Keep `IslandNarrativeToast` for ambient notes.
- Add `IslandInhabitantEncounter` and `IslandRetroConversation` as sibling presentation components.
- Add a minimal `islandConversationTypes.ts` and validator that borrow the same prohibitions as narrative validation: no reward fields, no callbacks, no mutation/action fields, no tile-index authority, no build/travel/boss/stop completion authority.
- Optionally add a `conversation` surface reference to narrative beats later, but do not make the existing opening flow a full branching engine in the first PR.

This avoids creating a second independent story engine while avoiding overloading the current one-shot dialogue component.

## 6. Proposed component architecture

### Likely new files

- `src/features/gamification/level-worlds/inhabitants/islandInhabitantTypes.ts`
- `src/features/gamification/level-worlds/inhabitants/islandConversationTypes.ts`
- `src/features/gamification/level-worlds/inhabitants/islandConversationValidation.ts`
- `src/features/gamification/level-worlds/inhabitants/definitions/island001InhabitantConversations.ts`
- `src/features/gamification/level-worlds/inhabitants/components/IslandInhabitantEncounter.tsx`
- `src/features/gamification/level-worlds/inhabitants/components/IslandRetroConversation.tsx`
- `src/features/gamification/level-worlds/inhabitants/components/IslandInhabitantFlow.tsx`
- `src/features/gamification/level-worlds/inhabitants/useIslandInhabitantFlow.ts`
- `src/features/gamification/level-worlds/inhabitants/__tests__/islandConversationValidation.test.ts`
- component tests for encounter and retro conversation navigation.

### Likely reused files/services

- `useIslandRunState` for canonical reads.
- `islandRunBestNextActionAdvisor` for guidance copy inputs, if it remains read-only.
- `islandArtManifest`, `islandBackgrounds`, `islandBoardThemes`, and `islandContentManifest` for island names, backgrounds, biome palette, and scalable metadata.
- `lockPageScroll` and portal/focus patterns from `IslandNarrativeDialogue`.
- `playIslandRunSound` / `triggerIslandRunHaptic` only after adding typed conversation events to the existing service.
- Existing board overlay blocking logic in `IslandRunBoardPrototype`, ideally consolidated into a small overlay coordinator in later PRs.

## 7. Minimal conversation content contract

Keep MVP shallow and deterministic.

```ts
export type IslandConversationSpeakerId = 'player' | string;

export type IslandConversationNode =
  | {
      type: 'npc';
      id: string;
      speakerId: string;
      text: string;
      nextNodeId?: string;
    }
  | {
      type: 'choice';
      id: string;
      prompt: string;
      choices: Array<{
        id: string;
        label: string;
        nextNodeId: string;
      }>;
    }
  | {
      type: 'player_text_response';
      id: string;
      prompt: string;
      placeholder?: string;
      maxLength: number;
      nextNodeId: string;
      storageIntent?: 'presentation_only' | 'defer_to_compass' | 'defer_to_reflection';
    }
  | {
      type: 'close';
      id: string;
      label?: string;
      returnTo?: 'encounter' | 'board';
    };

export type IslandConversation = {
  version: 1;
  id: string;
  islandNumber: number;
  inhabitantId: string;
  title: string;
  openingNodeId: string;
  nodes: Record<string, IslandConversationNode>;
};
```

Validation rules:

- `version` must be `1`.
- `id`, `inhabitantId`, `title`, and node IDs must be non-empty.
- `islandNumber` must be a positive integer.
- `openingNodeId` must exist.
- every `nextNodeId` must exist.
- choices must be two to four items for MVP.
- text length should be capped per page, e.g. 180 characters for NPC text and 70 characters for choice labels.
- graph depth should be capped, e.g. six nodes from opening to close.
- no prohibited gameplay-authority fields.

## 8. Branching recommendation

MVP branching should be shallow:

- two to four topics on the premium encounter,
- each topic maps to one conversation,
- each conversation has one to three NPC pages,
- at most one choice node,
- one follow-up message,
- deterministic close,
- no condition expressions in content,
- no inventory/reward/economy outcomes.

## 9. Player representation

Recommendation: **use a generic back-facing explorer sprite for MVP.**

Reasons:

- Current app has profile/avatar UI elsewhere, but Island Run does not have an established retro player sprite pipeline.
- A back-facing generic explorer avoids likeness/customization complexity and still communicates “you are present”.
- It is cheap to localize and theme later.
- It avoids making the conversation system depend on profile/avatar data availability.

Later enhancement: optional avatar-derived palette accent, not full avatar rendering.

## 10. Modal/collision strategy

Treat the full inhabitant flow as one modal-level overlay with a single active token, not as separate premium and retro modals.

### Opening priority

Do not open inhabitant conversations over:

1. StoryReader / narrative dialogue,
2. island-clear celebration,
3. travel overlay,
4. boss trial / minigame,
5. active stop modal / Build modal,
6. shop/market/sanctuary,
7. reward claim / hatch reveal / creature pack opening,
8. out-of-dice or purchase prompts.

### Entry by source

- **Landing event:** queue the flow; open only when board motion/rewards and blocking overlays finish.
- **Active stop:** prefer a Talk CTA inside the stop; close/suspend stop before opening inhabitant flow.
- **Wisdom encounter:** use the inhabitant conversation only for reflective presentation; defer any saved reflection to the Wisdom/Compass owner.
- **Landmark modal:** Talk CTA requests flow after the modal closes or returns to it after close.
- **Manual Talk button:** open immediately only if no blocking overlay is active; otherwise disabled with accessible reason.

### Implementation direction

PR 4 or PR 5 should introduce a small `isIslandInhabitantSurfaceBlocked` selector/helper similar to existing narrative surface blocking. Do not scatter one-off boolean checks throughout components.

## 11. State and persistence strategy

### Presentation-only local state

- active layer (`encounter` or `conversation`),
- selected topic,
- active node ID,
- revealed text/page index,
- focus target,
- transient typed input before submit,
- local close confirmation.

### Locally suppressible state

Use localStorage/session-scoped state for MVP:

- seen first-meeting IDs,
- dismissed auto-open prompts,
- per-session display guards.

This matches current narrative opening-flow suppression and avoids a database migration.

### Canonical gameplay state

Only existing gameplay systems own:

- dice, essence, shards, rewards,
- active stop completion/progression,
- build upgrades,
- boss state,
- travel,
- Compass curriculum,
- goals/habits/reflections.

### Saved conversation progress

Deferred. MVP should not persist graph position. It may persist “conversation id seen at timestamp” locally only.

### Deferred integration state

If a Wisdom text response later needs to become a reflection or Compass answer, the conversation emits a typed presentation result to a service owned by that feature. The UI/content should never mutate those systems directly.

## 12. Accessibility strategy

- Use readable system or game UI font for body text; avoid tiny pixel fonts for paragraphs.
- Pixel style should come from frames, shadows, corners, and sprites, not from illegible text.
- Minimum text size: 16px body, 18px preferred for dialogue on phones.
- Tap first reveals full current page; tap again advances.
- Respect `prefers-reduced-motion`; disable typewriter and use instant layer transition.
- Provide an app setting/hook later for “disable typewriter”.
- Use `role="dialog"`, `aria-modal="true"`, labelled title, described body, and focus restoration.
- Lock background scroll while open.
- All controls minimum 44px touch target.
- Keyboard support: Escape, Enter/Space for buttons, arrow keys for choices as enhancement.
- Ensure contrast for navy/gold/biome accents and retro palettes.
- Do not rely on pixel art alone to communicate speaker or choice meaning; provide labels.
- Wrap long text and allow vertical scrolling inside the modal panel when needed.
- Reserve layout for localization expansion: assume 30-50% longer strings.
- Screen readers should announce speaker name and current page text as one coherent region, not each typewriter character.

## 13. Complete MVP asset list with specifications

| Asset | Filename suggestion | Purpose | Dimensions | Aspect | Background | Format | Scope | Priority |
|---|---|---:|---:|---:|---|---|---|---|
| Woodland servant wizard full body | `inhabitants/woodland_servant_wizard_full.webp` | Premium Layer A character | 1024×1536 | 2:3 | Transparent | WebP + PNG fallback | Biome archetype | Blocking |
| Woodland servant wizard retro sprite | `inhabitants/woodland_servant_wizard_sprite_4x.png` | Retro Layer B NPC | 192×192 export of 48×48 source | 1:1 | Transparent | PNG | Biome archetype | Blocking |
| Fire servant wizard full body | `inhabitants/fire_servant_wizard_full.webp` | First non-woodland scalability proof | 1024×1536 | 2:3 | Transparent | WebP + PNG fallback | Biome archetype | High-value |
| Fire servant wizard retro sprite | `inhabitants/fire_servant_wizard_sprite_4x.png` | First non-woodland retro proof | 192×192 export of 48×48 source | 1:1 | Transparent | PNG | Biome archetype | High-value |
| Generic player back sprite | `inhabitants/player_explorer_back_sprite_4x.png` | Retro player representation | 192×192 export of 48×48 source | 1:1 | Transparent | PNG | Shared | Blocking |
| Optional player portrait sprite | `inhabitants/player_explorer_portrait_sprite.png` | Future name plate/icon | 128×128 | 1:1 | Transparent | PNG | Shared | Optional |
| Modern encounter frame | `ui/inhabitant_encounter_frame.svg` | Premium card/frame | Scalable | Flexible | Transparent | SVG | Shared | Blocking |
| Character name plate | `ui/inhabitant_name_plate.svg` | Name label styling | Scalable, target 320×72 | ~4.4:1 | Transparent | SVG | Shared | Blocking |
| Role plate | `ui/inhabitant_role_plate.svg` | Role/kicker styling | Scalable, target 280×48 | ~5.8:1 | Transparent | SVG | Shared | High-value |
| Modern choice-button frame | `ui/inhabitant_choice_button.svg` | Premium topic buttons | Scalable, target 640×96 | ~6.7:1 | Transparent | SVG | Shared | Blocking |
| Encounter close control | `ui/inhabitant_close_button.svg` | Close/minimize | 96×96 | 1:1 | Transparent | SVG | Shared | Blocking |
| Island emblem | `ui/island001_lumin_emblem.svg` | Shared civilization mark | 128×128 | 1:1 | Transparent | SVG | Island/civilization | High-value |
| Character ground shadow | `ui/inhabitant_ground_shadow.png` | Grounding character in scene | 512×160 | 3.2:1 | Transparent | PNG | Shared | Optional |
| Magic/speaking effect | `vfx/inhabitant_speech_motes.webp` | Subtle premium idle effect | 512×512 | 1:1 | Transparent | WebP/APNG | Shared tinted | Optional |
| Retro outer frame | `ui/retro_conversation_outer_frame.svg` | Retro mode container | Scalable | Flexible | Transparent | SVG | Shared | Blocking |
| Pixel scene frame | `ui/retro_scene_frame.svg` | Frames pixel scene | Scalable target 640×300 | ~2.13:1 | Transparent | SVG | Shared | Blocking |
| Dialogue box frame | `ui/retro_dialogue_box_frame.svg` | Text box frame | Scalable target 640×220 | ~2.9:1 | Transparent | SVG | Shared | Blocking |
| Speaker name plate | `ui/retro_speaker_name_plate.svg` | Speaker label | Scalable target 260×56 | ~4.6:1 | Transparent | SVG | Shared | Blocking |
| Response choice frame | `ui/retro_choice_frame.svg` | Choice rows | Scalable target 600×72 | ~8.3:1 | Transparent | SVG | Shared | Blocking |
| Continue arrow | `ui/retro_continue_arrow.png` | Page advance affordance | 64×64 export of 16×16 source | 1:1 | Transparent | PNG | Shared | Blocking |
| Selection cursor | `ui/retro_selection_cursor.png` | Choice pointer | 64×64 export of 16×16 source | 1:1 | Transparent | PNG | Shared | High-value |
| Pixel inhabitant idle sprite | duplicate biome sprite filenames above | NPC idle | 192×192 | 1:1 | Transparent | PNG | Biome archetype | Blocking |
| Pixel player idle sprite | duplicate player sprite above | Player idle | 192×192 | 1:1 | Transparent | PNG | Shared | Blocking |
| Speaking animation frames | `inhabitants/woodland_servant_wizard_talk_strip.png` | Optional talking animation | 768×192 strip of 4 frames | 4:1 | Transparent | PNG | Biome archetype | Optional |
| Small portrait icons | `inhabitants/woodland_servant_wizard_icon.png` | Optional choice/speaker icon | 160×160 | 1:1 | Transparent | PNG/WebP | Biome archetype | Optional |
| Retro island background tile | `backgrounds/island001_retro_scene.png` | Pixel scene backdrop | 640×360 from 160×90 source | 16:9 | Opaque | PNG/WebP | Island/biome | High-value |
| Premium island background crop | existing island background when possible | Full-screen encounter backdrop | 1440×2560 target | 9:16 | Opaque | WebP | Island | Blocking if no reusable background exists |

## 14. Scalable biome/character-variant strategy

Do **not** create fully unique UI frames for 120 islands.

Recommended scalable approach:

- Shared UI frame library for premium and retro layers.
- Per-biome palette tokens: accent, glow, shadow, panel gradient, retro palette.
- Per-biome inhabitant archetype art: full-body + retro sprite.
- Per-island civilization/emblem art only when story value warrants it.
- Per-island background can reuse existing island art crops where possible.
- Unique clothing/staff/crystal silhouettes for major biome families, not every island.
- For 120 islands, target 12-20 biome archetypes first, then palette/name/staff variations.

## 15. Technical feasibility notes

- Pixel assets should use `image-rendering: pixelated` only on the sprite/retro scene image, not on text.
- Use CSS variables scoped to `.island-inhabitant-flow` to avoid broad theme inheritance.
- Use portal root `document.body` like narrative dialogue for viewport anchoring.
- Use one scroll-lock release function per flow.
- Bundle size: lazy-load inhabitant assets and conversation definitions by island/biome; keep sample Island 1 inline only for PR 1.
- Validation should run in unit tests and optionally a manifest test similar to narrative validation tests.
- Component tests should cover node traversal, choice selection, close behavior, reduced-motion fallback, and focus restoration.
- Avoid content callbacks. If a node needs a future side effect, model it as a display-only `storageIntent` or typed `resultIntent` consumed by an owner service in a later PR.

## 16. Proposed implementation PR stack

### PR 1 — Content contract, validator, and one Island 1 sample conversation

Includes:

- types and validator,
- Island 1 woodland/Lumin sample inhabitant metadata,
- one first-meeting/guidance conversation,
- tests for prohibited fields and graph validity.

Does **not** include:

- UI components,
- runtime integration,
- assets beyond placeholder paths,
- gameplay writes,
- persistence/database changes.

### PR 2 — Retro conversation component in isolation

Includes:

- `IslandRetroConversation` presentation component,
- local node traversal,
- tap-to-reveal/continue behavior,
- accessible choice rows,
- reduced-motion behavior,
- CSS and test fixture.

Does **not** include:

- premium encounter,
- board integration,
- canonical gameplay writes,
- saved progress,
- complex branching.

### PR 3 — Premium inhabitant encounter component in isolation

Includes:

- `IslandInhabitantEncounter`,
- name/role/topic layout,
- biome tokens,
- safe-area behavior,
- focus/portal/scroll-lock pattern,
- component tests.

Does **not** include:

- landing trigger integration,
- retro transition orchestration,
- gameplay effects,
- repeat suppression.

### PR 4 — Integrate one Island 1 entry point

Includes:

- `IslandInhabitantFlow` coordinator,
- one manual Talk button or one low-risk Island 1 trigger,
- overlay-blocking helper,
- return-to-board/encounter behavior.

Does **not** include:

- Island 2+ content,
- database persistence,
- reward/economy changes,
- replacing StoryReader/narrative opening flow.

### PR 5 — Repeat suppression, collision hardening, accessibility/device polish

Includes:

- local seen-state suppression,
- robust collision tests/helper coverage,
- mobile viewport and tablet polish,
- screen-reader labels,
- keyboard navigation,
- optional SFX event additions to existing audio service.

Does **not** include:

- complex conditional graphs,
- saved cross-device conversation progress,
- avatar customization pipeline,
- large asset rollout.

## 17. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Modal overload | Single flow token; never stack over StoryReader, stops, build, minigames, travel, shop, sanctuary, or claim modals. |
| Two visual styles feel disconnected | Shared emblem, biome accent, crystal motif, name/role consistency, and deliberate transition. |
| Excessive text | Cap page length and graph depth; topic-focused conversations. |
| Retro font readability | Use readable text font; pixel treatment in frames/sprites only. |
| Asset workload across 120 islands | Biome archetypes + palette swaps; shared frames; unique assets only for important civilizations. |
| Duplicated narrative state | Reuse narrative metadata ideas and validation guardrails; keep StoryReader/narrative beats authoritative for major story. |
| Branching complexity | Shallow deterministic graphs only. |
| Player avatar availability | Generic back-facing sprite for MVP. |
| Localization | Length caps, wrapping, scrollable panels, avoid text baked into images. |
| Mobile viewport height | Fixed portal, safe-area padding, internal scrolling, compact scene heights. |
| Portal layering | Reuse overlay root conventions; define z-index token and blocker helper. |
| Gameplay authority leakage | Validator rejects action/reward/mutation fields; UI emits presentation result only. |
| Conversations interrupt board flow | Auto-open only for first meeting; repeat visits manual or suppressed. |
| Performance/image size | WebP full-body, PNG sprites, lazy load by island/biome. |
| Overuse of inhabitants | Use for guidance and flavor; keep story-critical beats in existing narrative surfaces. |

## 18. Open questions

1. What is the canonical name of the Island 1 inhabitant civilization going forward: existing Lumin characters, new servant-wizard civilization, or a servant-wizard role within The Lumin?
2. Should first meeting be tied to a new tile type, an existing encounter tile, or a manual island HUD Talk affordance for the first integration?
3. Should Wisdom text entry initially be disabled until Compass/reflection ownership is fully specified?
4. Which existing island background art is approved for premium encounter crops?
5. What is the app-wide preference surface for disabling typewriter animation?
6. Is there a desired global overlay coordinator planned to replace the current board-level overlay boolean cluster?
7. Should retro conversation support audio bleeps in MVP, or wait until after accessibility review?

## 19. Final recommendation

**Proceed, with conditions.**

Conditions:

- Build as a two-stage flow.
- Keep conversation content read-only and validator-guarded.
- Do not add gameplay mutations, rewards, economy changes, build/boss/travel changes, or database migrations.
- Integrate one low-risk Island 1 entry point only after isolated components and modal blockers are tested.
- Keep major story beats in `IslandStoryReader` / existing narrative flow.

Final status: **PASS WITH CONDITIONS**.
