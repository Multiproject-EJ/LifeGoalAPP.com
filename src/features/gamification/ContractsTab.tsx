import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  GamificationProfile,
  CommitmentContract,
  ContractEvaluation,
} from '../../types/gamification';
import {
  fetchContracts,
  fetchContractEvaluations,
  recordContractProgress,
  pauseContract,
  cancelContract,
  resumeContract,
  evaluateContract,
  evaluateDueContracts,
  syncContractProgressWithTarget,
  getReduceStakeEligibility,
  getGentleRecoveryEligibility,
  getResetContractEligibility,
  activateGentleRampRecovery,
  resetContractWithSameSettings,
  reduceContractStake,
  recordWitnessPing,
  fetchContractSweepHealth,
  logOutcomeOnlyContractFailure,
  MAX_ACTIVE_CONTRACTS,
  type ReduceStakeEligibility,
  type GentleRecoveryEligibility,
  type ContractSweepHealth,
  type ResetContractEligibility,
} from '../../services/commitmentContracts';
import { ContractWizard } from './ContractWizard';
import { ContractStatusCard } from './ContractStatusCard';
import { ContractResultModal } from './ContractResultModal';
import { ContractHistoryCard } from './ContractHistoryCard';
import { ReputationCard } from './ReputationCard';
import { claimContractLinkedReward, fetchLinkedRewardForContract, type ContractRewardLink } from '../../services/contractRewards';

function buildAccountabilityBuddyReminder(contract: CommitmentContract): string {
  const witnessName = contract.witnessLabel ?? 'my accountability buddy';
  const cadenceLabel = contract.cadence === 'daily' ? 'today' : 'this week';
  return `Hey ${witnessName} — quick promise check-in: I'm aiming for ${contract.targetCount} ${contract.targetType.toLowerCase()} completions ${cadenceLabel} for "${contract.title}". This is just a reminder message, and a little encouragement from you would help 💛`;
}

interface ContractsTabProps {
  session: Session | null;
  profile: GamificationProfile | null;
  enabled: boolean;
  loading: boolean;
  onWizardOpen?: () => void;
  onWizardClose?: () => void;
}

