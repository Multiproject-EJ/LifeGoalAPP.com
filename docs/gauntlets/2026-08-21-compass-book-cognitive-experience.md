# Compass Book cognitive-experience Gauntlet

Date: 2026-08-21
Owner: Compass Book / HabitGame
Status: Active

## Mission

Bring Chapters I, V, and VI up to the same philosophical and methodological standard as the revised Inner Compass, Living Horizon, and Ikigai Map. The result should help a player discover useful patterns in their own life while feeling curious, capable, and free to disagree.

## Sources of truth

- `docs/product/compass-book-question-method-v2.md`
- `docs/product/compass-book-player-playthrough-feedback.md`
- EJ-Jarvis project memory and HabitGame doctrine
- Existing canonical Compass Book chapter/activity IDs and serialization contracts
- Island Run architecture and gameplay contracts

## Non-negotiables

1. Evidence before labels: ask for a remembered situation, observed behaviour, or concrete comparison before proposing an identity-like conclusion.
2. Proposals, not verdicts: derived patterns must be visibly provisional and editable.
3. Agency over compulsion: no shame, false urgency, streak loss, hidden scarcity, or rewards that pressure the player to disclose more.
4. Gamefulness must carry meaning: a reveal, animation, collection, or celebration must improve comprehension, recall, prioritisation, or follow-through.
5. Low cognitive load: no activity may exceed four inputs; repeated scales must have an obvious purpose and visible payoff.
6. Real-life portability: each finished chapter must produce a small, testable next action and a reason to revisit it.
7. Compatibility: preserve canonical chapter, island, question, and output keys unless an additive versioned extension is required.
8. Honest inference: confidence, counterevidence, and review conditions must be representable in the final reading.
9. Accessibility: all interactions work without drag, colour alone, animation, or pointer precision.
10. No new gameplay write path or UI-owned Island Run runtime mirror.

## Scope

### Chapter I — The Living Wheel

- Ground the opening labels in recent-life evidence.
- Turn repeated scoring into a visual scan with meaningful contrast.
- Treat engine, brake, fragile spoke, and lever as hypotheses the player confirms or corrects.
- End with one humane next move, confidence, and a review trigger.

### Chapter V — The Quest Forge

- Compare candidate quests before commitment.
- Distinguish desire, identity/status pull, season fit, cost, controllability, and evidence.
- Replace permanent-calling language with a seasonal quest hypothesis.
- Give supporting and not-now quests dignified homes rather than framing them as failures.
- Celebrate a bounded commitment and a concrete first test.

### Chapter VI — The Personal Playbook

- Infer operating patterns from contrasted examples, not a single self-description.
- Convert advice into if-then plans, minimum viable versions, environmental support, and recovery routes.
- Make the rocket/cockpit metaphor explain the system rather than distract from it.
- End with an experiment, confidence level, and scheduled review—not a permanent personality claim.

## Ethical cognitive-design palette

- Curiosity gap: invite a prediction, then reveal the comparison that produced it.
- Progressive disclosure: one useful decision at a time; show why the next question follows.
- Chunking and spatial memory: wheel spokes, forge trays, and cockpit systems each hold one kind of information.
- Retrieval and contrast: recall a working example and a failed/strained example before abstracting a rule.
- Implementation intentions: express selected actions as “When X, I will Y.”
- Endowment without coercion: the player builds a personal artefact they can edit; nothing is lost for leaving.
- Peak-end design: celebrate an earned synthesis and close on a small, achievable next step.
- Self-determination: protect autonomy, support competence, and allow relational/support choices where relevant.

## Evidence required

- Focused projector/content/renderer tests pass.
- Full TypeScript build passes.
- Launch-contract check passes.
- Browser walkthrough of fresh Chapter I, V, and VI flows at desktop and narrow viewport.
- Reduced-motion walkthrough of Chapter VI.
- No console errors in the tested flows.
- Visual reference is generated, inspected, and either translated into code-native motifs or explicitly retained as concept-only.

## Milestones

1. Rewrite content and method versions while preserving IDs.
2. Extend pure projectors with evidence/confidence/review metadata.
3. Add meaningful in-flow reveals and chapter completion celebrations.
4. Improve the three final graphics so proposals and next actions are immediately legible.
5. Run the evidence suite and repair every material defect.

## Budgets

- Prefer additive, reversible content/projector/UI changes.
- Do not expand the persistence schema unless existing JSON output cannot carry the needed metadata.
- Avoid new production dependencies.
- Keep animations optional and inexpensive; reduced-motion must preserve the information.

## Rollback

- Chapter-specific method versions allow v1 answers to remain readable.
- New output fields are nullable and additive.
- UI reveals degrade to normal text and controls when motion or enhanced visuals are unavailable.
- Each chapter can be reverted independently without changing global curriculum versioning.

## Stop conditions and handoff

Stop implementation if preserving an existing question ID would materially corrupt saved meaning, if a gameplay architecture change becomes necessary, or if browser evidence contradicts the intended low-pressure experience. Record the conflict and request a product decision.

Handoff occurs after all evidence gates pass. The founder then completes the entire Compass Book and records per-island feedback using the playthrough rubric; those observations become the next revision backlog.
