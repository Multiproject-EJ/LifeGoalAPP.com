import {
  ENERGY_SANCTUARY_UNLOCK_ISLAND,
  canRenderEnergyMobileTab,
  getEnergyMobileTabAccess,
  getEnergyMobileTabFeatureId,
  getEnergyMobileTabStatusLabel,
  isEnergySanctuaryUnlocked,
  type EnergyMobileTab,
} from '../energyFeatureAccess';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runAllEnergyFeatureAccessTests(): void {
  const publiclyGatedTabs: EnergyMobileTab[] = ['meditation', 'conflict', 'yoga', 'food', 'exercise'];

  assertEqual(getEnergyMobileTabAccess('breathing'), 'open', 'Focus breathing should remain live');
  assertEqual(canRenderEnergyMobileTab('breathing'), true, 'Focus breathing implementation should render');
  assertEqual(getEnergyMobileTabStatusLabel('breathing'), null, 'Focus breathing should not show a preview badge');
  assertEqual(getEnergyMobileTabFeatureId('breathing'), null, 'Focus breathing should not use preview gating');

  for (const tab of publiclyGatedTabs) {
    assertEqual(getEnergyMobileTabAccess(tab), 'previewOnly', `${tab} should be preview-only for normal users`);
    assertEqual(canRenderEnergyMobileTab(tab), false, `${tab} implementation should not render for normal users`);
    assertEqual(getEnergyMobileTabStatusLabel(tab), 'Demo ⭐️', `${tab} should show Demo status`);
    assertEqual(getEnergyMobileTabAccess(tab, true), 'open', `${tab} should remain open for admins`);
    assertEqual(canRenderEnergyMobileTab(tab, true), true, `${tab} implementation should render for admins`);
    assertEqual(getEnergyMobileTabStatusLabel(tab, true), 'Demo Mode', `${tab} should show admin demo status`);
  }

  assertEqual(ENERGY_SANCTUARY_UNLOCK_ISLAND, 3, 'The Energy Sanctuary should awaken on Island 3');
  assertEqual(isEnergySanctuaryUnlocked(1), false, 'Energy should stay sealed on Island 1');
  assertEqual(isEnergySanctuaryUnlocked(2), false, 'Energy should stay sealed on Island 2');
  assertEqual(isEnergySanctuaryUnlocked(3), true, 'Energy should open on Island 3');
  assertEqual(isEnergySanctuaryUnlocked(12), true, 'Energy should remain open after Island 3');
  assertEqual(isEnergySanctuaryUnlocked(Number.NaN), false, 'Invalid island state should fail safely closed');
  assertEqual(isEnergySanctuaryUnlocked(1, true), true, 'Admins should retain Energy preview access');
}
