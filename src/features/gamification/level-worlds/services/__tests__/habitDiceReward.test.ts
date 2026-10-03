import {
  HABIT_DICE_DAILY_CAP,
  HABIT_DICE_KEY,
  HABIT_DICE_MAX,
  HABIT_DICE_MIN,
  decideHabitDiceClaim,
  habitDiceForRewardValue,
  mergeHabitDiceLedger,
  sanitizeHabitDiceLedger,
} from '../habitDiceReward';
import { mergeIslandRunSignatureMissionProgress, sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const DAY = '2026-10-03';

export const habitDiceRewardTests: TestCase[] = [
  {
    name: 'habit dice: struggling habits pay more, within 5–15 dice',
    run: () => {
      assertEqual(habitDiceForRewardValue(5), HABIT_DICE_MIN, 'easy habit pays the minimum');
      assertEqual(habitDiceForRewardValue(85), HABIT_DICE_MAX, 'struggling habit pays the maximum');
      assertEqual(habitDiceForRewardValue(45), 10, 'midpoint');
      assertEqual(habitDiceForRewardValue(500), HABIT_DICE_MAX, 'clamped high');
      assertEqual(habitDiceForRewardValue(Number.NaN), HABIT_DICE_MIN, 'invalid input is safe');
    },
  },
  {
    name: 'habit dice: once per habit per day; toggling off and on cannot pay twice',
    run: () => {
      const first = decideHabitDiceClaim({ ledger: undefined, habitId: 'h1', dateKey: DAY, rewardValue: 45, nowMs: 10 });
      assert(first.ok, 'first check-in pays');
      if (!first.ok) return;
      assertEqual(first.dice, 10, 'paid dice');
      const again = decideHabitDiceClaim({ ledger: first.ledger, habitId: 'h1', dateKey: DAY, rewardValue: 45, nowMs: 20 });
      assertDeepEqual(again, { ok: false, reason: 'already_claimed' }, 'same habit same day is not paid again');
      const nextDay = decideHabitDiceClaim({ ledger: first.ledger, habitId: 'h1', dateKey: '2026-10-04', rewardValue: 45, nowMs: 30 });
      assert(nextDay.ok, 'the next day pays again');
      if (nextDay.ok) assertDeepEqual(nextDay.ledger.claimedHabitIds, ['h1'], 'a new day starts a fresh list');
    },
  },
  {
    name: 'habit dice: daily safety cap',
    run: () => {
      let ledger: unknown;
      for (let index = 0; index < HABIT_DICE_DAILY_CAP; index += 1) {
        const decision = decideHabitDiceClaim({ ledger, habitId: `h${index}`, dateKey: DAY, rewardValue: 5, nowMs: index + 1 });
        assert(decision.ok, `check-in ${index + 1} pays`);
        if (decision.ok) ledger = decision.ledger;
      }
      assertDeepEqual(
        decideHabitDiceClaim({ ledger, habitId: 'extra', dateKey: DAY, rewardValue: 5, nowMs: 99 }),
        { ok: false, reason: 'daily_cap' },
        'over the cap is not paid',
      );
    },
  },
  {
    name: 'habit dice: ledger sanitises, merges across devices and survives the save pipeline',
    run: () => {
      assertEqual(sanitizeHabitDiceLedger({ missionId: 'habit-dice', version: 1, dateKey: 'bad', claimedHabitIds: [] }), null, 'bad date rejected');
      const a = { missionId: 'habit-dice' as const, version: 1 as const, dateKey: DAY, claimedHabitIds: ['h1'], updatedAtMs: 5 };
      const b = { missionId: 'habit-dice' as const, version: 1 as const, dateKey: DAY, claimedHabitIds: ['h2', 'h1'], updatedAtMs: 3 };
      assertDeepEqual(mergeHabitDiceLedger(a, b)?.claimedHabitIds, ['h1', 'h2'], 'same day keeps every claim from both devices');
      const older = { ...b, dateKey: '2026-10-02' };
      assertEqual(mergeHabitDiceLedger(a, older)?.dateKey, DAY, 'the later day wins');
      const sanitized = sanitizeIslandRunSignatureMissionProgress({ [HABIT_DICE_KEY]: a });
      assertDeepEqual(sanitized[HABIT_DICE_KEY], a, 'kept by the save sanitiser');
      const merged = mergeIslandRunSignatureMissionProgress({ [HABIT_DICE_KEY]: a }, { [HABIT_DICE_KEY]: b });
      assertDeepEqual((merged[HABIT_DICE_KEY] as { claimedHabitIds: string[] }).claimedHabitIds, ['h1', 'h2'], 'remote/local merge unions claims');
    },
  },
];
