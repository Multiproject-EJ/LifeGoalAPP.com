# Conflict Resolver — One-Click Conflict Type Categorizer Brainstorm

> Status: brainstorm / product direction, not an implementation contract.  
> Goal: add an early “what kind of conflict is this?” moment so the resolver can give immediately useful guidance, route the user into the right emotional frame, and avoid treating all conflicts like the same problem.

---

## 1) Core idea

Add a lightweight conflict-type routing moment near the beginning of Conflict Resolver, before the deeper capture and summary flow.

The user should be able to tap one card that says, in plain language, what kind of conflict this feels closest to right now. This gives the system useful direction immediately, before the app asks for long-form context.

The feature should not feel like “choose the official reason for this conflict.” It should feel like “help us choose the best starting map.” The routing moment should not feel diagnostic, clinical, analytical, or final. It should feel like:

> “What does this feel closest to right now?”

The app can then adapt prompts, safety checks, coaching language, boundary guidance, and resolution options based on conflict type.

---

## 2) Why this matters

Conflict Resolver currently has a strong staged structure for calming down, capturing perspective, creating a neutral shared artifact, and moving toward agreement. But different conflicts need different first moves.

A personality annoyance is not the same as a values conflict. A misunderstanding is not the same as repeated boundary crossing. A practical logistics conflict is not the same as betrayal. A chronic pattern is not the same as a one-time bad moment.

If the app asks one smart categorization question early, it can:

- reduce user effort,
- make the next prompt feel more relevant,
- prevent over-escalating small annoyances,
- prevent under-treating boundary or safety issues,
- create better AI summaries,
- suggest better resolution paths,
- and make users feel understood faster.

---

## 3) Proposed UX moment: “What kind of conflict is this?”

### Placement options

#### Option A — after mode selection, before grounding

Flow:

1. Choose mode: `Inner Tension` or `Shared Conflict`.
2. Choose conflict type.
3. Grounding sequence adapts to that type.
4. Private capture prompts adapt to that type.

Pros:

- Fast personalization.
- User gets immediate agency.
- Grounding can be tailored.

Cons:

- Some users may be too activated to categorize accurately before grounding.

#### Option B — after grounding, before private capture

Flow:

1. Choose mode.
2. Grounding.
3. Choose conflict type.
4. Private capture adapts.

Pros:

- User may categorize more accurately after calming down.
- Lower risk of emotionally reactive labels.

Cons:

- Slightly later payoff.

#### Recommended starting point

Use **Option B** for v1: after grounding and before private capture. In other words: choose mode → grounding → conflict type routing → private capture → reflection / neutral summary → resolution suggestion.

Rationale: the category should guide the capture and resolution, but it should not become a hot, blame-based label while the user is still ungrounded.

---

## 4) One-click categories

Use simple user-facing cards. Behind the scenes, each card maps to a primary routing type and an adapted prompt strategy. The safety affordance should be separate and visually distinct, not just another normal category card. Recommended screen copy:

- Title: `What does this feel closest to right now?`
- Subtitle: `You can change this later. This just helps us guide the next step.`

### Suggested v1 cards

1. **Personality clash / annoyance**
   - “They keep doing something that irritates me.”
   - Best for: habits, style differences, tone, repeated small frustrations.

2. **Misunderstanding**
   - “I think we read the same thing differently.”
   - Best for: unclear intent, bad wording, assumed meaning.

3. **Boundary issue**
   - “Something feels like it crossed a line.”
   - Best for: repeated overreach, unwanted behavior, emotional space, time, privacy.

4. **Unfairness / imbalance**
   - “The effort or care feels unequal.”
   - Best for: household labor, emotional labor, workload, reciprocity.

5. **Hurt / broken trust**
   - “Something damaged trust.”
   - Best for: broken promises, secrecy, dishonesty, betrayal, public embarrassment.

6. **Different needs or values**
   - “We both want different things.”
   - Best for: priorities, lifestyle, commitment, parenting, religion, money, life direction.

7. **Practical decision conflict**
   - “We need to choose what to do.”
   - Best for: plans, scheduling, moving, spending, tasks, decisions.

8. **Repeated pattern**
   - “This keeps happening.”
   - Best for: issues already discussed where nothing really changes.

