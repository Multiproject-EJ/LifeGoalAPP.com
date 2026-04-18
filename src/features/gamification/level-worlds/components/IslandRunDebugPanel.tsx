/**
 * IslandRunDebugPanel — Comprehensive troubleshooting & debugging overlay.
 *
 * Accessible from the topbar ☰ menu. Displays all critical game state including
 * Supabase-persisted and local runtime data to help diagnose sync issues,
 * egg hatchery bugs, dice/economy discrepancies, and more.
 */

import { useEffect, useMemo, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { IslandRunRuntimeState } from '../services/islandRunRuntimeState';

// ── Types ────────────────────────────────────────────────────────────────────

interface DebugPanelProps {
  session: Session;
  client: SupabaseClient | null;
  runtimeState: IslandRunRuntimeState;
  localState: IslandRunDebugLocalState;
  onClose: () => void;
}

export interface IslandRunDebugLocalState {
  islandNumber: number;
  tokenIndex: number;
  dicePool: number;
  essence: number;
  shards: number;
  shields: number;
  diamonds: number;
  coins: number;
  spinTokens: number;
  eggStage: number;
  activeStopId: string | null;
  isRolling: boolean;
  cameraMode: string;
  timeLeftSec: number;
  showTravelOverlay: boolean;
  islandExpiresAtMs: number;
  islandStartedAtMs: number;
  hasHydratedRuntimeState: boolean;
  diceRegenCountdown: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || ms <= 0) return '—';
  return new Date(ms).toISOString();
}

function fmtBool(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return v ? '✅ yes' : '❌ no';
}

function fmtJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

type DebugSection = {
  title: string;
  rows: Array<{ label: string; value: string; warn?: boolean }>;
};

// ── Component ────────────────────────────────────────────────────────────────

