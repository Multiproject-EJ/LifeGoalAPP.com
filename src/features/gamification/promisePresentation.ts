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

