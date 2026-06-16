#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function requirePattern(filePath, pattern, description) {
  const content = readFileSync(filePath, 'utf8');
  if (!pattern.test(content)) {
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
    /SAFETY_FIRST_RESOLUTION_OPTIONS[\s\S]*trusted support[\s\S]*does not require negotiation, apology, or agreement/,
    'Safety fallback uses support-oriented language instead of normal mutual-resolution language',
  );

  requirePattern(
    'src/features/conflict-resolver/services/conflictAiOrchestrator.ts',
    /buildConflictRoutingPromptContext\(input\.conflictRouting\)/,
    'Prompt builders include routing context helper output',
  );

  requirePattern(
    'docs/conflict-resolver/09_ACCEPTANCE_VALIDATION_RUNBOOK.md',
    /PR5 \+ PR6/,
    'Acceptance validation runbook exists',
  );

  console.log('\nConflict Resolver smoke validation checks passed.');
}

run();
