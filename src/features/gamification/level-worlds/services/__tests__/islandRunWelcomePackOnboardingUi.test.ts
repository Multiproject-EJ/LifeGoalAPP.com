import { shouldAutoShowWelcomePackModal } from '../islandRunWelcomePackOnboardingUi';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunWelcomePackOnboardingUiTests: TestCase[] = [
  {
    name: 'eligible state auto-shows when no higher-priority onboarding modal is active',
    run: async () => {
      assertEqual(shouldAutoShowWelcomePackModal({
        eligibility: 'eligible',
        hasBeenDismissedThisSession: false,
        isWelcomePackModalVisible: false,
        isHigherPriorityOnboardingModalVisible: false,
      }), true, 'eligible should show');
    },
  },
  {
    name: 'already claimed state never auto-shows',
    run: async () => {
      assertEqual(shouldAutoShowWelcomePackModal({
        eligibility: 'already_claimed',
        hasBeenDismissedThisSession: false,
        isWelcomePackModalVisible: false,
        isHigherPriorityOnboardingModalVisible: false,
      }), false, 'already claimed should not show');
    },
  },
  {
    name: 'same-session manual dismiss blocks auto reopen',
    run: async () => {
      assertEqual(shouldAutoShowWelcomePackModal({
        eligibility: 'eligible',
        hasBeenDismissedThisSession: true,
        isWelcomePackModalVisible: false,
        isHigherPriorityOnboardingModalVisible: false,
      }), false, 'dismissed should not reopen this session');
    },
  },
  {
    name: 'higher-priority onboarding modal blocks welcome-pack auto-show to avoid stacking',
    run: async () => {
      assertEqual(shouldAutoShowWelcomePackModal({
        eligibility: 'eligible',
        hasBeenDismissedThisSession: false,
        isWelcomePackModalVisible: false,
        isHigherPriorityOnboardingModalVisible: true,
      }), false, 'higher-priority modal should block auto-show');
    },
  },
];
