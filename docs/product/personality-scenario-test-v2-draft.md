# Foundation Test v2 — 20 Scenario Questions (content draft)

_Status: **shipped**. Implemented in `personalityTestDataV2.ts` / `personalityScoringV2.ts`.
This document remains the content source of truth — change copy here and in the bank together._

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

## The five game axes

An axis only earns its place if the app *does something different* because of it.
**Four questions each = 20.**

| Axis | Reads as | Drives | Trait substrate |
|---|---|---|---|
| **Planner ↔ Improviser** | How you set things up | Scheduling, quest setup, reminder style | `regulation_style`, conscientiousness |
| **Bounce-back ↔ Slow-burn** | What a miss does to you | Streak-break recovery flow, tone after a miss | `stress_response`, emotional_stability |
| **Solo ↔ Co-op** | Who's in the room | Accountability, sharing, social prompts | extraversion, agreeableness |
| **Explorer ↔ Consolidator** | Variety vs. routine | Whether to suggest new habits or reinforce | openness, `cognitive_entry` |
| **Sprinter ↔ Marathoner** | The pace you keep | Goal sizing, streak targets, intensity of asks | conscientiousness, `stress_response` |

**Bounce-back ↔ Slow-burn is the one nothing currently measures**, and it's arguably the most
important axis in a habit app.

> **Naming change made during implementation:** the low pole was "Spiral" in review. That word is
> fine in a design doc but this label is displayed on the player's own card, and "you are a
> Spiral" contradicts the rule that no answer is the wrong one — the same principle behind "an
> unplayed strategy, not a flaw". Shipped as **Slow-burn**: same axis, same scoring, no verdict.

### Changes from revision 1

- **Mastery ↔ Reward dropped** (per review). It had the weakest substrate — `identity_sensitivity`
  was doing all the work — and its three questions were better spent elsewhere.
  - *Consequence handled:* those three questions carried most of `identity_sensitivity`, which the
    deck weights heavily (Empath 0.9, Rebel 0.9, Creator 0.8, Dreamer 0.8). The three new questions
    (12, 16, 20) deliberately re-home it, and **Q20 keeps the motivation signal as trait data** even
    though it's no longer a headline axis.
- **A skip is now allowed** on every question (per review). See below.
- **Every option now carries at least one trait load.** Revision 1 had an option
  ("points, badges, unlocks") that scored nothing but a game axis. That's now a hard rule,
  enforceable in a test.
- **Tone rewritten** warmer and more playful, to sit next to "Meet your playstyle", "Deal the
  questions", and "an unplayed strategy, not a flaw".

## The skip

Every question offers **"Skip this one"** as a quiet secondary action — *not* a fifth option in
the list. It scores nothing at all.

The reasoning: a genuine "none of these fit me" escape hatch is kinder, but a neutral option
sitting in the middle of the choices invites fence-sitting. Making it visually secondary keeps
it available to the people who need it without making it the lazy default.

## Writing rules used

- **Concrete but domain-neutral** — time, plans, people and setbacks, never gym/office/parenting
  specifics, so they land regardless of the player's life shape.
- **No option is the "right" one.** Every option is a legitimate way to be. This is what keeps
  self-report honest — and it's the same principle as "a shadow isn't a flaw".
- **Every option carries a trait load.** No dead options.
- **No double-barrelled options**, no idioms, no jargon.
- **Realism framing** ("Be honest.", "as it actually exists") to pull answers toward behaviour
  rather than aspiration.

---

## The 20 questions

Notation: `AXIS n` = contribution to that game axis (1–5). Trait loads in `code`.
Every question also offers *Skip this one* (scores nothing).

### ⚙️ Planner ↔ Improviser — "How you set the board"

**1. Sunday night. The week ahead is a blank page. What actually happens?**
- A — I fill it in. Times, blocks, the lot. · PLAN 5 · `regulation_style 5` `conscientiousness 5`
- B — I circle two or three things that matter and leave space around them. · PLAN 4 · `regulation_style 4` `conscientiousness 4`
- C — I've got a rough shape in my head. Nothing written down. · PLAN 2 · `regulation_style 2` `conscientiousness 3`
- D — Blank page sounds about right. I'll meet the week when it gets here. · PLAN 1 · `regulation_style 1` `conscientiousness 2`

