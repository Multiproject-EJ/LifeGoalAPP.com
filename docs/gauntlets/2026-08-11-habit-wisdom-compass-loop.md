# Habit → Wisdom → Compass Gauntlet

Date: 2026-08-11
Project: HabitGame / Island Run
Status: approved for implementation by Eivind in the active task

## Mission

Turn the two behavioural landmarks into one coherent real-life loop:

1. **Habit** asks for one genuine action now.
2. **Wisdom** lets the caretaker ask the island's real Compass Book question.
3. The answer is saved to the canonical 120-island Compass curriculum.
4. The player receives a short, kind explanation of what the answer clarifies and where it can help next.

The experience must be calm, premium, phone-first, and materially useful outside the game.

## Non-negotiables

- Habit and Wisdom have different jobs. Habit never becomes a personality questionnaire.
- One Habit encounter requires exactly one real-world action.
- Habit shows at most three primary actions and normally completes in two taps.
- Habit never opens Life Wheel, Habits, Check-ins, or another large product surface.
- Compass questions live in Wisdom and persist through the canonical Compass Book store.
- There is exactly one Compass activity per island across all 120 islands; do not create a parallel question ledger.
- Wisdom uses the high-detail caretaker presentation and keeps the board visible behind a compact, transparent encounter card.
- AI is optional assistance only. It may suggest or rephrase; it never silently answers, confirms, diagnoses, or writes.
- The non-AI path is complete and equally capable of finishing the encounter.
- No fabricated community percentages. Community comparison requires a real, privacy-safe aggregate with a minimum cohort threshold.
- "Shadow" copy is framed as a growth edge or counterbalance, not a defect, diagnosis, or verdict.
- No new currency is introduced. "Insight" is descriptive copy unless a separate economy contract approves it.
- Gameplay completion remains behind canonical Island Run actions; UI components do not write gameplay runtime state.

## Scope

### In this pass

- Simplify the Habit Landmark to:
  - up to three unfinished Today habits; or
  - up to three instant two-minute actions when Today has no suitable unfinished habit;
  - recognize a Today habit already completed and let that real action satisfy the landmark without duplicate habit rewards;
  - preserve the one-time Island 1 breathing ritual.
- Remove Compass overflow and navigation detours from Habit.
- Replace the stacked Wisdom Tree + optional Compass panel with one caretaker-led Compass encounter.
- Persist the Wisdom answer in `compass_chapter_states` through `useCompassBook`.
- Prefer the canonical island-mapped activity; saved answers reopen as editable/confirmed rather than asking a random duplicate question.
- Add a four-signal Compass illumination summary:
  - **Know** — Living Wheel + Inner Compass
  - **Choose** — Living Horizon + Ikigai Map
  - **Act** — Quest Forge
  - **Sustain** — Personal Playbook
- Score each signal 0–4 from completed canonical activities, with kind labels:
  - 0 Open potential
  - 1 First clues
  - 2 Taking shape
  - 3 Clear path
  - 4 Strong signal
- Add a compact post-answer reveal explaining:
  - what was saved;
  - which Compass signal it develops;
  - one optional connection to the player's existing goals or habits when available.
  - one deterministic practical use, so usefulness never depends on AI availability or consent.
- Add a native-AI capability boundary and documented availability/fallback behaviour. The deterministic product must ship independently of the native adapter.
- Verify at 390×844 and with reduced motion.

### Explicitly deferred

- Public or group answer percentages.
- Creature battle stat changes based on personality answers.
- Pairing rewards, feeding economy, or a new Insight currency.
- Clinical assessment, diagnosis, therapy, crisis support, or personality certainty claims.
- Bulk AI analysis of the entire Compass Book.
- Server AI fallback for people who decline on-device AI. Their fallback is the private, deterministic authored experience.

## Authority and data ownership

- Island Run state: canonical Island Run store/actions only.
- Habit completion: `habits_v2` / canonical habit services.
- Compass answers: `compass_books` and `compass_chapter_states`, plus their existing local mirror.
- Goals/habits context: read-only through the existing Compass player-data adapter.
- AI suggestions: ephemeral until the player explicitly applies and confirms them.

## Usefulness gates

Every Wisdom prompt must pass all four checks:

1. **Home** — the answer maps to a named canonical Compass activity/output.
2. **Interpretation** — the UI can explain what the answer clarifies without pretending certainty.
3. **Bridge** — it can connect to a goal, habit, life area, or later Compass chapter, or clearly say it is building self-knowledge first.
4. **Agency** — the player can reject, revise, skip for now, and complete without AI.

If a prompt fails one of these checks, it is not eligible for Island Run.

## Milestones and evidence

1. Contract and content map.
2. Habit one-action implementation and focused tests.
3. Wisdom caretaker Compass implementation and persistence tests.
4. Four-signal score projector tests.
5. Optional native-AI capability spike; must compile behind availability guards or be left disabled.
6. Phone screenshots for Habit, Wisdom question, and Wisdom result at 390×844.
7. Final diff, architecture check, type/build/test pass.

## Budgets

- Habit: one screen, two taps normally, three visible choices maximum.
- Wisdom: one activity per encounter; no duplicated preliminary card.
- Answer reveal: one compact screen; no dashboard-sized report inside the landmark.
- AI prompt: current question plus minimal relevant selected goal/habit context only; never the full private book by default.
- Motion: no long blocking animation; reduced-motion path remains complete.

## Rollback

- Components remain replaceable at the existing Habit and Wisdom mount points.
- No database migration is required for the core pass.
- Native AI is isolated behind a capability service and can be disabled without changing answer persistence.
- Existing Compass Book data shape and Island Run action contracts remain unchanged.

## Stop conditions

Stop and re-contract before:

- adding a new currency or reward economy;
- changing the six canonical Compass chapters or persisted answer schema;
- using private answers for group statistics;
- allowing AI to write or confirm answers automatically;
- making creature combat outcomes depend on personality data;
- requiring a newer iOS deployment target for the whole app.
