# HabitGame — Goals, Campaigns, Quests, and SuperHabits roadmap

Status: release implementation complete, 2026-07-19

## Product language

- **Compass Book:** the player's field guide. It helps discover direction, records durable reflections, and surfaces live evidence from active Quests. Sealed chapter answers remain historical truth.
- **Goal:** a meaningful long-term destination or life change.
- **Campaign:** HabitGame's name for a focused, time-boxed season of effort toward a Goal. A Campaign is not the Goal itself.
- **Quest:** a time-bounded, SMART-sized outcome or behavior experiment inside a Campaign. It combines habits, current and better behavior loops, environment changes, a minimum move, recovery rules, and reflection.
- **Habit:** the repeated action that makes a Quest real. A Quest may have one keystone habit and multiple supporting habits.
- **SuperHabit:** a habit with a launchable tool that helps complete it inside the app. Journaling is Free and live; other SuperHabits are Pro previews until their tools ship.

## Current foundation slice

- Canonical `Goal → Campaign → Quest → quest_habit_links` persistence with ownership RLS, explicit Data API grants, and user-data limits.
- Quest Forge and Quest Log on Today for SMART definition, behavior-loop redesign, environment changes, minimum move, recovery rule, Quest habits, editing, and lifecycle transitions.
- Existing habits can join a Quest; a new daily habit can be created from the Quest and inherit its Goal.
- Quest, new-habit, and link writes commit atomically. Recoverable outages keep one optimistic full-state bundle in the shared mutation queue for safe replay.
- Every linked habit receives a named Quest tag on Today. Goal tags and the older single gold-star bonus-door habit remain visually and mechanically distinct.
- A 28-day circular Today calendar marks Goal milestones, Campaign days, and Quest ranges.
- Compass Book shows the product hierarchy and live current-loop → better-loop Quest evidence without overwriting sealed reflections.
- SuperHabits roster, per-habit tool launch button, Free live Journaling that adds or reuses its habit before launch, and interactive device-saved Pro demo tools.
- Eat Well includes preference prompts, meals 1/2/3, optional feasts, tagged alternatives, a meal plan, and recipe-library progression. It remains clearly marked Pro demo and cannot complete a habit.
- Quest field journals save quick check-ins, weekly loop reviews, completion reflections, next experiments, and private in-game Quest Ally replies.
- Calendar days are selectable with accessible Goal, Campaign, and Quest detail.
- Wellbeing Shield derives a rolling Body + Mind score from SuperHabit evidence, contributes a visible maximum of 10 points to Body & Health, appears on Today/Campaign/Life Wheel, and remains distinct from existing Shield currency/items.
- The former mobile Shield navigation slot now opens Compass Book.

## Completed in this release — Quest reflection and evidence loop

1. Add weekly loop reviews and completion reflection using `quest_reflections`.
2. Turn Quest Ally letters into occasional in-game correspondence. A letter asks one focused question; the player's reply is saved as an `ally_reply` journal-style Quest reflection. Never send a real external message without a separate, explicit sharing flow.
3. Add Quest calendar selection and accessible detail sheets for Goal, Campaign, and Quest markers.
4. Add success evidence from linked habit completions and recommend the next behavior experiment instead of simply raising pressure.
5. Add database-backed conflict and negative cross-user RLS integration coverage once this repository has a runnable local Supabase configuration.
6. Repair the existing guest/demo entry path so Today-tab click-through testing does not depend on cloud anonymous sign-in being enabled.

## Completed as a Pro demo in this release — Eat Well SuperHabit

1. Keep Eat Well Pro and clearly marked demo until its core tool is reliable.
2. Build “My Meal Plan” around meals 1, 2, 3, and optional feasts, not calorie-accounting complexity.
3. Each meal opens a small set of recipe alternatives filtered by effort, time, taste, cost, dietary fit, and available ingredients.
4. The long-term progression is building a personal recipe library. Preference questions are woven into the game loop in small doses and stop once confidence is high.
5. Food story content may temporarily influence Arena/Island prompts such as “Get in Shape,” but isolated food islands stay optional and cannot block the main story.

## Completed in this release — Shield and Compass menu refactor

The repository already defines two Shield concepts: the Body Habit Shield wallet currency and a Shop Shield item. The proposed wellbeing system must not silently become a third ambiguous Shield.

1. Introduce an explicitly named **Wellbeing Shield score** representing Body + Mind resilience, powered by relevant SuperHabits and recovery practices.
2. Show it in the Body & Health Goal/Campaign area and the Life Wheel. Its contribution to Body & Health progress should be visible and bounded so it informs the score without dominating it.
3. Move the Wellbeing Shield out of the main-menu slot and give that slot to the Compass Book icon.
4. Preserve the existing Body Habit Shield currency and Shop Shield item unless a separate migration deliberately renames or retires them. UI copy and icons must distinguish all remaining concepts.
5. Formula: 60% rolling seven-day consistency plus 40% today's completion, calculated separately for Body and Mind; combined score is 0–100 and Body & Health contribution is `round(score / 10)`. The current score is device-cached for cross-surface display and carries forward through its seven-day window. Accessibility labels are included; server history and analytics remain post-demo hardening work.

## Later SuperHabit tools

- Move Body, Sleep, Focus, Calm, Plan Day, and similar tool-backed habits remain Pro previews until each completion loop genuinely does the habit rather than merely opening a decorative modal.
- Preference gathering should feel like play and reflection, be skippable, and stop asking settled questions.
- SuperHabit launches must return a verifiable completion result to the source habit; preview-only tools must never mark a habit complete.