**2. You want to build a new habit. What's your opening move?**
- A — Pick a time, put it in the calendar, done. · PLAN 5 · `regulation_style 5` `conscientiousness 5`
- B — Bolt it onto something I already do every day. · PLAN 4 · `regulation_style 4` `conscientiousness 4`
- C — Start today. Work out the details later. · PLAN 2 · `cognitive_entry 1` `conscientiousness 3`
- D — Read up properly first. I like knowing what I'm walking into. · PLAN 3 · `cognitive_entry 5` `conscientiousness 4`

**3. Your evening is planned. Then a better offer lands. Be honest.**
- A — Plan wins. I said I'd do it. · PLAN 5 · `conscientiousness 5` `regulation_style 4`
- B — Offer wins — but the plan gets a new slot before I say yes. · PLAN 3 · `conscientiousness 4` `regulation_style 3`
- C — Offer wins. The plan will keep. · PLAN 2 · `conscientiousness 2` `regulation_style 2`
- D — Offer wins, and then I think about the plan all night. · PLAN 3 · `emotional_stability 2` `identity_sensitivity 4`

**4. Your to-do list, as it actually exists right now.**
- A — One list. In order. I work down it. · PLAN 5 · `regulation_style 5` `conscientiousness 5`
- B — Three lists in three places, roughly current. · PLAN 3 · `regulation_style 3` `conscientiousness 3`
- C — It's in my head, and mostly that's fine. · PLAN 2 · `regulation_style 2` `conscientiousness 2`
- D — I make beautiful lists and never look at them again. · PLAN 2 · `regulation_style 2` `conscientiousness 2` `openness 4`

### 🔥 Bounce-back ↔ Slow-burn — "What a miss does to you"

**5. Twelve days into a streak. You miss one. Next morning?**
- A — Straight back on it. A day is a day. · BOUNCE 5 · `stress_response 5` `emotional_stability 5`
- B — Back on it, though it nags at me for a while. · BOUNCE 4 · `stress_response 4` `emotional_stability 4`
- C — It feels broken now, and I drift for a few days. · BOUNCE 2 · `stress_response 2` `emotional_stability 2`
- D — That's usually where it quietly ends. · BOUNCE 1 · `stress_response 1` `emotional_stability 2`

**6. Something goes wrong, and it genuinely isn't your fault. First move?**
- A — Straight to: right, what now? · BOUNCE 5 · `stress_response 5` `emotional_stability 5`
- B — Complain for sixty seconds, then get on with it. · BOUNCE 4 · `stress_response 4` `emotional_stability 4` `extraversion 4`
- C — I chew it over for a while before I can move. · BOUNCE 2 · `stress_response 2` `emotional_stability 2`
- D — It follows me around for the rest of the day. · BOUNCE 1 · `stress_response 1` `emotional_stability 1`

**7. Real pressure. A deadline, too much at once. What does it do to you?**
- A — Sharpens me. I'm better under load. · BOUNCE 5 · `stress_response 5` `emotional_stability 5`
- B — I manage — but I'm no fun to be around. · BOUNCE 3 · `stress_response 3` `agreeableness 2` `emotional_stability 3`
- C — I stall. Everything feels like too much to start. · BOUNCE 2 · `stress_response 2` `emotional_stability 2`
- D — I get through it, and crash afterwards. · BOUNCE 3 · `stress_response 3` `emotional_stability 3`

**8. Someone criticises something you put real work into.**
- A — Good. What else have you got? · BOUNCE 5 · `stress_response 5` `openness 5` `identity_sensitivity 2`
- B — I'll use it — but it lands somewhere personal. · BOUNCE 3 · `stress_response 3` `identity_sensitivity 4`
- C — I defend it first. I come round later, usually. · BOUNCE 3 · `agreeableness 2` `identity_sensitivity 4`
- D — It knocks me off the whole thing for a while. · BOUNCE 2 · `stress_response 2` `emotional_stability 2` `identity_sensitivity 5`

### 🤝 Solo ↔ Co-op — "Who's in the room"

**9. You set a goal that actually matters to you. Who knows?**
- A — People know. Being watched keeps me honest. · COOP 5 · `extraversion 5`
- B — One or two I trust. · COOP 4 · `extraversion 3` `agreeableness 4`
- C — Nobody yet. They'll see the result. · COOP 2 · `extraversion 2`
- D — Nobody, ever. It's mine. · COOP 1 · `extraversion 1`

