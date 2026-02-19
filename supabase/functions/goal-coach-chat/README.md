# Goal Coach Chat Edge Function

Multi-turn goal coaching endpoint with optional structured goal draft finalization.

## Endpoint

`POST /functions/v1/goal-coach-chat`

## Request

```json
{
  "messages": [
    { "role": "user", "content": "I want better fitness consistency" }
  ],
  "context": {
    "life_wheel_category": "health_fitness",
    "personality_summary": "prefers small steps",
    "existing_goals": ["Run 5k"],
    "ai_access": { "goalEvolution": false }
  },
  "finalize": false
}
```

## Response

```json
{
  "assistant_message": "Great direction. What target date feels realistic?",
  "draft_goal": null
}
```

When ready to finalize, `draft_goal` may be returned:

```json
{
  "assistant_message": "Here is a first draft.",
  "draft_goal": {
    "title": "Build a sustainable 4-day fitness routine",
    "description": "...",
    "life_wheel_category": "health_fitness",
    "target_date": "2026-05-30",
    "status_tag": "active",
    "milestones": ["Finish month 1 consistency"],
    "tasks": ["Schedule workouts for this week"]
  }
}
```

## Notes

- Auth required (`Authorization: Bearer <jwt>`).
- Uses `ai_settings` user override for OpenAI model/key when available.
- Falls back gracefully when model output is malformed (`draft_goal: null`).


## Behavior guardrails

- Message history is normalized and truncated to recent turns for reliability.
- Message content is length-limited before model call.
- `finalize: true` nudges the model to return a concrete `draft_goal` when possible.
- If JSON parsing fails or schema fields are incomplete, the function returns a safe coaching fallback and `draft_goal: null`.
