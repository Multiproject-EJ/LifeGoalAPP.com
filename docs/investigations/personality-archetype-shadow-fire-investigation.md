# Personality Archetype Cards, Shadow Patterns, and Fire Activation Investigation

## 1. Executive summary

The repository already has a surprisingly close foundation for this concept. There is an existing personality identity system with a Big Five/custom-axis question bank, archetype deck, archetype scoring, a five-card “Player Hand,” a shadow-card role, stored `archetype_hand` data, and a reusable full-screen card/flip-card UI. The proposed “gift + shadow + activation trigger + growth quest” direction should not start as a new schema-heavy system.

The safest MVP is config-driven: extend or wrap existing archetype card content with additional static fields such as `coreGift`, `shadowPattern`, `activationTrigger`, `growthLesson`, `questPrompt`, and optional `element/icon`. Then render that content through the existing Player Hand / SPARK card surface or a new read-only modal in the Quest Compass/Profile area. No Supabase migration is needed for a first version if the MVP only uses static content and existing computed archetype identity.

Best natural fit:

1. **Primary fit: Player Hand / Profile identity surface** — the app already presents archetypes as a user-facing identity hand.
2. **Secondary fit: Quest Compass** — it already has a `Fire` force and reflective prompts, so “activation trigger → growth quest” maps naturally there.
3. **Later fit: AI Coach** — only after product language stabilizes and data-access/privacy handling is explicit.
4. **Today tab / Score Hub / Collections** — useful later for daily cards and collection-style engagement, but not the safest first integration point.

## 2. Existing relevant systems found

### 2.1 Personality test and scoring foundation

The app has a personality test domain under `src/features/identity`. The question bank defines five Big Five traits plus custom axes such as regulation style, stress response, identity sensitivity, cognitive entry, honesty-humility, and emotionality. This is directly relevant because the proposed archetype cards can be derived from existing personality signals instead of adding a new intake flow.

Key implication: avoid building a second “personality quiz” unless there is a clear product reason. The current model can support a static archetype-card layer as a presentation/content upgrade.

### 2.2 Existing archetype deck

The existing archetype deck is already a card system. Each `ArchetypeCard` includes:

- `id`
- `name`
- `suit`
- `icon`
- `color`
- trait weights
- drive/orientation/time focus/risk tolerance
- strengths
- weaknesses
- stress behavior
- growth strategy

This maps strongly to the proposed structure:

| Proposed field | Existing equivalent / gap |
| --- | --- |
| Archetype name | `name` already exists |
| Core gift / strength | `strengths` already exists |
| Shadow pattern | `weaknesses` and `stressBehavior` partially cover it |
| Activation trigger | Not explicit yet |
| Growth lesson | `growthStrategy` partially covers it |
| Quest prompt | Not explicit yet |
| Element/icon | `suit`, `icon`, `color` exist; `Fire` exists in Quest Compass and at least one archetype |

The deck comments explicitly describe the system as a “Player’s Deck” and say archetypes are lenses for understanding a player’s Game of Life playstyle, which is highly aligned with the requested concept.

### 2.3 Existing shadow-card concept

The hand builder already creates a five-card hand with roles:

- dominant
- secondary
- support
- shadow

The shadow is currently the lowest-scoring archetype and is described as a “growth opportunity.” This is almost exactly the conceptual slot needed for “shadow pattern” and “growth lesson.”

Important product note: the current shadow model is “lowest score = growth opportunity,” while the requested concept seems closer to “every archetype has a shadow expression.” Those are compatible, but not identical. The MVP should avoid redefining stored hand semantics. It can add per-card shadow copy while preserving the existing shadow-role meaning.

### 2.4 Player Hand / identity UI

There is a user-facing Player Avatar/Profile surface that consumes `personalityScores`, `archetypeHand`, and `personalitySummary`. It already imports `ARCHETYPE_DECK`, derives the user’s hand cards, filters by suit, and uses personality data to unlock/recommend avatar items.

There is also a `MyPlayerHandPanel` that displays the hand or a “Take the personality test” locked state.

This is likely the cleanest place to introduce archetype card expansion because users already expect identity/personality content there.

### 2.5 SPARK card preview and reveal ceremony

The `PlayersHandSparkPreview` component is a strong reusable candidate. It already supports:

- compact preview
- full-screen overlay
- dialog semantics
- Escape key close
- background scroll lock
- reduced-motion detection
- hand/grid/story tabs
- swipe/tap card selection
- card flipping
- front/back card faces

