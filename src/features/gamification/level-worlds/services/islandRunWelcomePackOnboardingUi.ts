import type { WelcomePackEligibility } from './islandRunWelcomePackEligibility';

export function shouldAutoShowWelcomePackModal(options: {
  eligibility: WelcomePackEligibility;
  hasBeenDismissedThisSession: boolean;
  isWelcomePackModalVisible: boolean;
  isHigherPriorityOnboardingModalVisible: boolean;
}): boolean {
  return options.eligibility === 'eligible'
    && !options.hasBeenDismissedThisSession
    && !options.isWelcomePackModalVisible
    && !options.isHigherPriorityOnboardingModalVisible;
}
