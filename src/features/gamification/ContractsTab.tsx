import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  GamificationProfile,
  CommitmentContract,
  ContractEvaluation,
} from '../../types/gamification';
import {
  fetchActiveContract,
  recordContractProgress,
  pauseContract,
  cancelContract,
} from '../../services/commitmentContracts';
import { ContractWizard } from './ContractWizard';
import { ContractStatusCard } from './ContractStatusCard';
import { ContractResultModal } from './ContractResultModal';

interface ContractsTabProps {
  session: Session | null;
  profile: GamificationProfile | null;
  enabled: boolean;
  loading: boolean;
}

export function ContractsTab({
  session,
  profile,
  enabled,
  loading,
}: ContractsTabProps) {
  const userId = session?.user?.id ?? profile?.user_id ?? '';
  const zenTokens = profile?.zen_tokens ?? 0;
  const [goldBalance, setGoldBalance] = useState(profile?.total_points ?? 0);
  const [activeContract, setActiveContract] = useState<CommitmentContract | null>(null);
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [contractResult, setContractResult] = useState<ContractEvaluation | null>(null);

  useEffect(() => {
    if (profile?.total_points !== undefined) {
      setGoldBalance(profile.total_points);
    }
  }, [profile?.total_points]);

  useEffect(() => {
    if (!userId) return;
    
    const loadContract = async () => {
      const { data } = await fetchActiveContract(userId);
      setActiveContract(data);
    };
    
    void loadContract();
  }, [userId]);

  // Contract handlers
  const handleContractWizardComplete = async () => {
    setShowContractWizard(false);
    // Reload active contract
    const { data } = await fetchActiveContract(userId);
    setActiveContract(data);
  };

  const handleMarkProgress = async () => {
    if (!activeContract || !userId) return;

    const { data, error } = await recordContractProgress(userId, activeContract.id);
    if (error) {
      console.error('Failed to record progress:', error);
      return;
    }

    if (data) {
      setActiveContract(data);
    }
  };

  const handlePauseContract = async () => {
    if (!activeContract || !userId) return;

    const { data, error } = await pauseContract(userId, activeContract.id);
    if (error) {
      console.error('Failed to pause contract:', error);
      return;
    }

    if (data) {
      setActiveContract(data);
    }
  };

  const handleCancelContract = async () => {
    if (!activeContract || !userId) return;

    const { data, error } = await cancelContract(userId, activeContract.id);
    if (error) {
      console.error('Failed to cancel contract:', error);
      return;
    }

    if (data) {
      setActiveContract(null);
    }
  };

  const handleContractResultClose = () => {
    setContractResult(null);
  };

  const handleResetContract = async () => {
    if (!activeContract || !userId) return;
    
    // TODO: Implement reset contract with same settings
    // This should create a new contract with identical parameters
    console.log('Reset contract with same settings');
    setContractResult(null);
  };

  const handleReduceStake = async () => {
    if (!activeContract || !userId) return;
    
    // TODO: Implement reduce stake (one-time option for users with 2+ misses)
    // This should allow the user to modify the stake amount downward
    console.log('Reduce stake amount');
    setContractResult(null);
  };

  const handlePauseWeek = async () => {
    if (!activeContract || !userId) return;
    
    // Pause contract for a week
    const { error } = await pauseContract(userId, activeContract.id);
    if (error) {
      console.error('Failed to pause contract:', error);
      return;
    }
    
    setContractResult(null);
    // Reload to reflect paused state
    const { data } = await fetchActiveContract(userId);
    setActiveContract(data);
  };

  return (
    <section className="score-tab">
      <header className="score-tab__header">
        <div className="score-tab__title">
          <span className="score-tab__badge" aria-hidden="true">🤝</span>
          <div>
            <p className="score-tab__eyebrow">Commitment contracts</p>
            <h2 className="score-tab__headline">Commitment Contracts</h2>
          </div>
        </div>
      </header>

      {loading && (
        <div className="score-tab__status" role="status">
          Loading your contracts...
        </div>
      )}

      {!loading && !enabled && (
        <div className="score-tab__status">
          Gamification is currently disabled. Enable it in settings to use contracts.
        </div>
      )}

      {!loading && enabled && (
        <div className="score-tab__content">
          <div className="score-tab__contracts-header">
            <h2 className="score-tab__headline">Commitment Contracts</h2>
            <p className="score-tab__subtitle">
              Stake Gold or Tokens to stay accountable to your goals.
            </p>
          </div>
          {!activeContract && !showContractWizard && (
            <div className="score-tab__contracts-empty">
              <p className="score-tab__contracts-empty-text">
                No active contract yet. Ready to commit?
              </p>
              <button
                type="button"
                className="score-tab__contracts-create-button"
                onClick={() => setShowContractWizard(true)}
              >
                Create Contract
              </button>
            </div>
          )}
          {activeContract && !showContractWizard && (
            <ContractStatusCard
              contract={activeContract}
              onMarkProgress={handleMarkProgress}
              onPause={handlePauseContract}
              onCancel={handleCancelContract}
            />
          )}
          {showContractWizard && (
            <ContractWizard
              userId={userId}
              currentGoldBalance={goldBalance}
              currentTokenBalance={zenTokens}
              onComplete={handleContractWizardComplete}
              onCancel={() => setShowContractWizard(false)}
            />
          )}
        </div>
      )}

      {contractResult && activeContract && (
        <ContractResultModal
          contract={activeContract}
          evaluation={contractResult}
          onClose={handleContractResultClose}
          onResetContract={handleResetContract}
          onReduceStake={handleReduceStake}
          onPauseWeek={handlePauseWeek}
          onCancelContract={handleCancelContract}
        />
      )}
    </section>
  );
}
