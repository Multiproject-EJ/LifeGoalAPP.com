import { useState, useCallback, useMemo } from 'react';
import { useKeyboardShortcuts, formatShortcut } from '../../../hooks/useKeyboardShortcuts';
import type { Action, ActionCategory } from '../../../types/actions';

interface UseActionsKeyboardOptions {
  actions: Action[];
  onNewAction: () => void;
  onCompleteAction: (id: string) => void;
  onDeleteAction: (id: string) => void;
  onCategoryChange: (category: ActionCategory) => void;
  onSave?: () => void;
  onCancel?: () => void;
  enabled?: boolean;
}

export function useActionsKeyboard({
  actions,
  onNewAction,
  onCompleteAction,
  onDeleteAction,
  onCategoryChange,
  onSave,
  onCancel,
  enabled = true,
}: UseActionsKeyboardOptions) {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedAction = useMemo(() => 
    selectedIndex >= 0 && selectedIndex < actions.length 
      ? actions[selectedIndex] 
      : null,
    [actions, selectedIndex]
  );

  const moveSelection = useCallback((direction: 'up' | 'down') => {
    setSelectedIndex(prev => {
      if (actions.length === 0) return -1;
      if (prev === -1) return 0;
      
      if (direction === 'up') {
        return prev > 0 ? prev - 1 : actions.length - 1;
      } else {
        return prev < actions.length - 1 ? prev + 1 : 0;
      }
    });
  }, [actions.length]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(actions.map(a => a.id)));
    setSelectionMode(true);
  }, [actions]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
    setSelectedIndex(-1);
  }, []);

  const shortcuts = useMemo(() => [
    {
      key: 'n',
      action: onNewAction,
      description: 'New action',
    },
    {
      key: 'Enter',
      ctrl: true,
      action: () => onSave?.(),
      description: 'Save',
    },
    {
      key: 'Escape',
      action: () => {
        if (selectionMode) {
          clearSelection();
        } else {
          onCancel?.();
        }
      },
      description: 'Cancel / Clear selection',
    },
    {
      key: 'ArrowUp',
      action: () => moveSelection('up'),
      description: 'Move selection up',
    },
    {
      key: 'ArrowDown',
      action: () => moveSelection('down'),
      description: 'Move selection down',
    },
    {
      key: 'Enter',
      action: () => {
        if (selectedAction) {
          onCompleteAction(selectedAction.id);
        }
      },
      description: 'Complete selected action',
    },
    {
      key: 'Backspace',
      action: () => {
        if (selectedAction) {
          onDeleteAction(selectedAction.id);
          setSelectedIndex(prev => Math.max(0, prev - 1));
        }
      },
      description: 'Delete selected action',
    },
    {
      key: 'Delete',
      action: () => {
        if (selectedAction) {
          onDeleteAction(selectedAction.id);
          setSelectedIndex(prev => Math.max(0, prev - 1));
        }
      },
      description: 'Delete selected action',
    },
    {
      key: '1',
      action: () => onCategoryChange('must_do'),
      description: 'Switch to MUST DO',
    },
    {
      key: '2',
      action: () => onCategoryChange('nice_to_do'),
      description: 'Switch to NICE TO DO',
    },
    {
      key: '3',
      action: () => onCategoryChange('project'),
      description: 'Switch to PROJECT',
    },
    {
      key: 'a',
      ctrl: true,
      action: selectAll,
      description: 'Select all',
    },
    {
      key: ' ', // Space
      action: () => {
        if (selectedAction) {
          toggleSelected(selectedAction.id);
          setSelectionMode(true);
        }
      },
      description: 'Toggle selection',
      preventDefault: true,
    },
  ], [
    onNewAction, 
    onSave, 
    onCancel, 
    moveSelection, 
    selectedAction, 
    onCompleteAction, 
    onDeleteAction, 
    onCategoryChange, 
    selectAll, 
    toggleSelected, 
    selectionMode, 
    clearSelection
  ]);

  useKeyboardShortcuts(shortcuts, { enabled });

  return {
    selectedIndex,
    setSelectedIndex,
    selectedAction,
    selectionMode,
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
    shortcuts: shortcuts.map(s => ({
      ...s,
      formatted: formatShortcut(s),
    })),
  };
}
