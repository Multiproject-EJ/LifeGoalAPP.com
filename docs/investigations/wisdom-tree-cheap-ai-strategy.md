# Wisdom Tree Cheap AI Strategy Investigation

## Cost confidence

**PASS if generation is bundled, cached, and scarce. FAIL if generation is live per tile or chat-based.**

Wisdom Tree can be cheap at scale if Free is mostly handcrafted and Pro uses cached bundles. It becomes expensive and risky if AI is called during frequent gameplay loops.

## Existing cost-control assets

### Reusable

- `src/services/aiTaskRouting.ts`
  - Central task registry with `level_1` and `level_2`.
  - Model routing differs by free/premium tier.
- `src/services/aiQuotaService.ts`
  - Local daily/session quotas.
  - Free limits currently cap level 1 and level 2 calls.
- `src/services/aiEntitlementService.ts`
  - Resolves premium/free/fallback mode.
  - Emits quota and fallback events.
- `src/services/habitAiSuggestions.ts`
  - Uses a short timeout, strict max tokens, JSON output, and fallback generation.
- `src/services/environmentAiSuggestions.ts`
  - Generates exactly 3 ideas, short max token budget, and local fallback.
- `supabase/functions/goal-coach-chat/index.ts`
  - Caps message count and text length.
  - Authenticates user before calling OpenAI.
- `supabase/functions/suggest-goal/index.ts`
  - Authenticates user, resolves user/app OpenAI key, and requests JSON output.

### Not enough on their own

- Existing quotas are client-side localStorage/sessionStorage only.
- Client-side direct OpenAI calls expose the cost-control decision to the browser.
- For app-funded Wisdom Tree generation, cost caps should be enforced server-side.

## AI cost risks

### High-risk patterns

1. AI call on every tile landing.
2. AI call on every roll.
3. AI call every time the modal opens.
4. Infinite back-and-forth chat.
5. Regenerating cards when a player dislikes a card.
6. Calling AI separately for title, body, choices, and future-self text.
7. Sending raw journals or long histories in every prompt.

### Lower-risk patterns

1. Weekly user bundle.
2. Daily small bundle.
3. Per-island-band bundle.
4. Server cache keyed by user, period, category mix, and prompt version.
5. Local template assembly with small personalization slots.
6. Handcrafted Free cards.
7. Pro-only richer generated text with hard caps.

## Recommended hybrid architecture

### Layer 1 — Static library

Create a handcrafted card library:

- 6 categories.
- 20–40 cards per category.
- Each card has:
  - title
  - one-line story
  - 2–3 choices
  - optional tiny action
  - safe fallback wording

This powers Free and acts as fallback for Pro.

### Layer 2 — Template interpolation

Use low-risk slots:

- `{goal_area}`
- `{habit_title}`
- `{island_name}`
- `{category_symbol}`
- `{tiny_action}`

Example shape:

- “A small lantern glows near your {goal_area} path. Which step feels kind today?”

Rules:

- Never insert long raw journal text.
- Trim habit/goal titles.
- If context is missing, use generic fantasy text.

### Layer 3 — Cached AI bundles

For Pro or limited experiments:

- Generate a bundle, not a single card.
- Bundle examples:
  - 12 cards for the week.
  - 6 future-self notes for the week.
  - 3 cards for the current island band.
- Cache by:
  - user id
  - week key or day key
  - prompt version
  - context hash
  - tier

### Layer 4 — Local assembly

During gameplay:

- Select a cached card locally.
- Shuffle choices locally.
- Apply deterministic seed from island number and day key.
- Never block gameplay on generation.

## Where AI generation should happen

### Recommended

Use a Supabase Edge Function for app-funded generation.

Why:

- Existing functions already authenticate users.
- Server can enforce quotas and cache writes.
- Server can avoid exposing app-funded keys.
- Server can trim and normalize context.

Existing models to follow:

- Auth + OpenAI fallback key pattern:
  - `supabase/functions/suggest-goal/index.ts`
  - `supabase/functions/goal-coach-chat/index.ts`
- JSON response parsing/normalization:
  - `supabase/functions/suggest-goal/index.ts`
- Context trimming:
  - `supabase/functions/goal-coach-chat/index.ts`

