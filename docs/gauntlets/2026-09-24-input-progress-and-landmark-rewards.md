# Input progress and landmark reward gates

Status: discovery complete for primary Habit/Wisdom paths; economy decision pending.

Implementation checkpoint: Habit and Wisdom now share ActivityProgress. The
ordinary Habit path counts one real action; the first-day path labels its unit
as a breathing exercise. Wisdom counts only required answers, distinguishing
filled draft from saved insight. Both receive the actual build level from the
board. Render tests pass for counts, independent bars and saved/draft states.
This is not complete global coverage: bonus/input modals and completion reward
settlement remain pending. No new dice amount or reward grant was introduced.
Date: 2026-09-24

## Next slice after HUD release

Bonus encounters now project their real existing progress through ActivityProgress:
quiz = one selection; gratitude = one nonempty draft then submit; focus = one
acknowledgement; tapping = configured tap count; breathing = configured seconds.
Completion is only marked saved after the existing reward-stage transition. No
construction bar is invented for unattached bonus encounters. The modal now uses
document.body portal and a scoped page-scroll lock. Focused render tests cover all
five types, blank versus filled drafts, real remaining counts and saved state.
This slice is local and not part of live `20365528`; full follow-up release QA is
still needed. The previous Habit/Wisdom progress slice is included in that release.

Content issue found: three-breaths copy describes 3 × (3s in + 3s out), but its
timer is 9s; box-breathing describes 2 × (4s in + 4s hold + 4s out), but timer is
10s. Align instructions/timings deliberately in the next slice; no silent reward
or answer-quota change in this presentation patch. Asked user to confirm 5 dice
per dual-completed landmark, separately from construction rewards; no answer yet.

## Outcome and authority

User requests visible remaining-input progress on all Island Run input encounters,
plus separate construction progress below landmark activity progress. Landmark
dice payouts require both the activity and construction to be complete. Local
implementation and tests are authorized; this change is not deployed.

## Verified baseline

- Habit uses IslandRunLifePromptCard: one real action, including acknowledgement
  of an eligible already-completed Today habit. Selection alone is not completion.
- Wisdom uses WisdomCaretakerCompassEncounter and getIslandFragment. Required
  answerable blocks determine completion; optional blocks must not inflate the
  denominator. Authoring ceiling is four compact inputs. Saving and confirming
  completion are separate from merely filling a draft.
- Buildings have three levels. Existing construction grants one die per new level.
  Preserve those grants; the requested dual-gate completion prize is separate.
- Current ordinary stop completion grants shards but has no common configured
  dual-gate dice prize. Amount needs user decision.
- Bonus encounter rewards have a documented legacy/canonical discrepancy.
  Progress UX must not silently expand direct-dice payouts to tile encounters.
- From Island004, activities generally require Level3 to enter. Islands001–003
  can finish an activity before construction. Reward settlement must work in
  either order without changing activity access or departure rules.

## Milestones / evidence

1. Inventory every input-bearing Island Run modal, including bonus challenge,
   orientation, breathing, journal, Compass and alternate completion paths.
   Record actual quotas and persistence; do not claim global coverage early.
2. Shared accessible progress presentation: explicit remaining count, real
   denominator, optional inputs excluded, completed/saving/error states. A
   timer or action count uses its actual unit, never fictitious answers.
3. Landmark view includes activity bar above L0–L3 construction bar, with a
   clearly locked/ready/claimed dice prize. Unattached encounters have no build
   requirement. Preserve viewport portal and scroll-lock modal requirements.
4. Canonical duplicate-safe reward settlement in action services, triggered by
   either activity completion or construction completion, never render effects.
   Verify both orders, partial gates, replay, reload, visit/cycle identity and
   legacy saves. Preserve previously granted rewards; no implicit backpay.
5. Test primary Habit/Wisdom plus representative bonus/multi-input/timed flows,
   run architecture guards, focused/service tests, TypeScript and build; inspect
   narrow-screen modals. Record uncovered surfaces before rollout.

## Decisions / stop conditions

- Confirm new completion dice amount. Proposed starting point: five per ordinary
  landmark, separate from existing building-level dice and boss/egg rewards.
- Keep current input quotas unless inventory exposes empty or excessive content;
  report such cases rather than manufacturing additional questions.
- Resolve any requested bonus direct-dice policy explicitly before economy edits.
- Stop on ambiguous old reward receipts or unsafe concurrent settlement.

## Recovery

Keep the existing controller/camera/theme work untouched. Implement small
reversible slices in this worktree. UI must only read canonical progress and
call canonical actions. Do not reset saves or introduce UI wallet writes.
