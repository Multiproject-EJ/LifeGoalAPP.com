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

// NOTE: The legacy 20-step "Game of Life onboarding" was rebranded to the
// optional "Leap Progress" leveling sprint and decoupled from first-run gating.
// The new start-the-app onboarding flow (founder welcome → guided in-game
// how-to-play) is tracked separately and will own first-run gating.
export const ONBOARDING_ENTRY_POINTS: OnboardingEntryPoint[] = [
  {
    id: 'account-leap-progress',
    label: 'Account Leap Progress tools',
    location: 'My Account → Leap Progress',
    trigger: 'Launch or restart Leap Progress, or open the Day Zero quick start.',
    storageKeys: ['leap_progress_{userId}', 'day_zero_onboarding_{userId}'],
    notes: 'Restart clears local progress before relaunching the sprint.',
  },
  {
    id: 'day-zero-quick-start',
    label: 'Day zero quick start',
    location: 'My Account → Leap Progress',
    trigger: 'Selects “Launch Day Zero quick start.”',
    storageKeys: ['day_zero_onboarding_{userId}'],
  },
];

export const ONBOARDING_ROUTE_MAP: OnboardingRoute[] = [
  {
    id: 'account-to-leap',
    from: 'My Account → Leap Progress tools',
    to: 'LeapProgress sprint',
    condition: 'User opts in to the optional leveling sprint.',
  },
  {
    id: 'leap-close',
    from: 'LeapProgress sprint',
    to: 'Quest workspace',
    condition: 'User closes the sprint before completion.',
    notes: 'Local storage retains stage progress for resume.',
  },
  {
    id: 'leap-finish-hub',
    from: 'LeapProgress sprint',
    to: 'Quest Hub',
    condition: 'User finishes the sprint and chooses the hub.',
    notes: 'Records leap_progress_completed and clears local storage state. Never sets onboarding_complete.',
  },
  {
    id: 'leap-finish-coach',
    from: 'LeapProgress sprint',
    to: 'AI Coach',
    condition: 'User finishes the sprint and chooses coach.',
    notes: 'Records leap_progress_completed and clears local storage state. Never sets onboarding_complete.',
  },
  {
    id: 'day-zero-close',
    from: 'DayZeroOnboarding modal',
    to: 'Quest workspace',
    condition: 'User finishes quick-start flow or closes modal.',
    notes: 'Completes onboarding_complete and logs telemetry.',
  },
];

export const ONBOARDING_DEMO_PARITY_NOTES: OnboardingParityNote[] = [
  {
    id: 'profile-save',
    area: 'Profile save',
    demoBehavior: 'Updates local demo display name; never flips onboardingComplete.',
    supabaseBehavior: 'Writes full_name to auth metadata when changed; leaves onboarding_complete untouched.',
  },
  {
    id: 'local-progress',
    area: 'Leap progress storage',
    demoBehavior: 'Persists in localStorage via leap_progress_{userId}.',
    supabaseBehavior: 'Same localStorage storage; Leap Progress is local-only.',
  },
  {
    id: 'telemetry',
    area: 'Telemetry',
    demoBehavior: 'Records leap_progress_completed event locally.',
    supabaseBehavior: 'Records leap_progress_completed event via telemetry service.',
  },
];
