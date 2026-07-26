# Foundation Test v2 — 20 Scenario Questions (content draft)

_Status: **draft for review**. No code changes. Nothing here is wired up yet._

## What this is

A replacement for the 28-item Likert foundation test. It answers three product goals:

1. **≤ 20 questions.**
2. **Habit-game categorisation, not a personality type.** The card the player sees describes
   *how they play*, not what psychological type they are.
3. **Situational self-report** — "how I'd act in situations" — rather than trait adjectives
   ("I am the life of the party").

## The core design decision: dual scoring

Each answer scores onto **two** things at once:

- a **game axis** (user-facing — this is the card), and
- one or more **existing trait/axis dimensions** (internal — everything downstream keeps working).

This matters because `PersonalityScores` / `TraitKey` is consumed by **19 files**: the 32-card
archetype deck, journal guided templates, avatar unlocks, recommendations, the Compass Book
shadow/values bridges, and the dashboard. Replacing Big Five internally would mean rewriting all
of that for zero user-visible gain.

So: **Big Five stays as the substrate; the game axes become the presentation.** One scenario
answer feeds both.

Scoring reuses the existing maths — each option carries 1–5 loads per dimension, averaged per
dimension, then `normalizeAverageToPercent`. No new scoring engine.

## The six game axes

An axis only earns its place if the app *does something different* because of it.

| Axis | Reads as | Drives | Trait substrate |
|---|---|---|---|
| **Planner ↔ Improviser** | How you set things up | Scheduling, quest setup, reminder style | `regulation_style`, conscientiousness |
| **Sprinter ↔ Marathoner** | Your pace | Goal sizing, streak targets, intensity of asks | conscientiousness, `stress_response` |
| **Solo ↔ Co-op** | Who's involved | Accountability, sharing, social prompts | extraversion, agreeableness |
| **Explorer ↔ Consolidator** | Variety vs. routine | Whether to suggest new habits or reinforce | openness |
| **Bounce-back ↔ Spiral** | What a miss does to you | Streak-break recovery flow, tone after a miss | `stress_response`, emotional_stability |
| **Mastery ↔ Reward** | What actually motivates you | Which incentives/treats to surface | `identity_sensitivity`, agreeableness |

**Bounce-back ↔ Spiral is the one nothing currently measures**, and it's arguably the most
important axis in a habit app.

## Writing rules used

- **Concrete but domain-neutral** — situations about time, plans, people and setbacks, never
  gym/office/parenting specifics, so they land regardless of the player's life shape.
- **No option is the "right" one.** Every option is a legitimate way to be. This is what keeps
  self-report honest.
- **No double-barrelled options**, no idioms, no jargon.
- **Realism framing** ("Realistically?", "Honestly?") to pull answers toward behaviour rather
  than aspiration.

---

## The 20 questions

Notation: `AXIS n` = contribution to that game axis (1–5). Trait loads in `code`.

### Planner ↔ Improviser (4)

**1. It's Sunday evening and the week ahead is wide open. What actually happens?**
- A — I map the week out: what happens when, more or less. · PLAN 5 · `regulation_style 5` `conscientiousness 5`
- B — I pick two or three things that matter and leave the rest loose. · PLAN 4 · `regulation_style 4` `conscientiousness 4`
- C — I have a rough sense of it in my head, nothing written down. · PLAN 2 · `regulation_style 2` `conscientiousness 3`
- D — I'll deal with the week as it comes at me. · PLAN 1 · `regulation_style 1` `conscientiousness 2`

**2. There's a new habit you want to build. How do you actually start?**
- A — Pick a fixed time and put it in the calendar. · PLAN 5 · `regulation_style 5` `conscientiousness 5`
- B — Attach it to something I already do every day. · PLAN 4 · `regulation_style 4` `conscientiousness 4`
- C — Just start today and see how it fits. · PLAN 2 · `cognitive_entry 1` `conscientiousness 3`
- D — Read up on it properly first, then begin. · PLAN 3 · `cognitive_entry 5` `conscientiousness 4`

