# Breathing Space Conflict Resolver — Product + Technical Integration Plan

## 1) Product intent
Build a mediator that feels safe, fair, and non-judgmental while still moving conflict toward resolution.

Core outcomes:
- Users feel heard and respected.
- No party can dominate or derail the process.
- AI appears supportive to each participant while remaining truly neutral.
- Internal conflict mode and external party mode are both first-class.

---

## 2) Entry model (first screen)
When opening Conflict Resolver, require the user to choose:
1. **Inner Tension** (you vs yourself)
2. **Shared Conflict** (you + 1 or more people)

This should be a low-friction chooser with reassurance copy:
- “No blame, no judgment.”
- “Your words stay yours; AI helps clarity and tone.”

---

## 2.1) Experience shape (non-negotiable UX rules)
- This is a **guided emotional state machine**, not a form and not chat.
- Use **card-by-card progression**:
  - one full-screen card per stage
  - no long scrolling surfaces during active mediation
- Use **two-layer UI**:
  - foreground action card
  - soft calming background layer for emotional regulation
- Prefer “calm tech” visuals:
  - soft gradients, rounded surfaces, light glass blur, subtle shadows
  - avoid sharp edges, chat bubbles, and noisy gamification visuals

---

## 3) End-to-end UX flow

### Stage 0 — Conflict type
- Choose Inner Tension or Shared Conflict.
- If Shared Conflict, define:
  - Relationship/context (work, partner, family, team)
  - Number of participants (2+)
  - Urgency (low/medium/high)

### Stage 1 — Grounding and consent
- Calming intro + norms:
  - No disrespect
  - Equal voice
  - Repair-oriented framing
- All parties explicitly tap **I agree** to proceed.
- Add **hold-to-continue** for “I’m ready” to create intentional slowdown.

### Stage 2 — Perspective capture (private first)
- Each party responds privately to structured prompts:
  - What happened?
  - What did this mean to you?
  - What do you need now?
  - What are you willing to offer?
- AI rewrites to “clear + respectful” while preserving intent.
- User approves rewritten version before sharing.
- Optional “Skip for now” remains secondary and low-emphasis.

### Stage 3 — Shared understanding pass
- AI builds a neutral shared summary.
- Timed read window (gentle, extendable).
- Reactions captured without immediate interruption from others.
- Interaction pattern:
  - stacked “pile” cards during input
  - merge animation into summarized cards after AI synthesis

### Stage 4 — Option generation and negotiation
- Objective brainstorming board:
  - AI proposes balanced options
  - Parties can add options
- Anti-hijack pacing:
  - Early proposals go to queue until all finish understanding pass
  - Turn-based review/response
- Include shared-text highlighting actions:
  - “This is accurate”
  - “This is missing something”

### Stage 5 — Apology Alignment + agreement
- Apology module:
  - Party selects apology style(s): acknowledgment, responsibility, repair action, reassurance
  - Coordinated timing (simultaneous or sequenced)
- Agreement builder:
  - “We agree now”
  - “I will do”
  - Check-in date

### Stage 6 — Close and follow-up
- Session closes with confidence/clarity scores.
- Optional reminder for check-in and progress review.

---

## 4) Safety and trust architecture (non-threatening by design)

### Mediation guardrails
- Enforce no-abuse content policy in real time (insults, threats, contempt, humiliation).
- Always offer “rewrite respectfully” suggestions.
- Never publish unreviewed AI rewrites on behalf of a user.

### Dual-sided fairness
- AI response contract:
  - Validate feelings on both sides
  - Avoid assigning villain/hero labels
  - Highlight overlap before difference

### No-hijack orchestration
- Stateful gates (cannot skip mandatory stages without group consent).
- Turn tokens in shared stages.
- Proposal queue with release criteria (everyone completes read step).
- No-pressure pacing:
  - timers are guidance defaults
  - request-extra-time should be frictionless

### AI output formatting rules
- Never show large raw AI paragraphs in core flow.
- Default to cards, bullets, and step chunks.
- “Tone softened” and rewrite rationale available as tap-to-expand metadata.

---

## 5) AI system design (expert mediator behavior)

## 5.1 Prompt stack
Use a layered prompt strategy:
1. **System prompt:** expert mediator persona, neutrality, de-escalation, fairness, non-judgment.
2. **Policy prompt:** safety and content constraints (no harmful amplification).
3. **Session context:** stage, participants, prior accepted summaries, unresolved needs.
4. **User context:** optional archetype/trait snapshots for tone adaptation.