This is the closest existing UI to “archetype cards.” It already satisfies much of the repo’s modal UX guardrail by using a fixed-style full-screen overlay pattern with scroll lock, although any future use should verify viewport anchoring in CSS.

### 2.6 Quest Compass and Fire force

Quest Compass already defines a `fire` force with icon `🔥`, summary “Passion, energy, joy, creativity, and drive,” a description list, and a prompt. This is a strong semantic home for “Fire is energy that needs direction.”

The Quest Compass modal also already loads check-ins, goals, habits, today habit logs, and a quest habit, then builds recommended actions. That means it is already an “alignment → next quest” system.

Potential fit: archetype activation prompts could appear as a Quest Compass detail panel, especially when the selected force is Fire or when the user’s hand includes a Power/fire-coded card.

### 2.7 AI Coach

The AI Coach already has coaching topics, intervention types, access to habits/goals/journal/check-ins depending on settings, and centralized base instructions. It is a future integration point, but the user specifically constrained that prompts should not change now. For MVP planning, AI Coach should only be referenced as a later consumer of stabilized archetype copy.

### 2.8 Onboarding

There is Day Zero onboarding for selecting a life area, tiny habit, reminder, reward, and starting a first win. It persists temporary progress in localStorage and records onboarding completion. This is not the best first home for the archetype concept unless the product wants a personality reveal during onboarding.

Reason: onboarding is already focused on immediate activation and habit setup. Adding archetype/shadow language too early could increase friction. A lightweight “discover your Player Hand later” CTA would be safer than adding a new archetype quiz step.

### 2.9 Profile/settings/account

`MyAccountPanel` has many settings folders and onboarding tools. It can be a secondary entry point, but “settings” is not the ideal primary surface for emotionally resonant identity cards. Profile/Player Avatar is better for card identity; Account settings can provide a path to retake/review personality data.

### 2.10 Score Hub / Collections

Feature availability includes `score.collections`, `score.achievements`, and similar Score surfaces. This could eventually host a collection-style archive of archetype cards, but it is probably a later engagement layer. For MVP, reuse Player Hand rather than inventing a new collection economy.

## 3. Key files and components

### Core personality/archetype files

- `src/features/identity/personalityTestData.ts` — personality question bank and trait/axis types.
- `src/features/identity/personalityScoring.ts` — scoring logic for personality dimensions.
- `src/features/identity/personalityTraitCopy.ts` — trait-card copy with power/strength/growth-edge/micro-tip language.
- `src/features/identity/archetypes/archetypeDeck.ts` — primary archetype deck and card metadata.
- `src/features/identity/archetypes/archetypeScoring.ts` — likely scores personality results against archetype cards.
- `src/features/identity/archetypes/archetypeHandBuilder.ts` — builds the five-card hand with dominant/secondary/support/shadow roles.

### Data/storage files

- `src/data/personalityTestRepo.ts` — queues local/offline personality test results and includes optional `archetypeHand`.
- `src/services/personalityTest.ts` — normalizes/fetches personality test history and persists `archetype_hand` when Supabase is available.
- `src/lib/database.types.ts` — generated DB type includes `personality_tests.archetype_hand` JSON.
- `src/data/localDb.ts` — local IndexedDB-style storage for personality test values.
- `src/data/personalityTestOfflineRepo.ts` — queued mutation support for offline personality test sync.

### UI files

- `src/features/avatar/PlayerAvatarPanel.tsx` — existing profile/avatar/personality surface.
- `src/features/players_hand/components/MyPlayerHandPanel.tsx` — existing hand display wrapper.
- `src/features/players_hand/spark-preview/PlayersHandSparkPreview.tsx` — best reusable card/flip/modal surface.
- `src/features/players_hand/spark-preview/PlayersHandRevealCeremony.tsx` — reveal ceremony UI for the hand.
- `src/features/players_hand/spark-preview/playersHandSparkAdapter.ts` — adapts hand data into card-preview data.
- `src/features/players_hand/spark-preview/PlayersHandSparkPreview.css` — existing card/modal styling.
- `src/styles/player-avatar.css` — avatar/profile/personality card styling.

### Quest/Life Compass files

- `src/features/quest-compass/questCompassForces.ts` — includes `Fire` force with `🔥`.
- `src/features/quest-compass/QuestCompassModal.tsx` — existing modal surface for life alignment and next-quest routing.
- `src/features/quest-compass/questCompassViewModel.ts` — likely best place to connect force detail/recommended action logic later.
- `src/services/compassState.ts` — persisted compass template has a `personality` spoke, making “identity card reflection” conceptually relevant.

### AI Coach future-integration files