**3. Your plan for the evening collides with a better offer. Realistically?**
- A — Stick to the plan. I said I'd do it. · PLAN 5 · `conscientiousness 5` `regulation_style 4`
- B — Take the offer, and move the plan to another slot. · PLAN 3 · `conscientiousness 4` `regulation_style 3`
- C — Take the offer. The plan can wait. · PLAN 2 · `conscientiousness 2` `regulation_style 2`
- D — Take the offer, then feel bad about the plan all evening. · PLAN 3 · `emotional_stability 2` `identity_sensitivity 4`

**4. What does your to-do list actually look like?**
- A — One list, in order, and I work down it. · PLAN 5 · `regulation_style 5` `conscientiousness 5`
- B — A few lists in different places, mostly current. · PLAN 3 · `regulation_style 3` `conscientiousness 3`
- C — It lives in my head. · PLAN 2 · `regulation_style 2` `conscientiousness 2`
- D — I write lists enthusiastically and then ignore them. · PLAN 2 · `regulation_style 2` `conscientiousness 2` `openness 4`

### Bounce-back ↔ Spiral (4)

**5. You're twelve days into a streak and you miss a day. The next morning you…**
- A — Pick it straight back up. One day is one day. · BOUNCE 5 · `stress_response 5` `emotional_stability 5`
- B — Start again, though it stings for a bit. · BOUNCE 4 · `stress_response 4` `emotional_stability 4`
- C — Feel like it's ruined, and lose momentum for a few days. · BOUNCE 2 · `stress_response 2` `emotional_stability 2`
- D — Quietly stop, and don't come back to it for a long while. · BOUNCE 1 · `stress_response 1` `emotional_stability 2`

**6. Something goes wrong that wasn't your fault. Your first reaction?**
- A — Work out what to do next. · BOUNCE 5 · `stress_response 5` `emotional_stability 5`
- B — Vent about it for a minute, then deal with it. · BOUNCE 4 · `stress_response 4` `emotional_stability 4` `extraversion 4`
- C — Replay it for a while before I can move on. · BOUNCE 2 · `stress_response 2` `emotional_stability 2`
- D — It colours the rest of my day. · BOUNCE 1 · `stress_response 1` `emotional_stability 1`

**7. Real pressure — a deadline, too much at once. What happens to you?**
- A — I get sharper. Pressure focuses me. · BOUNCE 5 · `stress_response 5` `emotional_stability 5`
- B — I cope, but I get short with people. · BOUNCE 3 · `stress_response 3` `agreeableness 2` `emotional_stability 3`
- C — I stall, and struggle to start anything at all. · BOUNCE 2 · `stress_response 2` `emotional_stability 2`
- D — I keep going, and pay for it afterwards. · BOUNCE 3 · `stress_response 3` `emotional_stability 3`

**8. Someone criticises something you worked hard on. Honestly?**
- A — Useful. Tell me more. · BOUNCE 5 · `stress_response 5` `openness 5` `identity_sensitivity 2`
- B — I take it on board, but it lands personally. · BOUNCE 3 · `stress_response 3` `identity_sensitivity 4`
- C — I defend it first, and reconsider later. · BOUNCE 3 · `agreeableness 2` `identity_sensitivity 4`
- D — It knocks me off the thing for a while. · BOUNCE 2 · `stress_response 2` `emotional_stability 2` `identity_sensitivity 5`

### Solo ↔ Co-op (3)

**9. You've set yourself a goal that matters. Who knows about it?**
- A — I've told people. Being watched keeps me honest. · COOP 5 · `extraversion 5`
- B — One or two people I trust. · COOP 4 · `extraversion 3` `agreeableness 4`
- C — Nobody yet. I'll show them the result. · COOP 2 · `extraversion 2`
- D — Nobody, ever. It's mine. · COOP 1 · `extraversion 1`

