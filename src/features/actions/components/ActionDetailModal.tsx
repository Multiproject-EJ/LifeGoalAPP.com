import { useState, useEffect } from 'react';
import type { Action, ActionCategory, UpdateActionInput, Project } from '../../../types/actions';
import { ACTION_CATEGORY_CONFIG, calculateTimeRemaining, getActionXpReward } from '../../../types/actions';
import './ActionDetailModal.css';

// Helper function to format dates
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Helper function to filter active projects
const getActiveProjects = (projects: Project[]): Project[] => {
  return projects.filter(
    (p) => p.status === 'planning' || p.status === 'active'
  );
};

export interface ActionDetailModalProps {
  action: Action;
  projects: Project[];
  onClose: () => void;
  onSave: (id: string, updates: UpdateActionInput) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveToProject: (actionId: string, projectId: string) => Promise<void>;
}

export function ActionDetailModal({
  action,
  projects,
  onClose,
  onSave,
  onComplete,
  onDelete,
  onMoveToProject,
}: ActionDetailModalProps) {
  const [title, setTitle] = useState(action.title);
  const [notes, setNotes] = useState(action.notes || '');
  const [category, setCategory] = useState<ActionCategory>(action.category);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const config = ACTION_CATEGORY_CONFIG[category];
  const timeRemaining = calculateTimeRemaining(action.expires_at);
  const xpReward = getActionXpReward(action.category);

  // Check for changes
  useEffect(() => {
    const changed =
      title !== action.title ||
      notes !== (action.notes || '') ||
      category !== action.category;
    setHasChanges(changed);
  }, [title, notes, category, action]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [hasChanges, onClose]); // Add dependencies

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Close anyway?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      await onSave(action.id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        category,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      await onComplete(action.id);
      onClose();
    } catch (err) {
      console.error('Failed to complete:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this action?')) {
      try {
        await onDelete(action.id);
        onClose();
      } catch (err) {
        console.error('Failed to delete:', err);
      }
    }
  };

  const handleMoveToProjectClick = async (projectId: string) => {
    setShowProjectSelector(false);
    try {
      await onMoveToProject(action.id, projectId);
      onClose();
    } catch (err) {
      console.error('Failed to move to project:', err);
    }
  };

  const formatTimeLeft = () => {
    if (action.category === 'must_do') return null;
    
    if (timeRemaining.isExpired) {
      return 'Expired';
    }

    const { daysRemaining, hoursRemaining } = timeRemaining;
    if (daysRemaining > 0) {
      return `${daysRemaining}d ${hoursRemaining}h`;
    }
    if (hoursRemaining > 0) {
      return `${hoursRemaining}h`;
    }
    return '< 1h';
  };

  const activeProjects = getActiveProjects(projects);

  return (
    <div className="action-detail-modal__overlay" onClick={handleClose}>
      <div
        className="action-detail-modal__card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="action-detail-modal__header"
          style={{ '--category-color': config.color } as React.CSSProperties}
        >
          <div className="action-detail-modal__badge">
            <span aria-hidden="true">{config.icon}</span>
            <span>{config.label}</span>
          </div>
          <button
            type="button"
            className="action-detail-modal__close"
            onClick={handleClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="action-detail-modal__body">
          {/* Title */}
          <div className="action-detail-modal__field">
            <label htmlFor="action-title" className="action-detail-modal__label">
              Title
            </label>
            <input
              id="action-title"
              type="text"
              className="action-detail-modal__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>

          {/* Notes */}
          <div className="action-detail-modal__field">
            <label htmlFor="action-notes" className="action-detail-modal__label">
              Notes
            </label>
            <textarea
              id="action-notes"
              className="action-detail-modal__textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes (optional)"
              rows={4}
            />
          </div>

          {/* Category */}
          <div className="action-detail-modal__field">
            <div className="action-detail-modal__label">Category</div>
            <div className="action-detail-modal__category-selector" role="radiogroup">
              {(Object.keys(ACTION_CATEGORY_CONFIG) as ActionCategory[]).map((cat) => {
                const catConfig = ACTION_CATEGORY_CONFIG[cat];
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`action-detail-modal__category-option ${
                      isSelected ? 'action-detail-modal__category-option--selected' : ''
                    }`}
                    style={{ '--category-color': catConfig.color } as React.CSSProperties}
                    onClick={() => setCategory(cat)}
                  >
                    <span className="action-detail-modal__category-radio">
                      {isSelected ? '●' : '○'}
                    </span>
                    <span aria-hidden="true">{catConfig.icon}</span>
                    <span>{catConfig.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Info */}
          <div className="action-detail-modal__info-box">
            <div className="action-detail-modal__info-item">
              <span className="action-detail-modal__info-icon">⏱️</span>
              <span className="action-detail-modal__info-label">Created:</span>
              <span className="action-detail-modal__info-value">
                {formatDate(action.created_at)}
              </span>
            </div>

            {action.category !== 'must_do' && (
              <>
                <div className="action-detail-modal__info-item">
                  <span className="action-detail-modal__info-icon">⏳</span>
                  <span className="action-detail-modal__info-label">Expires:</span>
                  <span className="action-detail-modal__info-value">
                    {formatDate(action.expires_at)}
                  </span>
                </div>

                <div className="action-detail-modal__info-item">
                  <span className="action-detail-modal__info-icon">🕐</span>
                  <span className="action-detail-modal__info-label">Time left:</span>
                  <span
                    className={`action-detail-modal__info-value ${
                      timeRemaining.isExpiringSoon ? 'action-detail-modal__info-value--warning' : ''
                    } ${timeRemaining.isExpired ? 'action-detail-modal__info-value--expired' : ''}`}
                  >
                    {formatTimeLeft()}
                    {timeRemaining.isExpiringSoon && !timeRemaining.isExpired && ' ⚠️'}
                  </span>
                </div>
              </>
            )}

            <div className="action-detail-modal__info-item">
              <span className="action-detail-modal__info-icon">⭐</span>
              <span className="action-detail-modal__info-label">XP Reward:</span>
              <span className="action-detail-modal__info-value">+{xpReward} XP</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="action-detail-modal__footer">
          <div className="action-detail-modal__footer-left">
            <button
              type="button"
              className="action-detail-modal__action action-detail-modal__action--complete"
              onClick={handleComplete}
            >
              ✅ Complete
            </button>
            <div className="action-detail-modal__move-container">
              <button
                type="button"
                className="action-detail-modal__action action-detail-modal__action--move"
                onClick={() => setShowProjectSelector(!showProjectSelector)}
              >
                📦 Move to Project
              </button>

              {showProjectSelector && (
                <div className="action-detail-modal__project-selector">
                  {activeProjects.length === 0 ? (
                    <div className="action-detail-modal__no-projects">
                      No projects yet. Create a project first.
                    </div>
                  ) : (
                    <div className="action-detail-modal__project-list">
                      {activeProjects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          className="action-detail-modal__project-item"
                          onClick={() => handleMoveToProjectClick(project.id)}
                        >
                          <span aria-hidden="true">{project.icon}</span>
                          <span>{project.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="action-detail-modal__footer-right">
            <button
              type="button"
              className="action-detail-modal__action action-detail-modal__action--delete"
              onClick={handleDelete}
            >
              🗑️ Delete
            </button>
            <button
              type="button"
              className="action-detail-modal__action action-detail-modal__action--save"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? '...' : '💾 Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
