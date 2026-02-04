# Reward Object Validation (P1.1)

## Purpose
Validate the Reward object model (fields + constraints) before implementation, ensuring the schema is complete, consistent, and safe to enforce.

## Reward Object (Authoritative Shape)
```
Reward {
  id
  title
  description
  category            // Rest, Fun, Growth, Treat, Social, Meta
  cost {
    currency_type     // Gold, Tokens, Keys, Energy, RealMoney(optional)
    amount
  }
  unlock_conditions {
    min_level?
    stats_required?
    streak_required?
    time_locked?
  }
  cooldown {
    type              // none | soft | hard
    duration          // seconds
  }
  satisfaction_weight // 1–5 (self-reported, later AI-adjusted)
  reward_type         // Instant | Session | Delayed | External
  visibility          // Private | Public | Party
}
```

## Field-Level Validation Rules
### Core fields
- `title`: required, 2–80 chars, trimmed, no leading/trailing whitespace.
- `description`: optional, 0–240 chars.
- `category`: required enum of: `Rest`, `Fun`, `Growth`, `Treat`, `Social`, `Meta`.

### Cost
- `cost.currency_type`: required enum of `Gold`, `Tokens`, `Keys`, `Energy`, `RealMoney`.
- `cost.amount`: required, integer, `>= 1`.
- **Guardrail**: rewards **cannot** be `Gold`-only forever. At least one user reward must be created with `Tokens` or `Keys` before the system considers “reward set complete.”

### Unlock conditions
- `min_level`: optional integer, `>= 1`.
- `stats_required`: optional key/value map (string -> integer), each value `>= 1`.
- `streak_required`: optional integer, `>= 1`.
- `time_locked`: optional ISO date (UTC) or ISO datetime.

### Cooldown
- `cooldown.type`: required enum of `none`, `soft`, `hard`.
- `cooldown.duration`: required when `type != none`, integer seconds, `>= 3600` (1 hour minimum).
  - If `type = none`, duration should be omitted or `0`.

### Satisfaction weight
- `satisfaction_weight`: required integer between `1` and `5` (inclusive).

### Reward type
- `reward_type`: required enum of `Instant`, `Session`, `Delayed`, `External`.

### Visibility
- `visibility`: required enum of `Private`, `Public`, `Party`.

## Cross-Field Constraints
- `RealMoney` rewards must have `visibility = Private` by default (can be overridden by explicit user choice).
- If `reward_type = Session`, then `cooldown.type` must be `soft` or `hard` (not `none`).
- If `streak_required` exists, `cooldown.type` should not be `soft` (enforce `hard` or `none`).

## Implementation Notes (Non-Blocking)
- Validation should run on both client and server.
- All errors should be presented in user-friendly copy (no raw enum errors in UI).

## Status
- ✅ Model fields validated against Competition Killer spec.
- ✅ Constraints ready for data model + UI flows.
