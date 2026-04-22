import type { RewardItem } from '../types/gamification';
import { fetchRewardCatalog, redeemRewardWithoutGoldSpend } from './rewards';

type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
};

export interface ContractRewardLink {
  contractId: string;
  rewardId: string;
  rewardTitle: string;
  createdAt: string;
}

const CONTRACT_REWARD_LINKS_KEY = 'lifegoal_contract_reward_links';

function getLinksKey(userId: string): string {
  return `${CONTRACT_REWARD_LINKS_KEY}_${userId}`;
}

function readLinks(userId: string): ContractRewardLink[] {
  try {
    const stored = localStorage.getItem(getLinksKey(userId));
    const parsed = stored ? (JSON.parse(stored) as ContractRewardLink[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLinks(userId: string, links: ContractRewardLink[]): void {
  localStorage.setItem(getLinksKey(userId), JSON.stringify(links));
}

export async function listAvailableRewardsForContracts(userId: string): Promise<ServiceResponse<RewardItem[]>> {
  const { data, error } = await fetchRewardCatalog(userId);
  if (error) {
    return { data: null, error };
  }

  return { data: data ?? [], error: null };
}

export async function linkRewardToContract(
  userId: string,
  contractId: string,
  rewardId: string
): Promise<ServiceResponse<ContractRewardLink>> {
  const { data: rewards, error } = await fetchRewardCatalog(userId);
  if (error || !rewards) {
    return { data: null, error: error || new Error('Reward catalog unavailable') };
  }

  const reward = rewards.find((item) => item.id === rewardId);
  if (!reward) {
    return { data: null, error: new Error('Selected reward was not found') };
  }

  const links = readLinks(userId);
  const filtered = links.filter((link) => link.contractId !== contractId);
  const link: ContractRewardLink = {
    contractId,
    rewardId,
    rewardTitle: reward.title,
    createdAt: new Date().toISOString(),
  };

  writeLinks(userId, [...filtered, link]);
  return { data: link, error: null };
}

export async function fetchLinkedRewardForContract(
  userId: string,
  contractId: string
): Promise<ServiceResponse<ContractRewardLink | null>> {
  const links = readLinks(userId);
  const match = links.find((link) => link.contractId === contractId) ?? null;
  return { data: match, error: null };
}

export async function claimContractLinkedReward(
  userId: string,
  contractId: string
): Promise<ServiceResponse<{ rewardTitle: string }>> {
  const links = readLinks(userId);
  const link = links.find((item) => item.contractId === contractId);
  if (!link) {
    return { data: null, error: new Error('No reward linked to this contract') };
  }

  const { data, error } = await redeemRewardWithoutGoldSpend(userId, link.rewardId, {
    sourceType: 'contract',
    sourceContractId: contractId,
  });

  if (error || !data) {
    return { data: null, error: error || new Error('Unable to claim contract reward') };
  }

  return { data: { rewardTitle: data.reward.title }, error: null };
}
