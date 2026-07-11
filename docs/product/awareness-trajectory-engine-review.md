# Awareness Trajectory Engine — Product Review

This companion note makes the existing product concept explicitly reviewable before implementation.

Primary specification:

- [`awareness-trajectory-engine.md`](./awareness-trajectory-engine.md)

## Review decision requested

Review the concept as a product and research direction, not as an approved build plan.

The proposal should proceed only if the team agrees that it can remain:

- lightweight enough to use with near-zero resistance;
- explicit about observed data versus inference;
- cautious about causality, identity, and psychological interpretation;
- outcome-driven rather than insight-driven;
- privacy-preserving and user-controllable;
- integrated across Journal, Habits, Quest, Life Wheel, and AI Coach rather than becoming another isolated tab.

## Questions to resolve before implementation

1. What is the smallest useful MVP that proves better outcomes rather than merely producing compelling narratives?
2. Which existing app signals may be used by default, and which require separate opt-in consent?
3. What confidence and sample-size thresholds are required before showing a recurring route?
4. How will users correct, reject, export, or delete inferred patterns?
5. Which single visual model should ship first: route cards, branching paths, or the river/terrain metaphor?
6. What hard rules prevent identity verdicts, diagnosis, false precision, and overclaiming causality?
7. Which measurable outcome should determine whether the feature survives an MVP test?

## Proposed next artifact

If the concept is accepted, the next document should be a narrow MVP specification covering:

- one capture surface;
- one reconstructed trajectory card;
- one correction interaction;
- one branch-point intervention;
- one measurable result loop;
- privacy and retention rules;
- an explicit non-goals list.

No production schema or AI prompt architecture should be approved solely from the concept document.
