-- Tip of the Day follow-up — "did you try yesterday's tip?" outcome.
-- Recorded on the *previous* tip's row when the user answers the check-in card
-- at the top of the next day's tip. Lets the coach learn what actually worked.

alter table public.tip_of_day_log
  add column if not exists followup_result text
    check (followup_result in ('worked', 'partly', 'not_yet', 'didnt_work')),
  add column if not exists followup_at timestamptz;
