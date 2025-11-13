import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'bright-sky' | 'dark-glass';

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
      metaThemeColor.setAttribute('content', theme === 'bright-sky' ? '#e0f2fe' : '#0f172a');
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