9. **I’m not sure yet**
   - “Help me figure it out.”
   - Best for: ambiguous cases; app can ask 2–3 narrowing questions.

---

## 5) Personality clash / annoyance path

This is the category from the stakeholder note and should get special care because it is common and easy to mishandle.

### Product insight

For personality clashes and annoyances, the answer is often not “make the other person different.” The first useful move is to help the user locate their own sustainable limit.

The app should guide the user toward:

1. noticing the behavior,
2. measuring how much annoyance they can live with while still behaving normally and kindly,
3. recognizing when they have passed that limit and started becoming mean, cold, contemptuous, or punitive,
4. backtracking to identify the boundary that should have been set earlier,
5. communicating that boundary before resentment turns into cruelty.

### Core principle

> If you’ve become cold, sharp, or mean, it may be a sign that your limit was crossed earlier than you realized.

This should not be framed as blame. It should be framed as a signal:

- “Your coldness, sharpness, or meanness may be evidence that your limit was crossed earlier.”
- “The goal is not to justify being mean.”
- “The goal is to find the boundary before you become a version of yourself you do not respect.”

### Key user-facing guidance

Possible copy:

> “Some conflicts are not about who is bad. They are about how much irritation you can carry before you stop acting like yourself.”

Possible micro-prompt:

> “At what level of this behavior can you still treat them like a normal person?”

Possible boundary prompt:

> “Everything above that level may need a boundary, not more silent tolerance.”

Possible repair prompt:

> “If you have already become sharp, cold, or mean, first backtrack. What line got crossed before you reacted that way?”

### Important friend assumption

For friendships and generally caring relationships, the app can gently remind the user:

> “If this person is a real friend, there is a high chance they would rather know your boundary than unknowingly push you until you resent them.”

This should be phrased carefully. The app should not promise that every person will respect a boundary, but it can encourage charitable interpretation when there is no evidence of danger or repeated disregard.

### Prompts for this category

- “What specific behavior annoys you?”
- “How often does it happen?”
- “What level could you live with without becoming cold, sarcastic, or mean?”
- “What is the first sign you are past your limit?”
- “What boundary would have helped before resentment built up?”
- “What could you ask for that is specific, realistic, and not a demand that they become a different person?”

### Output style for this category

The resolution suggestion should lean toward:

- one small behavior request,
- one self-boundary,
- one repair if the user has already acted badly,
- one assumption of goodwill if appropriate.

Example resolution shape:

> “I realize I waited too long to say this and then got colder than I wanted to. I’m sorry for that. I can handle X sometimes, but when it happens Y often, I start feeling resentful. Could we try Z? If that doesn’t work, I may need to step away earlier instead of pretending I’m fine.”

---

## 6) Smarter routing for other conflict types

Each category should adapt the next screen in three ways:

1. **Primary lens** — what the app helps the user notice.
2. **Best first move** — what kind of action is most likely to help.
3. **Failure mode to avoid** — what would make this conflict worse.

### Category routing table

| Category | Primary lens | Best first move | Failure mode to avoid |
|---|---|---|---|
| Personality clash / annoyance | Sustainable tolerance and early boundary | Identify the limit before resentment | Pretending it is fine until becoming mean |
| Misunderstanding | Meaning vs intent | Clarify what each person thought happened | Arguing against an assumed motive |
| Boundary issue | Line crossed and consequence | Name the line and needed protection | Over-explaining the boundary as if it needs permission |
| Unfairness / imbalance | Distribution of effort/cost/care | Make the imbalance visible and measurable | Turning it into a global character attack |
| Hurt / betrayal | Trust injury and repair requirements | Name impact, accountability, and repair path | Rushing forgiveness or demanding instant trust |
| Different needs or values | Legitimate competing goods | Translate needs into tradeoffs | Treating difference as disrespect |
| Practical decision conflict | Constraints and options | Define decision criteria | Making logistics symbolic of love/respect too early |
| Repeated pattern | Loop and failed repair attempts | Identify the cycle and what must change this time | Having the same conversation with no new structure |
| Not sure yet | Pattern discovery | Ask narrowing questions | Forcing premature certainty |

---

## 7) Narrowing questions for “I’m not sure yet”

