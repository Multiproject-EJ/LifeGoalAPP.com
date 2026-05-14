export type SettingsVisibility = 'basic' | 'advanced' | 'internal';

export type SettingsVisibilityId =
  | 'account.appearance'
  | 'account.onboarding'
  | 'account.subscription'
  | 'account.haptics'
  | 'account.menuIcon'
  | 'account.rewards'
  | 'account.ai'
  | 'account.gamification'
  | 'account.experimentalFeatures'
  | 'account.telemetry'
  | 'account.yesterdayRecap'
  | 'account.dreamJournalReminders';

export interface SettingsVisibilityEntry {
  id: SettingsVisibilityId;
  label: string;
  description: string;
  visibility: SettingsVisibility;
  surface?: string;
  category?: string;
}

export const settingsVisibilityRegistry = {
  'account.appearance': {
    id: 'account.appearance',
    label: 'Appearance',
    description: 'Theme and visual preferences.',
    visibility: 'basic',
    surface: 'MyAccountPanel',
    category: 'account',
  },
  'account.onboarding': {
    id: 'account.onboarding',
    label: 'Onboarding',
    description: 'Onboarding launch and reset tools.',
    visibility: 'advanced',
    surface: 'MyAccountPanel',
    category: 'account',
  },
  'account.subscription': {
    id: 'account.subscription',
    label: 'Subscription',
    description: 'Billing plan and purchase controls.',
    visibility: 'basic',
    surface: 'MyAccountPanel',
    category: 'account',
  },
  'account.haptics': {
    id: 'account.haptics',
    label: 'Haptic feedback',
    description: 'Vibration intensity preferences.',
    visibility: 'basic',
    surface: 'MyAccountPanel',
    category: 'account',
  },
  'account.menuIcon': {
    id: 'account.menuIcon',
    label: 'Menu Icon',
    description: 'Main menu initials display preference.',
    visibility: 'basic',
    surface: 'MyAccountPanel',
    category: 'account',
  },
  'account.rewards': {
    id: 'account.rewards',
    label: 'Rewards',
    description: 'Optional reward preferences.',
    visibility: 'advanced',
    surface: 'MyAccountPanel',
    category: 'account',
  },
  'account.ai': {
    id: 'account.ai',
    label: 'AI settings',
    description: 'AI-related account settings.',
    visibility: 'advanced',
    surface: 'MyAccountPanel',
    category: 'account',
  },
  'account.gamification': {
    id: 'account.gamification',
    label: 'Gamification settings',
    description: 'Score, gameplay, and gamification preferences.',
    visibility: 'advanced',
    surface: 'MyAccountPanel',
    category: 'account',
  },
  'account.experimentalFeatures': {
    id: 'account.experimentalFeatures',
    label: 'Experimental features',
    description: 'Preview and experimental feature controls.',
    visibility: 'internal',
    surface: 'MyAccountPanel',
    category: 'account',
  },
  'account.telemetry': {
    id: 'account.telemetry',
    label: 'Telemetry',
    description: 'Telemetry and analytics preferences.',
    visibility: 'advanced',
    surface: 'MyAccountPanel',
    category: 'account',
  },
  'account.yesterdayRecap': {
    id: 'account.yesterdayRecap',
    label: 'Yesterday recap',
    description: 'Daily catch-up and recap preferences.',
    visibility: 'basic',
    surface: 'MyAccountPanel',
    category: 'account',
  },
  'account.dreamJournalReminders': {
    id: 'account.dreamJournalReminders',
    label: 'Dream journal reminders',
    description: 'Dream journal reminder preferences.',
    visibility: 'basic',
    surface: 'MyAccountPanel',
    category: 'account',
  },
} as const satisfies Record<SettingsVisibilityId, SettingsVisibilityEntry>;

export function getSettingsVisibility(id: SettingsVisibilityId): SettingsVisibilityEntry {
  return settingsVisibilityRegistry[id];
}
