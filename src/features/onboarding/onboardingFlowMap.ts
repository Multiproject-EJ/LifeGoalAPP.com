export type OnboardingEntryPoint = {
  id: string;
  label: string;
  location: string;
  trigger: string;
  storageKeys: string[];
  notes?: string;
};

export type OnboardingRoute = {
  id: string;
  from: string;
  to: string;
  condition: string;
  notes?: string;
};

export type OnboardingParityNote = {
  id: string;
  area: string;
  demoBehavior: string;
  supabaseBehavior: string;
};

export const ONBOARDING_ENTRY_POINTS: OnboardingEntryPoint[] = [
  {
    id: 'dashboard-start-card',
    label: 'Dashboard start card',
    location: 'Dashboard overview (App onboarding start card)',
    trigger: 'Selects “Start Game of Life onboarding.”',
    storageKeys: ['gol_onboarding_{userId}'],
  },
  {
    id: 'dashboard-nudge',
    label: 'Dashboard nudge',
    location: 'Dashboard onboarding nudge banner',
    trigger: 'Selects “Continue Game of Life onboarding.”',
    storageKeys: ['gol_onboarding_{userId}'],
  },
  {
    id: 'account-tools',
    label: 'Account onboarding tools',
    location: 'My Account → Onboarding tools',
    trigger: 'Launch or restart onboarding.',
    storageKeys: ['gol_onboarding_{userId}', 'day_zero_onboarding_{userId}'],
    notes: 'Restart clears local progress before relaunching the modal.',
  },
  {
    id: 'day-zero-quick-start',
    label: 'Day zero quick start',
    location: 'Day Zero onboarding modal',
    trigger: 'Completes quick-start steps, then closes or continues.',
    storageKeys: ['day_zero_onboarding_{userId}'],
  },
];

export const ONBOARDING_ROUTE_MAP: OnboardingRoute[] = [
  {
    id: 'start-to-gol',
    from: 'Dashboard start card / nudge / account tools',
    to: 'GameOfLifeOnboarding modal',
    condition: 'User is authenticated or demo session is active.',
  },
  {
    id: 'gol-close',
    from: 'GameOfLifeOnboarding modal',
    to: 'Dashboard',
    condition: 'User closes modal before completion.',
    notes: 'Local storage retains loop progress for resume.',
  },
  {
    id: 'gol-finish-dashboard',
    from: 'GameOfLifeOnboarding modal',
    to: 'Dashboard',
    condition: 'User finishes onboarding and chooses dashboard.',
    notes: 'Marks onboarding_complete and clears local storage state.',
  },
  {
    id: 'gol-finish-coach',
    from: 'GameOfLifeOnboarding modal',
    to: 'AI Coach',
    condition: 'User finishes onboarding and chooses coach.',
    notes: 'Marks onboarding_complete and clears local storage state.',
  },
  {
    id: 'day-zero-close',
    from: 'DayZeroOnboarding modal',
    to: 'Dashboard',
    condition: 'User finishes quick-start flow or closes modal.',
    notes: 'Completes onboarding_complete and logs telemetry.',
  },
];

export const ONBOARDING_DEMO_PARITY_NOTES: OnboardingParityNote[] = [
  {
    id: 'profile-save',
    area: 'Profile save',
    demoBehavior: 'Updates local demo profile + onboardingComplete in demo data.',
    supabaseBehavior: 'Writes full_name + onboarding_complete to auth metadata.',
  },
  {
    id: 'local-progress',
    area: 'Loop progress storage',
    demoBehavior: 'Persists in localStorage via gol_onboarding_{userId}.',
    supabaseBehavior: 'Same localStorage storage; Supabase remains source of truth for completion.',
  },
  {
    id: 'telemetry',
    area: 'Telemetry',
    demoBehavior: 'Records onboarding_completed event locally.',
    supabaseBehavior: 'Records onboarding_completed event via telemetry service.',
  },
];
