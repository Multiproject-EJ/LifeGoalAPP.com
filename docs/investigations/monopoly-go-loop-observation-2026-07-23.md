# Monopoly GO loop observation — 2026-07-23

## Session guardrails

This is a direct observation of a live Monopoly GO session on the mirrored phone. No real-money purchase was made. GO!Chat was not opened. No invite, social-connect, message, or voluntary opponent-selection flow was used. Ordinary rolls can force a Shutdown screen; where a shield was visually identifiable, it was selected to minimise impact.

Account context during the session:

- Username: `TonicSonic`
- Net Worth at start: `7,881`
- Board: `219 — Playland Plaza`
- Dice at the start of the controlled roll study: `1,019 / 400`
- Dice at the end: `0 / 400`
- Dice after the free-reward sweep: `38 / 400`
- Dice after the free Color Wheel and temporary Roll Rush: approximately `360 / 400`
- Cash at the start of the controlled roll study: `3,992,485,400`
- Cash before building: `7,055,367,600`
- Phone battery reached 10% near the end of the session.

Evidence screenshots are stored in:

`/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/outputs/monopoly-go-research`

## Core roll loop

One roll spends the selected multiplier in dice and multiplies board rent, event progress, and side-game rewards. The session directly confirmed `×1`, `×2`, `×3`, `×5`, `×10`, `×20`, and `×50`.

Observed multiplier behaviour:

- At roughly 1,000 dice, `×50` was the maximum shown and the selector displayed “ALL REWARDS MAX.”
- The selector cycles upward and wraps back to `×1`.
- When the pool fell from 93 to 43, the game automatically reduced the active multiplier from `×50` to `×3`.
- At one remaining die, it automatically reduced to `×1`.
- At 38 dice the maximum was `×3`; at 85 it was `×5`; at 185 and 275 it was `×10`; and between 375 and 400 it was `×20`.
- Some rolls effectively refunded their cost through a side-game or immediate dice prize, so the pool occasionally stayed level or increased.
- The user separately reports a temporary “On a Roll” or High Roller state above roughly 2,500 dice where `×500` becomes available. This was not active in the observed session and should be treated as a hypothesis to verify, not as a confirmed static threshold.

The important rhythm is:

1. A large reserve unlocks higher multipliers.
2. High multipliers make cash, event bars, and prizes accelerate together.
3. Cross-loop rewards sometimes refund more dice than the triggering roll cost.
4. As the reserve shrinks, the game lowers the maximum multiplier.
5. The same board then feels slower until the player reaches zero.
6. Zero immediately presents paid and social recovery routes, with a delayed free option.

## Event progress and reward bars

### Bart Bullseye

Bart Bullseye used an explicit board-landing rule:

- Land on a Tax tile: `+4 × multiplier` bones.
- Land on a Utility tile: `+4 × multiplier` bones.

At `×3`, a qualifying landing added exactly 12 points. At `×50`, a qualifying landing could add 200 points and clear several short milestones in sequence. The collapsed board bar only showed the current numerator/denominator. Opening the card revealed:

- which tiles counted;
- the multiplier formula;
- the next visible reward;
- the current tier, for example `98 / 190` toward 225 dice.

The tier denominator changed after each claim (`0/5`, then `5/10`, later `8/50`, then `98/190`). This creates frequent early rewards and progressively longer goals without showing a daunting total at all times.

One `×50` event sequence visibly awarded:

- 75 dice;
- 17 Bart/bone event points;
- one sticker pack;
- a timed 10-minute Cash Boost.

Later Bart progress awarded seven more bone points and another sticker pack. The game chained these rewards as a short sequence of full-screen collect cards.

### Railroad Ventures

The visible free ladder advertised “GET UP TO 5,700” dice. Early visible milestones were:

- 5 points → 35 dice
- 15 points → 40 dice
- 25 points → 50 dice
- 40 points → 65 dice

The same panel contained a paid unlock at `KR 199`. It was not selected.

### Curbside Finds

