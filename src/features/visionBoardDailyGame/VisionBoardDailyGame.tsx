import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LIFE_WHEEL_CATEGORIES } from '../checkins/LifeWheelCheckins';
import { useDailyVisionSession } from './useDailyVisionSession';
import './visionBoardDailyGame.css';

type VisionBoardDailyGameProps = {
  session: Session;
  onClose: () => void;
  isConfigured: boolean;
};

type ItemDraft = {
  title: string;
  description: string;
  file: File | null;
};

export function VisionBoardDailyGame({ session, onClose, isConfigured }: VisionBoardDailyGameProps) {
  const {
    sessionRow,
    items,
    loading,
    error,
    revealItem,
    updateItemArea,
    reorderItem,
    completeSession,
  } = useDailyVisionSession(session);

  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const revealedItems = useMemo(() => items.filter((item) => item.status !== 'hidden'), [items]);
  const isCompleted = sessionRow?.status === 'completed';

  const updateDraft = (itemId: string, updates: Partial<ItemDraft>) => {
    setDrafts((current) => {
      const base: ItemDraft = current[itemId] || { title: '', description: '', file: null };
      return {
        ...current,
        [itemId]: { ...base, ...updates },
      };
    });
  };

  const handleReveal = async (itemId: string) => {
    const draft = drafts[itemId];
    if (!draft?.title?.trim()) {
      setLocalError('Add a title before revealing this card.');
      return;
    }
    if (!draft.file) {
      setLocalError('Choose an image to attach to this card.');
      return;
    }
    setLocalError(null);
    setUploadingId(itemId);
    try {
      await revealItem(itemId, {
        title: draft.title,
        description: draft.description,
        file: draft.file,
        suggestedArea: revealedItems.length % LIFE_WHEEL_CATEGORIES.length === 0
          ? LIFE_WHEEL_CATEGORIES[0].key
          : undefined,
      });
    } finally {
      setUploadingId(null);
    }
  };

  const handleFileChange = (itemId: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLocalError('Daily game cards only accept image files.');
      return;
    }
    updateDraft(itemId, { file });
  };

  return (
    <div className="daily-game">
      <header className="daily-game__header">
        <div>
          <p className="daily-game__eyebrow">Vision Board · Daily Game</p>
          <h3>Reveal, rank, and balance today’s inspirations</h3>
          <p className="daily-game__lede">
            Flip six mystery cards, drag them into order, and assign each to a life wheel area. We’ll store the images in
            your existing vision board bucket using signed URLs so the legacy board keeps working.
          </p>
        </div>
        <button type="button" className="daily-game__close" onClick={onClose}>
          Close
        </button>
      </header>

      {!isConfigured && (
        <p className="daily-game__status daily-game__status--warning">
          Connect Supabase to play. The daily game requires storage uploads and signed URLs.
        </p>
      )}

      {error && <p className="daily-game__status daily-game__status--error">{error}</p>}
      {localError && <p className="daily-game__status daily-game__status--error">{localError}</p>}
      {loading && <p className="daily-game__status">Loading your daily session…</p>}

      {sessionRow?.status === 'completed' && (
        <div className="daily-game__summary">
          <div>
            <p className="daily-game__eyebrow">Today’s insight</p>
            <h4>{sessionRow.insight_area || 'Balance focus'}</h4>
            <p>{sessionRow.insight_text || 'Great work! You have already completed the Daily Vision Game today.'}</p>
          </div>
          <div className="daily-game__summary-score">
            <span className="daily-game__score-number">{sessionRow.balance_score ?? 0}</span>
            <span className="daily-game__score-label">Balance score</span>
          </div>
        </div>
      )}

      <section className="daily-game__section">
        <header className="daily-game__section-header">
          <div>
            <p className="daily-game__eyebrow">Step 1</p>
            <h4>Reveal your cards</h4>
            <p>Tap each card to add a title and upload an image. Images are compressed to WebP and stored in Supabase.</p>
          </div>
          <span className="daily-game__chip">6 cards</span>
        </header>
        <div className="daily-game__grid">
          {items.map((item, index) => (
            <article key={item.id} className={`daily-game__card daily-game__card--${item.status}`}>
              <div className="daily-game__card-head">
                <span className="daily-game__chip">Card {index + 1}</span>
                <span className="daily-game__chip">{item.status === 'hidden' ? 'Hidden' : 'Revealed'}</span>
              </div>
              {item.status === 'hidden' ? (
                <div className="daily-game__card-body">
                  <label className="daily-game__field">
                    <span>Title</span>
                    <input
                      type="text"
                      placeholder="Add a headline"
                      value={drafts[item.id]?.title || ''}
                      onChange={(event) => updateDraft(item.id, { title: event.target.value })}
                      disabled={!isConfigured || isCompleted}
                    />
                  </label>
                  <label className="daily-game__field">
                    <span>Description</span>
                    <textarea
                      placeholder="Why does this inspire you?"
                      value={drafts[item.id]?.description || ''}
                      onChange={(event) => updateDraft(item.id, { description: event.target.value })}
                      disabled={!isConfigured || isCompleted}
                    />
                  </label>
                  <label className="daily-game__field">
                    <span>Attach image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleFileChange(item.id, event.target.files?.[0] ?? null)}
                      disabled={!isConfigured || isCompleted}
                    />
                  </label>
                  <button
                    type="button"
                    className="daily-game__button"
                    onClick={() => handleReveal(item.id)}
                    disabled={!isConfigured || uploadingId === item.id || isCompleted}
                  >
                    {uploadingId === item.id ? 'Saving…' : 'Reveal & save'}
                  </button>
                </div>
              ) : (
                <div className="daily-game__card-body">
                  {item.signedUrl ? (
                    <img src={item.signedUrl} alt={item.title || 'Daily card'} className="daily-game__image" />
                  ) : (
                    <div className="daily-game__placeholder" aria-hidden>
                      <span>Image stored</span>
                    </div>
                  )}
                  <div className="daily-game__meta">
                    <p className="daily-game__title">{item.title}</p>
                    {item.description && <p className="daily-game__description">{item.description}</p>}
                  </div>
                  <label className="daily-game__field">
                    <span>Life wheel area</span>
                    <select
                      value={item.final_area || item.suggested_area || ''}
                      onChange={(event) => updateItemArea(item.id, event.target.value)}
                      disabled={isCompleted}
                    >
                      <option value="">Select an area</option>
                      {LIFE_WHEEL_CATEGORIES.map((category) => (
                        <option key={category.key} value={category.key}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="daily-game__section">
        <header className="daily-game__section-header">
          <div>
            <p className="daily-game__eyebrow">Step 2</p>
            <h4>Order your picks</h4>
            <p>Move cards up or down to rank them. Your order is saved instantly.</p>
          </div>
        </header>
        {revealedItems.length === 0 ? (
          <p className="daily-game__status">Reveal at least one card to start ordering.</p>
        ) : (
          <ul className="daily-game__list">
            {revealedItems.map((item, index) => (
              <li key={item.id} className="daily-game__list-item">
                <div>
                  <p className="daily-game__title">{item.title}</p>
                  <p className="daily-game__caption">{item.final_area || item.suggested_area || 'Unassigned'}</p>
                </div>
                <div className="daily-game__actions">
                  <button
                    type="button"
                    onClick={() => reorderItem(item.id, 'up')}
                    disabled={index === 0 || isCompleted}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => reorderItem(item.id, 'down')}
                    disabled={index === revealedItems.length - 1 || isCompleted}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="daily-game__section">
        <header className="daily-game__section-header">
          <div>
            <p className="daily-game__eyebrow">Step 3</p>
            <h4>Balance check</h4>
            <p>Spread your cards across life wheel areas. A balanced mix boosts your score.</p>
          </div>
        </header>
        <div className="daily-game__balance">
          {revealedItems.length === 0 ? (
            <p className="daily-game__status">Assign areas after revealing cards.</p>
          ) : (
            <ul className="daily-game__grid daily-game__grid--balance">
              {revealedItems.map((item) => (
                <li key={item.id} className="daily-game__balance-card">
                  <p className="daily-game__title">{item.title}</p>
                  <label className="daily-game__field">
                    <span>Area</span>
                    <select
                      value={item.final_area || item.suggested_area || ''}
                      onChange={(event) => updateItemArea(item.id, event.target.value)}
                      disabled={isCompleted}
                    >
                      <option value="">Select an area</option>
                      {LIFE_WHEEL_CATEGORIES.map((category) => (
                        <option key={category.key} value={category.key}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="daily-game__section">
        <header className="daily-game__section-header">
          <div>
            <p className="daily-game__eyebrow">Step 4</p>
            <h4>Complete today’s game</h4>
            <p>We’ll lock in your picks, compute the balance score, and store the insight with today’s session.</p>
          </div>
        </header>
        <div className="daily-game__actions-row">
          <button
            type="button"
            className="daily-game__button daily-game__button--primary"
            onClick={completeSession}
            disabled={isCompleted || revealedItems.length === 0}
          >
            {isCompleted ? 'Already completed' : 'Complete session'}
          </button>
          {isCompleted && (
            <div className="daily-game__summary-inline">
              <span className="daily-game__score-number">{sessionRow?.balance_score ?? 0}</span>
              <span className="daily-game__score-label">Balance score</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
