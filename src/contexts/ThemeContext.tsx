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
  | 'bio-night';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeCategory = 'light' | 'dark';

type FlowVariant = 'sunrise' | 'morning' | 'day' | 'sunset' | 'midnight';

export interface ThemeMetadata {
  id: Theme;
  name: string;
  icon: ReactNode;
  description: string;
  metaColor: string;
  category: ThemeCategory;
}

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
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    icon: '🌊',
    description: 'Calm teal and aquamarine tones',
    metaColor: '#0d9488',
    category: 'light',
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    icon: '🌲',
    description: 'Natural green with earthy accents',
    metaColor: '#059669',
    category: 'light',
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    icon: '🌅',
    description: 'Warm oranges and pinks like a sunset',
    metaColor: '#f97316',
    category: 'light',
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    icon: '🌸',
    description: 'Soft pink with gentle warmth',
    metaColor: '#f472b6',
    category: 'light',
  },
  {
    id: 'desert-sand',
    name: 'Desert Sand',
    icon: '🏜️',
    description: 'Warm beige and sandy tones',
    metaColor: '#d97706',
    category: 'light',
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    icon: '❄️',
    description: 'Cool whites and icy blues',
    metaColor: '#60a5fa',
    category: 'light',
  },
  {
    id: 'autumn-harvest',
    name: 'Autumn Harvest',
    icon: '🍂',
    description: 'Warm browns and golden yellows',
    metaColor: '#ea580c',
    category: 'light',
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    icon: '💜',
    description: 'Soft purple with dreamy gradients',
    metaColor: '#c084fc',
    category: 'light',
  },
  {
    id: 'flow-day',
    name: 'Flow Day',
    icon: '🌀',
    description: 'Neumorphic glass with airy silver gradients and soft glow',
    metaColor: '#f2f4fb',
    category: 'light',
  },
  {
    id: 'bio-day',
    name: 'Bio Day',
    icon: bioDayIcons,
    description: 'Organic greens inspired by nature',
    metaColor: '#16a34a',
    category: 'light',
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
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    icon: '🔮',
    description: 'Deep purple with mystical vibes',
    metaColor: '#7c3aed',
    category: 'dark',
  },
  {
    id: 'flow-night',
    name: 'Flow Night',
    icon: '🌊',
    description: 'Deep focus mode with cool blue tones',
    metaColor: '#0c1222',
    category: 'dark',
  },
  {
    id: 'bio-night',
    name: 'Bio Night',
    icon: '🌲',
    description: 'Dark forest greens for natural calm',
    metaColor: '#0a1e0a',
    category: 'dark',
  },
];

// Combined for backward compatibility
export const AVAILABLE_THEMES: ThemeMetadata[] = [...LIGHT_THEMES, ...DARK_THEMES];

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
  const windowIndex = FLOW_VARIANT_WINDOWS.findIndex((window, idx) => {
    const nextStart = FLOW_VARIANT_WINDOWS[(idx + 1) % FLOW_VARIANT_WINDOWS.length].startHour;
    // Handles normal ranges and the overnight window that wraps from late evening to early morning.
    if (window.startHour < nextStart) {
      return hour >= window.startHour && hour < nextStart;
    }
    return hour >= window.startHour || hour < nextStart;
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
    return stored && LIGHT_THEMES.some(t => t.id === stored) ? stored : 'bright-sky';
  });

  const [darkTheme, setDarkThemeState] = useState<Theme>(() => {
    const stored = readStoredValue<Theme>(DARK_THEME_STORAGE_KEY);
    return stored && DARK_THEMES.some(t => t.id === stored) ? stored : 'dark-glass';
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
  }, [theme, themeMode, lightTheme, darkTheme]);

  useEffect(() => {
    if (typeof document === 'undefined') {
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
