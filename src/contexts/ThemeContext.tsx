import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import bioDayChartIcon from '../assets/theme-icons/bio-day-chart.svg';
import bioDayCheckIcon from '../assets/theme-icons/bio-day-check.svg';

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

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeCategory = 'light' | 'dark';

export const DEFAULT_LIGHT_THEME: Theme = 'bio-day';
export const DEFAULT_DARK_THEME: Theme = 'flow-night';

const DEFAULT_FREE_THEME_IDS = new Set<Theme>([DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME]);

type FlowVariant = 'sunrise' | 'morning' | 'day' | 'sunset' | 'midnight';

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
    }
  | { type: 'player_shop_purchase'; skuId: string; priceUsd: string }
  | { type: 'admin_preview' };

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

export interface ThemeMetadata {
  id: Theme;
  name: string;
  icon: ReactNode;
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

const adminPreviewUnlockRule: ThemeUnlockRule = { type: 'admin_preview' };


const bioDayIcons = (
  <span className="theme-icon-stack">
    <img src={bioDayChartIcon} alt="" className="theme-icon-image" />
    <img src={bioDayCheckIcon} alt="" className="theme-icon-image" />
  </span>
);

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  effectiveCategory: ThemeCategory;
  lightTheme: Theme;
  darkTheme: Theme;
  setTheme: (theme: Theme) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLightTheme: (theme: Theme) => void;
  setDarkTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cycleThemeMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'lifegoal-theme';
const THEME_MODE_STORAGE_KEY = 'lifegoal-theme-mode';
const LIGHT_THEME_STORAGE_KEY = 'lifegoal-light-theme';
const DARK_THEME_STORAGE_KEY = 'lifegoal-dark-theme';

const FLOW_VARIANT_INTERVAL_MS = 5 * 60 * 1000;

const FLOW_VARIANT_WINDOWS: Array<{ variant: FlowVariant; startHour: number }> = [
  { variant: 'sunrise', startHour: 4 },
  { variant: 'morning', startHour: 8 },
  { variant: 'day', startHour: 12 },
  { variant: 'sunset', startHour: 17 },
  { variant: 'midnight', startHour: 21 },
];

// Light themes
export const LIGHT_THEMES: ThemeMetadata[] = [
  {
    id: 'bright-sky',
    name: 'Bright Sky',
    icon: '☀️',
    description: 'Light and airy with soft blue gradients',
    metaColor: '#e0f2fe',
    category: 'light',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    icon: '🌊',
    description: 'Calm teal and aquamarine tones',
    metaColor: '#0d9488',
    category: 'light',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    icon: '🌲',
    description: 'Natural green with earthy accents',
    metaColor: '#059669',
    category: 'light',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    icon: '🌅',
    description: 'Warm oranges and pinks like a sunset',
    metaColor: '#f97316',
    category: 'light',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    icon: '🌸',
    description: 'Soft pink with gentle warmth',
    metaColor: '#f472b6',
    category: 'light',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'desert-sand',
    name: 'Desert Sand',
    icon: '🏜️',
    description: 'Warm beige and sandy tones',
    metaColor: '#d97706',
    category: 'light',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    icon: '❄️',
    description: 'Cool whites and icy blues',
    metaColor: '#60a5fa',
    category: 'light',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'autumn-harvest',
    name: 'Autumn Harvest',
    icon: '🍂',
    description: 'Warm browns and golden yellows',
    metaColor: '#ea580c',
    category: 'light',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    icon: '💜',
    description: 'Soft purple with dreamy gradients',
    metaColor: '#c084fc',
    category: 'light',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'flow-day',
    name: 'Flow Day',
    icon: '🌀',
    description: 'Neumorphic glass with airy silver gradients and soft glow',
    metaColor: '#f2f4fb',
    category: 'light',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'bio-day',
    name: 'Bio Day',
    icon: bioDayIcons,
    description: 'Organic greens inspired by nature',
    metaColor: '#16a34a',
    category: 'light',
    unlockRule: { type: 'free' },
  },
  {
    id: 'birthday-wish',
    name: 'Birthday Wish',
    icon: '🎂',
    description: 'A warm birthday gift theme unlocked from your first birthday present',
    metaColor: '#fbcfe8',
    category: 'light',
    unlockRule: { type: 'special_gift', giftId: 'first_birthday_present' },
  },
  {
    id: 'sproutling-grove',
    name: 'Sproutling Grove',
    icon: '🌱',
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
  },
  {
    id: 'ember-glow',
    name: 'Ember Glow',
    icon: '🔥',
    description: 'A one-time real-money creature theme inspired by Ember Sprout',
    metaColor: '#fb923c',
    category: 'light',
    unlockRule: {
      type: 'creature_purchase',
      creatureId: 'rare-ember-sprout',
      creatureName: 'Ember Sprout',
      tier: 'rare',
      skuId: 'theme_ember_glow',
      basePriceUsd: '$4.99',
      pairedSkuId: 'theme_ember_glow_paired',
      pairedPriceUsd: '$3.99',
      pairedDiscountPercent: 20,
    },
  },
  {
    id: 'aurora-sky',
    name: 'Aurora Sky',
    icon: '🪽',
    description: 'A one-time real-money creature theme inspired by Aurora Finch',
    metaColor: '#bae6fd',
    category: 'light',
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
    },
  },
];

