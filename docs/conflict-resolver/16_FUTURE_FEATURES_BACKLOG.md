# Conflict Resolver Future Features Backlog

> Status: future product backlog, not a committed roadmap.
> None of the features below are part of Conflict Type Routing v1 or the current five-PR closure plan. Each feature requires separate prioritization, investigation, safety review, and implementation approval.

This document preserves promising future Conflict Resolver ideas so Routing v1 scope can remain frozen without losing product thinking. It is not an implementation contract, launch plan, delivery sequence, or commitment to build any item.

## 1. Routing and conflict understanding

Future routing candidates may include:

- Additional conflict categories.
- Multiple selected categories.
- Primary + user-visible secondary conflict shapes.
- AI-inferred secondary signals.
- Confidence scoring.
- Changing or refining the category later in the flow.
- Relationship-specific routing sets.
- Automatic reclassification based on new context.

Important boundaries:

- AI-inferred categories must never be presented as objective truth.
- User-selected routing must remain editable.
- More categories can increase cognitive load and should only be added after usage evidence.
- Any automatic reclassification should be explainable, reversible, and clearly separated from user-confirmed routing.

## 2. Deeper guided resolution journeys

Potential future journey concepts include:

- Boundary workshop.
- Trust-repair journey.
- Repeated-pattern interruption plan.
- Compatibility and values exploration.
- Unfairness/workload balancing tool.
- Practical decision matrix.
- Misunderstanding clarification pathway.
- Follow-up repair check-ins.

These are product candidates only. Each journey should be evaluated for user value, safety implications, and whether a deterministic guided flow should exist before adding AI assistance.

## 3. AI capabilities

Potential future AI capabilities include:

- Conversational AI conflict coach.
- Adaptive follow-up questions.
- More personalized summaries and resolution options.
- Context from goals, journals, reflections, personality, or relationship history.
- AI memory across previous conflicts.
- Live two-person AI mediation.
- Voice-based coaching.
- AI-generated practice conversations.
- AI-generated alternative interpretations.
- AI-assisted message drafting.

Required cautions for any AI expansion:

- No diagnosis.
- No deciding who is right.
- No treating inferred intent as fact.
- No reconciliation pressure.
- No automated safety conclusions without a separately reviewed safety system.
- User approval before sharing or persisting AI-generated content.

AI features should be designed as supportive tools, not authorities. They should preserve user agency, clearly label generated content, and provide safe non-AI fallbacks where appropriate.

## 4. Safety and support capabilities

Safety-sensitive concepts include:

- Text-based safety signal detection.
- Safety planning tools.
- Trusted-contact support.
- Local support-resource integration.
- Emergency guidance for immediate danger.
- Documentation/evidence organization.
- Private exit or quick-close behavior.
- Safety check-ins.
- Separate non-mutual resolution path.

Warning: These features require dedicated safety, privacy, legal, geographic, and escalation review. They must not be casually implemented as ordinary conflict coaching features.

Safety-support work should be treated as a distinct product and systems track with reviewed escalation behavior, regional resource accuracy, privacy protections, abuse-resistance, and clear user consent boundaries.

## 5. Persistence and cross-device behavior

Future persistence and recovery candidates include:

- Server-side routing metadata.
- Cross-device routing completion state.
- Durable safety-close state.
- Shared-session routing metadata.
- Conflict history.
- Archived resolutions.
- Follow-up state.
- Versioned draft migrations.
- Improved session recovery.

Any durable persistence should be reviewed for privacy sensitivity, retention expectations, deletion behavior, and whether local-only state is safer for the use case.

## 6. Shared and multiplayer conflict resolution

Potential shared-resolution capabilities include:

- Participant-specific perspectives.
- Different routing selections for each participant.
- More than two participants.
- Facilitator, mediator, coach, or therapist role.
- Anonymous participation.
- Live collaboration.
- Shared editing.
- Participant permissions.
- Consent controls for shared summaries.
- Better invite/rejoin/revoke controls.

Shared conflict features should prioritize consent, participant safety, permission clarity, and non-coercive interaction design before richer collaboration mechanics.

## 7. Outputs and follow-up

Future output and follow-up candidates include:

- Exportable summaries.
- Printable or PDF agreements.
- Message/email/SMS drafts.
- Follow-up reminders.
- Calendar check-ins.
- Repair-plan tracking.
- Agreement progress.
- Revisit unresolved conflicts.
- Therapist or coach sharing packages.

Generated or exported outputs should avoid implying that an agreement is legally binding, clinically validated, or mutually consented to unless the product explicitly verifies those conditions.

## 8. Analytics and product learning

Potential product-learning signals include:

- Category selection rates.
- Category change rates.
- Completion/drop-off by route.
- Safety route usage.
- AI fallback rates.
- Fairness-warning rates.
- Resolution usefulness feedback.
- Outcome follow-ups.
- A/B testing category labels and helper copy.

Required analytics note:

- Avoid collecting sensitive conflict content for analytics. Prefer aggregate, privacy-preserving events and explicit consent.

Analytics should support product learning without creating surveillance of private conflict details.

## 9. Visual and interaction improvements

Potential visual and interaction improvements include:

- Full visual redesign.
- Richer category icons.
- Improved grounding animations.
- More polished progress visualization.
- Relationship-specific themes.
- Voice and audio guidance.
- Accessibility improvements.
- Reduced-motion mode.
- Better tablet/desktop layouts.

Interaction improvements should continue to support calm pacing, accessible comprehension, and clear user control rather than optimizing only for speed or visual polish.

## 10. Suggested prioritization framework

For each future feature, evaluate:

1. User value.
2. Safety risk.
3. Privacy sensitivity.
4. Implementation complexity.
5. Evidence from real usage.
6. Whether deterministic behavior should precede AI.
7. Whether it requires schema or cross-device persistence.
8. Whether it could accidentally pressure reconciliation.

Suggested status taxonomy:

- Candidate.
- Needs user evidence.
- Needs investigation.
- Safety review required.
- Privacy/legal review required.
- Not currently planned.

This taxonomy is intended for backlog clarity only. A status does not imply approval, scheduling, or commitment.

## 11. Routing v1 scope boundary

Routing v1 currently includes:

- Conflict-shape selection after grounding.
- Editable primary routing type.
- Category-aware first private prompt.
- Personality-annoyance coaching.
- Category-aware resolution guidance.
- Prompt-safe AI routing context.
- Safety-first routing and close state.
- Fairness-aware resolution fallback.
- AI-unavailable summary fallback.
- Shared-session routing hydration guard.

All other items in this document are future backlog. They are outside Conflict Type Routing v1 and outside the current five-PR closure plan.

PR 0 documentation complete. The five-PR Routing v1 closure budget remains unchanged.
