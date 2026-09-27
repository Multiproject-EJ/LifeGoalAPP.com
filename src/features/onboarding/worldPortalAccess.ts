/**
 * Game-first entry policy, wired in App through owner-scoped save/admin checks.
 * Paid entitlement provisioning remains unimplemented. Existing regular users are gated
 * too (explicit user decision); their saved real-world data must be preserved.
 * This is presentation policy, NOT server authorization for paid APIs.
 */
export const WORLD_PORTAL_ISLAND = 40;
export const WORLD_PORTAL_EVENT_ID = 'island-040-caretaker-world-portal-v1';

export interface WorldPortalAccessInput {
  /** Canonical earned progress, never an island-preview route/query value. */
  highestReachedIsland: number;
  /** Durable once-only handover evidence, preserved across island cycles. */
  hasEarnedPortal: boolean;
  /** Must originate from the existing verified developer/admin policy. */
  isVerifiedDeveloper: boolean;
  /** Server-confirmed entitlement; never a local switch or user_metadata. */
  hasVerifiedEarlyAccess: boolean;
}

export type WorldPortalAccessReason = 'developer' | 'earned' | 'early-access'
  | 'council-ready' | 'game-first';

export interface WorldPortalAccess {
  reason: WorldPortalAccessReason;
  startSurface: 'game' | 'today';
  canOpenFullApp: boolean;
  canLeaveGameForToday: boolean;
  canAttendCaretakerCouncil: boolean;
  canClaimPortal: boolean;
  /** Recovery reloads/resumes canonical state. It never erases a save. */
  recoveryMode: 'reload-preserving-progress';
  canOpenAccountPrivacySupport: true;
}

export function resolveWorldPortalAccess(input: WorldPortalAccessInput): WorldPortalAccess {
  const island = Number.isFinite(input.highestReachedIsland)
    ? Math.max(1, Math.floor(input.highestReachedIsland)) : 1;
  const councilReady = island >= WORLD_PORTAL_ISLAND;
  const reason: WorldPortalAccessReason = input.isVerifiedDeveloper ? 'developer'
    : input.hasEarnedPortal ? 'earned'
      : input.hasVerifiedEarlyAccess ? 'early-access'
        : councilReady ? 'council-ready' : 'game-first';
  const canOpenFullApp = reason !== 'game-first' && reason !== 'council-ready';
  return {
    reason,
    startSurface: canOpenFullApp ? 'today' : 'game',
    canOpenFullApp,
    canLeaveGameForToday: canOpenFullApp,
    canAttendCaretakerCouncil: councilReady,
    // Purchase/dev access does not grant island progress or replace the story.
    canClaimPortal: councilReady && !input.hasEarnedPortal,
    recoveryMode: 'reload-preserving-progress',
    canOpenAccountPrivacySupport: true,
  };
}

/** Shared allowlist for menus and route/deep-link guards; hiding Exit is insufficient. */
export function canOpenWorkspaceWithWorldPortal(access: WorldPortalAccess, workspace: string): boolean {
  return access.canOpenFullApp || ['game', 'account', 'support'].includes(workspace);
}

/** Story brief only. No rewards/actions embedded in conversation content. */
export const WORLD_PORTAL_COUNCIL_BRIEF = Object.freeze({
  eventId: WORLD_PORTAL_EVENT_ID,
  islandNumber: WORLD_PORTAL_ISLAND,
  participants: 'All island caretakers',
  title: 'The Meeting Between Worlds',
  beats: Object.freeze([
    'All caretakers gather on Island 40, with remote links where needed.',
    'They reflect on the small choices and discoveries the player has made.',
    'They offer the portal: a way to carry those discoveries into everyday life.',
    'The player accepts the tool; canonical ownership is recorded once before presentation.',
    'Today opens with editable suggestions, only using answers the player has agreed to use.',
  ]),
  replay: 'Replay the meeting without granting ownership or rewards again.',
  existingLaterPlayers: 'Offer a recoverable council invitation; never require replaying forty islands.',
});
