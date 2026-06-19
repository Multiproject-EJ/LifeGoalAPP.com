# Compass Book / Curriculum Full Repository Investigation

Date: 2026-06-19  
Scope: investigation only; no production code, migrations, schema, economy, route, handler, AI prompt, or gameplay behavior changes were made.

## 1. Executive summary

**Overall feasibility: PASS.** A Compass Book MVP can begin without changing core Island Run progression or the game economy, provided the first implementation PR treats Compass as its own canonical content/answer state and only derives unlock hints from Island Run. The repository already contains partial Compass concepts, a one-row `compass_state` table, a pure Island-number-to-Compass phase mapper, a current in-game Compass modal, a Player Menu Quest Compass modal, Life Wheel check-ins, canonical goals, canonical habits, AI coach infrastructure, reusable modal patterns, and UI-export dependencies.

**PASS / PARTIAL / BLOCKED:** **PASS — implementation can begin with the proposed MVP.** The strongest caveat is that the currently implemented Compass is not the proposed six-chapter book: it is an older “smarter ikigai / spokes” model with 11 uneven phases. The MVP should therefore create a new durable Compass Book model or explicitly version a new `compass_state` shape rather than overloading the old semantics silently.

**Strongest reusable systems**

- **Island Run progression authority:** canonical store/hook/action path around `IslandRunGameStateRecord.currentIslandNumber`, `completedStopsByIsland`, `stopStatesByIndex`, `stopBuildStateByIndex`, and `travelToNextIsland`.
- **Existing Compass seed:** `compass_state`, `compassCurriculum.ts`, `CompassModal`, and `recordCompassContribution` prove that per-island reflective contributions can be persisted best-effort without blocking gameplay.
- **Life Wheel:** canonical eight-category taxonomy, check-in scoring, trends, radar visualization, and Quest Compass scoring.
- **Goals/habits:** `goals`, `life_goal_steps`, `habits_v2`, `habit_logs_v2`, offline queues, goal snapshots, quest habit, and Today rendering already provide canonical user-action systems.
- **AI:** Edge functions and client AI flows already support authenticated OpenAI calls, user AI settings, model fallback, structured JSON parsing, context loading, and review-before-create goal drafts.
- **Visual/export:** `html2canvas` is installed and `src/utils/imageGenerator.ts` already exports DOM-rendered images, supporting app-rendered chapter graphics plus optional export.

**Biggest architectural gaps**

- The existing `compass_state` schema is an older single-document Compass template, not a six-chapter / 120-answer curriculum ledger.
- Current Compass contributions are tied mainly to Habit and Wisdom stops, not one activity per island.
- Chapter progress and completion have no canonical authority today beyond older `completed_phases` strings.
- The Player Menu button opens Quest Compass, not a Compass Book; it is active but conceptually different from the requested product.
- Current AI Coach is broad and chat-like; Compass needs a narrower state-machine/structured-update layer where AI proposes field changes but the player confirms.

**Recommended MVP boundary**

- Wire both entry points later to a shared Compass Book shell, but do not change their behavior in this investigation.
- Implement **Chapter 1 only** with fixed guided mode first, structured persistence, direct review/edit, app-rendered Living Wheel output, and no automatic goal/habit creation.
- Treat AI as optional per-question “Help me think” / draft-summary support behind a feature flag after deterministic persistence exists.
- Keep Island Run as an unlock/progress signal only. Compass completion must not block rolls, stops, bosses, island travel, dice, essence, eggs, tickets, or rewards.

## 2. Entry-point map

| Entry point | Current file/component | Current behavior | Recommended integration seam |
|---|---|---|---|
| In-game left-side Compass below hatchery/potential egg area | `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` renders `island-run-board__hatchery-compass-btn`; click sets `showHatcheryCompassModal` to `true`; modal is `src/features/gamification/level-worlds/components/CompassModal.tsx`. Styling lives in `src/features/gamification/level-worlds/LevelWorlds.css`. | Visible active button. Opens existing `CompassModal` for the current `islandNumber`. The modal fetches `compass_state`, shows the current old Compass phase/direction/spokes, lets the player type into direction or center fields, and saves via `recordCompassContribution` / `setCompassCenterStatement`. It is not a route. It is not behind a feature flag in the inspected button path. | Replace modal body later with `CompactGameCompassPanel` mounted through the existing `showHatcheryCompassModal` seam. It should read Island Run through `useIslandRunState`/canonical selectors and read/write Compass through a new Compass service, never through gameplay runtime patch APIs. |
| Player Menu Compass / Compass Book hero card | `src/App.tsx` renders the large `mobile-menu-overlay__hero-card--compass-placeholder` with title “Compass Book” and `onClick={openQuestCompassFromMobileMenu}`. The My Quest submenu also has action id `quest-compass`, label “Quest Compass”, icon 🧭, same handler. It renders `src/features/quest-compass/QuestCompassModal.tsx`. | Active button, not inert. Pressing closes menus/overlays and opens `QuestCompassModal`, which is Life Realm / Quest Compass analytics based on check-ins, goals, habits, and quest habit. It is not the full six-chapter Compass Book and does not persist book answers. The hero visual says “Compass Book / Chapter I Know Thyself,” creating a product-label mismatch. | Introduce a full-screen `CompassBookScreen`/modal behind the same `openQuestCompassFromMobileMenu` seam in a future PR. Keep Quest Compass either as a section inside the book or a separate action to avoid breaking current users. Respect Feature Availability when adding a real Compass Book feature id. |
| Other Compass surfaces | `src/services/compassState.ts`, `src/features/gamification/level-worlds/services/compassCurriculum.ts`, `src/features/quest-compass/*`, `src/features/leap-progress/LeapProgress.tsx`, avatar/cosmetic catalogs (`compassion-compass`, `soul-compass`), Zen Garden `Explorer's Compass`, and docs/migrations. | Mixed: old Compass curriculum, Quest Compass analytics, cosmetic names, and stale/prototype references. | Do not assume all “compass” strings are product-equivalent. New work should distinguish `CompassBook` from old `QuestCompass` and old Island Run Compass. |

