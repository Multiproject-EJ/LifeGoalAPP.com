import { useRef, useState } from 'react';
import type { Action } from '../../../types/actions';
import { ACTION_CATEGORY_CONFIG, calculateTimeRemaining } from '../../../types/actions';
import { ActionTimer } from './ActionTimer';

export interface ActionItemProps {
  action: Action;
  onComplete: () => void;
  onDelete: () => void;
  onOpenDetail?: () => void;
  isSelected?: boolean;
  isJustCompleted?: boolean;
}

export function ActionItem({ action, onComplete, onDelete, onOpenDetail, isSelected = false, isJustCompleted = false }: ActionItemProps) {
  const timeRemaining = calculateTimeRemaining(action.expires_at);
  const config = ACTION_CATEGORY_CONFIG[action.category];
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const swipeHandledRef = useRef(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
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

  return (
    <li 
      className={`action-item ${timeRemaining.isExpiringSoon && showTimer ? 'action-item--expiring-soon' : ''} ${isSelected ? 'action-item--selected' : ''} ${isJustCompleted ? 'action-item--just-completed' : ''}`}
      style={{ '--category-color': config.color } as React.CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
        <span className="action-item__title">{action.title}</span>
        {action.notes && (
          <span className="action-item__notes">{action.notes}</span>
        )}
      </div>
      
      <ActionTimer action={action} />

      {showDeleteConfirm ? (
        <div className="action-item__delete-confirm" role="group" aria-label={`Delete ${action.title}`}>
          <span className="action-item__delete-confirm-label">Delete?</span>
          <button
            type="button"
            className="action-item__delete-confirm-yes"
            onClick={handleConfirmDelete}
          >
            Yes
          </button>
          <button
            type="button"
            className="action-item__delete-confirm-no"
            onClick={handleCancelDelete}
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="action-item__delete"
          onClick={onDelete}
          aria-label={`Delete: ${action.title}`}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </li>
  );
}