If the user taps “I’m not sure yet,” the app can ask up to three simple questions and infer a likely category.

### Question 1

> “What hurts most right now?”

Options:

- “I feel misunderstood.” → likely misunderstanding.
- “I feel disrespected.” → boundary, unfairness, or betrayal.
- “I feel exhausted by a repeated pattern.” → repeated pattern.
- “I feel irritated by how they are.” → personality clash / annoyance.
- “I feel stuck choosing what to do.” → practical decision conflict.

### Question 2

> “Has this happened before?”

Options:

- “No, this is mostly one incident.”
- “Yes, a few times.”
- “Yes, this is the pattern.”

### Question 3

> “What would make this meaningfully better?”

Options:

- “A clearer explanation.”
- “An apology.”
- “A boundary being respected.”
- “A fairer split.”
- “A decision.”
- “A real change in the pattern.”

The app can then say:

> “This sounds closest to a boundary issue with a repeated-pattern element. You can change this if it feels wrong.”

---

## 8) How the categorizer changes AI behavior

The selected category should become a structured signal for AI orchestration, not just a UI label.

### AI should use the category to adjust:

- follow-up prompts,
- neutral summary language,
- reframing style,
- suggested next actions,
- apology guidance,
- boundary guidance,
- agreement templates,
- risk/safety checks.

### AI should not use the category to:

- diagnose either person,
- label someone as toxic based on one click,
- excuse harmful behavior,
- pressure reconciliation,
- override user-provided facts,
- turn a soft annoyance into a severe moral judgment.

### Primary + secondary category model

Store one primary user-selected routing type with optional secondary signals, not as truth. Many conflicts are combinations: annoyance + repeated pattern, boundary issue + unfairness, misunderstanding + hurt, different values + practical decision, or broken trust + repeated pattern.

Suggested internal shape:

```ts
{
  primaryConflictType: 'personality_annoyance',
  selectedBy: 'user',
  confidence: 'user_asserted',
  secondarySignals: ['repeated_pattern_possible', 'boundary_possible'],
  safetyFlag: false,
  canChangeLater: true
}
```

User-facing copy can stay simple: “This sounds like personality friction, with a possible boundary element.”

---

## 9) Safety and escalation considerations

The categorizer must include a quiet safety escape hatch. Some users may categorize an unsafe dynamic as “annoyance” or “misunderstanding” because they are minimizing it.

### Safety-sensitive signals

If the user mentions threats, coercion, stalking, physical danger, sexual pressure, financial control, isolation, or fear of retaliation, the app should move away from mutual-resolution framing and toward safety/support guidance.

### Copy principle

Do not say:

> “Invite them to resolve this together.”

When safety signals are present, say something closer to:

> “This may not be a mutual problem-solving situation. Your safety and support matter first.”

### Categorizer safety affordance

Add a visible secondary safety link:

> “I may not feel safe resolving this directly.”

This should route to a safety-first flow, not a shared invite flow. It should not be styled as a normal conflict category.

---

## 10) Category-specific capture prompt shapes

Each category should adapt private capture enough that the user immediately feels the resolver got smarter.

### Personality clash / annoyance

Primary goal: find sustainable limit before resentment.

Prompts:

1. What specific behavior annoys you?
2. How often does it happen?
3. What level of this could you live with while still treating them normally?
4. What is the first sign you are past your limit?
5. Did you become cold, sarcastic, sharp, or distant?
6. What boundary would have helped earlier?
7. What is one small realistic request, not a demand that they become a different person?

Output should include one repair sentence, one specific request, one self-boundary, and one goodwill assumption if appropriate.

### Misunderstanding

Primary goal: separate intent from interpretation. Avoid arguing against a motive that has not been confirmed.

Output shape:

> “When X happened, I interpreted it as Y. I realize I may not know your intent. Can you help me understand what you meant?”

### Boundary issue

Primary goal: name the line clearly. Avoid over-explaining the boundary as if it needs permission.

Output shape:

> “I need to be clear about a boundary. I’m not okay with X. Going forward, I need Y. If X happens again, I’ll need to Z.”

### Unfairness / imbalance

Primary goal: make the imbalance visible and specific. Avoid “you never care” / “you always make me do everything.”