- `src/features/ai-coach/AiCoach.tsx` — main coach UI and context assembly.
- `src/services/aiCoachInstructions.ts` — central instruction payload. Do not change for MVP unless explicitly requested later.
- `docs/game-of-life-2.0/AI_COACH_PERSONALITY.md` — product tone/spec reference.

### Feature gating / preview files

- `src/features/players_hand/playersHandFeatureFlags.ts` — Player Hand SPARK result is enabled by default unless explicitly disabled.
- `src/config/featureAvailability.ts` — registry includes Score/Collections/future feature availability patterns.

## 4. Best integration options

### Option A — Expand Player Hand/Profile card details

**Fit:** Excellent.

Use the existing Player Hand surface to show richer card backs:

- Gift
- Shadow pattern
- Activation trigger
- Growth lesson
- Quest prompt
- Element/icon

This is the most natural MVP because the app already has archetype cards, shadow-role semantics, card UI, and a profile identity surface.

**Pros**

- Minimal conceptual drift.
- No migration required if static config derives from existing archetype IDs.
- Reuses existing full-screen/flip-card UI.
- Keeps identity content in an identity surface.

**Cons**

- Requires care not to confuse “shadow role card” with “shadow pattern on every card.”
- Existing card adapter may need an extended display model when implementation begins.

**Recommended for MVP:** Yes.

### Option B — Quest Compass “Fire Activation” detail

**Fit:** Very good, especially for the Fire concept.

Add a static or derived “Activation Card” section to Quest Compass, especially when Fire is selected or when the user opens a “What needs direction?” prompt.

**Pros**

- Fire already exists as a compass force.
- Quest Compass already maps signals to recommended actions.
- Growth quest prompts fit naturally.

**Cons**

- Quest Compass currently uses check-ins/goals/habits, not personality hand context.
- Could become too dense if added before card language is validated.

**Recommended for MVP:** Good as a secondary entry point or phase 1.5.

### Option C — AI Coach archetype-aware reflection

**Fit:** Strong later, not first.

The coach could use stable archetype-card content to ask better questions, e.g. “Your Harmonizer shadow may be over-tolerating; what loving boundary is one sentence?”

**Pros**

- Best for personalized growth prompts.
- Existing coach already handles goals/habits/journal/check-ins.

**Cons**

- Requires prompt changes and privacy/access decisions.
- Risk of over-psychologizing if not carefully framed.
- User explicitly constrained prompt changes to future integration only.

**Recommended for MVP:** No. Identify as future integration only.

### Option D — Today tab daily activation card

**Fit:** Medium.

A “Today’s Activation” card could show one quest prompt from the user’s dominant or shadow archetype.

**Pros**

- Daily action surface is likely high-engagement.
- Quest prompt can become practical behavior.

**Cons**

- Today already contains habit/progress systems; adding personality prompts could distract from task completion.
- Needs persistence/rotation rules if it becomes daily content.

**Recommended for MVP:** Later, after static card content is validated.

### Option E — Score Hub / Collections archetype collection

**Fit:** Medium-later.

Archetype cards could eventually become a collection/archive. The app already has Score/Collections feature availability patterns.

**Pros**

- Card collecting is motivational.
- Aligns with existing game/card language.

**Cons**

- Risks turning self-discovery into reward economy prematurely.
- Could imply unlock mechanics, schema, or telemetry.

**Recommended for MVP:** Not first.

### Option F — Onboarding personality reveal

**Fit:** Medium-low for first MVP.

A short discovery prompt or later CTA could be included in onboarding, but not the full archetype/shadow system.

**Pros**

- Users encounter the concept early.
- Can motivate profile completion.

**Cons**

- Increases onboarding friction.
- Current Day Zero onboarding is practical and tiny-win oriented.

**Recommended for MVP:** Use only as a light CTA later.

## 5. Existing data models/types that can support MVP without migration

### 5.1 Static config extension

The lowest-risk approach is to add a static config object keyed by existing archetype IDs, for example:

```ts
const ARCHETYPE_SHADOW_COPY_BY_ID = {
  challenger: {
    coreGift: 'Courage and direct action',
    shadowPattern: 'Fighting every battle or burning allies',
    activationTrigger: 'Injustice, disrespect, blocked truth',
    growthLesson: 'Use fire as directed energy, not collateral damage',
    questPrompt: 'Where does your courage need a cleaner channel today?',
    element: 'fire',
    icon: '🔥',
  },
};
```

This requires no database changes because it is derived from current archetype ID.

### 5.2 Existing `archetype_hand` JSON

