import type { Json } from '../../lib/database.types';
import type { PlanQualityResult } from './planQuality';

export type GoalHealthState = 'on_track' | 'caution' | 'at_risk';

export type GoalRiskReason =
  | 'strategy_mismatch'
  | 'overload_or_low_priority'
  | 'activation_risk'
  | 'under_defined_goal'
  | 'none';

export type GoalRecommendedAction =
  | 'scale_scope'
  | 'reduce_workload'
  | 'switch_to_planning_habit'
  | 'defer_priority'
  | 'clarify_success_metric'
  | 'keep_plan';

export type GoalHealthSnapshot = {
  goalId: string;
  capturedAt: string;
  healthState: GoalHealthState;
  riskReason: GoalRiskReason | null;
  recommendedAction: GoalRecommendedAction | null;
  signals: Json | null;
};

export type GoalExecutionRecommendation = {
  encouragementLine: string;
  realityObservation: string;
  recommendedAction: string;
  oneTapOptions: string[];
};

export type GoalExecutionEvaluation = {
  planQuality: PlanQualityResult;
  healthSnapshot: GoalHealthSnapshot;
};