function getWindowEnd(contract: CommitmentContract): Date {
  const windowStart = new Date(contract.currentWindowStart);
  const end = new Date(windowStart);

  if (contract.cadence === 'daily') {
    end.setHours(23, 59, 59, 999);
  } else {
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  return end;
}

function pickPrimaryContract(contracts: CommitmentContract[]): CommitmentContract | null {
  const active = contracts.find((contract) => contract.status === 'active');
  if (active) return active;

  const paused = contracts
    .filter((contract) => contract.status === 'paused')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return paused[0] ?? null;
}

function pickSelectedContractId(
  contracts: CommitmentContract[],
  previousSelectionId: string | null,
): string | null {
  if (contracts.length === 0) return null;
  if (previousSelectionId && contracts.some((contract) => contract.id === previousSelectionId)) {
    return previousSelectionId;
  }
  return pickPrimaryContract(contracts)?.id ?? null;
}

function getContractProgressPercent(contract: CommitmentContract): number {
  const safeTarget = Math.max(contract.targetCount, 1);
  return Math.min(100, Math.round((contract.currentProgress / safeTarget) * 100));
}

function buildCascadingChains(contracts: CommitmentContract[]): CommitmentContract[][] {
  const byId = new Map(contracts.map((contract) => [contract.id, contract]));
  const chainedIds = new Set<string>();
  contracts.forEach((contract) => {
    if (contract.unlocksContractId) chainedIds.add(contract.unlocksContractId);
  });

  const roots = contracts.filter((contract) => contract.contractType === 'cascading' && !chainedIds.has(contract.id));
  const chains: CommitmentContract[][] = [];

  roots.forEach((root) => {
    const chain: CommitmentContract[] = [];
    const seen = new Set<string>();
    let cursor: CommitmentContract | undefined = root;
    while (cursor && !seen.has(cursor.id)) {
      chain.push(cursor);
      seen.add(cursor.id);
      cursor = cursor.unlocksContractId ? byId.get(cursor.unlocksContractId) : undefined;
    }
    if (chain.length > 0) chains.push(chain);
  });

  return chains;
}

export function ContractsTab({
  session,
  profile,
  enabled,
  loading,
  onWizardOpen,
  onWizardClose,
}: ContractsTabProps) {
  const userId = session?.user?.id ?? profile?.user_id ?? '';
  const zenTokens = profile?.zen_tokens ?? 0;
  const [goldBalance, setGoldBalance] = useState(profile?.total_points ?? 0);
  const [activeContracts, setActiveContracts] = useState<CommitmentContract[]>([]);
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [showSystemInfoModal, setShowSystemInfoModal] = useState(false);
  const [showEvaluationInfoModal, setShowEvaluationInfoModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [contractResult, setContractResult] = useState<ContractEvaluation | null>(null);
  const [resultContract, setResultContract] = useState<CommitmentContract | null>(null);
  const [reduceStakeEligibility, setReduceStakeEligibility] = useState<ReduceStakeEligibility | null>(null);
  const [gentleRecoveryEligibility, setGentleRecoveryEligibility] = useState<GentleRecoveryEligibility | null>(null);
  const [resetEligibility, setResetEligibility] = useState<ResetContractEligibility | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyEvaluationsByContractId, setHistoryEvaluationsByContractId] = useState<Record<string, ContractEvaluation[]>>({});
  const [overdueCatchUpMessage, setOverdueCatchUpMessage] = useState<string | null>(null);
  const [sweepHealth, setSweepHealth] = useState<ContractSweepHealth | null>(null);
  const [resultLinkedReward, setResultLinkedReward] = useState<ContractRewardLink | null>(null);
  const [claimingLinkedReward, setClaimingLinkedReward] = useState(false);
  const [pastContracts, setPastContracts] = useState<CommitmentContract[]>([]);
  const [hiddenPastPromiseIds, setHiddenPastPromiseIds] = useState<string[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // For single-contract actions, use the primary (first active) contract
  const activeContract = activeContracts[0] ?? null;
  const activeContractCount = activeContracts.filter((c) => c.status === 'active').length;
  const canCreateMore = activeContractCount < MAX_ACTIVE_CONTRACTS;
  const cascadingChains = buildCascadingChains(activeContracts);
  const visiblePastContracts = pastContracts.filter((contract) => !hiddenPastPromiseIds.includes(contract.id));
  const hiddenPastPromiseCount = pastContracts.length - visiblePastContracts.length;
  const selectedContract = selectedContractId
    ? activeContracts.find((contract) => contract.id === selectedContractId) ?? null
    : null;

  useEffect(() => {
    if (profile?.total_points !== undefined) {
      setGoldBalance(profile.total_points);
    }
  }, [profile?.total_points]);

  const fetchEvaluationsForContract = async (contractId: string) => {
    if (!userId) return [];

    const { data: evaluations } = await fetchContractEvaluations(userId, contractId);
    return evaluations ?? [];
  };

  const refreshContractEvaluations = async (contractId: string) => {
    const safeEvaluations = await fetchEvaluationsForContract(contractId);
    setHistoryEvaluationsByContractId((prev) => ({
      ...prev,
      [contractId]: safeEvaluations,
    }));
    return safeEvaluations;
  };

  // Deferred non-critical work: server sweep + sweep health.
  // Runs after initial contracts are rendered so it never blocks first paint.
  // State updates here are intentionally separate renders (stale-while-revalidate).
  const runBackgroundEvaluation = async () => {
    if (!userId) return;

    let dueEvaluations: ContractEvaluation[] | null = null;
    let latestSweepHealth: ContractSweepHealth | null = null;
    try {
      const [dueResult, sweepResult] = await Promise.all([
        evaluateDueContracts(),
        fetchContractSweepHealth(),
      ]);
      dueEvaluations = dueResult.data;
      latestSweepHealth = sweepResult.data;
    } catch (err) {
      console.warn('Background evaluation encountered an error:', err);
      return;
    }

    setSweepHealth(latestSweepHealth ?? null);

    if (dueEvaluations && dueEvaluations.length > 0) {
      if (dueEvaluations.length > 1) {
        setOverdueCatchUpMessage(
          `Resolved ${dueEvaluations.length} overdue promise windows while you were away.`
        );
      } else {
        setOverdueCatchUpMessage(null);
      }

      const latestEvaluation = dueEvaluations
        .slice()
        .sort((a, b) => new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime())
        [dueEvaluations.length - 1];

      if (latestEvaluation) {
        const { data: freshContracts } = await fetchContracts(userId);
        const evaluatedContract = freshContracts?.find((c) => c.id === latestEvaluation.contractId) ?? null;
        if (evaluatedContract) {
          const freshEnded = (freshContracts ?? [])
            .filter((c) => c.status === 'completed' || c.status === 'cancelled')
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5);
          setPastContracts(freshEnded);

          const freshDisplay = (freshContracts ?? []).filter(
            (c) => c.status === 'active' || c.status === 'paused'
          );
          setActiveContracts(freshDisplay);

          setContractResult(latestEvaluation);
          setResultContract(evaluatedContract);
          const { data: linkedReward } = await fetchLinkedRewardForContract(userId, evaluatedContract.id);
          setResultLinkedReward(linkedReward ?? null);
        }
      }
    } else {
      setOverdueCatchUpMessage(null);
    }
  };

  const loadContract = async () => {
    if (!userId) {
      setActiveContracts([]);
      setPastContracts([]);
      setHistoryEvaluationsByContractId({});
      return;
    }

    // === PHASE 1: Fetch and immediately display current contracts (stale-while-revalidate) ===
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) return;

    const endedContracts = contracts
      .filter((contract) => contract.status === 'completed' || contract.status === 'cancelled')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
    setPastContracts(endedContracts);

    const displayContracts = contracts.filter(
      (c) => c.status === 'active' || c.status === 'paused'
    );

    // Render current contracts immediately so the tab is not blank while syncing
    setActiveContracts(displayContracts);

    // === PHASE 2: Sync progress for each active contract (serial — write-safe for all backends) ===
    const hydratedContracts: CommitmentContract[] = [];

    for (const contract of displayContracts) {
      let hydratedContract = contract;

      if (contract.status === 'active') {
        const { data: syncedContract } = await syncContractProgressWithTarget(userId, contract.id);
        if (syncedContract) {
          hydratedContract = syncedContract;
        }
      }

      hydratedContracts.push(hydratedContract);
    }

    setActiveContracts(hydratedContracts);

    // === PHASE 3: Evaluate any expired windows; single re-fetch after all evaluations ===
    let lastEvalResult: { evaluation: ContractEvaluation; contractId: string } | null = null;

    for (const contract of hydratedContracts) {
      if (contract.status === 'active' && new Date() > getWindowEnd(contract)) {
        const { data: evaluation } = await evaluateContract(userId, contract.id);
        if (evaluation) {
          lastEvalResult = { evaluation, contractId: contract.id };
        }
      }
    }

    let finalContracts = hydratedContracts;

    if (lastEvalResult !== null) {
      // Single re-fetch after ALL evaluations (replaces one fetchContracts per evaluation)
      const { data: refreshedContracts } = await fetchContracts(userId);
      if (refreshedContracts) {
        const refreshedEnded = refreshedContracts
          .filter((c) => c.status === 'completed' || c.status === 'cancelled')
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);
        setPastContracts(refreshedEnded);

        finalContracts = hydratedContracts.map((c) => {
          const refreshed = refreshedContracts.find((r) => r.id === c.id);
          return refreshed ?? c;
        });
        setActiveContracts(finalContracts);
      }

      const { contractId, evaluation } = lastEvalResult;
      const resultContractData = finalContracts.find((c) => c.id === contractId) ?? null;
      setContractResult(evaluation);
      setResultContract(resultContractData);
      const { data: linkedReward } = await fetchLinkedRewardForContract(userId, contractId);
      setResultLinkedReward(linkedReward ?? null);
    }

    // === PHASE 4: Load evaluation history in parallel ===
    const hydratedIds = new Set(finalContracts.map((c) => c.id));
    const contractsNeedingHistory = [
      ...finalContracts,
      ...endedContracts.filter((pastContract) => !hydratedIds.has(pastContract.id)),
    ];

    if (contractsNeedingHistory.length === 0) {
      setHistoryEvaluationsByContractId({});
    } else {
      const evaluationsByContract = await Promise.all(
        contractsNeedingHistory.map(async (contract) => ({
          contractId: contract.id,
          evaluations: await fetchEvaluationsForContract(contract.id),
        })),
      );
      setHistoryEvaluationsByContractId(
        evaluationsByContract.reduce<Record<string, ContractEvaluation[]>>((acc, entry) => {
          acc[entry.contractId] = entry.evaluations;
          return acc;
        }, {}),
      );
    }

    // === PHASE 5: Deferred non-critical background work (non-blocking) ===
    void runBackgroundEvaluation();
  };

  useEffect(() => {
    void loadContract();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const intervalId = window.setInterval(() => {
      void loadContract();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [userId]);

  useEffect(() => {
    setSelectedContractId((prev) => pickSelectedContractId(activeContracts, prev));
  }, [activeContracts]);

  useEffect(() => {
    if (!userId || !resultContract || !contractResult || contractResult.result !== 'miss') {
      setReduceStakeEligibility(null);
      setGentleRecoveryEligibility(null);
      setResetEligibility(null);
      return;
    }

    const hydrateEligibility = async () => {
      const stakeEligibility = await getReduceStakeEligibility(userId, resultContract);
      setReduceStakeEligibility(stakeEligibility);
      setGentleRecoveryEligibility(getGentleRecoveryEligibility(resultContract));
      setResetEligibility(getResetContractEligibility(resultContract));
    };

    void hydrateEligibility();
  }, [userId, resultContract, contractResult]);

  const handleContractWizardComplete = async () => {
    setShowContractWizard(false);
    onWizardClose?.();
    await loadContract();
  };

  const handleOpenWizard = () => {
    setShowContractWizard(true);
    onWizardOpen?.();
  };

  const handleCancelWizard = () => {
    setShowContractWizard(false);
    onWizardClose?.();
  };

  const refreshContractInList = (updated: CommitmentContract) => {
    setActiveContracts((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleMarkProgress = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const previousEvaluatedAt = target.lastEvaluatedAt;
    const { data, error } = await recordContractProgress(userId, target.id);
    if (error) {
      console.error('Failed to record progress:', error);
      setActionError(error.message);
      return;
    }

    setActionError(null);

    if (data) {
      refreshContractInList(data);
      const refreshedEvaluations = await refreshContractEvaluations(data.id);

      if (data.lastEvaluatedAt && data.lastEvaluatedAt !== previousEvaluatedAt) {
        const latestEvaluation = refreshedEvaluations[refreshedEvaluations.length - 1] ?? null;
        if (latestEvaluation) {
          setContractResult(latestEvaluation);
          setResultContract(data);
          const { data: linkedReward } = await fetchLinkedRewardForContract(userId, data.id);
          setResultLinkedReward(linkedReward);
        }
      }
    }
  };

  const handleLogOutcomeFailure = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const { data: evaluation, error } = await logOutcomeOnlyContractFailure(userId, target.id);
    if (error || !evaluation) {
      setActionError(error?.message ?? 'Unable to log failure right now.');
      return;
    }

    setActionError(null);
    const { data: refreshedContracts } = await fetchContracts(userId);
    const refreshed = refreshedContracts?.find((contract) => contract.id === target.id) ?? null;
    if (refreshed) {
      refreshContractInList(refreshed);
      setResultContract(refreshed);
    }
    setContractResult(evaluation);
    const { data: linkedReward } = await fetchLinkedRewardForContract(userId, target.id);
    setResultLinkedReward(linkedReward);
    await loadContract();
  };

  const handleFinalizeOutcomeSuccess = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const { data: evaluation, error } = await evaluateContract(userId, target.id, { forceResult: 'success' });
    if (error || !evaluation) {
      setActionError(error?.message ?? 'Unable to finalize this promise right now.');
      return;
    }

    setActionError(null);
    const { data: refreshedContracts } = await fetchContracts(userId);
    const refreshed = refreshedContracts?.find((contract) => contract.id === target.id) ?? null;
    if (refreshed) {
      refreshContractInList(refreshed);
      setResultContract(refreshed);
    }
    setContractResult(evaluation);
    const { data: linkedReward } = await fetchLinkedRewardForContract(userId, target.id);
    setResultLinkedReward(linkedReward);
    await loadContract();
  };

  const handlePauseContract = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const { data, error } = await pauseContract(userId, target.id);
    if (error) {
      console.error('Failed to pause contract:', error);
      setActionError(error.message);
      return;
    }

    setActionError(null);

    if (data) {
      refreshContractInList(data);
    }
  };

  const handleResumeContract = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const { data, error } = await resumeContract(userId, target.id);
    if (error) {
      console.error('Failed to resume contract:', error);
      setActionError(error.message);
      return;
    }

    setActionError(null);

    if (data) {
      refreshContractInList(data);
    }
  };

  const handleCancelContract = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const { data, error } = await cancelContract(userId, target.id);
    if (error) {
      console.error('Failed to cancel contract:', error);
      setActionError(error.message);
      return;
    }

    setActionError(null);

    if (data) {
      await loadContract();
    }
  };

  const handleContractResultClose = () => {
    setContractResult(null);
    setResultContract(null);
    setResultLinkedReward(null);
    setReduceStakeEligibility(null);
    setGentleRecoveryEligibility(null);
    setResetEligibility(null);
    setRecoveryMessage(null);
  };

  const handleResultClaimLinkedReward = async () => {
    if (!userId || !resultContract) return;
    setClaimingLinkedReward(true);
    const { data, error } = await claimContractLinkedReward(userId, resultContract.id);
    if (error) {
      setActionError(error.message);
    } else {
      setActionError(null);
      setRecoveryMessage(`Claimed promise reward: ${data?.rewardTitle ?? 'Reward'}.`);
    }
    setClaimingLinkedReward(false);
  };

  const handleResetContract = async () => {
    if (!resultContract || !userId) return;

    const { data, error } = await resetContractWithSameSettings(userId, resultContract.id);
    if (error || !data) {
      setRecoveryMessage(error?.message ?? 'Unable to reset this promise right now.');
      return;
    }

    refreshContractInList(data);
    await refreshContractEvaluations(data.id);
    setRecoveryMessage('Promise reset. Fresh window, same commitment.');
    setContractResult(null);
    setResultContract(null);
    setResetEligibility(null);
  };

  const handleReduceStake = async () => {
    if (!resultContract || !userId) return;

    const { data, error } = await reduceContractStake(userId, resultContract.id);
    if (error || !data) {
      setRecoveryMessage(error?.message ?? 'Unable to reduce the promise stake right now.');
      return;
    }

    refreshContractInList(data);
    await refreshContractEvaluations(data.id);
    setRecoveryMessage(`Stake reduced to ${data.stakeAmount} ${data.stakeType === 'gold' ? 'Gold' : 'Tokens'}.`);
    setContractResult(null);
    setResultContract(null);
    setResetEligibility(null);
  };


  const handleActivateGentleRecovery = async () => {
    if (!resultContract || !userId) return;

    const { data, error } = await activateGentleRampRecovery(userId, resultContract.id);
    if (error || !data) {
      setRecoveryMessage(error?.message ?? 'Unable to start gentle ramp recovery for this promise right now.');
      return;
    }

    refreshContractInList(data);
    await refreshContractEvaluations(data.id);
    setRecoveryMessage(`Gentle ramp started. Target temporarily adjusted to ${data.targetCount} this ${data.cadence}.`);
    setContractResult(null);
    setResultContract(null);
    setResetEligibility(null);
    setReduceStakeEligibility(null);
    setGentleRecoveryEligibility(null);
  };


  const handleAccountabilityBuddyReminder = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((contract) => contract.id === contractId) : activeContract;
    if (!target || !userId || target.accountabilityMode !== 'witness') return;

    const reminderMessage = buildAccountabilityBuddyReminder(target);

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'LifeGoal Promise Buddy Reminder',
          text: reminderMessage,
        });
        await recordWitnessPing(userId, target, 'share');
        setRecoveryMessage('Buddy reminder shared. This is a support nudge, not a formal witness workflow.');
        return;
      } catch (error) {
        console.warn('Share sheet unavailable, falling back to copy.', error);
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(reminderMessage);
        await recordWitnessPing(userId, target, 'clipboard');
        setRecoveryMessage('Buddy reminder copied. Send it whenever you want support.');
        return;
      } catch (error) {
        console.warn('Clipboard write failed.', error);
      }
    }

    setRecoveryMessage('Could not open share/copy in this browser. You can still message your accountability buddy manually.');
  };

  const handlePauseWeek = async () => {
    if (!activeContract || !userId) return;

    const { data, error } = await pauseContract(userId, activeContract.id);
    if (error) {
      console.error('Failed to pause contract:', error);
      setActionError(error.message);
      return;
    }

    setActionError(null);
    setContractResult(null);
    setResultContract(null);
    if (data) {
      refreshContractInList(data);
    }
  };

  const getSweepHealthCopy = () => {
    if (!sweepHealth) {
      return 'Server sweep status will appear after the first scheduled run.';
    }

    const relativeLabel = new Date(sweepHealth.triggeredAt).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (sweepHealth.status === 'success') {
      return `Latest server sweep succeeded at ${relativeLabel} (${sweepHealth.usersProcessed} users checked).`;
    }

    if (sweepHealth.status === 'running') {
      return `A server sweep is currently running (started ${relativeLabel}).`;
    }

    if (sweepHealth.status === 'partial') {
      return `Latest server sweep was partial at ${relativeLabel} (${sweepHealth.failedUsers} user failures captured).`;
    }

    return `Latest server sweep failed at ${relativeLabel}. Reliability fallbacks remain active in-app.`;
  };

  const formatArchiveDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const handleHidePastPromise = (contractId: string) => {
    setHiddenPastPromiseIds((prev) => (prev.includes(contractId) ? prev : [...prev, contractId]));
  };

  const handleShowHiddenPastPromises = () => {
    setHiddenPastPromiseIds([]);
    setShowArchiveModal(true);
  };

  return (
    <section className="score-tab">
      {loading && (
        <div className="score-tab__status" role="status">
          Loading your promises...
        </div>
      )}

      {!loading && !enabled && (
        <div className="score-tab__status">
          Gamification is currently disabled. Enable it in settings to use promises.
        </div>
      )}

      {!loading && enabled && (
        <div className="score-tab__content">
          <section className="score-tab__contracts-toolbar" aria-label="Promise dashboard toolbar">
            <div className="score-tab__contracts-toolbar-title">
              <span className="score-tab__badge" aria-hidden="true">🤝</span>
              <div>
                <p className="score-tab__eyebrow">Accountability</p>
                <h2 className="score-tab__headline">Promises</h2>
              </div>
            </div>
            {!showContractWizard && (
              <div className="score-tab__contracts-toolbar-actions">
                <button
                  type="button"
                  className="score-tab__icon-button"
                  aria-label="How the Promise System works"
                  onClick={() => setShowSystemInfoModal(true)}
                >
                  ⓘ
                </button>
                <button
                  type="button"
                  className="score-tab__icon-button"
                  aria-label="How promise evaluation works"
                  onClick={() => setShowEvaluationInfoModal(true)}
                >
                  ⏱
                </button>
                <button
                  type="button"
                  className="score-tab__archive-toggle"
                  onClick={() => setShowArchiveModal(true)}
                >
                  Archive ({visiblePastContracts.length})
                </button>
                <button
                  type="button"
                  className="score-tab__contracts-create-button score-tab__contracts-create-button--toolbar"
                  onClick={handleOpenWizard}
                  disabled={!canCreateMore}
                >
                  {canCreateMore
                    ? `+ Add Promise (${activeContractCount}/${MAX_ACTIVE_CONTRACTS})`
                    : `Promise limit reached (${MAX_ACTIVE_CONTRACTS})`}
                </button>
              </div>
            )}
          </section>
          {recoveryMessage && <p className="score-tab__status">{recoveryMessage}</p>}
          {actionError && <p className="score-tab__status">{actionError}</p>}
          {overdueCatchUpMessage && <p className="score-tab__status">{overdueCatchUpMessage}</p>}

          {activeContracts.length === 0 && !showContractWizard && (
            <div className="score-tab__contracts-empty">
              <p className="score-tab__contracts-empty-text">
                No active promise yet. Ready to make one?
              </p>
              <button
                type="button"
                className="score-tab__contracts-create-button"
                onClick={handleOpenWizard}
              >
                Create Promise
              </button>
            </div>
          )}
          {activeContracts.length > 0 && !showContractWizard && (
            <>
              <section className="score-tab__contracts-list-wrap" aria-label="Active promises">
                <ul className="score-tab__contracts-list">
                  {activeContracts.map((contract) => {
                    const progressPercent = getContractProgressPercent(contract);
                    const cadenceLabel = contract.cadence === 'daily' ? 'day' : 'week';
                    return (
                      <li key={contract.id}>
                        <button
                          type="button"
                          className={`score-tab__contract-row ${
                            selectedContractId === contract.id ? 'score-tab__contract-row--active' : ''
                          }`}
                          onClick={() => setSelectedContractId(contract.id)}
                          aria-pressed={selectedContractId === contract.id}
                        >
                          <div className="score-tab__contract-row-title">
                            <span>{contract.title}</span>
                            <span className={`score-tab__contract-row-status score-tab__contract-row-status--${contract.status}`}>
                              {contract.status === 'paused' ? 'Paused' : 'Active'}
                            </span>
                          </div>
                          <div className="score-tab__contract-row-meta">
                            <span>
                              {contract.currentProgress}/{contract.targetCount} this {cadenceLabel}
                            </span>
                            <span>{progressPercent}%</span>
                            <span>{contract.stakeAmount} {contract.stakeType === 'gold' ? 'Gold' : 'Tokens'}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {selectedContract && (
                <section className="score-tab__contract-detail" aria-label={`Promise details for ${selectedContract.title}`}>
                  <ContractStatusCard
                    contract={selectedContract}
                    onMarkProgress={() => void handleMarkProgress(selectedContract.id)}
                    onLogFailure={() => void handleLogOutcomeFailure(selectedContract.id)}
                    onFinalizeSuccess={() => void handleFinalizeOutcomeSuccess(selectedContract.id)}
                    onPause={() => void handlePauseContract(selectedContract.id)}
                    onResume={() => void handleResumeContract(selectedContract.id)}
                    onCancel={() => void handleCancelContract(selectedContract.id)}
                    onWitnessPing={() => void handleAccountabilityBuddyReminder(selectedContract.id)}
                  />
                  <ContractHistoryCard
                    contract={selectedContract}
                    evaluations={historyEvaluationsByContractId[selectedContract.id] ?? []}
                  />
                </section>
              )}

              {cascadingChains.length > 0 && (
                <section className="score-tab__chain-viz" aria-live="polite">
                  <h3 className="score-tab__chain-viz-title">Cascading promise chain</h3>
                  {cascadingChains.map((chain) => (
                    <p key={chain.map((contract) => contract.id).join('>')} className="score-tab__chain-viz-item">
                      {chain.map((contract) => contract.title).join(' → ')}
                    </p>
                  ))}
                </section>
              )}
            </>
          )}
          {showContractWizard && (
            <ContractWizard
              userId={userId}
              currentGoldBalance={goldBalance}
              currentTokenBalance={zenTokens}
              onComplete={handleContractWizardComplete}
              onCancel={handleCancelWizard}
              onRewardLinked={async (contractId) => {
                const { data: linkedReward } = await fetchLinkedRewardForContract(userId, contractId);
                if (resultContract?.id === contractId) {
                  setResultLinkedReward(linkedReward);
                }
              }}
            />
          )}

          {userId && !showContractWizard && (
            <ReputationCard userId={userId} />
          )}
        </div>
      )}

      {showSystemInfoModal && (
        <div
          className="score-tab__info-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Promise System info"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSystemInfoModal(false); }}
        >
          <div className="score-tab__info-modal">
            <h3 className="score-tab__info-modal-title">How the Promise System works</h3>
            <p className="score-tab__info-modal-body">
              Stake Gold or Tokens on an active promise and track progress in this dashboard.
            </p>
            <p className="score-tab__info-modal-body">{getSweepHealthCopy()}</p>
            <button
              type="button"
              className="score-tab__info-modal-close"
              onClick={() => setShowSystemInfoModal(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {showEvaluationInfoModal && (
        <div
          className="score-tab__info-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Promise evaluation info"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEvaluationInfoModal(false); }}
        >
          <div className="score-tab__info-modal">
            <h3 className="score-tab__info-modal-title">How evaluation works</h3>
            <p className="score-tab__info-modal-body">
              Promises evaluate at the end of each day or week. This screen runs checks when opened.
            </p>
            <p className="score-tab__info-modal-body">
              If you are away, the server sweep catches up and applies results automatically.
            </p>
            <button
              type="button"
              className="score-tab__info-modal-close"
              onClick={() => setShowEvaluationInfoModal(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {showArchiveModal && (
        <div
          className="score-tab__info-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Archived promises"
          onClick={(e) => { if (e.target === e.currentTarget) setShowArchiveModal(false); }}
        >
          <div className="score-tab__info-modal score-tab__archive-modal">
            <h3 className="score-tab__info-modal-title">Past Promises ({visiblePastContracts.length})</h3>
            <p className="score-tab__info-modal-body">
              Completed, broken, and cancelled promises are kept here.
            </p>
            {hiddenPastPromiseCount > 0 && (
              <button
                type="button"
                className="score-tab__archive-link"
                onClick={handleShowHiddenPastPromises}
              >
                Show hidden archive items ({hiddenPastPromiseCount})
              </button>
            )}
            {visiblePastContracts.length === 0 ? (
              <p className="score-tab__past-promises-empty">No completed or broken promises yet.</p>
            ) : (
              <ul className="score-tab__past-promises-list">
                {visiblePastContracts.map((contract) => {
                  const evaluations = historyEvaluationsByContractId[contract.id] ?? [];
                  const latestEvaluation = evaluations.reduce<ContractEvaluation | null>((latest, current) => {
                    if (!latest) return current;
                    return new Date(current.evaluatedAt).getTime() > new Date(latest.evaluatedAt).getTime()
                      ? current
                      : latest;
                  }, null);
                  const resultLabel = latestEvaluation
                    ? latestEvaluation.result === 'success'
                      ? 'Kept'
                      : 'Broken'
                    : contract.status === 'cancelled'
                      ? 'Cancelled'
                      : contract.status === 'completed'
                        ? 'Completed'
                        : 'Ended';
                  const resultDate = latestEvaluation?.evaluatedAt ?? contract.updatedAt;
                  const impactText = latestEvaluation
                    ? latestEvaluation.result === 'success'
                      ? `+${latestEvaluation.bonusAwarded} ${contract.stakeType === 'gold' ? 'Gold' : 'Tokens'}`
                      : `-${latestEvaluation.stakeForfeited} ${contract.stakeType === 'gold' ? 'Gold' : 'Tokens'}`
                    : 'Impact unavailable';

                  return (
                    <li key={contract.id} className="score-tab__past-promises-item">
                      <div className="score-tab__past-promises-row">
                        <div>
                          <p className="score-tab__past-promises-title">{contract.title}</p>
                          <div className="score-tab__past-promises-meta">
                            <span>{resultLabel}</span>
                            <span>{formatArchiveDate(resultDate)}</span>
                            <span>{impactText}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="score-tab__archive-item-button"
                          onClick={() => handleHidePastPromise(contract.id)}
                        >
                          Hide from archive
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              type="button"
              className="score-tab__info-modal-close"
              onClick={() => setShowArchiveModal(false)}
            >
              Close archive
            </button>
          </div>
        </div>
      )}

      {contractResult && resultContract && (
        <ContractResultModal
          contract={resultContract}
          evaluation={contractResult}
          resetEligibility={resetEligibility}
          reduceStakeEligibility={reduceStakeEligibility}
          gentleRecoveryEligibility={gentleRecoveryEligibility}
          onClose={handleContractResultClose}
          onResetContract={handleResetContract}
          onReduceStake={handleReduceStake}
          onActivateGentleRecovery={handleActivateGentleRecovery}
          onPauseWeek={handlePauseWeek}
          onCancelContract={handleCancelContract}
          linkedRewardTitle={resultLinkedReward?.rewardTitle ?? null}
          onClaimLinkedReward={handleResultClaimLinkedReward}
          claimingLinkedReward={claimingLinkedReward}
        />
      )}
    </section>
  );
}