**10. A hard week is over. What actually refills you?**
- A — Being around people. · COOP 5 · `extraversion 5`
- B — A couple of close people, nothing loud. · COOP 4 · `extraversion 3` `agreeableness 4`
- C — Time on my own, doing my own thing. · COOP 2 · `extraversion 2`
- D — Proper solitude for a while. · COOP 1 · `extraversion 1`

**11. You're stuck on something. What's the move?**
- A — Talk it through with someone. · COOP 5 · `extraversion 5` `agreeableness 4`
- B — Ask someone who's already done it. · COOP 4 · `extraversion 4` `agreeableness 4` `cognitive_entry 4`
- C — Work at it myself until it cracks. · COOP 2 · `extraversion 2` `conscientiousness 4`
- D — Leave it, and let it solve itself in the background. · COOP 2 · `extraversion 2` `openness 4`

### Explorer ↔ Consolidator (3)

**12. A routine has been working well for six weeks. You…**
- A — Keep it exactly as it is. It's working. · EXPLORE 1 · `openness 2` `conscientiousness 5`
- B — Keep the core, adjust the edges. · EXPLORE 3 · `openness 3` `conscientiousness 4`
- C — Start getting restless and want to change something. · EXPLORE 4 · `openness 4`
- D — Have already swapped it for something new. · EXPLORE 5 · `openness 5` `conscientiousness 2`

**13. A free evening, nothing owed to anyone. What's tempting?**
- A — Something I've never done before. · EXPLORE 5 · `openness 5`
- B — Something I love that I haven't done in ages. · EXPLORE 3 · `openness 3`
- C — My usual thing. It's my usual thing for a reason. · EXPLORE 1 · `openness 2`
- D — Depends who's around. · EXPLORE 3 · `extraversion 4`

**14. A new method could improve how you do something. You…**
- A — Try it straight away. · EXPLORE 5 · `openness 5` `cognitive_entry 1`
- B — Look into it properly, then decide. · EXPLORE 3 · `openness 4` `cognitive_entry 5`
- C — Wait and see whether it sticks for other people. · EXPLORE 2 · `openness 2`
- D — Stay with what I know works. · EXPLORE 1 · `openness 1`

### Sprinter ↔ Marathoner (3)

**15. A big goal, three months out. How do you go at it?**
- A — Hard and fast up front, then coast. · SPRINT 5 · `conscientiousness 3` `stress_response 4`
- B — In intense bursts, whenever I have the energy. · SPRINT 4 · `conscientiousness 3`
- C — A steady amount, most days. · SPRINT 1 · `conscientiousness 5` `regulation_style 4`
- D — Steady, with a real push near the deadline. · SPRINT 3 · `conscientiousness 4`

**16. How ambitious is the version of a habit you actually commit to?**
- A — Ambitious. I'd rather aim high and miss. · SPRINT 5 · `conscientiousness 3`
- B — A bit more than comfortable. · SPRINT 4 · `conscientiousness 4`
- C — Small enough that I'll definitely do it. · SPRINT 1 · `conscientiousness 5` `regulation_style 4`
- D — Whatever I can manage that day. · SPRINT 2 · `regulation_style 1` `conscientiousness 2`

**17. Two weeks of going hard. You notice you're running low. You…**
- A — Push through. Momentum matters more. · SPRINT 5 · `stress_response 3` `conscientiousness 4`
- B — Deliberately ease off, then pick it back up. · SPRINT 2 · `stress_response 5` `conscientiousness 4`
- C — Keep going until something forces me to stop. · SPRINT 5 · `stress_response 2` `emotional_stability 2`
- D — Drop it altogether, and feel guilty about it. · SPRINT 3 · `stress_response 2` `emotional_stability 2`

### Mastery ↔ Reward (3)

**18. You finish something genuinely difficult. What feels good about it?**
- A — Knowing I can do it now. · MASTERY 5 · `identity_sensitivity 4` `openness 4`
- B — That the thing exists at all. · MASTERY 4 · `openness 4`
- C — People noticing. · MASTERY 1 · `extraversion 4` `identity_sensitivity 4`
- D — Ticking it off, and the reward I promised myself. · MASTERY 2 · `conscientiousness 4`

