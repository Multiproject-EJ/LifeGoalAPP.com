import assert from 'node:assert/strict';
import { computePlanQuality } from '../src/features/goals/planQuality';
import { computeGoalHealth } from '../src/features/goals/goalHealth';
import { evaluateHabitLifecycle } from '../src/features/habits/habitLifecycle';

const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10);

const strongPlan = computePlanQuality({
  goalOutcomeStatement: 'Run a 5k in under 30 minutes',
  successMetric: '5k <= 30:00',
  targetDate: futureDate,
  firstAction: 'Run 20 minutes on Monday',
  weeklyWorkloadTarget: 4,
  priorityLevel: 'now',
});

assert.equal(strongPlan.score, 5, 'Expected complete plan to score 5/5');
assert.equal(strongPlan.stars, '★★★★★');
assert.equal(strongPlan.missingCriteria.length, 0);

const weakPlan = computePlanQuality({
  goalOutcomeStatement: 'Be better',
  successMetric: '',
  targetDate: '2020-01-01',
  firstAction: 'think about it',
  weeklyWorkloadTarget: 0,
  priorityLevel: 'later',
});

assert.ok(weakPlan.score <= 1, 'Expected weak plan to score poorly');
assert.ok(weakPlan.missingCriteria.includes('metricMeasurable'));
assert.ok(weakPlan.missingCriteria.includes('targetDateValid'));

const activationRisk = computeGoalHealth({
  effortEventsLast14Days: 0,
  outcomeUpdatesLast14Days: 0,
  frictionTagsLast14Days: [],
  planQualityScore: 4,
});
assert.equal(activationRisk.healthState, 'at_risk');
assert.equal(activationRisk.primaryRiskReason, 'activation_risk');
assert.equal(activationRisk.recommendedNextAction, 'switch_to_planning_habit');

const nearDeadlineRisk = computeGoalHealth({
  effortEventsLast14Days: 3,
  outcomeUpdatesLast14Days: 0,
  planQualityScore: 4,
  targetDate: tomorrow,
});
assert.equal(nearDeadlineRisk.healthState, 'at_risk');
assert.equal(nearDeadlineRisk.primaryRiskReason, 'strategy_mismatch');
assert.equal(nearDeadlineRisk.recommendedNextAction, 'scale_scope');

const longHorizonLowEffort = computeGoalHealth({
  effortEventsLast14Days: 1,
  outcomeUpdatesLast14Days: 0,
  frictionTagsLast14Days: [],
  planQualityScore: 4,
  targetDate: farFuture,
});
assert.equal(longHorizonLowEffort.healthState, 'caution');
assert.equal(longHorizonLowEffort.primaryRiskReason, 'overload_or_low_priority');
assert.equal(longHorizonLowEffort.recommendedNextAction, 'defer_priority');

const underDefined = computeGoalHealth({
  effortEventsLast14Days: 3,
  outcomeUpdatesLast14Days: 2,
  frictionTagsLast14Days: ['unclear'],
  planQualityScore: 2,
});
assert.equal(underDefined.primaryRiskReason, 'under_defined_goal');
assert.equal(underDefined.recommendedNextAction, 'clarify_success_metric');

const onTrack = computeGoalHealth({
  effortEventsLast14Days: 5,
  outcomeUpdatesLast14Days: 3,
  frictionTagsLast14Days: [],
  planQualityScore: 4,
});
assert.equal(onTrack.healthState, 'on_track');
assert.equal(onTrack.primaryRiskReason, 'none');
assert.equal(onTrack.recommendedNextAction, 'keep_plan');

const formingHabit = evaluateHabitLifecycle({
  daysSinceStart: 14,
  adherence7: 90,
  adherence30: 90,
  missedDaysLast14: 1,
});
assert.equal(formingHabit.state, 'forming');
assert.equal(formingHabit.action, 'continue_reinforcement');

const reinforceLongHabit = evaluateHabitLifecycle({
  daysSinceStart: 120,
  adherence7: 85,
  adherence30: 88,
  missedDaysLast14: 1,
});
assert.equal(reinforceLongHabit.state, 'reinforcing');
assert.equal(reinforceLongHabit.action, 'continue_reinforcement');

const unstableHabit = evaluateHabitLifecycle({
  daysSinceStart: 12,
  adherence7: 30,
  adherence30: 30,
  missedDaysLast14: 7,
  attemptCount: 1,
});
assert.equal(unstableHabit.state, 'at_risk');
assert.equal(unstableHabit.action, 'restart_smaller');

const abortHabit = evaluateHabitLifecycle({
  daysSinceStart: 80,
  adherence7: 20,
  adherence30: 35,
  missedDaysLast14: 10,
  attemptCount: 4,
});
assert.equal(abortHabit.state, 'aborted');
assert.equal(abortHabit.action, 'abort_and_replace');

const pausedHabit = evaluateHabitLifecycle({
  daysSinceStart: 40,
  adherence7: 70,
  adherence30: 62,
  missedDaysLast14: 4,
  pauseRequested: true,
});
assert.equal(pausedHabit.state, 'paused');
assert.equal(pausedHabit.action, 'pause_and_reanalyze');

console.log('goal execution and habit lifecycle model tests passed');
