# Habits V2 Manual Regression Checklist

This document provides a manual regression checklist for testing the habits feature (V2 implementation).

---

## Habit Creation

- [ ] Create a boolean habit via the wizard.
- [ ] Create a quantity habit via a template.
- [ ] Create a duration habit via a template.
- [ ] Confirm rows appear in `habits_v2`.

---

## Today's Checklist & Logging

- [ ] Boolean habit: "Mark done" creates a log and updates UI.
- [ ] Quantity habit: entering a value and logging it writes to `habit_logs_v2` and UI shows value.
- [ ] Duration habit: entering minutes and logging writes a value and UI shows it.
- [ ] Refresh page: checklist still reflects correct statuses.

---

## Streaks

- [ ] After several days of logging, Streaks section shows non‑zero current/best streaks for a habit.
- [ ] Removing logs (e.g., manually in Supabase) appropriately affects streaks after reload.

---

## Insights Heatmap

- [ ] Selecting a habit in "Habit Insights" triggers the 31‑day heatmap.
- [ ] Days with logs are rendered as filled/green; others as empty/gray.
- [ ] Changing selected habit updates the heatmap.

---

## Templates

- [ ] Templates load without error when online.
- [ ] Template gallery handles network failures gracefully (error message but page still works).
- [ ] Clicking a template pre-fills the wizard correctly (title, emoji, type, basic schedule/targets).

---

## Error & Edge Cases

- [ ] Behavior when there are no habits.
- [ ] Behavior when there are habits but no logs.
- [ ] Behavior when Supabase returns an error (streaks/logs/habits) — error banners appear but page doesn't crash.