## 5.2 “Feels on my side” without bias
- Per-user private reflections can be empathic and personalized.
- Shared outputs must remain neutral and symmetry-checked.
- Add automated “fairness lint”:
  - Side A mentions vs Side B mentions
  - Blame-heavy phrasing detector
  - Solution imbalance detector

## 5.3 Apology intelligence
- Classify what apology ingredients are missing.
- Suggest apology variants that preserve dignity (“no loss of face” framing).
- Gate release based on recipient readiness.

---

## 6) Archetype/personality integration

Use existing archetype/trait data as optional inputs:
- Tone preference (direct, warm, concise, reflective)
- Stress style and trigger patterns
- Repair preference (practical action vs emotional validation first)

Rules:
- Personality data informs **delivery style**, not “who is right.”
- Always user-visible and optionally editable.

---

## 7) Cross-surface architecture: LifeGoal app + breathing space site

Goal: allow invited external parties to participate without full app onboarding.

### Surfaces
1. **LifeGoal app (authenticated users)** — starts/owns sessions.
2. **breathingspace.com (lightweight web app)** — invitees join via one-click email sign-in.

### Identity and auth
- Use shared auth provider/project (Supabase Auth).
- Invitation token ties invitee to a single session.
- One-click magic link login with minimal required profile (email only).

### Shared backend
- Single data model and Realtime channels for both surfaces.
- Session state machine stored centrally; both clients subscribe.

### Marketing funnel angle
- Invitee starts as “session-only lightweight account.”
- Post-session prompt:
  - Continue with full profile setup in LifeGoal app
  - Keep using breathing-space mode only

---

## 8) Suggested data model (MVP+)

Tables:
- `conflict_sessions`
  - `id`, `owner_user_id`, `conflict_type`, `status`, `created_at`, `closed_at`
- `conflict_participants`
  - `session_id`, `user_id` (nullable for invited pre-account), `email`, `role`, `joined_at`
- `conflict_stage_state`
  - `session_id`, `stage`, `participant_id`, `completed_at`, `readiness`, `extension_requested`
- `conflict_messages_private`
  - private reflections and approved rewrites
- `conflict_shared_summaries`
  - AI neutral summaries + revision history
- `conflict_proposals`
  - queued and active options, votes, counteroffers
- `conflict_apologies`
  - selected type, readiness, delivered_at, acknowledged_at
- `conflict_agreements`
  - final commitments + follow-up schedule

Realtime:
- Channel per session (`conflict:{session_id}`) with typed events.

---

## 9) State machine (must-have)

Allowed transitions:
- `draft` → `grounding` → `private_capture` → `shared_read` → `negotiation` → `apology_alignment` → `agreement` → `closed`

Hard rules:
- No jumping ahead unless required participants completed prior stage.
- Timeout handling with graceful recovery.
- If participant disconnects, session pauses with resumable state.

---

## 10) Implementation plan

### Phase A — Foundation
- Build stage state machine + DB schema + Realtime sync.
- Add Conflict Type chooser + Inner/Shared branching.

### Phase B — Shared conflict core
- Private capture, neutral summary, shared read, proposal queue.
- Turn-based pacing and anti-hijack controls.
- Build silent-read “focus chamber” mode and highlight feedback mechanic.

### Phase C — Apology + agreement
- Apology alignment module.
- Final agreement composer + follow-up reminders.

### Phase D — Cross-domain onboarding
- breathing-space.com lightweight join flow.
- Invite tokens + magic links + post-session funnel.

### Phase E — Quality + trust
- Mediation prompt tuning, fairness linting, safety red-team tests.

---

## 11) KPIs
- Completion rate by stage.
- Drop-off causes (especially shared_read and negotiation).
- Perceived fairness score (both parties).
- “Felt heard” score (both parties).
- Agreement durability (follow-up success).
- Invitee conversion to full LifeGoal sign-up.

---

## 12) Recommended next docs
To de-risk delivery, add:
1. `docs/conflict-resolver/01_UX_COPY_AND_WIREFRAMES.md`
2. `docs/conflict-resolver/02_DATA_MODEL_AND_RLS.md`
3. `docs/conflict-resolver/03_STATE_MACHINE_AND_REALTIME_EVENTS.md`
4. `docs/conflict-resolver/04_AI_MEDIATOR_PROMPT_SPEC.md`
5. `docs/conflict-resolver/05_BREATHINGSPACE_COM_INTEGRATION.md`
6. `docs/conflict-resolver/06_SAFETY_AND_FAIRNESS_TEST_PLAN.md`