Visual description: in Island Run, the Compass is a small gold compass icon in the reward-bar/hatchery tray beneath/near the egg stack. In Player Menu, it is a large hero card labelled “Compass Book” with a stylized open-book placeholder.

## 3. Existing system inventory

### Island Run progression

**Canonical sources and relevant symbols**

- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`: Island Run core loop is 5 sequential stops per island; boss completion completes the island and unlocks the next island.
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`: reads should use `useIslandRunState`; writes should use `islandRunStateActions`, roll/tile actions, and mutex-protected services.
- `src/features/gamification/level-worlds/hooks/useIslandRunState.ts`: canonical React entry point.
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`: `IslandRunGameStateRecord` includes `currentIslandNumber`, `cycleIndex`, `completedStopsByIsland`, `stopTicketsPaidByIsland`, `stopStatesByIndex`, `stopBuildStateByIndex`, `activeStopIndex`, `activeStopType`, currencies, egg ledgers, timed-event ledgers, and runtime version.
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`: canonical action services include stop sync, timer activation, boss marker sync, dev/admin grants, and `travelToNextIsland`.
- `src/features/gamification/level-worlds/services/islandRunProgression.ts`: `isIslandFullyCleared` checks all required stop ids from `generateIslandStopPlan`.
- `src/features/gamification/level-worlds/services/islandRunStops.ts`: authoritative five-stop island stop plan generation.
- Supabase persistence: `island_run_runtime_state` migrations including `0167_island_run_runtime_state_progression_markers.sql`, `0179_island_run_completed_stops_by_island.sql`, `0229_add_missing_island_run_columns.sql`, `0230_add_bonus_tile_charge_by_island.sql`, `0231_add_minigame_tickets_by_event.sql`, and related generated types.

**Hydration and save flow**

- `useIslandRunState` subscribes to the external store and exposes `hydrate`/`commit`.
- `islandRunStateStore.ts` hydrates from local storage plus Supabase and commits via `commitIslandRunState`.
- `islandRunGameStateStore.ts` handles demo-session local records and remote persistence.
- Older compatibility APIs still exist, but new Compass implementation must not use `persistIslandRunRuntimeStatePatch` from UI.

**Chapter derivation evaluation**

The requested derivation:

```ts
chapterIndex = Math.floor((currentIsland - 1) / 20)
chapterIslandIndex = ((currentIsland - 1) % 20) + 1
```

is mathematically compatible with a 1..120 island model and the travel wrap logic for a six-chapter curriculum, but it is **not the currently implemented Compass phase model**. Existing `compassCurriculum.ts` defines 11 phases: P1 is 1-20, P2 is 21-30, P3 is 31-40, P4 is 41-50, P5 is 51-60, P6 is 61-70, P7 is 71-80, P8 is 81-90, P9 is 91-100, P10 is 101-110, and P11 is 111-120. Therefore, the six-chapter formula should be introduced as a new Compass Book content model, not assumed to match the old Compass state.

**Edge cases**

- **Cycle wrap:** `resolveIslandRunTravelState` wraps >120 back to 1 and increments `cycleIndex`. Compass Book should store cycle/version if replaying matters.
- **Replay/return:** per-island maps are keyed by island number strings; travel clears old island stop/ticket maps but preserves other ledgers. Compass answers should not be deleted by island travel.
- **Skipped/admin grants:** admin/dev actions can alter progression. Compass unlock should derive from authoritative current/progress records but not mutate gameplay.
- **Offline:** goals/habits have offline queues; Island Run has local storage hydration. Compass persistence should choose an offline-resilient pattern if direct editing is allowed offline.
- **Demo:** demo sessions are common; Compass should allow preview state or local-only demo state without permanent writes.

**Answers**

- One Compass activity per island is compatible as a **soft-linked unlock model**, not as a gameplay completion requirement.
- A Compass item should become available when the player reaches/starts the island (`currentIslandNumber` and active island timer) or when the island is unlocked by authoritative travel, not when the board tile position changes.
- It should count as completed only when the player explicitly saves/confirms the Compass answer for that island/question.
- Players should be able to revisit/edit prior answers in the full book.
- Editing should affect only Compass state and projected chapter output, never Island Run stop/island completion.

### Life Wheel

**Canonical categories and scoring**

- `src/features/checkins/LifeWheelCheckins.tsx` defines `LIFE_WHEEL_CATEGORIES` with eight keys: `spirituality_community`, `finance_wealth`, `love_relations`, `fun_creativity`, `career_development`, `health_fitness`, `family_friends`, `living_spaces`.
- `src/features/life-wheel/lifeWheelTaxonomy.ts` is explicitly the single source of truth mapping game-facing areas (`Health`, `Mind`, `Work`, `Money`, `Love`, `Connections`, `Home`, `Fun`) to those check-in keys.
- Scores are 0-10 at category level; guided questions use 1-3 and scale to 0/5/10.

