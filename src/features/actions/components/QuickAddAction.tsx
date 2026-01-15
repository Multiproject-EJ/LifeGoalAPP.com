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
  const [showNotes, setShowNotes] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);

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
      setShowNotes(false);
      setShowProjectSelector(false);
    } catch (err) {
      // Error handling is done by parent component
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !adding) {
      handleSubmit();
    }
  };

  return (
    <section className="actions-tab__quick-add" aria-label="Add new action">
      <div className="actions-tab__quick-add-input-row">
        <input
          type="text"
          className="actions-tab__quick-add-input"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={adding || disabled}
          aria-label="New action title"
        />
        <button
          type="button"
          className="actions-tab__quick-add-button"
          onClick={handleSubmit}
          disabled={adding || disabled || !title.trim()}
          aria-label="Add action"
        >
          {adding ? '...' : '+'}
        </button>
      </div>
      
      {/* Notes toggle and textarea */}
      {!showNotes ? (
        <button
          type="button"
          className="actions-tab__notes-toggle"
          onClick={() => setShowNotes(true)}
          disabled={disabled}
        >
          📝 Add notes
        </button>
      ) : (
        <>
          <textarea
            className="actions-tab__notes-textarea"
            placeholder="Optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={adding || disabled}
            rows={3}
            aria-label="Action notes"
          />
          <button
            type="button"
            className="actions-tab__notes-toggle"
            onClick={() => {
              setShowNotes(false);
              setNotes('');
            }}
            disabled={disabled}
          >
            Hide notes
          </button>
        </>
      )}

      {/* Project selector */}
      {activeProjects.length > 0 && (
        <div className="actions-tab__project-selector-wrapper">
          {!showProjectSelector ? (
            <button
              type="button"
              className="actions-tab__project-toggle"
              onClick={() => setShowProjectSelector(true)}
              disabled={disabled}
            >
              📦 Assign to project
            </button>
          ) : (
            <>
              <label className="actions-tab__project-label" htmlFor="action-project-select">
                Select Project (required if clicked)
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
              <button
                type="button"
                className="actions-tab__project-toggle"
                onClick={() => {
                  setShowProjectSelector(false);
                  setProjectId('');
                }}
                disabled={disabled}
              >
                Remove project
              </button>
            </>
          )}
        </div>
      )}

      <div className="actions-tab__category-selector" role="radiogroup" aria-label="Action category">
        {(Object.keys(ACTION_CATEGORY_CONFIG) as ActionCategory[]).map((cat) => {
          const config = ACTION_CATEGORY_CONFIG[cat];
          return (
            <button
              key={cat}
              type="button"
              role="radio"
              aria-checked={category === cat}
              className={`actions-tab__category-option ${
                category === cat ? 'actions-tab__category-option--selected' : ''
              }`}
              style={{ 
                '--category-color': config.color 
              } as React.CSSProperties}
              onClick={() => setCategory(cat)}
              disabled={disabled}
            >
              <span aria-hidden="true">{config.icon}</span>
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
