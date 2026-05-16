import type { CommitmentContract } from '../../types/gamification';

export type PromiseVariant = 'classic' | 'reverse' | 'sacred';

export function getPromiseVariant(contract: CommitmentContract): PromiseVariant {
  if (contract.isSacred) return 'sacred';
  if (contract.contractType === 'reverse') return 'reverse';
  return 'classic';
}

export function getPromiseLabel(variant: PromiseVariant): string {
  if (variant === 'sacred') return 'Sacred Promise';
  if (variant === 'reverse') return 'Reverse Promise';
  return 'Classic Promise';
}

export function getOutcomePrimaryActionLabel(variant: PromiseVariant): string {
  return variant === 'reverse' ? 'Log Slip' : 'Log Miss';
}

function hasPromiseEnded(contract: CommitmentContract, now: Date): boolean {
  if (!contract.endAt) return false;

  const endTime = new Date(contract.endAt).getTime();
  return !Number.isNaN(endTime) && now.getTime() > endTime;
}

// Today only shows promises that can still be acted on.
export function isPromiseActionableToday(
  contract: CommitmentContract,
  now: Date = new Date(),
): boolean {
  if (contract.status === 'active') {
    return !hasPromiseEnded(contract, now);
  }

  if (contract.status === 'paused') {
    return !hasPromiseEnded(contract, now);
  }

  return false;
}
