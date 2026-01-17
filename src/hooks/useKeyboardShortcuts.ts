import { useEffect, useCallback, useRef } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  scope?: string; // For scoping shortcuts to specific components
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, scope } = options;
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    const isInputFocused = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable;

    for (const shortcut of shortcutsRef.current) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey;
      const metaMatch = shortcut.meta ? event.metaKey : true;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      // For single letter shortcuts, don't trigger when typing
      if (shortcut.key.length === 1 && !shortcut.ctrl && !shortcut.meta && isInputFocused) {
        continue;
      }

      // Avoid interfering with typing/backspace in inputs unless modifier keys are used
      if (isInputFocused && !shortcut.ctrl && !shortcut.meta && !shortcut.alt) {
        continue;
      }

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.action();
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
  };
}

// Helper to format shortcut for display
export function formatShortcut(config: ShortcutConfig): string {
  const parts: string[] = [];
  
  if (config.ctrl || config.meta) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (config.alt) {
    parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
  }
  if (config.shift) {
    parts.push('⇧');
  }
  
  // Format the key
  let keyDisplay = config.key.toUpperCase();
  if (config.key === 'Enter') keyDisplay = '↵';
  if (config.key === 'Escape') keyDisplay = 'Esc';
  if (config.key === 'ArrowUp') keyDisplay = '↑';
  if (config.key === 'ArrowDown') keyDisplay = '↓';
  if (config.key === 'Backspace') keyDisplay = '⌫';
  
  parts.push(keyDisplay);
  
  return parts.join('+');
}