Curbside Finds used yellow pencil tokens and remained at `0/30` during this session. The free path started with 35 dice and 58.6M cash, with later cash and sticker-pack rewards. A parallel premium path advertised 1,300 dice for `KR 129`. The previously observed Bart/bone rewards were therefore not Curbside entry tickets.

### Deluxe Class

Deluxe Class combined a short-lived leaderboard with a themed room. The observed account was rank 36 with 10 points. Higher placements visibly offered dice, sticker packs, cash, and tokens. “View Class” opened the room and showed a “Reach 130 to upgrade” goal. No paid or social action was taken.

## Side-game variety

Two lightweight side-games appeared naturally during rolling.

### Roll Doubles

A Chance landing opened “Roll Doubles”:

- three attempts;
- one tap per attempt;
- reward expressed as dice at the current `×50`;
- the second attempt succeeded;
- the side-game did not require another explanation modal or a separate currency.

The reward effectively refunded the triggering roll, keeping the dice pool level.

### The Simpsons RUN!

Another landing opened a one-screen chase:

- the rule was shown as a cat-to-bone pictogram;
- the current reward multiplier stayed visible (`×3` in the first run and `×20` in a later run);
- two taps advanced Marge to the finish;
- each successful step awarded three Bart bones;
- the side-game did not spend additional dice beyond the triggering board roll.

These side-games change the immediate objective while keeping the same tap/roll vocabulary and the same reward economy. This is a strong reference for Fortune Engine chamber variety.

## Dice recovery and purchase pressure

At `0 / 400`, a “KEEP ROLLING!” screen appeared immediately:

- 725 dice for `KR 39`
- 1,500 dice for `KR 59`
- 2,500 dice for `KR 99`
- free alternative in smaller text: wait about 49 minutes for 40 rolls

Closing it immediately produced a friend-invite screen with visible dice milestones (70, 100, and 200). Invite and Facebook Connect were not selected.

Zero was not the true end of the free economy. Two red-dot surfaces held recoverable rewards:

### Quick Wins

The three already-completed daily tasks were:

- Pass GO once
- Land on Chance once
- Land on Utility once

Claiming them yielded:

- 20 dice
- 337M cash (44M task reward plus a 293M weekly-track milestone)
- 12 Bart bones
- 12 weekly Quick Wins points (3 + 4 + 5)
- one new one-star “Art Attack” album sticker

The weekly bar was on Day 4 of 7 and visibly contained additional cash, sticker packs, 100 dice, and a final pink pack. The daily claims therefore advanced at least four loops at once: dice recovery, event progress, building cash, and album completion.

### Shop free gift

The Shop red dot led to a rapidly rotating carousel containing both paid bundles and a “FREE!” gift. The free card awarded:

- 18 dice
- 2 Bart bones

The card displayed a refresh timer of roughly eight hours. The carousel can rotate a paid offer beneath the pointer between inspection and tap; two App Store sheets were cancelled without confirming a purchase before the free card was targeted safely.

### Color Wheel and Roll Rush

At 38 dice, a normal `×3` roll opened a Color Wheel. The free wheel awarded 50 dice, taking the balance from 35 to 85 without a purchase. Soon afterward a clearly timed “Roll Rush” began:

- it granted 100 dice every minute;
- it lasted about ten minutes;
- the normal visible storage cap remained 400;
- it raised the maximum multiplier progressively from `×5` through `×10` to `×20`;
- the session ended near 360/400 when the phone disconnected with roughly 2 minutes 20 seconds remaining.

This is a temporary catch-up/acceleration event, not evidence of the account's ordinary regeneration rate. The base refill amount and cadence at Net Worth 7,903 still need a clean observation outside any timed boost.

During the rush, a `×20` Bank Heist paid 1.304B cash, one Springfield Monorail progression reward granted five event tokens, and a forced Shutdown resolved against a shield for 291M. One event pickup displayed `×19` and effectively returned 19 dice after a 20-dice roll. Bart Bullseye advanced in visible 20-point steps, reinforcing that the multiplier accelerates several loops at once.