**Storage and services**

- `src/services/checkins.ts` fetches, inserts, and updates `checkins` rows.
- Supabase migration `0118_checkins_upsert_rule.sql` allows repeated same-day Life Wheel check-ins to update existing entries.
- Generated database types include `checkins` JSON `scores` data.

**Visualizations and UI**

- `LifeWheelCheckins.tsx` contains radar geometry, full check-in flow, category scoring, trend insights, average deltas, and recent-history display.
- `src/features/quest-compass/questCompassViewModel.ts` translates Life Wheel check-in scores into six Quest Compass forces and trends.
- `src/features/quest-compass/QuestCompassModal.tsx` displays force scores and routes to check-ins/goals/starter quests.

**Existing vs proposed Living Wheel fields**

| Proposed Chapter 1 field | Existing support | Notes |
|---|---|---|
| current score | Exists | Latest `checkins.scores` by category. |
| historical scores/trends | Exists | Recent check-ins + trend calculations. |
| ideal score | New persistence | Not stored in check-ins. |
| good-enough score | New persistence | Could be Compass answer field. |
| minimum-safe score | New persistence | Could be Compass answer field. |
| emotional state | Partial | Journals/check-ins may imply mood elsewhere, but Life Wheel check-in category score does not store this per area. |
| momentum | Derivable | Latest-vs-previous deltas can derive rising/falling/steady. |
| importance | New persistence | Could be user-ranked answer. |
| attention gap | Derivable if desired/ideal exists | Current vs desired/good-enough. |
| spillover | New persistence | User reflection/choice. |
| Engine / Brake / Fragile Spoke / Lever | Derivable/projection after Compass answers | Should be chapter output fields, not changes to check-in schema. |

Recommendation: reuse Life Wheel check-ins as input data, but store Chapter 1 additional semantic fields in Compass Book state. Do not change the check-in schema for curriculum-specific concepts unless they become general Life Wheel product concepts.

### Goals and quests

**Canonical systems**

- `src/services/goals.ts`: canonical goals CRUD with Supabase plus offline local queues.
- `src/services/lifeGoals.ts`: goal steps/milestones and life-goal helpers.
- `src/features/goals/GoalWorkspace.tsx`, `AllGoalsView.tsx`, `LifeGoalsSection.tsx`: main goal UIs.
- `src/features/goals/MyQuestHub.tsx`: Player Menu / My Quest hub surface.
- `src/services/questHabit.ts`: quest habit / starter quest concept used by Quest Compass.
- `src/components/LifeGoalInputDialog.tsx`: goal creation dialog with AI chat/draft and review-before-create.
- Supabase migrations such as `0104_life_goals_extended.sql`, `0178_goal_strategy_type.sql`, `0185_environment_audit_foundations.sql`, and generated types define goal metadata: `status_tag`, `life_wheel_category`, `secondary_life_wheel_categories`, plan quality, environment context, priority, timing, etc.

**Quest Forge classification mapping**

| Classification | Existing mapping possibility | Safer recommendation |
|---|---|---|
| Primary Quest | Could map to priority/status or quest habit, but no global “one active main goal” invariant was found. | Store Compass classification in Compass-specific layer and link to a canonical `goals.id` only after explicit player action. |
| Supporting Quest | Could map to active goals linked by category or metadata. | Use Compass link rows/JSON plus normal goals; do not overload goal status. |
| Maintenance Quest | Could map to recurring habits/goals but not direct goal status. | Compass classification layer. |
| Exploration Quest | Could map to starter quest / experiments. | Compass classification layer with optional goal draft. |
| Not Now | Could map to archived/paused, but those have product behavior implications. | Compass-only “not_now” classification until user archives/pauses a real goal explicitly. |
| Release | Could map to archived/deleted, but dangerous. | Compass-only “released insight/goal” record; never delete/close canonical goal automatically. |

A Compass-generated goal should remain linked through explicit provenance: `origin_type='compass_book'`, `origin_chapter_id`, `origin_activity_id`, `origin_answer_id`, and possibly `created_from_compass_proposal_id`. Existing `goals` does not currently expose a clean Compass-origin field, so a linking table or JSON metadata in Compass state is safer than altering goal semantics first.

### Habits

**Canonical systems**

- `src/services/habitsV2.ts`: canonical Habit V2 service with offline queues, active/inactive lifecycle helpers, logs, recurrence schedule JSON, goal linking, domain key, environment fields, duration fields, and status.
- `src/features/habits/HabitsModule.tsx`, `MobileHabitHome.tsx`, `DailyHabitTracker.tsx`, `UnifiedTodayView.tsx`: primary habit and Today surfaces.
- `src/features/habits/HabitWizard.tsx`: habit setup.
- `src/features/habits/HabitPauseDialog.tsx`, `habitLifecycle.ts`: pause/resume/deactivate/archive behavior.
- `src/features/habits/scheduleInterpreter.ts`: recurrence/schedule interpretation.
- `src/features/habits/aiRationale.ts`, `suggestionsEngine.ts`, `suggestedHabitLibrary.ts`: AI/deterministic habit suggestions.
- Supabase migrations include `0004_habits_v2_domain_goal.sql`, `0185_environment_audit_foundations.sql`, status/lifecycle migrations, and `0246_user_quest_habits.sql`.

**Support for proposed habit model**

