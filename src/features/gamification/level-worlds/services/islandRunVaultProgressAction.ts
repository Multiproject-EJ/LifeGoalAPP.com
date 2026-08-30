import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { isVaultIslandCollectionUnlocked } from './islandRunVaultCollection';
import {
  areVaultIslandUpgradePrerequisitesMet,
  getVaultIslandUpgrade,
  hasVaultIslandUpgrade,
  sanitizeVaultIslandProgress,
  type VaultIslandUpgradeId,
} from './islandRunVaultProgress';

export type PurchaseVaultIslandUpgradeStatus =
  | 'purchased'
  | 'vault_locked'
  | 'already_owned'
  | 'prerequisite_locked'
  | 'insufficient_essence';

export interface PurchaseVaultIslandUpgradeResult {
  status: PurchaseVaultIslandUpgradeStatus;
  record: IslandRunGameStateRecord;
  upgradeId: VaultIslandUpgradeId;
}

/** Spends Essence and grants one unique Vault upgrade and its milestone reward in one commit. */
export function purchaseVaultIslandUpgrade(options: {
  session: Session;
  client: SupabaseClient | null;
  upgradeId: VaultIslandUpgradeId;
  triggerSource?: string;
}): PurchaseVaultIslandUpgradeResult {
  const { session, client, upgradeId } = options;
  const current = getIslandRunStateSnapshot(session);
  const unchanged = (status: Exclude<PurchaseVaultIslandUpgradeStatus, 'purchased'>) => ({
    status,
    record: current,
    upgradeId,
  }) as const;

  if (!isVaultIslandCollectionUnlocked(current.signatureMissionProgressByIsland)) {
    return unchanged('vault_locked');
  }
  if (hasVaultIslandUpgrade(current.vaultIslandProgress, upgradeId)) {
    return unchanged('already_owned');
  }
  if (!areVaultIslandUpgradePrerequisitesMet(current.vaultIslandProgress, upgradeId)) {
    return unchanged('prerequisite_locked');
  }

  const upgrade = getVaultIslandUpgrade(upgradeId);
  if (current.essence < upgrade.cost) return unchanged('insufficient_essence');

  const progress = sanitizeVaultIslandProgress(current.vaultIslandProgress);
  const next: IslandRunGameStateRecord = {
    ...current,
    runtimeVersion: current.runtimeVersion + 1,
    essence: current.essence - upgrade.cost,
    essenceLifetimeSpent: current.essenceLifetimeSpent + upgrade.cost,
    dicePool: current.dicePool + upgrade.rewardDice,
    shards: current.shards + upgrade.rewardShards,
    vaultIslandProgress: sanitizeVaultIslandProgress({
      purchasedUpgradeIds: [...progress.purchasedUpgradeIds, upgradeId],
    }),
  };

  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: options.triggerSource ?? `purchase_vault_island_upgrade_${upgradeId}`,
  });
  return { status: 'purchased', record: next, upgradeId };
}