Output shape:

> “I’m feeling worn down because X seems to be falling mostly on me. I don’t want to turn this into a character attack, but I do need the split to change. Could we agree on Y?”

### Hurt / broken trust

Primary goal: identify repair requirements. Avoid rushing forgiveness or demanding instant trust. This path should be slower and more careful.

Output shape:

> “What hurt most was X. It affected me by Y. I’m not ready to pretend it’s fine. For repair to start, I need Z.”

### Different needs or values

Primary goal: translate difference into tradeoffs. Avoid treating difference as disrespect.

Output shape:

> “I don’t think this is just about one of us being wrong. I think we may be prioritizing different real needs. I need X, and I hear that you need Y. Can we talk about what tradeoff would actually work?”

### Practical decision conflict

Primary goal: define decision criteria. This path can be lighter and faster, but should still ask: “Is this only logistical, or has it started to feel personal?”

Output shape:

> “Maybe we can separate the decision from the emotion for a moment. The decision is X. The criteria seem to be Y. Based on that, option Z seems most workable.”

### Repeated pattern

Primary goal: stop having the same conversation. This path should always include “what changes this time?”

Output shape:

> “I don’t want us to repeat the same conversation without a new structure. The pattern seems to be X. Last time we agreed Y, but Z happened. This time, I think we need A, B, and a check-in by C.”

---

## 11) Implementation sketch for a future PR

No code change is proposed in this brainstorm, but a future implementation could be sliced safely.

### Slice 1 — UX copy and static screen

- Add categorizer screen after grounding.
- Persist selected category as draft metadata.
- Allow “change category” before final summary.

### Slice 2 — prompt adaptation

- Adapt private capture prompts by category.
- Keep all answers user-approved.
- Add category-specific helper text.

### Slice 3 — AI orchestration

- Pass category into summary/rewrite requests.
- Add category-specific neutralization rules.
- Add safeguards against over-labeling.

### Slice 4 — resolution templates

- Generate different proposal templates per category.
- Add boundary-specific and repair-specific suggestions.
- Add repeated-pattern agreement structure.

### Slice 5 — analytics and learning

- Track category selection, category changes, completion, agreement quality, and dropoff.
- Use aggregate data to improve category wording.

---

## 12) Acceptance criteria for a future feature

A future implementation should be considered successful when:

- Users can choose a category in one tap.
- Users can change the category later without losing their work.
- The selected category changes the next prompts in a visible, helpful way.
- Personality-annoyance conflicts guide users toward sustainable limits and early boundaries, not blame.
- Safety-sensitive content overrides normal shared-resolution routing.
- The AI uses the category as context, not as a diagnosis.
- The feature improves clarity without adding noticeable friction.

---

## 13) Open product questions

1. Should categorization happen before or after grounding in the first shipped version? Recommended answer: after grounding.
2. Should “I may not feel safe resolving this directly” be a top-level card or a secondary link? Recommended answer: secondary but visible safety link, not a normal card.
3. Should the app allow multiple categories from the start, or force one primary category plus inferred secondary signals? Recommended answer: one primary in UI, secondary signals internally.
4. Should personality-annoyance guidance appear as a mini-coaching screen before private capture? Recommended answer: yes.
5. Should repeated-pattern conflicts automatically prompt for “what changed after the last conversation?” Recommended answer: yes, always.
6. Should practical decision conflicts bypass some emotional repair steps when both users agree it is only logistical? Recommended answer: partly, but ask if it has started to feel personal.
7. How should the app distinguish a normal annoyance from contempt, chronic disrespect, or incompatibility? Recommended checks: can I still act kindly, have I become cold/sarcastic/punitive, and have I communicated a realistic boundary?

---

## 14) Product thesis

A one-click conflict categorizer can make Conflict Resolver feel dramatically smarter without making it more complicated.

The feature should not box users in. It should give the resolver a better starting map.

For personality clashes and annoyance specifically, the key emotional insight is:

> Find the level of annoyance you can live with while still behaving like yourself. Everything above that needs a boundary earlier than you think.

That single idea can turn a common conflict pattern from silent resentment into respectful self-knowledge, cleaner boundaries, and better repair.
