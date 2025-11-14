import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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
  | 'lavender-dream';

export interface ThemeMetadata {
  id: Theme;
  name: string;
  icon: string;
  description: string;
  metaColor: string;
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'lifegoal-theme';

export const AVAILABLE_THEMES: ThemeMetadata[] = [
  {
    id: 'bright-sky',
    name: 'Bright Sky',
    icon: '☀️',
    description: 'Light and airy with soft blue gradients',
    metaColor: '#e0f2fe',
  },
  {
    id: 'dark-glass',
    name: 'Dark Glass',
    icon: '🌙',
    description: 'Premium dark glassmorphism with rich colors',
    metaColor: '#0f172a',
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    icon: '🌊',
    description: 'Calm teal and aquamarine tones',
    metaColor: '#0d9488',
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    icon: '🌲',
    description: 'Natural green with earthy accents',
    metaColor: '#059669',
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    icon: '🌅',
    description: 'Warm oranges and pinks like a sunset',
    metaColor: '#f97316',
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    icon: '🔮',
    description: 'Deep purple with mystical vibes',
    metaColor: '#7c3aed',
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    icon: '🌸',
    description: 'Soft pink with gentle warmth',
    metaColor: '#f472b6',
  },
  {
    id: 'desert-sand',
    name: 'Desert Sand',
    icon: '🏜️',
    description: 'Warm beige and sandy tones',
    metaColor: '#d97706',
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    icon: '❄️',
    description: 'Cool whites and icy blues',
    metaColor: '#60a5fa',
  },
  {
    id: 'autumn-harvest',
    name: 'Autumn Harvest',
    icon: '🍂',
    description: 'Warm browns and golden yellows',
    metaColor: '#ea580c',
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    icon: '💜',
    description: 'Soft purple with dreamy gradients',
    metaColor: '#c084fc',
  },
];

const readStoredTheme = (): Theme | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    return (window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) || null;
  } catch (error) {
    console.warn('Unable to access theme preference from storage.', error);
    return null;
  }
};

const persistTheme = (theme: Theme) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Unable to persist theme preference.', error);
  }
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = readStoredTheme();
    return stored || 'bright-sky';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    
    // Save to localStorage
    persistTheme(theme);
    
    // Update meta theme-color for PWA
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const themeData = AVAILABLE_THEMES.find(t => t.id === theme);
      metaThemeColor.setAttribute('content', themeData?.metaColor || '#e0f2fe');
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((current) => (current === 'bright-sky' ? 'dark-glass' : 'bright-sky'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
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