| Proposed habit field | Existing support | Notes |
|---|---|---|
| no more than ~3 active supporting habits | Policy/UI constraint | Existing services can list active habits; Compass should propose, not enforce globally. |
| normal version | Exists as habit title/type/target/schedule | Canonical habit row. |
| small version | Partial/new | Could fit `done_ish_config` or a Compass proposal field; inspect before overloading. |
| minimum/crisis version | New/partial | Not a canonical habit field; store in Compass proposal or extend carefully later. |
| cue | Partial | Could fit habit intent/environment context but not canonical explicit cue. |
| environment rule | Exists/partial | `environment_context`, score, risk tags exist. |
| completion evidence | Exists/partial | Habit logs record completion state; richer evidence may need new log metadata. |
| recovery rule | New/partial | Not canonical. |
| protected life area | Exists | `domain_key` / Life Wheel category. |
| habit-to-goal link | Exists | `goal_id` on `habits_v2`. |
| archive/delete behavior | Exists | lifecycle status and archived fields. |

Do not create duplicate habit storage. Compass should generate reviewable habit proposals and, after player approval, call canonical `createHabitV2` with provenance links retained in Compass state.

### Reflections/question flows

Reusable inspected primitives:

| Primitive | File/component | Current use | Reusable as-is? | Coupling / notes |
|---|---|---|---|---|
| Multi-question guided Life Wheel | `src/features/checkins/LifeWheelCheckins.tsx` | 24 Life Wheel questions, score selection, notes, radar/trends | Partially | Strong Life Wheel coupling, but question/score patterns are valuable. Mobile screens are already considered. |
| Area check-in / score slider style | `LifeWheelCheckins.tsx` | Category score capture | Partially | Use scoring/radar ideas; extract generic block renderer rather than import whole component. |
| Island Run habit prompt | `src/features/gamification/level-worlds/components/IslandRunLifePromptCard.tsx` | Deterministic no-AI habit intake; records Compass contribution | Partially | Tightly coupled to Island Run stop completion and habit creation service. Good source for compact in-game question UX. |
| Island Run reflection composer | `src/features/gamification/level-worlds/components/IslandRunReflectionComposer.tsx` | Mystery check-in reflection | Partially | Coupled to Island Run stop callback but reusable text-save pattern. |
| Wisdom Tree encounter | `src/features/gamification/level-worlds/components/WisdomTreeCardEncounter.tsx` | Card reflection in Wisdom stop | Partially | Useful short reflection pattern; tightly tied to stop completion message. |
| Journal composer/editor | `src/features/journal/Journal.tsx`, `JournalEntryEditor.tsx`, `JournalTypeSelector.tsx` | Short/long reflections, categories, modes | Partially | Persistence writes journal entries; UI patterns reusable. |
| Goal dialog AI chat + review | `src/components/LifeGoalInputDialog.tsx` | Chat, structured draft, review before create | Partially | Goal-specific but strong model for “propose, player confirms”. |
| Annual review wizard | `src/features/annual-review/components/ReviewWizard.tsx` | Multi-step review flow | Partially | Good stepper/progress flow; annual-review-specific content. |
| Habit wizard | `src/features/habits/HabitWizard.tsx` | Multi-step habit setup | Partially | Good wizard conventions; habit-specific persistence. |
| Player hand cards/ui | `src/features/players_hand/trait-card-hand-main/src/components/*` | Card deck, selection, tabs, dialogs | Low | Reference-only/imported prototype; avoid depending on nested app unless product chooses to integrate it. |

Minimal reusable curriculum block set recommended for MVP: `single_choice`, `multi_choice`, `scale`, `short_text`, `reflection`, `check_in`, `review`, `confirmation`. Add `ranking`, `emotion_choice`, `sentence_completion`, and `experiment` after Chapter 1 proves persistence and rendering.

Accessibility considerations: existing modals use `role="dialog"`, `aria-modal`, close labels, and some `aria-live`; the new block renderer should standardize labels, focus management, keyboard selection, visible focus, and mobile viewport constraints rather than inherit each feature’s partial implementation.

### AI Coach

**Current AI systems**

- `src/features/ai-coach/AiCoach.tsx`: broad coach modal. Loads check-ins, goals, habits, habit logs, journals, goal snapshots, workspace profile, balance score, intervention prompts, and AI Coach access.
- `src/services/aiCoachInstructions.ts`: prompt/instruction and life-stage context builder.
- `src/services/aiCoachAccess.ts`: metadata/local access state.
- `src/components/LifeGoalInputDialog.tsx` + `src/hooks/useGoalCoachChat.ts`: goal-coach chat, structured draft goal, player review/create.
- `supabase/functions/goal-coach-chat/index.ts`: authenticated OpenAI chat endpoint; user-specific `ai_settings` key/model; returns assistant message and optional structured draft.
- `supabase/functions/suggest-goal/index.ts`: structured goal suggestion JSON parsing.
- `src/services/habitAiSuggestions.ts`: direct client-side OpenAI/fallback habit suggestion path; less ideal for private Compass data.
- `supabase/functions/vision-star-special/index.ts`: story/image generation; not recommended for per-player chapter text image generation.
- `supabase/migrations/0201_conflict_ai_memory.sql`: conflict resolver AI run/artifact memory, useful as a pattern for storing AI artifacts but domain-specific.

**Compass support assessment**

