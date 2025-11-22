import { createContext, useContext, useState, type ReactNode } from 'react';
import type { JournalType } from './Journal';

/**
 * Context value for journal UI state
 */
type JournalContextValue = {
  journalType: JournalType;
  setJournalType: (type: JournalType) => void;
};

/**
 * Context for managing journal mode state across components
 */
const JournalContext = createContext<JournalContextValue | null>(null);

/**
 * Props for JournalProvider component
 */
type JournalProviderProps = {
  children: ReactNode;
  initialType?: JournalType;
};

/**
 * Provider component for journal context
 * 
 * @example
 * ```tsx
 * <JournalProvider initialType="standard">
 *   <YourJournalComponents />
 * </JournalProvider>
 * ```
 */
export function JournalProvider({ children, initialType = 'standard' }: JournalProviderProps) {
  const [journalType, setJournalType] = useState<JournalType>(initialType);

  const value: JournalContextValue = {
    journalType,
    setJournalType,
  };

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

/**
 * Hook to access journal context
 * 
 * @throws {Error} If used outside of JournalProvider
 * 
 * @example
 * ```tsx
 * const { journalType, setJournalType } = useJournalContext();
 * ```
 */
export function useJournalContext(): JournalContextValue {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournalContext must be used within a JournalProvider');
  }
  return context;
}