The generated database type already includes `personality_tests.archetype_hand` as JSON. The local/offline repo also queues `archetype_hand` as part of personality test results. If the MVP only displays computed/static copy from known card IDs, there is no need to store new fields.

### 5.3 Existing localStorage onboarding patterns

Day Zero onboarding stores temporary progress in localStorage. If a purely local, dismissible “seen archetype intro” state is needed, a localStorage key could work later. But MVP can avoid this if it only adds a manual entry point.

### 5.4 Existing Compass persisted JSON

`compass_state` has a `personality` spoke in its `spokes` JSON template. This could later store reflections, but it is not necessary for the first static card viewer.

### 5.5 Feature flags / feature availability

Player Hand SPARK is enabled by default unless disabled by env. Future preview/collection surfaces can follow the feature availability registry pattern, but the static MVP can likely live behind the existing Player Hand feature surface rather than adding a new feature flag.

## 6. Existing icons/assets and visual patterns

### Fire

- Quest Compass has a canonical `Fire` force with icon `🔥`.
- The `Challenger` archetype uses `🔥` and belongs to the Power/Agency suit.
- Theme CSS includes orange/fire-like palette tokens and shadow-glow patterns, but no dedicated fire SVG asset surfaced in the reviewed files.

### Shadow

- “Shadow” exists as a hand role in the archetype hand builder.
- The card UI already renders `card.role`, so a shadow badge exists conceptually.
- No dedicated “shadow” icon was found in the reviewed core identity files. The product can use copy/badge treatment first rather than a new asset.

### Traits/elements

- Trait cards use emoji icons and colors in `personalityTraitCopy.ts`.
- Archetypes use suit colors and emoji icons in `archetypeDeck.ts`.
- Quest Compass uses emoji icons for forces.

### Courage/boundaries/emotional states

- Courage/boundaries are already partially represented by Power suit cards such as `Challenger` and `Guardian`.
- `Challenger` strengths include fearless advocacy, direct communication, change catalyst, and high courage.
- `Guardian` uses a shield icon and protection/standing-firm language.
- The AI Coach and trait copy include emotional/stress language, but not a dedicated emotional-state icon system.

## 7. Recommended MVP path

### MVP recommendation: static archetype shadow copy in Player Hand/Profile

**Goal:** Validate the language and emotional resonance without changing schema, economy, telemetry, auth, or AI prompts.

Recommended slice:

1. Create or plan a static archetype-copy registry keyed by existing `ArchetypeCard.id`.
2. Include fields:
   - `coreGift`
   - `shadowPattern`
   - `activationTrigger`
   - `growthLesson`
   - `questPrompt`
   - `element`
   - `elementIcon`
3. Render the extra fields on the existing Player Hand card back or a new detail section in the existing SPARK overlay.
4. Keep the first UI read-only and manually opened from Profile/Player Hand.
5. Use existing card role badges, but clarify copy:
   - “Card shadow” = the pattern this archetype can fall into.
   - “Your Shadow Card” = the lowest-score growth-opportunity card in the existing hand.
6. Do not add persistence unless the user takes an action that already has a home, such as journaling or starting a quest.
7. Add Quest Compass integration later by surfacing the selected card’s `questPrompt` as a suggested reflection/action.
8. Add AI Coach integration only after privacy and prompt wording are reviewed.

### Suggested content model direction

The existing `ArchetypeCard` currently has `strengths`, `weaknesses`, `stressBehavior`, and `growthStrategy`. Rather than mutate the core card type immediately, consider a parallel metadata map in implementation:

```ts
type ArchetypeActivationCopy = {
  archetypeId: string;
  coreGift: string;
  shadowPattern: string;
  activationTrigger: string;
  growthLesson: string;
  questPrompt: string;
  element?: 'fire' | 'water' | 'earth' | 'air' | 'light' | 'shadow';
  elementIcon?: string;
};
```

This keeps the content experiment reversible and avoids forcing all existing deck logic to understand new fields.

### Best first placement

1. **Profile → My Player Hand**: add “Activation / Shadow” detail on flip-card backs.
2. **Quest Compass Fire force**: later add a “Fire Activation Prompt” from the dominant/shadow card.
3. **Today tab**: later rotate a single prompt as an optional daily reflection.

## 8. Risks / things to avoid

### Product/content risks