// Dark themes
export const DARK_THEMES: ThemeMetadata[] = [
  {
    id: 'dark-glass',
    name: 'Dark Glass',
    icon: '🌙',
    description: 'Premium dark glassmorphism with rich colors',
    metaColor: '#0f172a',
    category: 'dark',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    icon: '🔮',
    description: 'Deep purple with mystical vibes',
    metaColor: '#7c3aed',
    category: 'dark',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'flow-night',
    name: 'Midnight Blue',
    icon: '🌌',
    description: 'Deep focus mode with cool midnight blue tones',
    metaColor: '#0c1222',
    category: 'dark',
    unlockRule: { type: 'free' },
  },
  {
    id: 'bio-night',
    name: 'Bio Night',
    icon: '🌲',
    description: 'Dark forest greens for natural calm',
    metaColor: '#0a1e0a',
    category: 'dark',
    unlockRule: adminPreviewUnlockRule,
  },
  {
    id: 'dreamt-horizon',
    name: 'Dreamt Horizon',
    icon: '🌠',
    description: 'A free milestone gift for completing Island 120',
    metaColor: '#1e1b4b',
    category: 'dark',
    unlockRule: { type: 'special_gift', giftId: 'island_120_complete' },
  },
  {
    id: 'nebula-drift',
    name: 'Nebula Drift',
    icon: '🪐',
    description: 'A one-time real-money creature theme inspired by Nebula Wisp',
    metaColor: '#581c87',
    category: 'dark',
    unlockRule: {
      type: 'creature_purchase',
      creatureId: 'rare-nebula-wisp',
      creatureName: 'Nebula Wisp',
      tier: 'rare',
      skuId: 'theme_nebula_drift',
      basePriceUsd: '$4.99',
      pairedSkuId: 'theme_nebula_drift_paired',
      pairedPriceUsd: '$3.99',
      pairedDiscountPercent: 20,
    },
  },
  {
    id: 'starhorn-celestial',
    name: 'Starhorn Celestial',
    icon: '🦄',
    description: 'A one-time real-money mythic theme inspired by Starhorn Seraph',
    metaColor: '#312e81',
    category: 'dark',
    unlockRule: {
      type: 'creature_purchase',
      creatureId: 'mythic-starhorn-seraph',
      creatureName: 'Starhorn Seraph',
      tier: 'mythic',
      skuId: 'theme_starhorn_celestial',
      basePriceUsd: '$9.99',
      pairedSkuId: 'theme_starhorn_celestial_paired',
      pairedPriceUsd: '$7.99',
      pairedDiscountPercent: 20,
    },
  },
];

// Combined for backward compatibility
export const AVAILABLE_THEMES: ThemeMetadata[] = [...LIGHT_THEMES, ...DARK_THEMES];

export function isDefaultFreeTheme(theme: Theme): boolean {
  return DEFAULT_FREE_THEME_IDS.has(theme);
}

export function getThemeMetadata(theme: Theme): ThemeMetadata | undefined {
  return AVAILABLE_THEMES.find(themeOption => themeOption.id === theme);
}

export function resolveThemeAccess(
  themeOption: ThemeMetadata,
  context: ThemeAccessContext = {},
): ThemeAccessResult {
  const { isAdminOrCreator = false, ownedThemeIds, ownedCreatureIds, pairedCreatureIds, creatureBondLevelsById } = context;

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
      const meetsBondRequirement = !unlockRule.requiredBondLevel || bondLevel >= unlockRule.requiredBondLevel;
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

export function getThemeUnlockLabel(themeOption: ThemeMetadata, context: ThemeAccessContext = {}): string {
  const access = resolveThemeAccess(themeOption, context);
  if (access.status === 'admin_preview') return access.discountLabel ?? 'Admin preview';
  if (access.selectable) {
    return themeOption.unlockRule.type === 'free' ? 'Included by default' : 'Owned';
  }
  return access.lockedReason ?? 'Locked';
}

export function canSelectTheme(theme: Theme, isAdminOrCreator = false): boolean {
  const themeOption = getThemeMetadata(theme);
  return themeOption ? resolveThemeAccess(themeOption, { isAdminOrCreator }).selectable : false;
}

/**
 * Check if a theme is a dark theme
 */
export function isThemeDark(theme: Theme): boolean {
  return DARK_THEMES.some(t => t.id === theme);
}

/**
 * Get the category of a theme
 */
export function getThemeCategory(theme: Theme): ThemeCategory {
  return isThemeDark(theme) ? 'dark' : 'light';
}

const readStoredValue = <T extends string>(key: string): T | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    return (window.localStorage.getItem(key) as T | null) || null;
  } catch (error) {
    console.warn(`Unable to access ${key} from storage.`, error);
    return null;
  }
};

