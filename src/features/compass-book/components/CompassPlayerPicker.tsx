import type { CompassPlayerOption } from '../logic/playerOptions';

export type CompassPlayerPickerProps = {
  options: readonly CompassPlayerOption[];
  /** Noun for the hint, e.g. "goals" / "habits". */
  sourceNoun: string;
  /** Fills the text answer with the tapped option's label. */
  onPick: (label: string) => void;
};

/**
 * A compact chip row that lets the player fill a text fragment by tapping one of
 * their real goals/habits instead of typing it. Renders nothing when there is no
 * data, so the fragment cleanly falls back to plain text entry.
 */
export function CompassPlayerPicker({ options, sourceNoun, onPick }: CompassPlayerPickerProps) {
  if (options.length === 0) return null;
  return (
    <div className="compass-book__picker">
      <p className="compass-book__picker-hint">Tap one of your {sourceNoun}, or type your own:</p>
      <div className="compass-book__picker-chips">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="compass-book__picker-chip"
            onClick={() => onPick(option.label)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