export function IslandRunDebugPanel({ session, client, runtimeState, localState, onClose }: DebugPanelProps) {
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [supabaseLatencyMs, setSupabaseLatencyMs] = useState<number | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Ping Supabase to check connectivity
  useEffect(() => {
    if (!client) {
      setSupabaseStatus('error');
      setSupabaseError('No Supabase client available');
      return;
    }
    const start = performance.now();
    (async () => {
      try {
        const { error } = await client
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .limit(1)
          .single();
        const elapsed = Math.round(performance.now() - start);
        setSupabaseLatencyMs(elapsed);
        if (error) {
          setSupabaseStatus('error');
          setSupabaseError(`${error.code ?? 'UNKNOWN'}: ${error.message}`);
        } else {
          setSupabaseStatus('ok');
        }
      } catch (err: unknown) {
        setSupabaseStatus('error');
        setSupabaseError(String(err));
      }
    })();
  }, [client, session.user.id]);

  const now = Date.now();

  const sections: DebugSection[] = useMemo(() => {
    const rs = runtimeState;
    const ls = localState;

    const userSection: DebugSection = {
      title: '👤 User & Session',
      rows: [
        { label: 'User ID', value: session.user.id },
        { label: 'Email', value: session.user.email ?? '—' },
        { label: 'Display name', value: session.user.user_metadata?.full_name ?? '—' },
        { label: 'Session expires', value: fmtMs((session.expires_at ?? 0) * 1000) },
        { label: 'Supabase status', value: supabaseStatus === 'checking' ? '⏳ checking…' : supabaseStatus === 'ok' ? `✅ connected (${supabaseLatencyMs}ms)` : `❌ error`, warn: supabaseStatus === 'error' },
        ...(supabaseError ? [{ label: 'Supabase error', value: supabaseError, warn: true }] : []),
      ],
    };

    const islandSection: DebugSection = {
      title: '🏝️ Island State',
      rows: [
        { label: 'Current island', value: String(rs.currentIslandNumber) },
        { label: 'Cycle index', value: String(rs.cycleIndex) },
        { label: 'Token index (runtime)', value: String(rs.tokenIndex) },
        { label: 'Token index (local)', value: String(ls.tokenIndex), warn: rs.tokenIndex !== ls.tokenIndex },
        { label: 'Island started', value: fmtMs(rs.islandStartedAtMs) },
        { label: 'Island expires', value: fmtMs(rs.islandExpiresAtMs) },
        { label: 'Time left (sec)', value: String(ls.timeLeftSec) },
        { label: 'Timer pending start', value: fmtBool(ls.islandExpiresAtMs <= 0) },
        { label: 'Travel overlay visible', value: fmtBool(ls.showTravelOverlay) },
        { label: 'Hydrated', value: fmtBool(ls.hasHydratedRuntimeState) },
        { label: 'Runtime version', value: String(rs.runtimeVersion) },
      ],
    };

    const diceSection: DebugSection = {
      title: '🎲 Dice & Rolling',
      rows: [
        { label: 'Dice pool (runtime)', value: String(rs.dicePool) },
        { label: 'Dice pool (local)', value: String(ls.dicePool), warn: rs.dicePool !== ls.dicePool },
        { label: 'Is rolling', value: fmtBool(ls.isRolling) },
        { label: 'Regen max dice', value: rs.diceRegenState ? String(rs.diceRegenState.maxDice) : '—' },
        { label: 'Regen rate/hr', value: rs.diceRegenState ? String(rs.diceRegenState.regenRatePerHour) : '—' },
        { label: 'Regen last tick', value: rs.diceRegenState ? fmtMs(rs.diceRegenState.lastRegenAtMs) : '—' },
        { label: 'Regen countdown', value: ls.diceRegenCountdown ?? '—' },
      ],
    };

    const economySection: DebugSection = {
      title: '💰 Economy',
      rows: [
        { label: 'Essence', value: String(rs.essence) },
        { label: 'Essence lifetime earned', value: String(rs.essenceLifetimeEarned) },
        { label: 'Essence lifetime spent', value: String(rs.essenceLifetimeSpent) },
        { label: 'Coins (legacy)', value: String(rs.coins) },
        { label: 'Shards', value: String(rs.shards) },
        { label: 'Shields', value: String(rs.shields) },
        { label: 'Diamonds', value: String(rs.diamonds) },
        { label: 'Spin tokens', value: String(rs.spinTokens) },
        { label: 'Island shards', value: String(rs.islandShards) },
        { label: 'Shard tier index', value: String(rs.shardTierIndex) },
        { label: 'Shard claim count', value: String(rs.shardClaimCount) },
      ],
    };

    const eggSection: DebugSection = {
      title: '🥚 Egg & Hatchery',
      rows: [
        { label: 'Active egg tier', value: rs.activeEggTier ?? '—' },
        { label: 'Egg set at', value: fmtMs(rs.activeEggSetAtMs) },
        { label: 'Egg hatch duration', value: rs.activeEggHatchDurationMs ? `${Math.round(rs.activeEggHatchDurationMs / 60000)}min` : '—' },
        { label: 'Egg is dormant', value: fmtBool(rs.activeEggIsDormant) },
        { label: 'Egg stage (local)', value: String(ls.eggStage) },
        { label: 'Per-island eggs count', value: String(Object.keys(rs.perIslandEggs ?? {}).length) },
        ...Object.entries(rs.perIslandEggs ?? {}).map(([key, entry]) => ({
          label: `  Island ${key} egg`,
          value: `${entry.status} | ${entry.tier} | set:${fmtMs(entry.setAtMs)} | hatch:${fmtMs(entry.hatchAtMs)}`,
          warn: entry.status === 'incubating' && now >= entry.hatchAtMs,
        })),
      ],
    };

    const stopsSection: DebugSection = {
      title: '🏗️ Stops & Build',
      rows: [
        { label: 'Active stop', value: ls.activeStopId ?? '—' },
        { label: 'Active stop index', value: String(rs.activeStopIndex) },
        { label: 'Active stop type', value: rs.activeStopType },
        { label: 'Boss unlocked', value: fmtBool(rs.bossState?.unlocked) },
        { label: 'Boss obj complete', value: fmtBool(rs.bossState?.objectiveComplete) },
        { label: 'Boss build complete', value: fmtBool(rs.bossState?.buildComplete) },
        { label: 'Boss resolved island', value: rs.bossTrialResolvedIslandNumber !== null ? String(rs.bossTrialResolvedIslandNumber) : '—' },
        ...rs.stopStatesByIndex.map((s, i) => ({
          label: `  Stop ${i}`,
          value: `obj:${fmtBool(s.objectiveComplete)} build:${fmtBool(s.buildComplete)}${s.completedAtMs ? ' @' + fmtMs(s.completedAtMs) : ''}`,
        })),
        ...rs.stopBuildStateByIndex.map((b, i) => ({
          label: `  Build ${i}`,
          value: `L${b.buildLevel} | ${b.spentEssence}/${b.requiredEssence} essence`,
        })),
      ],
    };

    const completedStopsSection: DebugSection = {
      title: '✅ Completed Stops by Island',
      rows: Object.entries(rs.completedStopsByIsland ?? {}).map(([key, stops]) => ({
        label: `Island ${key}`,
        value: Array.isArray(stops) ? stops.join(', ') || '(none)' : '—',
      })),
    };

    const rewardBarSection: DebugSection = {
      title: '🎁 Reward Bar',
      rows: [
        { label: 'Progress', value: `${rs.rewardBarProgress} / ${rs.rewardBarThreshold}` },
        { label: 'Claims in event', value: String(rs.rewardBarClaimCountInEvent) },
        { label: 'Escalation tier', value: String(rs.rewardBarEscalationTier) },
        { label: 'Last claim', value: fmtMs(rs.rewardBarLastClaimAtMs) },
        { label: 'Bound event', value: rs.rewardBarBoundEventId ?? '—' },
        { label: 'Ladder ID', value: rs.rewardBarLadderId ?? '—' },
      ],
    };

    const companionSection: DebugSection = {
      title: '🐾 Creatures & Companion',
      rows: [
        { label: 'Active companion', value: rs.activeCompanionId ?? '—' },
        { label: 'Perfect companions', value: rs.perfectCompanionIds?.length ? rs.perfectCompanionIds.join(', ') : '—' },
        { label: 'Collection size', value: String(rs.creatureCollection?.length ?? 0) },
        { label: 'Treats (basic)', value: String(rs.creatureTreatInventory?.basic ?? 0) },
        { label: 'Treats (favorite)', value: String(rs.creatureTreatInventory?.favorite ?? 0) },
        { label: 'Treats (rare)', value: String(rs.creatureTreatInventory?.rare ?? 0) },
        { label: 'Last visit key', value: rs.companionBonusLastVisitKey ?? '—' },
      ],
    };

    const eventSection: DebugSection = {
      title: '🎪 Timed Event',
      rows: rs.activeTimedEvent
        ? [
            { label: 'Event ID', value: rs.activeTimedEvent.eventId },
            { label: 'Event type', value: rs.activeTimedEvent.eventType },
            { label: 'Started', value: fmtMs(rs.activeTimedEvent.startedAtMs) },
            { label: 'Expires', value: fmtMs(rs.activeTimedEvent.expiresAtMs) },
            { label: 'Feeding actions', value: String(rs.activeTimedEventProgress?.feedingActions ?? 0) },
            { label: 'Tokens earned', value: String(rs.activeTimedEventProgress?.tokensEarned ?? 0) },
            { label: 'Milestones claimed', value: String(rs.activeTimedEventProgress?.milestonesClaimed ?? 0) },
          ]
        : [{ label: 'Status', value: 'No active event' }],
    };

    const miscSection: DebugSection = {
      title: '⚙️ Misc Flags',
      rows: [
        { label: 'First run claimed', value: fmtBool(rs.firstRunClaimed) },
        { label: 'Story prologue seen', value: fmtBool(rs.storyPrologueSeen) },
        { label: 'Audio enabled', value: fmtBool(rs.audioEnabled) },
        { label: 'Onboarding name done', value: fmtBool(rs.onboardingDisplayNameLoopCompleted) },
        { label: 'Camera mode', value: ls.cameraMode },
        { label: 'Sticker fragments', value: String(rs.stickerProgress?.fragments ?? 0) },
      ],
    };

    return [
      userSection,
      islandSection,
      diceSection,
      economySection,
      eggSection,
      stopsSection,
      completedStopsSection,
      rewardBarSection,
      companionSection,
      eventSection,
      miscSection,
    ];
  }, [session, runtimeState, localState, supabaseStatus, supabaseLatencyMs, supabaseError, now]);

  const handleCopyAll = () => {
    const lines: string[] = [
      `=== Island Run Debug Snapshot ===`,
      `Generated: ${new Date().toISOString()}`,
      ``,
    ];
    for (const section of sections) {
      lines.push(`── ${section.title} ──`);
      for (const row of section.rows) {
        lines.push(`  ${row.label}: ${row.value}${row.warn ? ' ⚠️' : ''}`);
      }
      lines.push('');
    }
    // Also append raw runtimeState JSON
    lines.push(`── Raw Runtime State (JSON) ──`);
    lines.push(fmtJson(runtimeState));

    navigator.clipboard.writeText(lines.join('\n')).then(
      () => {
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 2000);
      },
      () => {
        // Clipboard write can fail in some browsers/contexts. Show feedback.
        setCopiedToClipboard(false);
        // eslint-disable-next-line no-console
        console.warn('[IslandRun] Debug panel: clipboard write failed');
      },
    );
  };

  return (
    <div className="island-run-debug-panel-backdrop" role="presentation" onClick={onClose}>
      <div
        className="island-run-debug-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Debug panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="island-run-debug-panel__header">
          <h3 className="island-run-debug-panel__title">🔧 Debug Panel</h3>
          <div className="island-run-debug-panel__header-actions">
            <button
              type="button"
              className="island-run-debug-panel__copy-btn"
              onClick={handleCopyAll}
            >
              {copiedToClipboard ? '✅ Copied!' : '📋 Copy All'}
            </button>
            <button type="button" className="island-run-debug-panel__close" onClick={onClose} aria-label="Close debug panel">
              ✕
            </button>
          </div>
        </div>
        <div className="island-run-debug-panel__body">
          {sections.map((section) => (
            <details key={section.title} className="island-run-debug-panel__section" open>
              <summary className="island-run-debug-panel__section-title">{section.title}</summary>
              <table className="island-run-debug-panel__table">
                <tbody>
                  {section.rows.map((row, i) => (
                    <tr key={i} className={row.warn ? 'island-run-debug-panel__row--warn' : undefined}>
                      <td className="island-run-debug-panel__label">{row.label}</td>
                      <td className="island-run-debug-panel__value">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