### Not recommended

Do not use direct browser OpenAI calls for Wisdom Tree app-funded generation.

Reason:

- It is harder to enforce server-side rate limits.
- It is easier to accidentally call repeatedly from UI loops.
- It ties gameplay responsiveness to network generation.

## Caching and pre-generation ideas

### Free

- No AI generation needed.
- Use static card library + local deterministic selection.
- Optional very light template personalization.
- Cache selected card in component/session state only.

### Pro

- Generate weekly bundles.
- Refresh at most once per week unless context changes meaningfully.
- Allow a small daily mini-bundle only if weekly bundle is empty or stale.
- Store generated cards in a future dedicated non-gameplay cache table, not Island Run runtime state.

### Suggested cache record shape for future design

No migration is proposed in this investigation, but a future cache should be separate from gameplay:

- `user_id`
- `period_key`
- `prompt_version`
- `context_hash`
- `tier`
- `cards_json`
- `created_at`
- `expires_at`

Do not store:

- raw full journal content
- clinical labels
- dice/reward state
- sensitive diagnosis-like fields

## Pacing limits

Recommended caps:

### Free

- 1 Wisdom Landmark card per island.
- Optional rare encounter card at most once per day.
- No regeneration button.
- No chat.

### Pro

- 1 Wisdom Landmark card per island.
- Up to 1 extra “Future Self note” per day.
- Weekly bundle refresh.
- Manual refresh max 1 per day, if offered at all.

### Global gameplay protection

- No AI while roll animation is active.
- No AI on reward-bar claim.
- No AI on boss win.
- No AI on every encounter tile.
- If no cached card exists, use handcrafted fallback immediately.

## Anti-spam protections

### Product protections

- Scarcity makes cards feel meaningful.
- No “generate again forever” button.
- “Draw another card tomorrow” is better than “Try again.”
- Reuse already drawn cards for the same island/day.

### Technical protections

- Server-side quota table or function-level rate limit in a future implementation.
- Cache first, generate second.
- Context hash dedupe.
- Idempotency key per user/period/prompt version.
- Short max tokens.
- JSON schema validation.
- Fallback to static cards on error.

## Prompt-size strategy

Use tiny context:

- Current goal category or one active goal title.
- 1–3 active habit titles.
- Recent chosen card categories.
- Optional personality summary if the user has enabled it.

Avoid:

- Full journal history.
- Long chat logs.
- Full habit logs.
- Any diagnosis-like inference.

## Free vs Pro architecture

### Free architecture

- Static cards.
- Deterministic local selection.
- Local template interpolation.
- Existing preview/gating systems can advertise richer Pro personalization later.
- Operational AI cost: near zero.

### Pro architecture

- Edge Function generates card bundles.
- Store cached bundle in future dedicated cache.
- Use billing entitlement from:
  - `src/services/billing.ts`
  - `supabase/migrations/0213_billing_and_wallet_foundation.sql`
- Use AI task routing/entitlement concepts from:
  - `src/services/aiTaskRouting.ts`
  - `src/services/aiEntitlementService.ts`
- Operational AI cost: low to medium if capped weekly/daily.

## Estimated operational cost risk

| Architecture | Cost risk | Notes |
|---|---:|---|
| Static Free cards | Very low | No AI calls |
| Free templates with local context | Very low | No AI calls |
| Pro weekly bundle | Low | One bundled generation per user/week |
| Pro daily small bundle | Medium | Bounded but more frequent |
| Per-island generation | Medium-high | Could scale with heavy play |
| Per-encounter generation | High | Tied to gameplay loop |
| Infinite chat | Very high | Unbounded sessions and long context |

## Recommended Phase 1 AI posture

Do not use live AI in Phase 1.

Phase 1 should prove:

- The Wisdom Tree feels good.
- Players understand symbolic choices.
- Reflection does not feel invasive.
- Island Run pacing remains intact.
- Journal save is optional and safe.

Only after that should Pro cached bundles be considered.

## Final recommendation

Use this order:

1. Handcrafted cards.
2. Template personalization.
3. Cached generated Pro bundles.
4. Future dedicated cache table and server-side quotas.
5. Never add infinite chat or per-tile live generation.