- Asking one question at a time: supported conceptually by chat UIs, but needs a Compass-specific state machine.
- Structured chapter updates: supported by goal draft patterns and JSON parsing, but not currently a generic Compass schema.
- Propose rather than decide: supported by LifeGoalInputDialog review-before-create pattern.
- Player confirmation: supported in goal flow; required for Compass.
- Selective “Help me think”: feasible as a small edge-function endpoint given current OpenAI setup.
- Cross-chapter context: feasible if Compass state is loaded server-side/client-side and summarized carefully.
- Goal/habit suggestions without auto-creation: current goal chat already drafts then user creates; habit suggestion has fallbacks but should be adapted to explicit approval.

Risk: reusing the general AI Coach directly would blur privacy, context, cost, and canonical-state boundaries. Compass AI should be a separate narrow endpoint that returns proposed structured patches, never direct writes to goals/habits/Compass without confirmation.

### Persistence

Existing relevant persistence:

- `supabase/migrations/0252_compass_state.sql`: one row per user with `template_version`, `current_phase`, `center_statement`, `directions` JSONB, `spokes` JSONB, `completed_phases` text array, RLS owner policies.
- `src/services/compassState.ts`: fetch/upsert/parse/apply older Compass state; logs raw contributions to game-life intake.
- `supabase/migrations/0251_game_life_intake.sql` (referenced by comments/services): raw per-stop contribution sink.
- Goals/habits have robust offline local repositories and mutation queues under `src/data/*OfflineRepo` and services.
- Check-ins use a simple row/table service without an offline queue.

**Schema option comparison**

| Option | Fit with repo patterns | Pros | Cons / risks |
|---|---|---|---|
| A. Single Compass state document | Existing `compass_state` already uses this. | Simple MVP, easy full-book load, AI can propose JSON patches, fewer migrations. | Harder analytics, partial save conflicts, edit history, answer provenance, and version migration. Existing shape conflicts with six-chapter model. |
| B. Normalized tables | Matches relational goals/habits/check-ins and RLS patterns. | Strong querying, per-answer history, links, analytics, curriculum versioning, partial saves. | More migrations/services/RLS, larger first PR, harder to evolve block payloads. |
| C. Hybrid | Best match for current repository conventions. | Chapter/book rows provide authority; flexible JSON answers per chapter/activity; explicit relational links to goals/habits; good MVP evolution. | Requires careful versioning and migration boundaries. |

Grounded recommendation: **Hybrid** for the real Compass Book. The repo already uses JSONB for flexible state (`compass_state`, Island Run ledgers, environment contexts) and relational tables for canonical user entities (goals/habits/check-ins). A hybrid model avoids over-normalizing every block answer while preserving explicit links to canonical goals/habits.

Possible MVP data model:

- `compass_books`: one active book per user/curriculum version, current chapter/activity, status.
- `compass_chapter_states`: one row per user/book/chapter, JSONB answers/output/progress, status, content version.
- `compass_answer_events` or `compass_answers` later if edit history/analytics is required.
- `compass_goal_links` / `compass_habit_links`: explicit relation to canonical goals/habits and originating answer/proposal.

If avoiding multiple tables for MVP, a versioned successor to `compass_state` can be used temporarily, but it must not overwrite old ikigai/spoke semantics without a migration plan.

### Navigation/modals/book/page UI

Existing useful patterns:

- Mobile menu hold modal/sheet in `src/App.tsx` and `QuestCompassModal.tsx`: viewport modal, backdrop, panel, header, close, submenu sheet.
- Island Run stop modal and `CompassModal`: in-game overlay conventions.
- `FeaturePreviewOverlay.tsx`: full-screen preview with screenshots and status.
- Annual Review wizard: stepper/review flow.
- Daily Treats modals/cards/scratch/unlock reveal: strong animated card/reveal patterns.
- Quest Journey visual preview and Player Hand components: card/deck visual references, but nested prototype components should not become core dependencies without cleanup.

Recommendation: full Player Menu experience should be a route-like full-screen modal/sheet first, not nested small modals. In-game view should reuse the chapter progress/graphic subcomponents in compact mode inside the existing Island Run Compass modal seam.

### Rewards

Existing reward/economy surfaces:

- Island Run dice/essence/shards/reward bar: `islandRunStateActions`, `islandRunTileRewardAction`, `islandRunClaimRewardAction`, reward bar services.
- XP/gamification: `useGamification`, `XP_REWARDS`, challenges/activity services.
- Achievements and collectibles/stickers/creatures exist in gamification services.
- Visual/cosmetic rewards: book visuals, badges, seals, chapter graphics can be client state/art without economy effect.

Safe Compass rewards: chapter seals, book page polish, completion badges, non-economy visual states, maybe achievement progress if existing achievement framework supports it. Economy-affecting rewards (dice, essence, shards, XP, tickets, eggs, diamonds) require separate balance review and should be deferred.

### Feature Availability

- `src/config/featureAvailability.ts` defines live/demo/future feature metadata and preview assets.
- `src/services/featureAccess.ts`, `FeatureStatusBadge`, future-feature engagement services, and App workspace gating handle demo/live states.
- `APP_WORKSPACE_FEATURE_IDS` in `src/App.tsx` maps some workspace ids to availability ids; current Compass/Quest Compass entry did not show a feature id in the inspected action.
- Island Run feature flags live separately in `src/config/islandRunFeatureFlags.ts` for gameplay experiments.

Compass does not appear to have a dedicated Feature Availability id today. Add one for `app.compass_book` or similar before public shell rollout. Fixed guided mode can ship before AI mode; AI mode should have its own availability/entitlement check.

## 4. Reuse matrix

