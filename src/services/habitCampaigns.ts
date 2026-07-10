// Today-tab habit campaign persistence.
//
// The campaign card on the Today tab used to live only in localStorage
// (`lifegoal.habits.campaign.<userId>`), so each device grew its own
// campaign. This service makes the Supabase `campaigns` table (migration
// 0272) the single source of truth; localStorage remains a render cache
// only. Today-tab campaigns are tagged with `campaign_data.source =
// 'habit_today'` so they coexist with other campaign types in the table.

import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database, Json } from '../lib/database.types';

export type HabitCampaignType =
  | 'body'
  | 'mind'
  | 'bad_loop'
  | 'project'
  | 'money'
  | 'sleep'
  | 'relationship'
  | 'custom';

export type HabitCampaignStatus = 'active' | 'completed' | 'paused' | 'ended';

export type HabitCampaign = {
  id: string;
  user_id: string;
  name: string;
  type: HabitCampaignType;
  status: HabitCampaignStatus;
  start_date: string;
  end_date: string;
  duration_days: number;
  victory_condition: string;
  keystone_habit_id?: string | null;
  minimum_move?: string | null;
  danger_window?: string | null;
  enemy_loop?: string | null;
  replacement_move?: string | null;
  recovery_rule?: string | null;
  created_at: string;
  updated_at: string;
};

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

type CampaignRow = Database['public']['Tables']['campaigns']['Row'];

export const HABIT_TODAY_CAMPAIGN_SOURCE = 'habit_today';

const HABIT_CAMPAIGN_TYPES: ReadonlySet<string> = new Set([
  'body',
  'mind',
  'bad_loop',
  'project',
  'money',
  'sleep',
  'relationship',
  'custom',
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Local pre-sync campaigns use `campaign-<timestamp>` ids; remote rows use uuids. */
export function isRemoteHabitCampaignId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

function toRowStatus(status: HabitCampaignStatus): CampaignRow['status'] {
  switch (status) {
    case 'active':
      return 'active';
    case 'paused':
      return 'paused';
    case 'completed':
      return 'completed';
    case 'ended':
    default:
      return 'archived';
  }
}

function fromRowStatus(status: CampaignRow['status']): HabitCampaignStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'paused':
      return 'paused';
    case 'completed':
      return 'completed';
    default:
      return 'ended';
  }
}

function readCampaignDataString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function mapCampaignRowToHabitCampaign(row: CampaignRow): HabitCampaign {
  const data = (row.campaign_data ?? {}) as Record<string, unknown>;
  const startDate = row.starts_on ?? row.created_at.slice(0, 10);
  const endDate = row.ends_on ?? startDate;
  const rawDuration = data.duration_days;
  const durationDays = typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration >= 1
    ? Math.floor(rawDuration)
    : Math.max(
        1,
        Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000) + 1,
      );
  return {
    id: row.id,
    user_id: row.owner_id,
    name: row.title,
    type: HABIT_CAMPAIGN_TYPES.has(row.campaign_type) ? (row.campaign_type as HabitCampaignType) : 'custom',
    status: fromRowStatus(row.status),
    start_date: startDate,
    end_date: endDate,
    duration_days: durationDays,
    victory_condition: readCampaignDataString(data, 'victory_condition') ?? row.description ?? '',
    keystone_habit_id: readCampaignDataString(data, 'keystone_habit_id'),
    minimum_move: readCampaignDataString(data, 'minimum_move'),
    danger_window: readCampaignDataString(data, 'danger_window'),
    enemy_loop: readCampaignDataString(data, 'enemy_loop'),
    replacement_move: readCampaignDataString(data, 'replacement_move'),
    recovery_rule: readCampaignDataString(data, 'recovery_rule'),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCampaignData(campaign: HabitCampaign): Json {
  return {
    source: HABIT_TODAY_CAMPAIGN_SOURCE,
    duration_days: campaign.duration_days,
    victory_condition: campaign.victory_condition,
    keystone_habit_id: campaign.keystone_habit_id ?? null,
    minimum_move: campaign.minimum_move ?? null,
    danger_window: campaign.danger_window ?? null,
    enemy_loop: campaign.enemy_loop ?? null,
    replacement_move: campaign.replacement_move ?? null,
    recovery_rule: campaign.recovery_rule ?? null,
  };
}

/**
 * Fetches the user's most recently updated Today-tab campaign, regardless of
 * status. Callers must inspect `status`: an `ended`/`completed` result means
 * "the campaign was closed on some device" and any local cache of it should
 * be dropped, not re-uploaded.
 */
export async function fetchHabitTodayCampaign(userId: string): Promise<ServiceResponse<HabitCampaign>> {
  // Report unavailability as an error: callers must be able to distinguish
  // "no remote campaign exists" (safe to clear caches / migrate up) from
  // "Supabase is not reachable right now" (leave local state alone).
  if (!canUseSupabaseData()) return { data: null, error: new Error('Supabase data is unavailable.') };
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('owner_id', userId)
    .eq('campaign_data->>source', HABIT_TODAY_CAMPAIGN_SOURCE)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? mapCampaignRowToHabitCampaign(data) : null, error: null };
}

/**
 * Creates or updates the Today-tab campaign row. Campaigns whose id is not a
 * uuid (device-local, pre-sync) are inserted and adopt the server-generated
 * uuid — persist the returned record so later saves update in place.
 */
export async function upsertHabitTodayCampaign(
  userId: string,
  campaign: HabitCampaign,
): Promise<ServiceResponse<HabitCampaign>> {
  if (!canUseSupabaseData()) return { data: null, error: null };
  const supabase = getSupabaseClient();
  const payload = {
    owner_id: userId,
    title: campaign.name,
    description: campaign.victory_condition || null,
    campaign_type: campaign.type,
    status: toRowStatus(campaign.status),
    starts_on: campaign.start_date,
    ends_on: campaign.end_date,
    campaign_data: toCampaignData(campaign),
  };

  if (isRemoteHabitCampaignId(campaign.id)) {
    const { data, error } = await supabase
      .from('campaigns')
      .update(payload)
      .eq('id', campaign.id)
      .eq('owner_id', userId)
      .select('*')
      .maybeSingle();
    if (error) return { data: null, error };
    if (data) return { data: mapCampaignRowToHabitCampaign(data), error: null };
    // Row vanished remotely (deleted elsewhere): fall through to insert.
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert(payload)
    .select('*')
    .single();
  if (error) return { data: null, error };
  return { data: mapCampaignRowToHabitCampaign(data), error: null };
}

/** Marks the campaign closed (default: archived) so every device drops it. */
export async function closeHabitTodayCampaign(
  userId: string,
  campaignId: string,
  status: Extract<HabitCampaignStatus, 'completed' | 'ended'> = 'ended',
): Promise<ServiceResponse<HabitCampaign>> {
  if (!canUseSupabaseData()) return { data: null, error: null };
  if (!isRemoteHabitCampaignId(campaignId)) return { data: null, error: null };
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('campaigns')
    .update({ status: toRowStatus(status), archived_at: new Date().toISOString() })
    .eq('id', campaignId)
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? mapCampaignRowToHabitCampaign(data) : null, error: null };
}