**10. Hard week, finally over. What actually refills the tank?**
- A — People. Noise. Being out. · COOP 5 · `extraversion 5`
- B — A couple of favourites, somewhere quiet. · COOP 4 · `extraversion 3` `agreeableness 4`
- C — My own company, my own thing. · COOP 2 · `extraversion 2`
- D — Nobody, for as long as I can get away with. · COOP 1 · `extraversion 1`

**11. You're stuck. Properly stuck. What happens next?**
- A — I talk it out loud at someone. · COOP 5 · `extraversion 5` `agreeableness 4`
- B — I find someone who's already solved it. · COOP 4 · `extraversion 4` `agreeableness 4` `cognitive_entry 4`
- C — I stay with it until it gives. · COOP 2 · `extraversion 2` `conscientiousness 4`
- D — I walk away, and let it solve itself in the background. · COOP 2 · `extraversion 2` `openness 4`

**12. Someone gives you advice about your goal. It doesn't fit who you are.** _(new)_
- A — I keep the useful bit and bin the rest. · COOP 4 · `identity_sensitivity 3` `openness 4`
- B — I'll probably follow it anyway. They might know better. · COOP 5 · `agreeableness 5` `identity_sensitivity 2`
- C — I nod, thank them, and quietly ignore it. · COOP 2 · `agreeableness 3` `identity_sensitivity 4`
- D — It bugs me that they've read me wrong. · COOP 3 · `identity_sensitivity 5` `emotional_stability 2`

### 🧭 Explorer ↔ Consolidator — "Same road, or a new one"

**13. A routine has been working for six weeks. Where's your head at?**
- A — Don't touch it. It's working. · EXPLORE 1 · `openness 2` `conscientiousness 5`
- B — Keep the middle, fiddle with the edges. · EXPLORE 3 · `openness 3` `conscientiousness 4`
- C — Getting itchy. Something needs to change. · EXPLORE 4 · `openness 4`
- D — Already swapped it for something shinier. · EXPLORE 5 · `openness 5` `conscientiousness 2`

**14. A free evening. Nothing owed to anyone. What pulls at you?**
- A — Something I've never done. · EXPLORE 5 · `openness 5`
- B — Something I love and haven't touched in ages. · EXPLORE 3 · `openness 3`
- C — The usual. It's the usual for good reason. · EXPLORE 1 · `openness 2`
- D — Depends entirely who's free. · EXPLORE 3 · `extraversion 4`

**15. There's a better way to do something you already do. You…**
- A — Try it tonight. · EXPLORE 5 · `openness 5` `cognitive_entry 1`
- B — Look into it properly, then decide. · EXPLORE 3 · `openness 4` `cognitive_entry 5`
- C — Wait and see whether it sticks for anyone else. · EXPLORE 2 · `openness 2`
- D — Stay where I am. Mine works. · EXPLORE 1 · `openness 1`

**16. You're about to try something you've genuinely never done. What do you need first?** _(new)_
- A — Nothing. In at the deep end. · EXPLORE 5 · `cognitive_entry 1` `openness 4`
- B — A quick look at how it works, then go. · EXPLORE 4 · `cognitive_entry 3` `openness 3`
- C — The whole picture before I take a step. · EXPLORE 2 · `cognitive_entry 5` `conscientiousness 4`
- D — Someone to show me once. · EXPLORE 3 · `cognitive_entry 3` `extraversion 4` `agreeableness 4`

### ⚡ Sprinter ↔ Marathoner — "The pace you actually keep"

**17. A big goal, three months out. How do you go at it?**
- A — Hard and fast up front, coast later. · SPRINT 5 · `conscientiousness 3` `stress_response 4`
- B — In bursts, whenever the energy shows up. · SPRINT 4 · `conscientiousness 3`
- C — A steady bit, most days. · SPRINT 1 · `conscientiousness 5` `regulation_style 4`
- D — Steady, then a proper sprint at the end. · SPRINT 3 · `conscientiousness 4`

**18. How big is the version of the habit you actually sign up for?**
- A — Ambitious. I'd rather aim high and miss. · SPRINT 5 · `conscientiousness 3`
- B — A notch past comfortable. · SPRINT 4 · `conscientiousness 4`
- C — Small enough that I'll definitely do it. · SPRINT 1 · `conscientiousness 5` `regulation_style 4`
- D — Whatever that particular day allows. · SPRINT 2 · `regulation_style 1` `conscientiousness 2`