Other observed paid prompts:

- Sofa Fortunes: 1,200 dice, sticker packs, and a 10-minute boost for `KR 59`
- Railroad Ventures premium path: `KR 199`
- Curbside Finds premium path: 1,300 dice for `KR 129`
- Insufficient building cash: 337M cash for `KR 59`

The building offer was contextual. The player had 202M, the cheapest next upgrade cost 458M, and the offer supplied 337M—enough to cross the shortfall with a small surplus.

## Building and board progression

Playland Plaza used five landmarks and 30 total construction pips.

Initial damaged-landmark repair costs:

- 27.5M
- 36.6M
- 45.8M
- 54.9M
- 67.1M

Repairing all five:

- moved board progress from `0/30` to `5/30`;
- increased Net Worth by one point per repair;
- converted “FIX” cards into normal upgrade cards.

Observed intact upgrade tiers:

| Board progress | Five visible costs |
| --- | --- |
| 5/30 | 168M, 244M, 305M, 381M, 458M |
| 10/30 | 214M, 320M, 397M, 503M, 610M |
| 15/30 | 275M, 427M, 519M, 656M, 793M |
| 20/30 | 351M, 564M, 671M, 838M, 976M |

Cash initially ran out at `21/30`; Net Worth reached `7,902`. Quick Wins then supplied enough free cash for exactly one more 458M upgrade, moving the board to `22/30`, Net Worth to `7,903`, and cash down to 81.467M. The next board was not unlocked. The map confirmed the current board as 219, Playland Plaza, and the preceding board as 218, Krustyland Alien Invasion.

## Album loop

The Simpsons album showed:

- `94 / 189` stickers;
- 6 days 2 hours remaining;
- headline completion prize of 15,000 dice, a token, and 35.5B cash.

Several early sets were complete. A nearly complete “Property of Ned Flanders” set was `8/9` and showed:

- one missing two-star sticker (“Let’s Go”);
- duplicate counts on several owned cards (`+1`, `+6`, `+5`);
- a set-completion reward of 417M cash plus a pack/reward icon.

A separate bonus set was entirely empty and used higher-rarity cards. The album therefore operates as a long-duration collection layer that converts ordinary sticker-pack drops into both near-term set completions and an aspirational headline jackpot.

## “On a Roll” requirement for HabitGame

The user’s reported high-reserve state should be modelled as a deliberate momentum phase, but not as hidden manipulation of outcomes.

Recommended rules:

- Make “On a Roll” an explicit state with a visible meter and start/end conditions.
- Let reserve size unlock multiplier ceilings; keep the thresholds deterministic and testable.
- During momentum, reduce interruption frequency:
  - batch adjacent milestone claims;
  - defer non-critical explanations;
  - avoid consecutive modal decisions;
  - favour fast reaction/memory chambers;
  - keep a small persistent reward bar visible instead of opening it repeatedly.
- Preserve fair landing and win probabilities. If some surfaces should appear less often during momentum, implement that as a disclosed encounter-cooldown or modal-suppression rule rather than secretly changing reward RNG.
- Taper the multiplier ceiling as the reserve falls so the player experiences a readable deceleration rather than a sudden hard stop.
- At zero, lead with the free recovery timer and next earnable source before any store action. Paid offers may remain available but should not visually obscure the free path.

The current Island Run multiplier service already unlocks `×100` at 1,000 dice and `×200` at 2,000 dice, but it has no `×500` tier. That gap should be evaluated with the existing economy-safety simulator before changing the canonical multiplier ladder.

### Guaranteed first-rush placement

The first full rush should be a deterministic progression beat immediately after Island 5, not a lucky random outcome:

