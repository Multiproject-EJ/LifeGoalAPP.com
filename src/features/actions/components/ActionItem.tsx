import { useRef, useState } from 'react';
import type React from 'react';
import type { Action } from '../../../types/actions';
import { ACTION_CATEGORY_CONFIG, ACTIONS_XP_REWARDS, calculateTimeRemaining } from '../../../types/actions';
import { convertXpToPoints } from '../../../constants/economy';
import { PointsBadge } from '../../../components/PointsBadge';
import { ActionTimer } from './ActionTimer';

export interface ActionItemProps {
  action: Action;
  onComplete: () => void;
  onDelete: () => void;
  onOpenDetail?: () => void;
  isSelected?: boolean;
  isJustCompleted?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragEnter?: () => void;
  onDragEnd?: () => void;
  showPointsBadge?: boolean;
}

export function ActionItem({
  action,
  onComplete,
  onDelete,
  onOpenDetail,
  isSelected = false,
  isJustCompleted = false,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragEnter,
  onDragEnd,
  showPointsBadge = false,
}: ActionItemProps) {
  const timeRemaining = calculateTimeRemaining(action.expires_at);
  const config = ACTION_CATEGORY_CONFIG[action.category];
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const swipeHandledRef = useRef(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isLinkedToProject = Boolean(action.project_id || action.migrated_to_project_id);

  // MUST DO items don't expire
  const showTimer = action.category !== 'must_do';

  const handleContentClick = () => {
    if (swipeHandledRef.current) {
      swipeHandledRef.current = false;
      return;
    }
    if (onOpenDetail) {
      onOpenDetail();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleContentClick();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchDeltaRef.current = { x: 0, y: 0 };
    swipeHandledRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    touchDeltaRef.current = {
      x: touch.clientX - touchStartRef.current.x,
      y: touch.clientY - touchStartRef.current.y,
    };
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current) return;
    const { x, y } = touchDeltaRef.current;
    const isHorizontalSwipe = Math.abs(x) > 70 && Math.abs(y) < 40;

    if (isHorizontalSwipe && x < 0) {
      swipeHandledRef.current = true;
      setShowDeleteConfirm(true);
    }

    touchStartRef.current = null;
    touchDeltaRef.current = { x: 0, y: 0 };
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', action.id);
    onDragStart?.();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    onDragEnter?.();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragEnter?.();
    onDragEnd?.();
  };

  const handleHandlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStart?.();
  };

  const itemClasses = [
    'action-item',
    timeRemaining.isExpiringSoon && showTimer ? 'action-item--expiring-soon' : '',
    isSelected ? 'action-item--selected' : '',
    isJustCompleted ? 'action-item--just-completed' : '',
    isDragging ? 'action-item--dragging' : '',
    isDragOver ? 'action-item--drag-over' : '',
    isLinkedToProject ? 'action-item--project-linked' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const pointsLabel = (() => {
    if (!showPointsBadge) return null;
    const xpReward = action.category === 'must_do'
      ? ACTIONS_XP_REWARDS.COMPLETE_MUST_DO
      : action.category === 'nice_to_do'
        ? ACTIONS_XP_REWARDS.COMPLETE_NICE_TO_DO
        : ACTIONS_XP_REWARDS.COMPLETE_PROJECT_ACTION;
    return convertXpToPoints(xpReward).toString();
  })();

  return (
    <li
      className={itemClasses}
      style={{ '--category-color': config.color } as React.CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      draggable
      onDragStart={handleDragStart}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragEnd={onDragEnd}
      onDrop={handleDrop}
    >
      {pointsLabel ? (
        <PointsBadge value={pointsLabel} className="points-badge--corner action-item__points-badge" size="mini" />
      ) : null}
      <button
        type="button"
        className="action-item__drag-handle"
        aria-label={`Drag to reorder: ${action.title}`}
        onPointerDown={handleHandlePointerDown}
      >
        <span aria-hidden="true">⠿</span>
      </button>

      <button
        type="button"
        className="action-item__checkbox"
        onClick={onComplete}
        aria-label={`Complete: ${action.title}`}
      >
        <span className="action-item__checkbox-icon" aria-hidden="true">
          {action.completed ? '✓' : '○'}
        </span>
      </button>

      <div
        className="action-item__content"
        onClick={handleContentClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`View details: ${action.title}`}
      >
        <span className="action-item__title-row">
          {isLinkedToProject && (
            <span className="action-item__project-icon" role="img" aria-label="Linked to project">
              🏷️
            </span>
          )}
          <span className="action-item__title">{action.title}</span>
        </span>
        {action.notes && <span className="action-item__notes">{action.notes}</span>}
      </div>

      <ActionTimer action={action} />

      {showDeleteConfirm ? (
        <div className="action-item__delete-confirm" role="group" aria-label={`Delete ${action.title}`}>
          <span className="action-item__delete-confirm-label">Delete?</span>
          <button type="button" className="action-item__delete-confirm-yes" onClick={handleConfirmDelete}>
            Yes
          </button>
          <button type="button" className="action-item__delete-confirm-no" onClick={handleCancelDelete}>
            No
          </button>
        </div>
      ) : (
        <button type="button" className="action-item__delete" onClick={onDelete} aria-label={`Delete: ${action.title}`}>
          <span aria-hidden="true">×</span>
        </button>
      )}
    </li>
  );
}