**19. Two weeks of going hard. The tank's low. You…**
- A — Push on. Momentum's worth more than rest. · SPRINT 5 · `stress_response 3` `conscientiousness 4`
- B — Ease off on purpose, then pick it back up. · SPRINT 2 · `stress_response 5` `conscientiousness 4`
- C — Keep going until something stops me. · SPRINT 5 · `stress_response 2` `emotional_stability 2`
- D — Drop it, then feel bad about having dropped it. · SPRINT 3 · `stress_response 2` `emotional_stability 2`

**20. Three weeks in. The novelty's gone. What keeps you in it?** _(new — carries the motivation signal)_
- A — I said I would. That's just who I am. · SPRINT 3 · `identity_sensitivity 5` `conscientiousness 5`
- B — I can feel myself getting better at it. · SPRINT 3 · `identity_sensitivity 4` `openness 4`
- C — The streak. I'm not breaking the streak. · SPRINT 3 · `conscientiousness 4` `regulation_style 4`
- D — Honestly? Not much. I need a fresh push. · SPRINT 4 · `conscientiousness 2` `openness 4`

---

## Dimension coverage

Verified by script against this document.

| Dimension | Scored options | Questions |
|---|---|---|
| `conscientiousness` | 33 | 1, 2, 3, 4, 11, 13, 16, 17, 18, 19, 20 |
| `stress_response` | 20 | 5, 6, 7, 8, 17, 19 |
| `openness` | 19 | 4, 8, 11, 12, 13, 14, 15, 16, 20 |
| `regulation_style` | 17 | 1, 2, 3, 4, 17, 18, 20 |
| `emotional_stability` | 17 | 3, 5, 6, 7, 8, 12, 19 |
| `extraversion` | 15 | 6, 9, 10, 11, 14, 16 |
| `identity_sensitivity` | 11 | 3, 8, 12, 20 |
| `cognitive_entry` | 9 | 2, 11, 15, 16 |
| `agreeableness` | 9 | 7, 8, 9, 10, 11, 12, 16 |

Thinnest dimension is 9 scored options across 4 questions — up from 5 in revision 1, because
the questions that replaced Mastery ↔ Reward were aimed at the two thinnest dimensions.
`honesty_humility` and `emotionality` remain HEXACO micro-test territory, as today.

## Implementation notes (for when we wire it)

1. **Versioned scoring is mandatory.** `scorePersonality` iterates the question bank and throws
   on a missing answer. Stored v1 records hold v1 question ids, so a v2 bank must be selected by
   the record's `version` field, not swapped globally.
2. **Skips make partial answers normal.** Scoring already tolerates this — the per-dimension
   average uses `count > 0` and falls back to neutral — but two things follow:
   - a dimension with **zero** answered options should be treated as *unmeasured for that record*
     (same treatment as `honesty_humility` today: hidden from results, neutral in the deck),
     which means "measured" becomes **per-record** rather than the static set it is now;
   - worth surfacing a soft nudge if someone skips a lot, since the read gets noisy.
3. **The deck will shift.** New scoring means recomputed hands. Preferred: keep v1 records scored
   by v1 so nothing changes retroactively, and let the new hand appear on the next retake — with
   the Shadow Journey as the natural place to narrate the change.
4. **Question shape changes.** v1 is `{ text, dimensionKey, reverseScored }` with a shared 1–5
   Likert. v2 needs `{ text, options: [{ label, axisLoads, traitLoads }], skippable: true }`.
   `reverseScored` disappears — direction is encoded per option, which removes the whole class
   of direction bug fixed in #3155.
5. **Suit-chunked flow still applies.** Five axes of four questions map cleanly onto the existing
   section-intro reveal.
6. **Card presentation.** The results hero becomes the five-axis playstyle read
   (e.g. "Improviser · Bounce-back · Solo · Consolidator · Marathoner"), with the Big Five moved
   fully behind the existing "Score breakdown" collapsible.

## Tests to write alongside it

- Every option carries ≥1 trait load (the revision-1 bug, made unrepeatable).
- Every dimension the deck weights is covered by ≥1 question.
- Axis question counts stay balanced (4 each).
- v1 records still score through the v1 bank after v2 ships.
- A fully-skipped dimension is reported unmeasured rather than scored as 0 — the phantom-0%
  bug from #3155, in its new form.
