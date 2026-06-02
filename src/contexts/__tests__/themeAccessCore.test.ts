import {
  getThemeUnlockLabel,
  resolveThemeAccess,
  type Theme,
  type ThemeAccessMetadata,
} from '../themeAccessCore';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

const sproutlingTheme: ThemeAccessMetadata = {
  id: 'sproutling-grove',
  name: 'Sproutling Grove',
  description: 'A one-time real-money creature theme inspired by Sproutling',
  metaColor: '#dcfce7',
  category: 'light',
  unlockRule: {
    type: 'creature_purchase',
    creatureId: 'common-sproutling',
    creatureName: 'Sproutling',
    tier: 'common',
    skuId: 'theme_sproutling_grove',
    basePriceUsd: '$2.49',
    pairedSkuId: 'theme_sproutling_grove_paired',
    pairedPriceUsd: '$1.99',
    pairedDiscountPercent: 20,
  },
};

const auroraBondTheme: ThemeAccessMetadata = {
  ...sproutlingTheme,
  id: 'aurora-sky',
  name: 'Aurora Sky',
  unlockRule: {
    type: 'creature_purchase',
    creatureId: 'rare-aurora-finch',
    creatureName: 'Aurora Finch',
    tier: 'rare',
    skuId: 'theme_aurora_sky',
    basePriceUsd: '$4.99',
    pairedSkuId: 'theme_aurora_sky_paired',
    pairedPriceUsd: '$3.99',
    pairedDiscountPercent: 20,
    requiredBondLevel: 5,
  },
};

export function runThemeAccessCoreTests(): void {
  const freeTheme: ThemeAccessMetadata = {
    id: 'bio-day',
    name: 'Bio Day',
    description: 'Default light theme',
    metaColor: '#16a34a',
    category: 'light',
    unlockRule: { type: 'free' },
  };
  const freeAccess = resolveThemeAccess(freeTheme);
  assertEqual(freeAccess.status, 'owned', 'Free default theme should be owned');
  assertEqual(freeAccess.selectable, true, 'Free default theme should be selectable');
  assertEqual(getThemeUnlockLabel(freeTheme), 'Included by default', 'Free theme label should mention default inclusion');

  const adminAccess = resolveThemeAccess(sproutlingTheme, { isAdminOrCreator: true });
  assertEqual(adminAccess.status, 'admin_preview', 'Admin should receive preview access');
  assertEqual(adminAccess.selectable, true, 'Admin preview should be selectable');

  const birthdayTheme: ThemeAccessMetadata = {
    id: 'birthday-wish',
    name: 'Birthday Wish',
    description: 'Birthday gift theme',
    metaColor: '#fbcfe8',
    category: 'light',
    unlockRule: { type: 'special_gift', giftId: 'first_birthday_present' },
  };
  const birthdayAccess = resolveThemeAccess(birthdayTheme);
  assertEqual(birthdayAccess.status, 'locked', 'Birthday theme should be locked until entitlement exists');
  assertEqual(birthdayAccess.ctaTarget, 'birthday_preferences', 'Birthday theme should route to birthday preferences');

  const unownedCreatureAccess = resolveThemeAccess(sproutlingTheme);
  assertEqual(unownedCreatureAccess.status, 'locked', 'Creature theme should be locked when creature is unowned');
  assert(
    unownedCreatureAccess.lockedReason?.includes('one-time Stripe theme offer') === true,
    'Unowned creature theme label should clarify one-time Stripe offer',
  );
  assert(
    unownedCreatureAccess.lockedReason?.toLowerCase().includes('shard') === false,
    'Unowned creature theme label should not mention shards',
  );

  const ownedCreatureAccess = resolveThemeAccess(sproutlingTheme, {
    ownedCreatureIds: new Set(['common-sproutling']),
  });
  assertEqual(ownedCreatureAccess.status, 'available_for_purchase', 'Owned creature should unlock base purchase offer');
  assertEqual(ownedCreatureAccess.checkoutSkuId, 'theme_sproutling_grove', 'Base purchase should use base SKU');
  assertEqual(ownedCreatureAccess.displayPrice, '$2.49', 'Base purchase should show base price');
  assertEqual(ownedCreatureAccess.selectable, false, 'Unpurchased base offer should not be selectable yet');

  const pairedAccess = resolveThemeAccess(sproutlingTheme, {
    ownedCreatureIds: new Set(['common-sproutling']),
    pairedCreatureIds: new Set(['common-sproutling']),
  });
  assertEqual(pairedAccess.status, 'available_for_paired_purchase', 'Paired creature should unlock paired purchase offer');
  assertEqual(pairedAccess.checkoutSkuId, 'theme_sproutling_grove_paired', 'Paired purchase should use paired SKU');
  assertEqual(pairedAccess.displayPrice, '$1.99', 'Paired purchase should show paired price');
  assertEqual(pairedAccess.compareAtPrice, '$2.49', 'Paired purchase should show compare-at base price');

  const insufficientBondAccess = resolveThemeAccess(auroraBondTheme, {
    ownedCreatureIds: new Set(['rare-aurora-finch']),
    creatureBondLevelsById: new Map([['rare-aurora-finch', 4]]),
  });
  assertEqual(insufficientBondAccess.status, 'locked', 'Bond-gated theme should lock below required bond level');
  assert(
    insufficientBondAccess.lockedReason?.includes('Bond Lv. 5') === true,
    'Bond-gated lock reason should mention required bond level',
  );

  const sufficientBondAccess = resolveThemeAccess(auroraBondTheme, {
    ownedCreatureIds: new Set(['rare-aurora-finch']),
    creatureBondLevelsById: new Map([['rare-aurora-finch', 5]]),
  });
  assertEqual(sufficientBondAccess.status, 'available_for_purchase', 'Bond-gated theme should become purchasable at required bond level');

  const purchasedAccess = resolveThemeAccess(sproutlingTheme, {
    ownedThemeIds: new Set<Theme>(['sproutling-grove']),
  });
  assertEqual(purchasedAccess.status, 'owned', 'Purchased creature theme entitlement should mark theme owned');
  assertEqual(purchasedAccess.selectable, true, 'Purchased creature theme should be selectable');
  assertEqual(getThemeUnlockLabel(sproutlingTheme, { ownedThemeIds: new Set<Theme>(['sproutling-grove']) }), 'Owned', 'Purchased label should be owned');
}

runThemeAccessCoreTests();
