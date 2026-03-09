import type { GoalHealthResult } from './goalHealth';
import { GOAL_STRATEGY_META, type GoalStrategyType } from './goalStrategy';

export type GoalDiagnosis = {
  diagnosisTitle: string;
  diagnosisDetail: string;
  prescribedStrategy: GoalStrategyType;
  prescriptionReason: string;
  urgency: 'low' | 'medium' | 'high';
  oneTapMessage: string;
};

type DiagnosisRow = {
  diagnosisTitle: string;
  diagnosisDetail: string;
  prescribedStrategy: GoalStrategyType;
  prescriptionReason: string;
  urgency: 'low' | 'medium' | 'high';
};

function buildOneTapMessage(diagnosisTitle: string, prescribedStrategy: GoalStrategyType): string {
  const strategyLabel = GOAL_STRATEGY_META[prescribedStrategy].label;
  return `My goal has been diagnosed as '${diagnosisTitle}'. The suggested strategy is ${strategyLabel}. Help me switch to this approach.`;
}

function lookupDiagnosis(
  primaryRiskReason: GoalHealthResult['primaryRiskReason'],
  healthState: GoalHealthResult['healthState'],
): DiagnosisRow {
  if (primaryRiskReason === 'activation_risk') {
    return {
      diagnosisTitle: "Hasn't started yet",
      diagnosisDetail:
        "No effort has been logged for this goal. Getting started is often the hardest step — breaking it into tiny wins can unlock momentum.",
      prescribedStrategy: 'micro',
      prescriptionReason:
        "Micro Wins builds momentum through the smallest possible daily actions, making it easier to break through the activation barrier.",
      urgency: 'high',
    };
  }

  if (primaryRiskReason === 'under_defined_goal') {
    if (healthState === 'at_risk') {
      return {
        diagnosisTitle: 'Goal is too vague',
        diagnosisDetail:
          'The goal lacks a clear success criterion and effort is low. Without a testable definition of done, progress is hard to measure.',
        prescribedStrategy: 'experiment',
        prescriptionReason:
          'Experiment Lab frames the goal as a testable hypothesis with a defined 30-day window, adding the structure and clarity that is currently missing.',
        urgency: 'high',
      };
    }
    return {
      diagnosisTitle: 'Needs more clarity',
      diagnosisDetail:
        'The goal definition could be sharpened. Adding a repeatable process will keep effort consistent while clarity develops.',
      prescribedStrategy: 'process',
      prescriptionReason:
        "Process-Based lets you focus on running a repeatable routine — the outcome naturally improves as the process tightens.",
      urgency: 'medium',
    };
  }

  if (primaryRiskReason === 'strategy_mismatch') {
    if (healthState === 'at_risk') {
      return {
        diagnosisTitle: 'Wrong approach — high effort, no results',
        diagnosisDetail:
          'Significant effort has been logged but outcomes have stalled. The current approach is consuming energy without producing results.',
        prescribedStrategy: 'friction_removal',
        prescriptionReason:
          'Friction Removal targets the specific blockers preventing progress, so every unit of effort starts translating into real results.',
        urgency: 'high',
      };
    }
    return {
      diagnosisTitle: 'Approach may need updating',
      diagnosisDetail:
        'The strategy is showing signs of strain. Planning backwards from the desired outcome can reveal gaps in the current approach.',
      prescribedStrategy: 'reverse',
      prescriptionReason:
        'Reverse Planning starts from the finished goal and maps back to today, surfacing missing steps and misaligned actions.',
      urgency: 'medium',
    };
  }

  if (primaryRiskReason === 'overload_or_low_priority') {
    if (healthState === 'at_risk') {
      return {
        diagnosisTitle: 'Too much at once',
        diagnosisDetail:
          'Effort and outcomes are both low — this goal may be competing with too many others. Focusing on a single commitment can restore momentum.',
        prescribedStrategy: 'constraint',
        prescriptionReason:
          'Constraint forces single-goal focus by eliminating competing distractions, freeing up the energy this goal needs.',
        urgency: 'high',
      };
    }
    return {
      diagnosisTitle: 'Getting crowded',
      diagnosisDetail:
        'The goal is showing signs of deprioritisation. Matching tasks to your available energy can keep it moving without burning out.',
      prescribedStrategy: 'energy_based',
      prescriptionReason:
        'Energy-Based assigns tasks to high/medium/low energy states so the goal always has a next action that fits how you feel today.',
      urgency: 'medium',
    };
  }

  // primaryRiskReason === 'none'
  if (healthState === 'on_track') {
    return {
      diagnosisTitle: 'Looking healthy',
      diagnosisDetail:
        'Effort and outcomes are aligned and the goal is progressing well. Keep running the current approach.',
      prescribedStrategy: 'standard',
      prescriptionReason:
        'Standard is the right choice for a well-defined goal with consistent progress — no change needed.',
      urgency: 'low',
    };
  }

  if (healthState === 'caution') {
    return {
      diagnosisTitle: 'Keep an eye on this',
      diagnosisDetail:
        'The goal is not at immediate risk, but some signals suggest a process check would be valuable soon.',
      prescribedStrategy: 'process',
      prescriptionReason:
        'Process-Based keeps effort consistent through a repeatable routine, making it easier to spot and fix drift early.',
      urgency: 'low',
    };
  }

  // healthState === 'at_risk', primaryRiskReason === 'none'
  return {
    diagnosisTitle: 'Needs attention',
    diagnosisDetail:
      'The goal is at risk without a clear root cause. Breaking it into smaller wins can restore momentum and surface hidden blockers.',
    prescribedStrategy: 'micro',
    prescriptionReason:
      'Micro Wins rebuilds momentum through small, achievable daily actions — ideal when the cause of stall is unclear.',
    urgency: 'medium',
  };
}

export function diagnoseAndPrescribe(healthResult: GoalHealthResult): GoalDiagnosis {
  const row = lookupDiagnosis(healthResult.primaryRiskReason, healthResult.healthState);
  return {
    ...row,
    oneTapMessage: buildOneTapMessage(row.diagnosisTitle, row.prescribedStrategy),
  };
}

export function buildGoalDoctorContext(goalTitle: string, diagnosis: GoalDiagnosis): string {
  const strategyLabel = GOAL_STRATEGY_META[diagnosis.prescribedStrategy].label;
  return `My goal "${goalTitle}" has been diagnosed as '${diagnosis.diagnosisTitle}'. The suggested strategy is ${strategyLabel}. Help me switch to this approach.`;
}