| Needed capability | Existing system/component | Reusable as-is? | Adaptation needed | Risk |
|---|---|---:|---|---|
| In-game Compass button | `IslandRunBoardPrototype` Compass button/modal state | Yes, seam only | Swap modal content later | Medium: high-risk Island Run file; avoid gameplay writes. |
| Full menu entry | App Compass Book hero / Quest Compass action | Yes, seam only | Route to new book shell; preserve Quest Compass | Medium: current label/behavior mismatch. |
| Island progress unlock | `useIslandRunState`, `currentIslandNumber`, travel actions | Yes | Read-only derivation | Low if read-only. |
| Six chapter derivation | New formula | No existing exact match | New curriculum model | Medium: conflicts with old 11-phase Compass. |
| Current Life Wheel scores | `checkins.scores`, taxonomy | Yes | Project latest scores into Chapter 1 | Low. |
| Ideal/min/safe scores | None | No | Compass-specific fields | Low. |
| Chapter graphic | Life Wheel radar + app CSS + html2canvas | Partially | New UI template and text fitting | Medium. |
| Question blocks | LifeWheelCheckins, wizards, Journal, Island prompt cards | Partially | Extract block renderer | Medium: coupling. |
| Goal creation | `goals.ts`, `LifeGoalInputDialog` | Yes for canonical writes | Add Compass provenance/link | Medium. |
| Habit creation | `habitsV2.ts`, `HabitWizard` | Yes for canonical writes | Add Compass provenance/link | Medium. |
| AI help | goal-coach edge function patterns | Partially | New narrow endpoint/schema | High if general coach reused directly. |
| Offline support | goals/habits offline repos | Pattern only | Build Compass queue or require online MVP | Medium. |
| Feature staging | Feature Availability system | Yes | Add Compass id/states | Low. |
| Rewards | visual modals/cards/achievements | Partially | Cosmetic-only first | High if economy touched. |

## 5. Data-authority map

| Domain | Canonical authority today | Ambiguity / duplication |
|---|---|---|
| Island | `IslandRunGameStateRecord.currentIslandNumber` via `useIslandRunState`/store/actions | Legacy runtime compatibility remains; new code must avoid UI patch writes. |
| Island completion | All five stops/boss/build criteria through Island Run state/actions and `isIslandFullyCleared` | Stop objective/build semantics are more nuanced than `completedStopsByIsland` alone. |
| Island unlock | `travelToNextIsland` and `currentIslandNumber`/`cycleIndex` | Admin/dev grants and cycle wrap must be considered. |
| Compass chapter | None for proposed six chapters | Old `compassCurriculum` has 11 phases; do not reuse as six-chapter authority. |
| Compass answer | Old `compass_state` JSON/spoke entries and `game_life_intake` raw logs | Proposed 120 structured answers need new/versioned authority. |
| Chapter output | None for six one-page outputs | Old `centerStatement` and spokes are not enough. |
| Goal | `goals` table via `src/services/goals.ts` | Goal snapshots and local offline repo are supporting layers, not alternate canonical goals. |
| Habit | `habits_v2` / `habit_logs_v2` via `src/services/habitsV2.ts` | Legacy/non-v2 references exist; use v2. |
| AI conversation | Goal Coach has edge-function transient chat plus optional draft; conflict resolver has domain-specific AI memory | No general Compass AI conversation store. |
| Chapter completion | None for new book | Old `completed_phases` is not equivalent. |

## 6. Recommended architecture

### State/data model

Use a hybrid Compass Book model:

- Book/chapter state is canonical and user-owned.
- Answers are structured JSON keyed by stable `activityId` and `questionId`, with `curriculumVersion`, `answeredAt`, `updatedAt`, `sourceMode` (`fixed_guided`, `direct_edit`, `ai_guided`), and confirmation status.
- Chapter outputs are projected from answers and stored as confirmed snapshots only when the player confirms them.
- Goal/habit proposals live in Compass state until the player explicitly creates or links canonical goals/habits.

### Content definition model

- Static TypeScript or JSON definitions for MVP: six chapters, 20 activity definitions each, stable IDs, block types, prompts, choices, output field mappings, completion requirements, and `curriculumVersion`.
- Existing comparable static content includes Island Run stop/island manifests, Life Wheel question definitions, guided journal templates, creature catalogs, feature availability config, and suggested habit libraries.
- Store stable IDs and version with every answer. If text changes, old answers remain readable through preserved version bundles or snapshot prompt labels. A player can redo a chapter under a newer version by creating a new chapter attempt/version while keeping the old confirmed output.

### Chapter progression

MVP rule: **soft island-gated unlock**.

- Reaching/starting island N unlocks Compass activity N and all prior activities up to N.
- Player may skip the reflection without blocking Island Run.
- Full book allows prior unlocked activities to be edited.
- Chapter completion is based on required Compass activities/outputs, not Island Run stop completion.
- For returning users beyond Island 20, unlock all activities up to their current island and show Chapter 1 as ready to complete/review.

### Component structure

- Shared components: `CompassChapterProgress`, `CompassChapterGraphic`, `CompassActivityRenderer`, answer review cards, proposal bridge.
- In-game: compact panel uses same state and read-only/quick-answer subcomponents.
- Full book: cover/contents/chapter screens/direct editor/goal bridge.

### Relationship to goals/habits

- Compass can propose goals/habits but never auto-create them.
- Player approval calls canonical `goals.ts` / `habitsV2.ts` services.
- Compass stores provenance links to created canonical IDs.

### AI/manual/direct-edit integration

All modes write the same structured Compass answer shape:

