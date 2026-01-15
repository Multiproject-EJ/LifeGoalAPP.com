import { useState } from 'react';
import type { ActionCategory, CreateActionInput } from '../../../types/actions';
import { ACTION_CATEGORY_CONFIG } from '../../../types/actions';

export interface QuickAddActionProps {
  onAdd: (input: CreateActionInput) => Promise<void>;
  disabled?: boolean;
}

export function QuickAddAction({ onAdd, disabled = false }: QuickAddActionProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<ActionCategory>('nice_to_do');
  const [adding, setAdding] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || adding) return;

    setAdding(true);
    try {
      await onAdd({
        title: trimmedTitle,
        category,
        notes: notes.trim() || undefined,
      });
      setTitle('');
      setNotes('');
      setShowNotes(false);
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
