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
    'docs/conflict-resolver/09_ACCEPTANCE_VALIDATION_RUNBOOK.md',
    /PR5 \+ PR6/,
    'Acceptance validation runbook exists',
  );

  console.log('\nConflict Resolver smoke validation checks passed.');
}

run();
