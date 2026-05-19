import {
  canRenderEnergyMobileTab,
  getEnergyMobileTabAccess,
  getEnergyMobileTabFeatureId,
  getEnergyMobileTabStatusLabel,
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
    assertEqual(getEnergyMobileTabStatusLabel(tab), 'Future Feature', `${tab} should show Future Feature status`);
    assertEqual(getEnergyMobileTabAccess(tab, true), 'open', `${tab} should remain open for admins`);
    assertEqual(canRenderEnergyMobileTab(tab, true), true, `${tab} implementation should render for admins`);
    assertEqual(getEnergyMobileTabStatusLabel(tab, true), 'Demo Mode', `${tab} should show admin demo status`);
  }
}