- Fixed Guided: deterministic block renderer writes answers directly after user submits.
- Direct Edit: editor writes the same fields with `sourceMode='direct_edit'`.
- AI Guided: AI returns proposed answer patches/summaries; UI shows them for confirmation; only confirmed patches become canonical Compass state.

Textual flow:

```text
Island progress
  → unlocks Compass activity
  → player completes fixed/direct/AI-assisted activity
  → activity writes structured answer
  → chapter projector derives chapter output
  → player confirms output
  → optional goal/habit proposals
  → explicit player action creates or links canonical goals/habits
```

## 7. Suggested component map

| Conceptual component | Existing convention to reuse/adapt |
|---|---|
| `CompassBookScreen` | Mobile hold modal / full-screen sheet patterns from `App.tsx` and `QuestCompassModal`. |
| `CompassBookCover` | Player Menu hero card styling and Daily Treats reveal/card polish. |
| `CompassContents` | My Quest submenu/list and Feature Preview card patterns. |
| `CompassChapterScreen` | Quest Compass modal detail layout + annual review wizard progression. |
| `CompassChapterGraphic` | Life Wheel radar/SVG patterns + app-rendered CSS templates. |
| `CompassChapterProgress` | Life Wheel progress/trend panels and Island Run progress badges. |
| `CompassActivityRenderer` | Extract from LifeWheelCheckins/question flows rather than coupling to one feature. |
| `CompassGuidedFlow` | Annual review / habit wizard stepper conventions. |
| `CompassDirectEditor` | Journal/goal editor form patterns. |
| `CompassAIHelper` | Goal Coach chat/draft pattern, narrowed to proposed patches. |
| `CompassGoalBridge` | LifeGoalInputDialog review-before-create; goals service canonical write. |
| `CompactGameCompassPanel` | Existing `CompassModal`/Island stop modal shell, compact mode only. |

## 8. Proposed MVP scope

Smallest coherent MVP:

1. Add a Compass Book feature flag/availability id.
2. Add shared Compass Book shell, but initially keep existing behavior until the implementation PR intentionally wires it.
3. Implement Chapter 1 only (“The Living Wheel”).
4. Use fixed guided mode first with a minimal block set: scale, single choice, multi choice, short text, reflection, review, confirmation.
5. Persist structured Chapter 1 answers and current chapter progress.
6. Reuse latest Life Wheel check-in scores as input; store ideal/good-enough/min-safe/emotional/momentum/importance/spillover and derived labels in Compass state.
7. Render the Living Wheel output as app UI with fixed/background art plus live text overlays.
8. Allow direct review/edit of Chapter 1 fields.
9. Generate goal/habit proposals only; do not auto-create.
10. Keep AI full-guide mode behind a separate feature flag; optionally add per-question “Help me think” later.

Deferred: chapters 2-6, full AI-guided mode, economy rewards, automatic goal/habit creation, export/share polish beyond local `html2canvas`, edit history analytics, redo-new-version UX, and any changes to Island Run progression.

## 9. Implementation phases

| Phase | Changed areas | Dependencies | Migration needs | Test plan | Rollback risk |
|---|---|---|---|---|---|
| 1. Entry-point shell/feature availability | `src/config/featureAvailability.ts`, `src/App.tsx`, new Compass components | None | None | Menu navigation, modal viewport, no behavior regression | Low if gated. |
| 2. Data model and curriculum definitions | New Compass service/types/content files; possibly migrations | Product accepts model | Likely yes if new tables/hybrid | Unit tests for derivation/versioning/RLS SQL review | Medium. |
| 3. Fixed question primitives | New `CompassActivityRenderer` + tests | Data model stable | None | Component/unit tests for block schemas and accessibility | Low. |
| 4. Chapter 1 guided flow | Compass feature components/services | Phases 2-3 | No additional | Persistence tests, reload tests, current/progress tests | Medium. |
| 5. Living Wheel graphic | New `CompassChapterGraphic`, reuse Life Wheel data | Chapter 1 answers | None | Visual/unit tests, mobile viewport, text overflow | Low/medium. |
| 6. Goal/habit proposal bridge | Compass proposal UI, goals/habits service calls | Canonical link model | Maybe link table | Tests that no auto-create occurs; explicit approval only | Medium. |
| 7. Optional AI help | New edge function/client hook | Structured schema | Maybe AI artifact table later | AI fallback/error tests, cost/rate tests | Medium/high. |
| 8. Later chapters | Content/components | Chapter 1 learnings | Maybe version additions | Chapter-specific block/output tests | Medium. |

## 10. Risks and blockers

- **Conflicting progression authorities:** old runtime patch paths remain; Compass must read Island Run only through canonical store/hooks/actions.
- **Duplicate Compass semantics:** old `compass_state` / 11-phase Compass conflicts with six-chapter book.
- **Duplicate Life Wheel schemas:** taxonomy was recently unified, but Life Wheel check-ins and game-facing area names still require careful mapping.
- **Stale goal/habit systems:** use canonical `goals` and `habits_v2`; avoid legacy habit paths.
- **AI cost/latency:** full AI-guided chapter mode is heavier than current goal suggestions; needs rate/cost controls.
- **Curriculum versioning:** stable IDs/version snapshots are mandatory before content changes.
- **User answer privacy:** Compass answers are sensitive life reflections; avoid broad AI context by default.
- **Text fitting:** one-page graphics with user text need clamp/edit warnings and responsive layouts.
- **Mobile performance:** full-book graphics/export should avoid heavy canvases during gameplay.
- **Existing users beyond Island 20:** unlock backfilled activities without forcing retroactive questionnaires.
- **Overcoupling to game progression:** never block stops/boss/island travel on Compass completion.
- **Accidental automatic goal/habit creation:** all suggestions must require explicit player approval.
- **Feature label mismatch:** Player Menu says Compass Book but opens Quest Compass today.

