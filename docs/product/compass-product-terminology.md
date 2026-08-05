# Compass product terminology

_Updated: 2026-07-19_

This note separates the live product surfaces so Compass Book, Wheel Pulse, Campaigns, and Quests do not drift into conflicting meanings.

## Compass Book

Compass Book is the six-chapter field guide for durable self-understanding and life direction. It owns chapter answers and sealed reflections. It may read canonical active Quests as a live evidence layer, but it does not overwrite sealed answers or independently create duplicate Goal/Habit records.

The mobile footer's former Shield slot now opens Compass Book. This makes the Book a first-class navigation destination while the Wellbeing Shield lives where its evidence is useful: Today, SuperHabits, Body & Health, Campaigns, and the Life Wheel.

### The Reading

**The Reading** is the Compass Book's seventh page — its standing page, and the page the book opens to. It is one compass reading of the player drawn from all six chapters at once: the statement each chapter produced, in the player's own words, plus a row for every chapter they have not reached yet showing what that chapter will eventually tell them.

The Reading owns no storage. Every row is derived from the chapter states, so it can never disagree with a sealed chapter. Do not call it a dashboard in user-facing copy, and do not let it accumulate its own fields — anything durable belongs to a chapter.

### Turning pages vs. writing in them

The book is seven pages — the Reading plus chapters I–VI — reachable in any order from a persistent fore-edge tab rail. These two are deliberately separate rules:

- **Turning to a page is always allowed.** A chapter the player has not sailed to yet is fully browsable: its core question, the output fields it will produce, its evolving graphic as an empty plate, and the island that opens it. Locked never means hidden — seeing the empty slot is what makes the player want to fill it.
- **Writing in a page is island-gated.** Reaching Island N is what makes fragment N answerable, in the book or at the island's Wisdom stop. This is unchanged.

There is no separate table-of-contents screen; the tab rail is the contents.

## Wheel Pulse

Wheel Pulse is the existing live analytics experience, shown to users as Quest Compass and then Quest Pulse before this rename. It reads Life Wheel check-ins and synthesizes them into six life forces, with goals, habits, current quest information, balance, momentum, trends, and attention signals layered on top.

The name is deliberate: the reading is computed from Life Wheel check-ins and nothing else, and its refresh action is a check-in. "Quest" was retired from this surface because it collides with canonical Quests, the Quest Forge chapter, and the Quest Ledger — the same collision that retired "Compass" here earlier.

## Old Island Run Compass

The old Island Run Compass is the legacy 11-phase Compass system used by Island Run. **Its client write path was removed** — no surface writes `compass_state` any more, and the compass template is no longer readable in-app. The table is retained for a data-retention window so early direction text can still be exported or migrated into the Compass Book; `parseCompassState`/`fetchCompassState` in `src/services/compassState.ts` remain solely as that read path.

Do not re-wire gameplay to `compass_state`. Island-fragment answering now lives in the Compass Book (`isIslandFragmentAnsweredForUser`).

Two parts of the legacy curriculum have **no Compass Book equivalent** and are lost when the table is dropped: the Personality spoke (phases P2/P6/P9, 30 islands) and the Shield spoke (P8/P10, 20 islands). Decide where those land — see the gaps note — before dropping the table.

## My Quest

My Quest is the active commitment and progress area where players manage current goals, habits, check-ins, contracts, and milestones.

## Goals, Campaigns, Quests, and Habits

- A **Goal** is a meaningful long-term destination.
- A **Campaign** is HabitGame's time-boxed season of effort toward a Goal; it is not a synonym for the Goal.
- A **Quest** is a SMART-sized outcome or behavior experiment inside a Campaign. It includes a current loop, a better loop, environment changes, linked habits, minimum moves, recovery rules, and reflections.
- A **Habit** is the repeatable daily/weekly move. One linked habit may be the Quest's keystone habit.

## Quest field journal and Quest Ally

Every active Quest has a field journal for quick check-ins, weekly loop reviews, completion reflections, evidence, and the next experiment. When enabled, the Quest Ally occasionally asks one focused in-game question. A reply is saved privately as an `ally_reply` reflection; it is journaling, not an external message.

## Wellbeing Shield

The **Wellbeing Shield** is a rolling seven-day Body + Mind resilience score powered only by matched SuperHabits and their completion evidence. It contributes at most 10 points to Body & Health progress. It is distinct from the existing Body Habit Shield currency and Shop Shield item.

## Quest Leaps

Quest Leaps remain a reserved short-experiment concept. Canonical Quests now cover the active time-bounded experiment layer; do not introduce a parallel Quest Leap persistence model without deciding whether it is a Quest kind, template, or presentation.

## Legacy internal code names

Some internal names remain unchanged for compatibility, including `QuestCompassModal`, `openQuestCompassFromMobileMenu`, the `quest-compass` module path, CSS classes, and the My Quest submenu action id `quest-compass`. These names refer to Wheel Pulse and must not be used as the namespace for Compass Book or canonical Quest persistence.
