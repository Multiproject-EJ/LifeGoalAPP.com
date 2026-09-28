/**
 * Mission Phone inbox (presentation only). Incoming Central Command messages
 * are read in their own view and then filed here, instead of living on the
 * main mission screen. Gameplay acknowledgement stays with the briefing flow.
 */
export const MISSION_PHONE_INBOX_STORAGE_PREFIX = 'lifegoal:mission-phone-inbox:v1';
export const MISSION_PHONE_INBOX_LIMIT = 40;

export interface MissionPhoneMessage {
  id: string;
  islandNumber: number;
  cycleIndex: number;
  sender: string;
  title: string;
  body: string;
  /** Objective labels at arrival; rendered as the picture steps. */
  stepLabels: string[];
  receivedAtMs: number;
  readAtMs: number | null;
}

export function getMissionPhoneInboxKey(userId: string): string {
  return `${MISSION_PHONE_INBOX_STORAGE_PREFIX}:${userId}`;
}

export function getMissionBriefingMessageId(cycleIndex: number, islandNumber: number, beatId: string): string {
  return `briefing:${Math.max(0, Math.floor(cycleIndex))}:${Math.max(1, Math.floor(islandNumber))}:${beatId}`;
}

function sanitizeMessage(value: unknown): MissionPhoneMessage | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  const number = (input: unknown, fallback: number) => (typeof input === 'number' && Number.isFinite(input) ? input : fallback);
  return {
    id: raw.id,
    islandNumber: Math.max(1, Math.floor(number(raw.islandNumber, 1))),
    cycleIndex: Math.max(0, Math.floor(number(raw.cycleIndex, 0))),
    sender: typeof raw.sender === 'string' ? raw.sender : 'Central Command',
    title: raw.title,
    body: typeof raw.body === 'string' ? raw.body : '',
    stepLabels: Array.isArray(raw.stepLabels) ? raw.stepLabels.filter((label): label is string => typeof label === 'string').slice(0, 6) : [],
    receivedAtMs: Math.max(0, number(raw.receivedAtMs, 0)),
    readAtMs: typeof raw.readAtMs === 'number' && Number.isFinite(raw.readAtMs) ? raw.readAtMs : null,
  };
}

export function sanitizeMissionPhoneInbox(value: unknown): MissionPhoneMessage[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const messages: MissionPhoneMessage[] = [];
  value.forEach((entry) => {
    const message = sanitizeMessage(entry);
    if (!message || seen.has(message.id)) return;
    seen.add(message.id);
    messages.push(message);
  });
  return messages
    .sort((a, b) => b.receivedAtMs - a.receivedAtMs)
    .slice(0, MISSION_PHONE_INBOX_LIMIT);
}

/** Adds a message (newest first). A message that already exists is kept as is. */
export function addMissionPhoneMessage(
  inbox: readonly MissionPhoneMessage[],
  message: MissionPhoneMessage,
): MissionPhoneMessage[] {
  if (inbox.some((entry) => entry.id === message.id)) return [...inbox];
  return sanitizeMissionPhoneInbox([message, ...inbox]);
}

export function markMissionPhoneMessageRead(
  inbox: readonly MissionPhoneMessage[],
  id: string,
  nowMs: number,
): MissionPhoneMessage[] {
  return inbox.map((entry) => (entry.id === id && entry.readAtMs === null ? { ...entry, readAtMs: nowMs } : entry));
}

export function countUnreadMissionPhoneMessages(inbox: readonly MissionPhoneMessage[]): number {
  return inbox.filter((entry) => entry.readAtMs === null).length;
}

export function readMissionPhoneInbox(userId: string): MissionPhoneMessage[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(getMissionPhoneInboxKey(userId));
    return raw ? sanitizeMissionPhoneInbox(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writeMissionPhoneInbox(userId: string, inbox: readonly MissionPhoneMessage[]): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(getMissionPhoneInboxKey(userId), JSON.stringify(inbox));
  } catch {
    // Private mode or full storage: the inbox is a convenience, never gameplay.
  }
}

export function formatMissionPhoneMessageTime(receivedAtMs: number, nowMs: number): string {
  const minutes = Math.max(0, Math.round((nowMs - receivedAtMs) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
