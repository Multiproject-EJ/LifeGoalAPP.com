# Proposal: Move Custom Rewards from Player Shop into Contracts

## Problem statement

Custom rewards currently live in the Player Shop (Score tab) and are redeemed by spending Gold.
That creates a mixed mental model:

- **Shop loop**: spend currency to buy things.
- **Behavior loop**: finish commitments and earn meaningful, real-life rewards.

For contract-driven behavior change, rewards fit better as a **contract outcome** than a separate shop purchase.

## Current product behavior (as implemented)

- Custom rewards are created in Score tab with:
  - title, optional description
  - category (Rest/Fun/Growth/Treat/Social/Meta)
  - **Gold cost**
  - cooldown (none/daily/custom)
- Redeeming a reward:
  - checks affordability
  - subtracts Gold from profile
  - logs redemption history
- Contracts are stake-based:
  - use Gold or Tokens stake type
  - validate stake size against balance and cap
  - forfeit stake on misses, grant bonus on success

## Product-direction recommendation

## 1) Keep two separate concepts: **Stake** and **Reward**

A contract should have both:

- **Stake (risk)**: what you lose if you miss.
- **Reward (upside)**: what you get when you complete.

This aligns with your idea and makes contracts feel complete and emotionally meaningful.

## 2) Move custom reward authoring to the Contracts flow

Add reward selection in Contract Wizard:

- **No reward** (default for lightweight contracts)
- **Attach existing custom reward**
- **Create new custom reward inline**

This makes reward creation contextual to the commitment.

## 3) Replace “Gold cost” for contract-attached rewards

For rewards attached to contracts, do **not** deduct Gold on redeem.
Use completion eligibility instead:

- contract completion unlocks reward claim
- optional cooldown still applies
- reward history shows “earned from contract”, not “bought with gold”

## 4) Keep a small optional “Gold bonus” channel (separate from custom rewards)

If you still want Gold as motivation:

- treat Gold bonus as a **bounded system reward**, not user-entered unlimited amount
- cap by contract difficulty/tier/duration
- only grant once per completed window or completion milestone

## Anti-gaming guardrails (important)

If any economy reward (Gold/Tokens/XP) is attached to contracts, add guardrails:

1. **Minimum contract duration** for economy bonuses (e.g., 7+ days).
2. **Difficulty gate**: payout scales with targetCount, cadence, adherence history, and contract tier.
3. **Diminishing returns** on repeated identical short contracts.
4. **Daily/weekly bonus caps** per user.
5. **Anti-loop lockout**: cannot repeatedly cancel/recreate same easy contract for payout.
6. **Outcome validation** preference for risky payout modes (e.g., stronger checks for outcome-only).

## Suggested UX model

Contract setup card:

- Stake: `Gold / Tokens / None`
- Reward:
  - `None`
  - `Custom life reward` (free claim on success)
  - `Gold bonus` (system-calculated, capped)

Contract result modal:

- On success:
  - show stake return/bonus as today
  - show reward unlock CTA (e.g., “Claim: Weekend getaway planning session”)
- On miss:
  - show forfeiture and recovery options

## Data model sketch (minimal)

Add contract reward fields:

- `reward_mode`: `none | custom_reward | economy_bonus`
- `linked_reward_id`: nullable (for custom reward)
- `reward_unlocked_at`: nullable timestamp
- `reward_claimed_at`: nullable timestamp
- `economy_bonus_amount`: integer nullable (server-computed)

Potentially add reward source metadata in redemptions:

- `source_type`: `shop | contract`
- `source_contract_id`: nullable

## Migration strategy (low-risk)

1. **Phase 1 (additive):**
   - keep current shop rewards working
   - add optional contract-linked rewards
2. **Phase 2 (behavior shift):**
   - hide Gold cost when creating rewards inside contracts
   - label shop rewards as “legacy redeem-with-gold rewards”
3. **Phase 3 (cleanup):**
   - de-emphasize/remove standalone reward shop entry
   - keep reward history unified

## Recommendation in one line

Yes—moving custom rewards into Contracts is a strong UX and behavior-design improvement, as long as you keep stake and reward separate and place strict caps/anti-gaming logic on any economy payouts.
