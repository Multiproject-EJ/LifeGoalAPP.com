export type Theme =
  | 'bright-sky'
  | 'dark-glass'
  | 'ocean-breeze'
  | 'forest-green'
  | 'sunset-glow'
  | 'midnight-purple'
  | 'cherry-blossom'
  | 'desert-sand'
  | 'arctic-frost'
  | 'autumn-harvest'
  | 'lavender-dream'
  | 'flow-day'
  | 'flow-night'
  | 'bio-day'
  | 'bio-night'
  | 'dreamt-horizon'
  | 'birthday-wish'
  | 'sproutling-grove'
  | 'ember-glow'
  | 'aurora-sky'
  | 'nebula-drift'
  | 'starhorn-celestial';

export type ThemeCategory = 'light' | 'dark';

export type ThemeCheckoutSkuId =
  | 'theme_sproutling_grove'
  | 'theme_sproutling_grove_paired'
  | 'theme_ember_glow'
  | 'theme_ember_glow_paired'
  | 'theme_aurora_sky'
  | 'theme_aurora_sky_paired'
  | 'theme_nebula_drift'
  | 'theme_nebula_drift_paired'
  | 'theme_starhorn_celestial'
  | 'theme_starhorn_celestial_paired';

export type ThemeUnlockRule =
  | { type: 'free' }
  | { type: 'special_gift'; giftId: 'island_120_complete' | 'first_birthday_present' }
  | {
      type: 'creature_purchase';
      creatureId: string;
      creatureName: string;
      tier: 'common' | 'rare' | 'mythic';
      skuId: ThemeCheckoutSkuId;
      basePriceUsd: string;
      pairedSkuId?: ThemeCheckoutSkuId;
      pairedPriceUsd?: string;
      pairedDiscountPercent?: 20;
      requiredBondLevel?: number;
      requiredCreatureFormLevel?: number;
    }
  | { type: 'player_shop_purchase'; skuId: string; priceUsd: string }
  | { type: 'admin_preview' };

export interface ThemeAccessMetadata {
  id: Theme;
  name: string;
  description: string;
  metaColor: string;
  category: ThemeCategory;
  unlockRule: ThemeUnlockRule;
}

export interface ThemeAccessContext {
  isAdminOrCreator?: boolean;
  ownedThemeIds?: ReadonlySet<Theme>;
  ownedCreatureIds?: ReadonlySet<string>;
  pairedCreatureIds?: ReadonlySet<string>;
  creatureBondLevelsById?: ReadonlyMap<string, number>;
  creatureFormLevelsById?: ReadonlyMap<string, number>;
}

export type ThemeAccessStatus =
  | 'owned'
  | 'locked'
  | 'available_for_purchase'
  | 'available_for_paired_purchase'
  | 'admin_preview';

export interface ThemeAccessResult {
  status: ThemeAccessStatus;
  selectable: boolean;
  checkoutSkuId?: ThemeCheckoutSkuId | string;
  displayPrice?: string;
  compareAtPrice?: string;
  discountLabel?: string;
  lockedReason?: string;
  ctaLabel?: string;
  ctaTarget?: 'settings' | 'creature_sanctuary' | 'birthday_preferences' | 'island_run' | 'player_shop';
}