No foundational blocker was found, but the first implementation must resolve the data-authority split between old Compass and new Compass Book.

## 11. Validation plan

- **Unit tests:** chapter derivation, content definitions, answer reducer, projector, version compatibility, output completeness.
- **Persistence tests:** create/read/update answers, partial saves, edit existing answer, confirmed output snapshots, link records.
- **RLS checks:** users can only read/write their own Compass rows/links; service-role AI functions do not leak cross-user data.
- **Mobile viewport checks:** Player Menu full book, in-game compact panel, keyboard/focus, scroll lock, safe-area constraints.
- **Game overlay checks:** opening/closing compact panel does not pause/alter board state, rolls, stop modals, reward bar, eggs, or timers unexpectedly.
- **Menu navigation checks:** Compass Book opens from hero card and My Quest action; existing Quest Compass route remains discoverable or intentionally migrated.
- **Offline/reload tests:** save behavior under no Supabase, reload after save, conflict resolution if supported.
- **Existing-player migration tests:** users with old `compass_state`, users at islands 1, 20, 21, 120, and cycle >0.
- **Chapter-version tests:** changed prompt text remains readable; old answers keep old version; redo under new version is explicit.
- **AI failure/fallback tests:** unavailable key, timeout, malformed JSON, refused/empty response, player rejects proposal, no automatic canonical writes.
- **Economy guard checks:** no dice/essence/shards/tickets/eggs/diamonds mutations in Compass paths.

## 12. Changed files

This investigation changed only:

- `docs/investigations/compass-book-curriculum-investigation.md`

## Explicit answers to final investigation questions

1. **Where exactly are the two existing Compass entry points?** In-game: `IslandRunBoardPrototype.tsx` Compass button opens `CompassModal`. Player Menu: `App.tsx` Compass Book hero card and My Quest `quest-compass` submenu action open `QuestCompassModal`.
2. **What happens when each is pressed today?** In-game opens old Island Run Compass modal tied to `compass_state`. Player Menu opens Quest Compass analytics modal, despite the hero label saying Compass Book.
3. **What is the canonical Island Run progression source?** `IslandRunGameStateRecord` read through `useIslandRunState` and mutated through `islandRunStateActions`/roll/tile action services.
4. **Can chapter progress be derived safely from island progress?** Unlock/progress display can be derived from `currentIslandNumber` with the six-chapter formula for the new model, but existing Compass phases do not match that formula. Do not treat it as answer completion.
5. **What existing Life Wheel data can Chapter 1 reuse?** Eight category keys, latest scores, historical scores, trends, radar visualization patterns, Life Wheel taxonomy, and Quest Compass force derivations.
6. **What existing goal and habit systems should remain canonical?** `goals` via `src/services/goals.ts` / goal UI and `habits_v2`/`habit_logs_v2` via `src/services/habitsV2.ts` / habit UI.
7. **What existing question/modal components can support the guided journey?** LifeWheelCheckins, IslandRunLifePromptCard, IslandRunReflectionComposer, WisdomTreeCardEncounter, Journal editors, Annual Review wizard, HabitWizard, and LifeGoalInputDialog patterns.
8. **What current AI infrastructure is reusable for optional Compass guidance?** Goal Coach edge-function patterns, AI settings/model fallback, structured JSON parsing, and review-before-create UI. General AI Coach context is useful but should not be reused directly as the Compass writer.
9. **What persistence architecture best matches existing repository conventions?** Hybrid: canonical book/chapter rows with flexible JSON answers/outputs and explicit links to canonical goals/habits.
10. **How should curriculum versions be handled?** Stable content IDs plus `curriculumVersion` on answers/outputs; preserve old prompt labels/version bundles; allow explicit redo under newer versions.
11. **Can the chapter graphics be rendered as reusable UI rather than generated images?** Yes. The repo has radar/SVG patterns and `html2canvas`; the primary graphic should be UI-rendered, with optional export later.
12. **What is the safest coherent Chapter 1 MVP?** Feature-gated Chapter 1 fixed guided flow, structured persistence, Life Wheel score reuse, app-rendered Living Wheel output, direct edit/review, proposal-only goal/habit bridge, no economy or Island Run progression changes.
13. **What must be deferred?** Full AI-guided mode, chapters 2-6, automatic goal/habit creation, economy rewards, robust export/share, edit-history analytics, and old/new Compass migration beyond compatibility.
14. **What are the exact files likely to change in the first implementation PR?** Likely `src/config/featureAvailability.ts`, `src/App.tsx`, new `src/features/compass-book/*`, new `src/services/compassBook*.ts`, new curriculum definition files, tests/scripts for Compass Book, and possibly Supabase migrations/types if persistence begins in PR1. In-game file `IslandRunBoardPrototype.tsx` should only change in a later focused wiring PR.
15. **Is the feature feasible without changing the core Island Run progression or game economy?** Yes. Keep Compass as a soft-linked curriculum/book system that reads Island Run progress and writes only Compass state unless the player explicitly creates canonical goals/habits.

**Conclusion: PASS — implementation can begin with the proposed MVP.**
