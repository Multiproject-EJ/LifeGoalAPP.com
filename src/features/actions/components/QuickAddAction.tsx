import { useState } from 'react';
import type { ActionCategory, CreateActionInput, Project } from '../../../types/actions';
import { ACTION_CATEGORY_CONFIG } from '../../../types/actions';

export interface QuickAddActionProps {
  onAdd: (input: CreateActionInput) => Promise<void>;
  projects?: Project[];
  disabled?: boolean;
}

export function QuickAddAction({ onAdd, projects = [], disabled = false }: QuickAddActionProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<ActionCategory>('nice_to_do');
  const [projectId, setProjectId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const hasTitle = title.trim().length > 0;

  const activeProjects = projects.filter(
    (p) => p.status === 'planning' || p.status === 'active'
  );

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || adding) return;

    setAdding(true);
    try {
      await onAdd({
        title: trimmedTitle,
        category,
        notes: notes.trim() || undefined,
        project_id: projectId || undefined,
      });
      setTitle('');
      setNotes('');
      setProjectId('');
      setShowCategoryModal(false);
      setShowDetailsModal(false);
    } catch (err) {
      // Error handling is done by parent component
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !adding) {
      if (title.trim()) {
        setShowCategoryModal(true);
      }
    }
  };

  return (
    <section className="actions-tab__quick-add" aria-label="Add new action">
      <div className="actions-tab__quick-add-input-row">
        <input
          type="text"
          className={`actions-tab__quick-add-input ${hasTitle ? '' : 'actions-tab__quick-add-input--pulse'}`}
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={adding || disabled}
          aria-label="New action title"
        />
        <button
          type="button"
          className={`actions-tab__quick-add-button ${hasTitle ? 'actions-tab__quick-add-button--visible' : ''}`}
          onClick={() => setShowCategoryModal(true)}
          disabled={adding || disabled || !hasTitle}
          aria-label="Choose action category"
          aria-hidden={!hasTitle}
          tabIndex={hasTitle ? 0 : -1}
        >
          {adding ? '...' : '+'}
        </button>
      </div>

      {showCategoryModal && (
        <div
          className="actions-tab__quick-add-modal-overlay"
          role="presentation"
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            className="actions-tab__quick-add-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose action category"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="actions-tab__quick-add-modal-header">
              <h3>Choose a category</h3>
              <button
                type="button"
                className="actions-tab__quick-add-modal-close"
                onClick={() => setShowCategoryModal(false)}
                aria-label="Close category selector"
              >
                ✕
              </button>
            </header>
            <div className="actions-tab__quick-add-modal-body actions-tab__quick-add-modal-body--category" role="radiogroup">
              {(Object.keys(ACTION_CATEGORY_CONFIG) as ActionCategory[]).map((cat) => {
                const config = ACTION_CATEGORY_CONFIG[cat];
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`actions-tab__category-option ${
                      isSelected ? 'actions-tab__category-option--selected' : ''
                    }`}
                    style={{
                      '--category-color': config.color,
                    } as React.CSSProperties}
                    onClick={() => {
                      setCategory(cat);
                      setShowCategoryModal(false);
                      setShowDetailsModal(true);
                    }}
                    disabled={disabled}
                  >
                    <span aria-hidden="true">{config.icon}</span>
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div
          className="actions-tab__quick-add-modal-overlay"
          role="presentation"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="actions-tab__quick-add-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add optional details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="actions-tab__quick-add-modal-header">
              <button
                type="button"
                className="actions-tab__quick-add-modal-back"
                onClick={() => {
                  setShowDetailsModal(false);
                  setShowCategoryModal(true);
                }}
                aria-label="Back to category selector"
              >
                ← Back
              </button>
              <h3>Optional details</h3>
              <button
                type="button"
                className="actions-tab__quick-add-modal-close"
                onClick={() => setShowDetailsModal(false)}
                aria-label="Close details"
              >
                ✕
              </button>
            </header>
            <div className="actions-tab__quick-add-modal-body">
              <label className="actions-tab__quick-add-modal-label" htmlFor="quick-add-notes">
                📝 Add notes (optional)
              </label>
              <textarea
                id="quick-add-notes"
                className="actions-tab__notes-textarea"
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={adding || disabled}
                rows={3}
                aria-label="Action notes"
              />

              {activeProjects.length > 0 && (
                <>
                  <label className="actions-tab__quick-add-modal-label" htmlFor="action-project-select">
                    📦 Assign to project (optional)
                  </label>
                  <select
                    id="action-project-select"
                    className="actions-tab__project-select"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    disabled={adding || disabled}
                    aria-label="Select project"
                  >
                    <option value="">Choose a project...</option>
                    {activeProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.icon} {project.title}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <footer className="actions-tab__quick-add-modal-footer">
              <button
                type="button"
                className="actions-tab__quick-add-modal-action actions-tab__quick-add-modal-action--secondary"
                onClick={() => setShowDetailsModal(false)}
                disabled={adding || disabled}
              >
                Cancel
              </button>
              <button
                type="button"
                className="actions-tab__quick-add-modal-action actions-tab__quick-add-modal-action--primary"
                onClick={handleSubmit}
                disabled={adding || disabled}
              >
                {adding ? 'Adding...' : 'Add action'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