- Avoid implying anger is bad. The product statement “Fire is energy that needs direction” should be a guiding content rule.
- Avoid clinical or diagnostic language. These should be reflective archetypes, not mental-health labels.
- Avoid presenting the shadow card as “what is wrong with you.” Use “growth edge,” “pattern under stress,” or “energy needing direction.”
- Avoid making high-agreeableness users feel blamed for empathy. For a Harmonizer-style card, frame people-pleasing as an overuse of a gift.
- Avoid deterministic language such as “you are always…” or “your type means…”. Existing deck comments already support “lenses, not rigid categories.”

### Architecture risks

- Do not add schema/migrations for static copy.
- Do not store derived copy in `archetype_hand`; store IDs/scores only and derive copy from config.
- Do not add new telemetry for investigation/MVP unless explicitly requested later.
- Do not alter AI Coach prompts in the first implementation.
- Do not place gameplay writes in UI components or touch Island Run economy/reward flows.
- Do not couple archetype quest prompts to dice, tickets, rewards, or Island Run progression.

### UX risks

- Modals must remain viewport-anchored, centered, and scroll-locking per repo guardrail.
- Existing SPARK overlay already has good modal behavior, but CSS should be verified before reuse.
- Too much copy on a flip-card back may be cramped. Consider a detail panel within the existing overlay rather than overloading the card itself.
- If “Fire” appears only on anger/boundaries cards, users may infer fire is negative. Include positive language: vitality, courage, action fuel, protection, creative drive.

## 9. Suggested follow-up implementation prompt

```md
Implement a static/config-driven MVP for Personality Archetype Activation Cards.

Constraints:
- No Supabase schema changes.
- No migrations.
- No telemetry changes.
- No auth changes.
- No Island Run economy/reward/dice/stake/ticket changes.
- No AI Coach prompt changes.
- Preserve existing Player Hand behavior.

Goal:
Add richer archetype card copy to the existing Player Hand/Profile experience. Each archetype can show:
- Core gift
- Shadow pattern
- Activation trigger
- Growth lesson
- Quest prompt
- Optional element/icon, including Fire where appropriate

Implementation direction:
1. Add a static metadata map keyed by existing `ArchetypeCard.id` in the identity/archetype area.
2. Do not persist the new copy; derive it from existing archetype IDs.
3. Extend the Player Hand SPARK adapter/display model so card details can include the new fields when present.
4. Render the fields in the existing PlayersHandSparkPreview overlay, preferably in card detail/story mode to avoid cramped card backs.
5. Include a small content note for Fire: “Fire is not the enemy. Fire is energy that needs direction.”
6. Add tests for any pure adapter/helper logic.
7. Verify modal accessibility and scroll locking remain intact.

Start with a small subset if needed:
- Challenger / Fire
- Guardian / Boundaries
- Harmonizer-style Heart card if an equivalent exists in the current deck
- Existing shadow-role card copy treatment
```

## 10. Investigation commands run

- `find .. -name AGENTS.md -print`
- `cat AGENTS.md && git status --short && rg -n "personality|archetype|trait|quiz|onboarding|profile|coach|Life Compass|Quest Compass|self-discovery|self discovery|collection|collections|fire|shadow|Life Wheel|force card|Force" -S --glob '!node_modules' --glob '!dist' --glob '!build' .`
- `find src docs -path '*/node_modules' -prune -o -type f | sed 's#^#/#' | head -300 && find src/features src/components -maxdepth 3 -type f | sort | sed -n '1,240p'`
- `find src/features -maxdepth 3 -type f | sort | sed -n '241,520p'`
- `sed -n '1,220p' src/features/identity/personalityTestData.ts; sed -n '1,220p' src/features/identity/archetypes/archetypeHandBuilder.ts; sed -n '1,220p' src/data/personalityTestRepo.ts; sed -n '1,200p' src/services/personalityTest.ts; sed -n '1,220p' src/features/players_hand/components/MyPlayerHandPanel.tsx; sed -n '1,200p' src/features/quest-compass/questCompassForces.ts`
- `sed -n '1,260p' src/features/identity/archetypes/archetypeDeck.ts; sed -n '1,260p' src/features/players_hand/spark-preview/PlayersHandSparkPreview.tsx; sed -n '1,220p' src/features/players_hand/spark-preview/PlayersHandRevealCeremony.tsx; sed -n '1,180p' src/features/identity/personalityTraitCopy.ts; sed -n '1,220p' src/services/compassState.ts`
- `rg -n "personality_tests|archetype_hand|profiles|onboarding_complete|QuestCompass|MyPlayerHand|PlayersHand|ARCHETYPE_DECK|fire|shadow" src supabase docs -S --glob '!node_modules' --glob '!*.zip'`
- `nl -ba ...` commands for the cited files and line-number verification.
