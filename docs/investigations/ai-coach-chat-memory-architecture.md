# AI Coach chat + memory architecture investigation

Date: 2026-06-20

## Current answer: is the proper AI wired into the main Coach chat?

As of the first wiring slice, yes for live authenticated sessions: the main `AiCoach` modal calls a dedicated `ai-coach-chat` Supabase Edge Function instead of relying only on local keyword responses. Demo sessions still use `simulateAiResponse()` as an intentional no-network fallback.

The new main Coach path now mirrors the app's existing AI pattern:

- The client sends recent chat turns, the Coach system prompt, and the privacy summary to `supabase.functions.invoke('ai-coach-chat')`.
- `supabase/functions/ai-coach-chat` authenticates the user, reads the user's OpenAI key/model from `ai_settings`, falls back to `OPENAI_API_KEY`, calls OpenAI, and returns `{ assistant_message }`.
- `ai_settings` already stores provider/API-key/model preferences per user with owner RLS.

The main Coach already has useful context assembly: privacy-aware access settings, habit environment notes, goals summary, telemetry difficulty, and life-stage context are composed into `loadAiCoachInstructions()`. The remaining bridge is durable memory: storing short-term thread records, selected summaries, and compact memory updates so future calls can retrieve only what is useful.

## What should be stored?

We should not store every raw chat forever as the primary memory. Raw transcripts are useful for short-term continuity and debugging, but they are expensive and privacy-sensitive if replayed into every prompt. The better architecture is a two-layer memory model:

### 1. Short-term thread records

Store recent chat turns so the user can reopen the Coach and continue the current conversation.

