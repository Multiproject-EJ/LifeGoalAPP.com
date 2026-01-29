# Daily Treats: Monthly Treat Calendar (Planning Draft)

## Concept Overview
- **Goal:** Introduce a monthly rolling calendar inside the Daily Treats menu that refreshes daily with a new hatch to open.
- **Core loop:**
  1. User returns each day.
  2. The next hatch becomes active after the daily cooldown window.
  3. Opening a hatch delivers a surprise (reward, story, cosmetic, or game token).

## Player Experience
- **Daily ritual:** A quick, satisfying “open hatch” animation with a surprise reveal.
- **Weekly rhythm:** Special milestones every 5th hatch (larger reward, narrative beat, or unlock).
- **Visual memory:** Opened hatches keep the revealed emoji visible, and a reward tracker shows progress toward symbol streaks.
- **Reset cadence:** When the month ends, the calendar rolls into the next month with no downtime.

## Calendar Structure
- **Hatches:** One hatch per calendar day in the active month.
- **Daily availability:** One hatch per day. If a day is missed, we can either:
  - Keep it locked (FOMO), or
  - Allow a “catch-up” with a small cost (tokens/points).
- **Season themes:** Each month can have a story/visual motif (ex: cosmic, ocean, forest).

## Rewards & Pricing Ideas
- **Free track:**
  - 15–20 hatches include small bonuses (XP, points, streak momentum, spin token).
- **Premium track (optional):**
  - 5–10 hatches include premium cosmetics, limited badges, or larger boosts.
- **Micro-bundles:**
  - “Catch-up pass” for 3 missed days.
  - “Golden hatch” to open a special bonus surprise.

## Fun Hatch Ideas
- “Mystery confetti” pop with a short animation.
- Tiny mini-game (tap 3 times to crack the hatch).
- Narrative snippets that evolve into a short story by the end of the month.
- Collectible tiles that form a larger artwork.

## Animation & Visual Notes
- **Locked hatch:** Subtle glow, soft pulse.
- **Ready hatch:** Bright glow + floating particle sparks.
- **Open sequence:**
  - Hatch shake → crack → reveal card slide + sound.
- **Rewards:**
  - Use celebratory burst and a “sticker” reward card.

## Supabase Data Model (Draft)
- **Tables:**
  - `daily_calendar_seasons`
    - `id`, `theme`, `start_date`, `end_date`, `status`
  - `daily_calendar_hatches`
    - `id`, `season_id`, `day_index`, `reward_type`, `reward_value`, `reward_meta`
  - `daily_calendar_progress`
    - `id`, `user_id`, `season_id`, `last_opened_day`, `opened_days[]`, `last_opened_at`
  - `daily_calendar_rewards`
    - `id`, `user_id`, `season_id`, `day_index`, `reward_payload`, `opened_at`

## Scheduling & Unlock Logic
- **Daily lock:** Unlock next hatch at local midnight or a fixed server time.
- **Grace period:** Optional 4–8 hour window to reduce timezone frustration.
- **Break period:** None; cycle is continuous across months.
- **Monthly cadence:** Use the calendar date as the active hatch day; missed days remain marked as missed/locked.

## Next Build Steps
1. Design the calendar grid UI (one tile per calendar day, with hover/locked states).
2. Create the hatch opening animation sequence.
3. Implement Supabase tables + RLS for user progress.
4. Add server-side logic (edge function) to generate rewards.
5. Integrate Daily Treats menu button to open the calendar modal.
