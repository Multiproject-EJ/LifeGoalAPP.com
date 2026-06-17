#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function requirePattern(filePath, pattern, description) {
  const content = readFileSync(filePath, 'utf8');
  if (!pattern.test(content)) {
    throw new Error(`[FAIL] ${description} (${filePath})`);
  }
  console.log(`[PASS] ${description}`);
}

function rejectPattern(filePath, pattern, description) {
  const content = readFileSync(filePath, 'utf8');
  if (pattern.test(content)) {
    throw new Error(`[FAIL] ${description} (${filePath})`);
  }
  console.log(`[PASS] ${description}`);
}

function run() {
  requirePattern(
    'src/features/conflict-resolver/services/conflictInvites.ts',
    /VITE_CONFLICT_INVITE_BASE_URL/,
    'Invite base URL is configurable via environment variable',
  );

  requirePattern(
    'src/features/conflict-resolver/ConflictResolverExperience.tsx',
    /Invite links ready/,
    'Agreement finalized UI exposes generated invite links section',
  );

  requirePattern(
    'src/features/conflict-resolver/hooks/useConflictSession.ts',
    /createConflictInvite\(/,
    'Session finalization can generate lightweight invites',
  );

  requirePattern(
    'src/features/conflict-resolver/hooks/useConflictSession.ts',
    /sanitizeForSharedSummary/,
    'Shared-summary moderation pipeline is present',
  );

  requirePattern(
    'src/features/conflict-resolver/screens/ParallelReadScreen.tsx',
    /onKeyDown=\{/,
    'Parallel Read supports keyboard interaction',
  );

  requirePattern(
    'src/features/conflict-resolver/services/conflictAnalytics.ts',
    /conflict\.agreement_finalized/,
    'Agreement-finalized analytics event is defined',
  );


  requirePattern(
    'src/features/conflict-resolver/services/conflictResolutionGuidance.ts',
    /personality_annoyance[\s\S]*misunderstanding[\s\S]*boundary_issue[\s\S]*unfairness_imbalance[\s\S]*hurt_broken_trust[\s\S]*different_needs_values[\s\S]*practical_decision[\s\S]*repeated_pattern[\s\S]*unsure/,
    'Category-aware resolution guidance covers all routing types',
  );

  requirePattern(
    'src/features/conflict-resolver/services/conflictResolutionGuidance.ts',
    /if \(input\.safetyFlag\)[\s\S]*SAFETY_FIRST_GUIDANCE/,
    'Safety-first resolution guidance overrides mutual-resolution copy',
  );

  requirePattern(
    'src/features/conflict-resolver/screens/ResolutionBuilderScreen.tsx',
    /getConflictResolutionGuidance\(\{ primaryConflictType, safetyFlag \}\)/,
    'Resolution builder renders deterministic routing guidance',
  );

  requirePattern(
    'src/features/conflict-resolver/hooks/useConflictSession.ts',
    /generateSharedSummaryCards\(\{[\s\S]*conflictRouting/,
    'Routing context is wired into shared summary generation',
  );

  requirePattern(
    'src/features/conflict-resolver/hooks/useConflictSession.ts',
    /generateResolutionOptions\(\{[\s\S]*conflictRouting/,
    'Routing context is wired into resolution option generation',
  );

  requirePattern(
    'src/features/conflict-resolver/services/conflictRoutingPromptContext.ts',
    /lens\/context, not truth/,
    'Routing prompt context treats selected category as a lens, not truth',
  );

  requirePattern(
    'src/features/conflict-resolver/services/conflictRoutingPromptContext.ts',
    /SAFETY OVERRIDE[\s\S]*Do not frame this as a shared problem to solve together[\s\S]*Do not recommend inviting the other person, negotiating, apologizing, reconciling, meeting privately, or creating an agreement/,
    'Safety override instructions block mutual-resolution pressure',
  );

  requirePattern(
    'src/features/conflict-resolver/services/conflictResolutionFallbacks.ts',
    /SAFETY_FIRST_RESOLUTION_OPTIONS[\s\S]*trusted support[\s\S]*does not require negotiation or the other person’s participation/,
    'Safety fallback uses support-oriented language instead of normal mutual-resolution language',
  );

  requirePattern(
    'src/features/conflict-resolver/services/conflictAiOrchestrator.ts',
    /buildConflictRoutingPromptContext\(input\.conflictRouting\)/,
    'Prompt builders include routing context helper output',
  );



  requirePattern(
    'src/features/conflict-resolver/services/conflictAiOrchestrator.ts',
    /parsedFairnessWarnings[\s\S]*shouldUseFallback = parsed\.length === 0 \|\| parsedFairnessWarnings\.length > 0[\s\S]*const options = shouldUseFallback \? fallbackOptions : parsed/,
    'Resolution options treat AI fairness warnings as hard fallback before returning options',
  );

  requirePattern(
    'src/features/conflict-resolver/services/conflictAiOrchestrator.ts',
    /fallbackReason === 'fairness_warnings'[\s\S]*Fairness warnings:[\s\S]*source: resolvedOptions\.source[\s\S]*rejectedAiOptionCount/,
    'Resolution option fairness fallback records warning metadata without returning warned AI options',
  );

  requirePattern(
    'src/features/conflict-resolver/services/conflictAiOrchestrator.ts',
    /return \{ options, fairnessWarnings, mode: shouldUseFallback \? 'fallback' : decision\.mode \}/,
    'Resolution option fairness fallback returns fallback mode when warned AI options are rejected',
  );

  requirePattern(
    'src/features/conflict-resolver/hooks/useConflictSession.ts',
    /resolveResolutionBuilderNextStage[\s\S]*'safety_support_close'[\s\S]*setStageWithSync\(nextStage\)[\s\S]*moveToApologyAlignment/,
    'Safety-flagged resolution builder route skips apology alignment',
  );

  requirePattern(
    'src/features/conflict-resolver/screens/ResolutionBuilderScreen.tsx',
    /const canContinue = safetyFlag \|\| Boolean\(selectedOptionId\) \|\| Boolean\(activeProposalId\)/,
    'Safety-flagged resolution builder can continue without a selected resolution or proposal',
  );

  requirePattern(
    'src/features/conflict-resolver/screens/SafetySupportCloseScreen.tsx',
    /Support plan saved[\s\S]*focus on safety, support, and what you can control[\s\S]*Finish/,
    'Safety support close screen uses support-first finish copy',
  );

  requirePattern(
    'src/features/conflict-resolver/ConflictResolverExperience.tsx',
    /session\.stage === 'safety_support_close'[\s\S]*<SafetySupportCloseScreen onFinish=\{session\.resetFlow\}/,
    'Safety support close screen is mounted locally in Conflict Resolver',
  );

  rejectPattern(
    'src/features/conflict-resolver/screens/SafetySupportCloseScreen.tsx',
    /agreement|reconciliation|reconcile|invite|both apologize|resolve together/i,
    'Safety support close screen avoids mutual-repair and shared-finalization language',
  );


  requirePattern(
    'src/features/conflict-resolver/hooks/useConflictSession.ts',
    /const resolveSharedSessionUiStage = \([\s\S]*status === 'private_capture'[\s\S]*routingCompleted \? 'private_capture' : 'conflict_type_routing'/,
    'Shared-session private_capture hydration routes through conflict type routing until routing is completed',
  );

  requirePattern(
    'src/features/conflict-resolver/hooks/useConflictSession.ts',
    /conflictTypeRoutingCompleted[\s\S]*setConflictTypeRoutingCompleted\(Boolean\(parsed\.conflictTypeRoutingCompleted\)\)[\s\S]*setConflictTypeRoutingCompleted\(true\)/,
    'Conflict type routing completion is persisted in local draft/session state',
  );

  rejectPattern(
    'src/features/conflict-resolver/hooks/useConflictSession.ts',
    /CONFLICT_STAGE_TO_UI:[\s\S]*private_capture: 'private_capture'/,
    'Persisted private_capture is not directly mapped to UI private_capture without routing completion guard',
  );


  requirePattern(
    'src/features/conflict-resolver/services/conflictAiOrchestrator.ts',
    /EMPTY_SHARED_SUMMARY_FALLBACK_CARDS:\s*SharedSummaryCard\[\]\s*=\s*\[\]/,
    'AI-unavailable shared summary returns empty fallback cards so local sanitized answer cards can render',
  );

  rejectPattern(
    'src/features/conflict-resolver/services/conflictAiOrchestrator.ts',
    /No summary available yet|No emotional summary available yet|No needs summary available yet/,
    'Shared-summary AI fallback does not return generic unavailable placeholder cards',
  );

  requirePattern(
    'src/features/conflict-resolver/hooks/useConflictSession.ts',
    /buildSharedSummaryCardsForDisplay[\s\S]*aiSummaryCards && input\.aiSummaryCards\.length > 0[\s\S]*sanitizeForSharedSummary\(raw\)/,
    'Local sanitized answer-based summary cards are used when AI summary cards are empty',
  );

  requirePattern(
    'docs/conflict-resolver/09_ACCEPTANCE_VALIDATION_RUNBOOK.md',
    /PR5 \+ PR6/,
    'Acceptance validation runbook exists',
  );

  console.log('\nConflict Resolver smoke validation checks passed.');
}

run();