Recommended table: `ai_coach_threads`

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `surface text not null default 'main_coach'`
- `title text null`
- `status text not null default 'active'`
- `last_message_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended table: `ai_coach_messages`

- `id uuid primary key`
- `thread_id uuid not null references ai_coach_threads(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `role text not null check (role in ('user', 'assistant', 'system'))`
- `content text not null`
- `token_estimate integer null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Retention recommendation: keep recent raw messages only, for example the latest 20-50 turns per active thread or 30-90 days. Older detail should be summarized.

### 2. Long-term compact memory summaries

Store small, typed facts and summaries the Coach can retrieve cheaply.

Recommended table: `ai_coach_memories`

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `memory_type text not null`
- `source_thread_id uuid null references ai_coach_threads(id) on delete set null`
- `summary text not null`
- `importance smallint not null default 1`
- `confidence numeric(3,2) not null default 0.70`
- `source_range jsonb not null default '{}'::jsonb`
- `consent_scope text[] not null default '{}'::text[]`
- `embedding vector(...) null` if vector search is enabled, or omit initially
- `last_used_at timestamptz null`
- `expires_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Good `memory_type` examples:

- `stable_preference` — “Prefers tiny first steps over detailed plans.”
- `recurring_friction` — “Evening habit attempts often fail because of low energy.”
- `active_commitment` — “Trying a 3-day recovery pause for ClawdBot 30 min.”
- `coach_summary` — “Last conversation focused on reducing habit effort and keeping momentum.”
- `safety_boundary` — “Avoid shame/pressure language around missed streaks.”

Bad memory examples:

- Full raw journal entries copied into memory.
- Sensitive inferred claims the user did not state.
- Exact birthday/age when only broad life-stage context is needed.
- A full transcript replayed into every future prompt.

## How to keep token cost low

The Coach should never blindly feed the whole user library into the model. Use a staged context budget:

1. **System prompt**: stable coach personality/safety/privacy rules.
2. **Conversation window**: last 6-10 turns from the active thread.
3. **Dynamic app summary**: short summaries from goals/habits/journal/check-ins that are already allowed by AI settings.
4. **Memory retrieval**: top 3-8 relevant `ai_coach_memories` by source, recency, importance, and similarity.
5. **Output contract**: assistant message plus optional structured memory updates.

A practical MVP budget:

- System prompt: 400-800 tokens.
- Recent thread: 1,000-2,000 tokens.
- Current app context summary: 500-1,200 tokens.
- Retrieved memories: 300-800 tokens.
- User message: as sent, capped.

This gives useful continuity without sending large raw datasets.

## Proposed request/response contract for a new main Coach endpoint

Add a new Edge Function, for example `supabase/functions/ai-coach-chat`.

Request:

```json
{
  "thread_id": "uuid-or-null",
  "message": "user text",
  "starter_context": "optional launch prompt/context",
  "surface": "main_coach",
  "client_context": {
    "visible_intervention_id": "optional",
    "selected_option": "optional"
  }
}
```

Server responsibilities:

1. Authenticate the user.
2. Resolve model/key through `ai_settings` and app fallback.
3. Read AI Coach access settings from user metadata or a normalized table.
4. Load or create an active thread.
5. Save the user message.
6. Build a compact context bundle from allowed data only.
7. Retrieve relevant memory summaries.
8. Call OpenAI.
9. Save the assistant message.
10. Summarize/update memories if the response produced durable signal.
11. Return assistant text and any UI actions.

Response:

```json
{
  "thread_id": "uuid",
  "assistant_message": "text",
  "memory_updates": [
    {
      "memory_type": "recurring_friction",
      "summary": "Evening habit attempts fail when energy is low.",
      "importance": 2
    }
  ],
  "suggested_actions": []
}
```

The client should not directly write Coach memory. It should only call the endpoint; the endpoint should own transcript persistence, memory extraction, and model calls.

## Recommended implementation slices

### Slice 1 — Wire the main Coach to a real endpoint

- Add `ai-coach-chat` Edge Function.
- Reuse the OpenAI credential/model lookup pattern already in `goal-coach-chat`.
- Reuse `loadAiCoachInstructions()` content conceptually, but assemble it server-side so secrets and token budgeting stay off the client.
- Keep `simulateAiResponse()` only as a local/demo fallback when the endpoint is unavailable or demo mode is active.

### Slice 2 — Persist active threads and recent messages

- Add `ai_coach_threads` and `ai_coach_messages` migrations with RLS.
- Save user/assistant turns from the Edge Function.
- Load the active thread when the Coach opens.

### Slice 3 — Add compact memory summaries

- Add `ai_coach_memories` migration with RLS.
- After every N turns or when the model returns a durable insight, summarize into short typed memories.
- Do not store raw sensitive app data as memory; store the smallest useful coaching summary.

### Slice 4 — Retrieval + prompt budget guardrails

- Retrieve top memories by recency/importance first.
- Add embeddings later only if keyword/metadata retrieval is not enough.
- Enforce max characters/tokens per context section.
- Log token estimates and endpoint errors for monitoring.

### Slice 5 — User-facing controls

- Add “Forget this chat” and “Clear Coach memory” controls.
- Show “What the Coach remembers” as a small privacy panel.
- Respect existing AI Settings access toggles when reading app data and retrieving memories.

## Important privacy/safety decisions

- AI memory should be opt-in or clearly disclosed under AI Settings.
- The user must be able to delete thread history and compact memories.
- Memories should keep provenance (`source_thread_id`, `source_range`, `consent_scope`) so future privacy controls can delete or exclude affected memories.
- If a user disables a data source, prompt assembly must stop using that source and should ignore memories whose `consent_scope` depends on that source.
- The Coach should not write gameplay, habit, goal, or journal records directly from chat. It can suggest actions or return structured proposals for the UI to confirm.

## Bottom line

The proper AI is now wired into the main Coach for live authenticated sessions, but durable Coach memory is not implemented yet. The next durable architecture is not just “call OpenAI from the modal.” It should add short-term threads, compact long-term memory summaries, privacy-scoped retrieval, and strict token budgets. That gives the user a chat that feels continuous and intelligent without sending too much context or storing too much raw private text.