export function resolveThemeAccess(
  themeOption: ThemeAccessMetadata,
  context: ThemeAccessContext = {},
): ThemeAccessResult {
  const { isAdminOrCreator = false, ownedThemeIds, ownedCreatureIds, pairedCreatureIds, creatureBondLevelsById, creatureFormLevelsById } = context;

  if (isAdminOrCreator) {
    return {
      status: 'admin_preview',
      selectable: true,
      discountLabel: 'Admin preview',
      ctaLabel: 'Preview theme',
    };
  }

  if (ownedThemeIds?.has(themeOption.id)) {
    return { status: 'owned', selectable: true, ctaLabel: 'Select theme' };
  }

  const { unlockRule } = themeOption;
  switch (unlockRule.type) {
    case 'free':
      return { status: 'owned', selectable: true, ctaLabel: 'Included by default' };
    case 'special_gift':
      return {
        status: 'locked',
        selectable: false,
        lockedReason: unlockRule.giftId === 'island_120_complete'
          ? 'Complete Island 120 to unlock this free gift theme.'
          : 'Enable birthday presents to unlock this free birthday gift theme.',
        ctaLabel: unlockRule.giftId === 'island_120_complete' ? 'Continue Island Run' : 'Set birthday gift',
        ctaTarget: unlockRule.giftId === 'island_120_complete' ? 'island_run' : 'birthday_preferences',
      };
    case 'creature_purchase': {
      const ownsCreature = ownedCreatureIds?.has(unlockRule.creatureId) ?? false;
      const bondLevel = creatureBondLevelsById?.get(unlockRule.creatureId) ?? 0;
      const formLevel = creatureFormLevelsById?.get(unlockRule.creatureId) ?? 1;
      const meetsBondRequirement = !unlockRule.requiredBondLevel || bondLevel >= unlockRule.requiredBondLevel;
      const meetsFormRequirement = !unlockRule.requiredCreatureFormLevel || formLevel >= unlockRule.requiredCreatureFormLevel;
      if (!ownsCreature) {
        return {
          status: 'locked',
          selectable: false,
          lockedReason: `Hatch ${unlockRule.creatureName} to unlock this one-time Stripe theme offer.`,
          ctaLabel: 'Open Sanctuary',
          ctaTarget: 'creature_sanctuary',
        };
      }
      if (!meetsBondRequirement) {
        return {
          status: 'locked',
          selectable: false,
          lockedReason: `Reach Bond Lv. ${unlockRule.requiredBondLevel} with ${unlockRule.creatureName} to unlock this one-time Stripe theme offer.`,
          ctaLabel: 'Open Sanctuary',
          ctaTarget: 'creature_sanctuary',
        };
      }
      if (!meetsFormRequirement) {
        return {
          status: 'locked',
          selectable: false,
          lockedReason: `Upgrade ${unlockRule.creatureName} to Form ${unlockRule.requiredCreatureFormLevel} with shards to unlock this one-time Stripe theme offer.`,
          ctaLabel: 'Open Sanctuary',
          ctaTarget: 'creature_sanctuary',
        };
      }
      if (unlockRule.pairedSkuId && pairedCreatureIds?.has(unlockRule.creatureId)) {
        return {
          status: 'available_for_paired_purchase',
          selectable: false,
          checkoutSkuId: unlockRule.pairedSkuId,
          displayPrice: unlockRule.pairedPriceUsd,
          compareAtPrice: unlockRule.basePriceUsd,
          discountLabel: 'Perfect Pair offer',
          lockedReason: `Perfect Pair one-time price: ${unlockRule.pairedPriceUsd}.`,
          ctaLabel: 'Buy in Sanctuary',
          ctaTarget: 'creature_sanctuary',
        };
      }
      return {
        status: 'available_for_purchase',
        selectable: false,
        checkoutSkuId: unlockRule.skuId,
        displayPrice: unlockRule.basePriceUsd,
        lockedReason: `One-time Stripe purchase in the Creature Sanctuary: ${unlockRule.basePriceUsd}.`,
        ctaLabel: 'Buy in Sanctuary',
        ctaTarget: 'creature_sanctuary',
      };
    }
    case 'player_shop_purchase':
      return {
        status: 'available_for_purchase',
        selectable: false,
        checkoutSkuId: unlockRule.skuId,
        displayPrice: unlockRule.priceUsd,
        lockedReason: `Available in the Player Shop for ${unlockRule.priceUsd}.`,
        ctaLabel: 'Open Player Shop',
        ctaTarget: 'player_shop',
      };
    case 'admin_preview':
    default:
      return {
        status: 'locked',
        selectable: false,
        lockedReason: 'Preview feature for future rewards and shop releases.',
        ctaLabel: 'Coming soon',
      };
  }
}

export function getThemeUnlockLabel(themeOption: ThemeAccessMetadata, context: ThemeAccessContext = {}): string {
  const access = resolveThemeAccess(themeOption, context);
  if (access.status === 'admin_preview') return access.discountLabel ?? 'Admin preview';
  if (access.selectable) {
    return themeOption.unlockRule.type === 'free' ? 'Included by default' : 'Owned';
  }
  return access.lockedReason ?? 'Locked';
}
