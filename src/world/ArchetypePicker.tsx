import React, { useId, useRef } from 'react';
import { ARCHETYPES } from './archetypes.ts';
import type { Archetype } from './archetypes.ts';
import { usePersistedState } from './usePersistedState.ts';

const STORAGE_KEY = 'habitgame:archetype';

export function ArchetypePicker() {
  const groupId = useId();
  const [selectedId, setSelectedId] = usePersistedState<string | null>(
    STORAGE_KEY,
    null,
  );
  const [expandedId, setExpandedId] = React.useState<string | null>(
    selectedId,
  );
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);

  // The focused card index — drives roving tabIndex.
  // Defaults to the selected card, or 0 if nothing is selected.
  const focusedIndex =
    selectedId !== null
      ? Math.max(
          ARCHETYPES.findIndex((a) => a.id === selectedId),
          0,
        )
      : 0;
  const [rovingIndex, setRovingIndex] = React.useState(focusedIndex);

  const handleSelect = (archetype: Archetype) => {
    const isAlreadySelected = selectedId === archetype.id;
    const nextId = isAlreadySelected ? null : archetype.id;
    setSelectedId(nextId);
    setExpandedId(nextId);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLLIElement>,
    index: number,
    archetype: Archetype,
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(archetype);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (index + 1) % ARCHETYPES.length;
      setRovingIndex(next);
      cardRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (index - 1 + ARCHETYPES.length) % ARCHETYPES.length;
      setRovingIndex(prev);
      cardRefs.current[prev]?.focus();
    }
  };

  const selectedName = ARCHETYPES.find((a) => a.id === selectedId)?.name;

  return (
    <section
      className="archetype-picker"
      aria-labelledby={`${groupId}-heading`}
    >
      <div className="archetype-picker__header">
        <p className="archetype-picker__eyebrow" aria-hidden="true">
          CHOOSE YOUR CLASS
        </p>
        <h2 className="archetype-picker__title" id={`${groupId}-heading`}>
          Who are you in this game?
        </h2>
        <p className="archetype-picker__subtitle">
          Your archetype shapes your quests and rewards.
        </p>
      </div>

      {/* Single persistent live region — announced on every selection change */}
      <p
        className="archetype-picker__live"
        aria-live="polite"
        aria-atomic="true"
      >
        {selectedName ? `${selectedName} selected. Tap again to deselect.` : ''}
      </p>

      <ul
        className="archetype-picker__list"
        role="radiogroup"
        aria-labelledby={`${groupId}-heading`}
      >
        {ARCHETYPES.map((archetype, index) => {
          const isSelected = selectedId === archetype.id;
          const isExpanded = expandedId === archetype.id;
          // Roving tabIndex: only the active item in the group is reachable via Tab
          const tabIdx = index === rovingIndex ? 0 : -1;

          return (
            <li
              key={archetype.id}
              ref={(el) => { cardRefs.current[index] = el; }}
              className={[
                'archetype-picker__card',
                isSelected ? 'archetype-picker__card--selected' : '',
                isExpanded ? 'archetype-picker__card--expanded' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="radio"
              aria-checked={isSelected}
              tabIndex={tabIdx}
              onClick={() => { setRovingIndex(index); handleSelect(archetype); }}
              onKeyDown={(e) => handleKeyDown(e, index, archetype)}
            >
              <div className="archetype-picker__card-summary">
                <span
                  className="archetype-picker__card-icon"
                  aria-hidden="true"
                >
                  {archetype.icon}
                </span>
                <div className="archetype-picker__card-text">
                  <strong className="archetype-picker__card-name">
                    {archetype.name}
                  </strong>
                  <span className="archetype-picker__card-tagline">
                    {archetype.tagline}
                  </span>
                </div>
                <span
                  className="archetype-picker__card-chevron"
                  aria-hidden="true"
                >
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>

              {isExpanded && (
                <div
                  className="archetype-picker__card-detail"
                  role="region"
                  aria-label={`${archetype.name} details`}
                >
                  <p className="archetype-picker__card-description">
                    {archetype.description}
                  </p>
                  <ul
                    className="archetype-picker__perks"
                    aria-label="Perks"
                  >
                    {archetype.perks.map((perk) => (
                      <li key={perk} className="archetype-picker__perk">
                        <span aria-hidden="true">✦</span> {perk}
                      </li>
                    ))}
                  </ul>
                  {isSelected && (
                    <p className="archetype-picker__selected-badge">
                      ✓ Selected
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {selectedId && (
        <p className="archetype-picker__hint">
          You chose: <strong>{selectedName}</strong>. Tap again to deselect.
        </p>
      )}
    </section>
  );
}