const persistValue = (key: string, value: string) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Unable to persist ${key}.`, error);
  }
};

/**
 * Detect the user's system color scheme preference.
 * Uses the prefers-color-scheme media query to determine if the user
 * prefers dark or light mode at the OS/browser level.
 * 
 * In SSR environments where window is undefined, or in browsers that
 * don't support matchMedia, this falls back to 'light' as the safe default.
 * 
 * @returns 'dark' if the system prefers dark mode, 'light' otherwise
 */
function getSystemPreference(): ThemeCategory {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const getFlowVariantForHour = (hour: number): FlowVariant => {
  const windowIndex = FLOW_VARIANT_WINDOWS.findIndex((variantWindow, idx) => {
    const nextStart = FLOW_VARIANT_WINDOWS[(idx + 1) % FLOW_VARIANT_WINDOWS.length].startHour;
    // Handles normal ranges and the overnight window that wraps from late evening to early morning.
    if (variantWindow.startHour < nextStart) {
      return hour >= variantWindow.startHour && hour < nextStart;
    }
    return hour >= variantWindow.startHour || hour < nextStart;
  });

  return windowIndex >= 0 ? FLOW_VARIANT_WINDOWS[windowIndex].variant : 'day';
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const stored = readStoredValue<ThemeMode>(THEME_MODE_STORAGE_KEY);
    return stored || 'system';
  });

  const [lightTheme, setLightThemeState] = useState<Theme>(() => {
    const stored = readStoredValue<Theme>(LIGHT_THEME_STORAGE_KEY);
    return stored && LIGHT_THEMES.some(t => t.id === stored) && canSelectTheme(stored)
      ? stored
      : DEFAULT_LIGHT_THEME;
  });

  const [darkTheme, setDarkThemeState] = useState<Theme>(() => {
    const stored = readStoredValue<Theme>(DARK_THEME_STORAGE_KEY);
    return stored && DARK_THEMES.some(t => t.id === stored) && canSelectTheme(stored)
      ? stored
      : DEFAULT_DARK_THEME;
  });

  const [systemPreference, setSystemPreference] = useState<ThemeCategory>(getSystemPreference);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Calculate effective category based on theme mode
  const effectiveCategory: ThemeCategory = 
    themeMode === 'system' ? systemPreference : themeMode;

  // Get the active theme based on effective category
  const theme: Theme = effectiveCategory === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    const isDarkTheme = getThemeCategory(theme) === 'dark';
    const colorScheme = isDarkTheme ? 'dark' : 'light';
    document.documentElement.style.colorScheme = colorScheme;
    
    // Persist settings
    persistValue(THEME_STORAGE_KEY, theme);
    persistValue(THEME_MODE_STORAGE_KEY, themeMode);
    persistValue(LIGHT_THEME_STORAGE_KEY, lightTheme);
    persistValue(DARK_THEME_STORAGE_KEY, darkTheme);
    
    // Update meta theme-color for PWA
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const themeData = AVAILABLE_THEMES.find(t => t.id === theme);
      metaThemeColor.setAttribute('content', themeData?.metaColor || '#e0f2fe');
    }

    // Ensure browser canvas / pull-down backdrop follows active theme.
    const bgMain = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg-main')
      .trim();
    const fallbackBg = AVAILABLE_THEMES.find(t => t.id === theme)?.metaColor || '#0a0e1a';
    const resolvedBackground = bgMain || fallbackBg;
    document.documentElement.style.backgroundColor = resolvedBackground;
    if (document.body) {
      document.body.style.backgroundColor = resolvedBackground;
      document.body.style.colorScheme = colorScheme;
    }
  }, [theme, themeMode, lightTheme, darkTheme]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }

    const root = document.documentElement;
    if (theme !== 'flow-day' && theme !== 'flow-night') {
      root.removeAttribute('data-flow-variant');
      return;
    }

    const applyVariant = () => {
      const now = new Date();
      root.setAttribute('data-flow-variant', getFlowVariantForHour(now.getHours()));
    };

    applyVariant();
    const interval = window.setInterval(applyVariant, FLOW_VARIANT_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      root.removeAttribute('data-flow-variant');
    };
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    const category = getThemeCategory(newTheme);
    if (category === 'dark') {
      setDarkThemeState(newTheme);
    } else {
      setLightThemeState(newTheme);
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const setLightTheme = (newTheme: Theme) => {
    if (LIGHT_THEMES.some(t => t.id === newTheme)) {
      setLightThemeState(newTheme);
    }
  };

  const setDarkTheme = (newTheme: Theme) => {
    if (DARK_THEMES.some(t => t.id === newTheme)) {
      setDarkThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    setThemeModeState((current) => current === 'light' ? 'dark' : 'light');
  };

  const cycleThemeMode = () => {
    setThemeModeState((current) => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      themeMode,
      effectiveCategory,
      lightTheme,
      darkTheme,
      setTheme,
      setThemeMode,
      setLightTheme,
      setDarkTheme,
      toggleTheme,
      cycleThemeMode,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
