import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Action, ActionCategory } from '../../../types/actions';
import { ActionItem } from './ActionItem';
import { CategoryHeader } from './CategoryHeader';

export interface ActionsListProps {
  actions: Action[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Action>) => void;
  onOpenDetail?: (action: Action) => void;
  onReorderCategory?: (category: ActionCategory, orderedIds: string[]) => void | Promise<void>;
  selectedIndex?: number;
  selectedIds?: Set<string>;
  justCompletedActionId?: string | null;
}

type ActionsByCategory = Record<ActionCategory, Action[]>;

const CATEGORY_ORDER: ActionCategory[] = ['must_do', 'nice_to_do', 'project'];

const sortCategoryActions = (actions: Action[]): Action[] =>
  [...actions].sort((a, b) => {
    if (a.order_index !== b.order_index) {
      return a.order_index - b.order_index;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

const buildActionsByCategory = (actions: Action[]): ActionsByCategory => {
  const grouped: ActionsByCategory = {
    must_do: [],
    nice_to_do: [],
    project: [],
  };

  for (const action of actions) {
    if (!action.completed) {
      grouped[action.category].push(action);
    }
  }

  for (const category of CATEGORY_ORDER) {
    grouped[category] = sortCategoryActions(grouped[category]);
  }

  return grouped;
};

export function ActionsList({
  actions,
  onComplete,
  onDelete,
  onOpenDetail,
  onReorderCategory,
  selectedIndex = -1,
  selectedIds = new Set(),
  justCompletedActionId = null,
}: ActionsListProps) {
  const computedByCategory = useMemo(() => buildActionsByCategory(actions), [actions]);
  const [orderedByCategory, setOrderedByCategory] = useState<ActionsByCategory>(computedByCategory);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingCategory, setDraggingCategory] = useState<ActionCategory | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const pendingReorderRef = useRef(false);

  useEffect(() => {
    setOrderedByCategory(computedByCategory);
  }, [computedByCategory]);

  const moveWithinCategory = useCallback((category: ActionCategory, sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    setOrderedByCategory((prev) => {
      const current = prev[category];
      const sourceIndex = current.findIndex((action) => action.id === sourceId);
      const targetIndex = current.findIndex((action) => action.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
        return prev;
      }

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      pendingReorderRef.current = true;

      return {
        ...prev,
        [category]: next,
      };
    });
  }, []);

  const finalizeReorder = useCallback(() => {
    if (!draggingCategory || !draggingId) return;

    const category = draggingCategory;
    const orderedIds = orderedByCategory[category].map((action) => action.id);

    setDraggingId(null);
    setDraggingCategory(null);
    setDragOverId(null);

    if (!pendingReorderRef.current) {
      return;
    }

    pendingReorderRef.current = false;
    onReorderCategory?.(category, orderedIds);
  }, [draggingCategory, draggingId, onReorderCategory, orderedByCategory]);

  useEffect(() => {
    if (!draggingId) return;

    const handlePointerUp = () => finalizeReorder();
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggingId, finalizeReorder]);

  const handleDragStart = useCallback((category: ActionCategory, actionId: string) => {
    setDraggingId(actionId);
    setDraggingCategory(category);
    pendingReorderRef.current = false;
  }, []);

  const handleDragEnter = useCallback(
    (category: ActionCategory, targetId: string) => {
      if (!draggingId || draggingCategory !== category) return;
      setDragOverId(targetId);
      moveWithinCategory(category, draggingId, targetId);
    },
    [draggingCategory, draggingId, moveWithinCategory]
  );

  const handleDragEnd = useCallback(() => {
    finalizeReorder();
  }, [finalizeReorder]);

  const renderCategorySection = (category: ActionCategory) => {
    const categoryActions = orderedByCategory[category];

    if (categoryActions.length === 0) {
      return null;
    }

    return (
      <section
        className="actions-tab__category"
        key={category}
        aria-labelledby={`actions-category-${category}`}
      >
        <CategoryHeader category={category} count={categoryActions.length} />

        <ul className="actions-tab__list" role="list" data-category={category}>
          {categoryActions.map((action) => {
            const globalIndex = actions.filter((a) => !a.completed).findIndex((a) => a.id === action.id);
            const isSelected = globalIndex === selectedIndex || selectedIds.has(action.id);
            const isDragging = draggingId === action.id;
            const isDragOver = dragOverId === action.id && draggingId !== action.id;

            return (
              <ActionItem
                key={action.id}
                action={action}
                onComplete={() => onComplete(action.id)}
                onDelete={() => onDelete(action.id)}
                onOpenDetail={onOpenDetail ? () => onOpenDetail(action) : undefined}
                isSelected={isSelected}
                isJustCompleted={justCompletedActionId === action.id}
                isDragging={isDragging}
                isDragOver={isDragOver}
                onDragStart={() => handleDragStart(category, action.id)}
                onDragEnter={() => handleDragEnter(category, action.id)}
                onDragEnd={handleDragEnd}
              />
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <div className="actions-tab__content">
      {renderCategorySection('must_do')}
      {renderCategorySection('nice_to_do')}
      {renderCategorySection('project')}
    </div>
  );
}