1. Island 5 remains the visible mini-milestone and Treasure Path introduction.
2. Completing Island 5 unlocks a one-time Island 6 “On a Roll” runway.
3. The runway tops the player up to a target reserve rather than blindly adding a fixed amount. Proposed first simulation target: 2,500 dice.
4. The runway temporarily exposes `×500` and suppresses non-critical modals.
5. Every `×500` roll fills a separate, always-visible Rush meter regardless of landing tile. This guarantees progress without rigging board RNG.
6. The third qualifying Rush roll opens a 2,000-dice headline reward. Starting from 2,500, the first three rolls spend 1,500 and the prize lifts the reserve back to roughly 3,000 before ordinary rewards, producing the desired second acceleration.
7. The boost then expires after a bounded number of qualifying rolls or when the pool falls below a tested reserve threshold. The canonical multiplier ladder tapers automatically from there.
8. Island 7 supplies a smaller confirmation burst so the first rush does not feel like an isolated tutorial trick.

This should be guaranteed by persisted claim/run counters, not by probability. If the player leaves mid-run, the unused qualifying rolls should survive for a bounded window. If the player has already accumulated more than the target reserve, no top-up is needed; the unlock and guaranteed Rush prize still apply.

Acceptance criteria before wiring it into canonical state:

- 100% of eligible players encounter the first rush before starting Island 7.
- 100% can reach the 2,000-dice Rush prize through a fixed number of qualifying rolls.
- no more than one blocking decision modal appears during the peak window;
- paid offers are suppressed during the first guaranteed peak;
- reward RNG remains unchanged and auditable;
- the integrated economy simulator still burns down after the bounded Rush grant and all one-time rewards;
- the experience remains idempotent across refresh/retry and cannot double-grant the top-up or 2,000-dice prize.

## Fortune Engine implications

The revised Fortune Engine should:

- keep the next exact dice prize and secured/at-risk progress visible during play;
- start the event ladder at 50 dice and culminate at a very difficult 2,000-dice prize;
- use three distinct chamber rules per run (timing, memory, and target matching);
- keep microgame instructions to one sentence or a pictogram;
- use one continuous play surface where possible;
- reserve the bank/risk decision for meaningful checkpoints;
- make “Bank” explicit: it adds run points to the event track and ends the run;
- label claims “Open reward,” not “Collect prizes” or “Collect now”;
- batch chained rewards so momentum is not interrupted by several difficult dialogs.

## Screenshot index

Key files:

- `02-pre-roll-1019-dice.jpg` — starting reserve
- `04-bart-bar-5-of-10-x2.jpg` — early rolling milestone
- `07-x50-cross-loop-reward-75-dice-17-tokens.jpg` — cross-loop reward bundle
- `12-curbside-free-vs-paid-track-0-of-30.jpg` — free/premium event paths
- `16-bart-bullseye-rule-4x-multiplier-98-of-190.jpg` — tile rule and exact bar
- `19-chance-roll-doubles-minigame.jpg` — reaction side-game
- `21-simpsons-run-minigame-x3.jpg` — chase side-game
- `22-zero-dice-purchase-wall.jpg` — zero-dice conversion prompt
- `23-zero-dice-invite-friends-pressure.jpg` — social recovery prompt, not used
- `24-build-playland-plaza-0-of-30.jpg` — initial repair costs
- `25-building-cost-escalation-20-of-30.jpg` — late build costs
- `26-insufficient-cash-contextual-offer.jpg` — contextual cash offer
- `27-album-94-of-189-15000-dice-prize.jpg` — album jackpot
- `28-album-missing-one-sticker-duplicates.jpg` — missing/duplicate set structure
- `29-quick-wins-three-free-claims.jpg` — three completed daily tasks
- `31-quick-win-two-20-dice-4-bones.jpg` — free dice recovery
- `32-quick-wins-weekly-milestone-293m.jpg` — weekly cash milestone
- `34-quick-win-new-sticker-art-attack.jpg` — new album sticker from Quick Wins
- `35-shop-carousel-free-gift.jpg` — rotating Shop free-gift card
- `36-shop-free-gift-18-dice-2-bones.jpg` — free Shop payout
- `37-quick-wins-cash-feeds-build-22-of-30.jpg` — free cash converted into board progress