**19. Which of these would keep you going the longest?**
- A — Visibly getting better at it. · MASTERY 5 · `identity_sensitivity 4`
- B — A streak I don't want to break. · MASTERY 3 · `conscientiousness 5`
- C — Points, badges, things to unlock. · MASTERY 1 · —
- D — Someone counting on me. · MASTERY 2 · `agreeableness 5` `extraversion 4`

**20. Why this goal, honestly?**
- A — It's who I want to become. · MASTERY 5 · `identity_sensitivity 5`
- B — It genuinely interests me. · MASTERY 4 · `openness 5`
- C — I don't like how things are right now. · MASTERY 3 · `emotional_stability 2`
- D — Someone or something else expects it of me. · MASTERY 1 · `agreeableness 4` `identity_sensitivity 2`

---

## Dimension coverage

Every dimension the deck and downstream features rely on is carried by at least **5 scored
options** (`cognitive_entry`, the thinnest) and most by 15–30 — better than v1 despite 8 fewer
questions, because each answer loads several dimensions at once.

| Dimension | Questions touching it |
|---|---|
| `openness` | 4, 8, 11, 12, 13, 14, 18, 20 |
| `conscientiousness` | 1, 2, 3, 4, 11, 12, 15, 16, 17, 18, 19 |
| `extraversion` | 6, 9, 10, 11, 13, 18, 19 |
| `agreeableness` | 7, 8, 9, 10, 11, 19, 20 |
| `emotional_stability` | 3, 5, 6, 7, 8, 17, 20 |
| `regulation_style` | 1, 2, 3, 4, 15, 16 |
| `stress_response` | 5, 6, 7, 8, 15, 17 |
| `identity_sensitivity` | 3, 8, 18, 19, 20 |
| `cognitive_entry` | 2, 11, 14 |

`honesty_humility` and `emotionality` remain HEXACO micro-test territory, as today.

## Implementation notes (for when we wire it)

1. **Versioned scoring is mandatory.** `scorePersonality` iterates the question bank and throws
   on a missing answer. Stored v1 records hold v1 question ids, so a v2 bank must be selected by
   the record's `version` field, not swapped globally. (The hub PR already stops this throwing
   mid-render, but v1 records still need v1 scoring to produce correct numbers.)
2. **The deck will shift.** New scoring means recomputed hands, so some players' dominant card
   changes. Options: keep v1 records scored by v1 (no retroactive change, new hand only on
   retake — preferred), and/or use the Shadow Journey as the place to narrate the change.
3. **Question shape changes.** v1 is `{ text, dimensionKey, reverseScored }` with a shared 1–5
   Likert. v2 needs `{ text, options: [{ label, axisLoads, traitLoads }] }`. `reverseScored`
   disappears — direction is encoded per option, which also removes a whole class of the
   direction bug fixed in #3155.
4. **Suit-chunked flow still applies.** 20 questions split naturally into the six axes; the
   existing section-intro reveal can group them.
5. **Card presentation.** The results hero becomes the six-axis playstyle read
   (e.g. "Improviser · Marathoner · Solo · Consolidator · Bounce-back · Mastery"), with the
   Big Five moved fully behind the existing "Score breakdown" collapsible.

## Open questions for review

1. **Six axes or five?** Mastery ↔ Reward is the weakest-substrate axis (`identity_sensitivity`
   is doing a lot of work). Dropping it frees 3 questions to strengthen the others.
2. **Neutral option?** Every question currently forces a lean. A "none of these" escape hatch
   is kinder but invites fence-sitting.
3. **Question 19 option C** ("points, badges, unlocks") loads no trait dimension at all — it's
   purely a game-axis signal. Fine, or should it carry something?
4. **Tone.** Currently plain and slightly blunt ("Honestly?"). Should it be warmer, or more
   playful to match the deck/Island Run voice?
