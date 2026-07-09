import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, useTheme, type Theme } from '../contexts/ThemeContext';

type PersonalizationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string | null;
  rankLabel?: string;
  progressLabel?: string;
  onSaveName?: (name: string) => void | Promise<void>;
};

const STORAGE_KEY = 'lifegoal-personalization-preferences';

const SHIP_COLORS = [
  { id: 'cosmic-blue', label: 'Cosmic Blue', value: '#38bdf8' },
  { id: 'aurora-green', label: 'Aurora Green', value: '#34d399' },
  { id: 'sunset-pink', label: 'Sunset Pink', value: '#fb7185' },
  { id: 'starlight-gold', label: 'Starlight Gold', value: '#fbbf24' },
] as const;

const SHIP_LOGOS = ['🚀', '⭐', '🌙', '🪐'] as const;
const TRAITS = ['Brave', 'Calm', 'Creative', 'Kind', 'Curious', 'Focused', 'Playful', 'Resilient'] as const;

type StoredPreferences = {
  shipName: string;
  shipColor: string;
  shipLogo: string;
  traits: string[];
};

function readStoredPreferences(): StoredPreferences {
  if (typeof window === 'undefined') {
    return { shipName: '', shipColor: SHIP_COLORS[0].id, shipLogo: SHIP_LOGOS[0], traits: [] };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<StoredPreferences>;
    return {
      shipName: typeof parsed.shipName === 'string' ? parsed.shipName : '',
      shipColor: SHIP_COLORS.some(color => color.id === parsed.shipColor) ? parsed.shipColor! : SHIP_COLORS[0].id,
      shipLogo: SHIP_LOGOS.some(logo => logo === parsed.shipLogo) ? parsed.shipLogo! : SHIP_LOGOS[0],
      traits: Array.isArray(parsed.traits) ? parsed.traits.filter(trait => TRAITS.some(option => option === trait)) : [],
    };
  } catch {
    return { shipName: '', shipColor: SHIP_COLORS[0].id, shipLogo: SHIP_LOGOS[0], traits: [] };
  }
}

export function PersonalizationModal({
  isOpen,
  onClose,
  initialName,
  rankLabel = 'New Explorer',
  progressLabel = 'Start completing habits and goals to fill your progress bar.',
  onSaveName,
}: PersonalizationModalProps) {
  const { setThemeMode, setLightTheme, setDarkTheme } = useTheme();
  const [name, setName] = useState(initialName ?? '');
  const [shipName, setShipName] = useState('');
  const [shipColor, setShipColor] = useState<string>(SHIP_COLORS[0].id);
  const [shipLogo, setShipLogo] = useState<string>(SHIP_LOGOS[0]);
  const [traits, setTraits] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const stored = readStoredPreferences();
    setName(initialName ?? '');
    setShipName(stored.shipName);
    setShipColor(stored.shipColor);
    setShipLogo(stored.shipLogo);
    setTraits(stored.traits);
    setStatus(null);
  }, [initialName, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const selectedColor = useMemo(
    () => SHIP_COLORS.find(color => color.id === shipColor) ?? SHIP_COLORS[0],
    [shipColor],
  );

  const toggleTrait = (trait: string) => {
    setTraits(current => (
      current.includes(trait)
        ? current.filter(item => item !== trait)
        : [...current, trait].slice(0, 4)
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const trimmedName = name.trim();
      if (onSaveName && trimmedName && trimmedName !== (initialName ?? '').trim()) {
        await onSaveName(trimmedName);
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        shipName: shipName.trim(),
        shipColor,
        shipLogo,
        traits,
      }));
      setStatus('Personalization saved!');
    } catch (error) {
      console.error('Failed to save personalization preferences:', error);
      setStatus('Could not save everything yet. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const chooseTheme = (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    if (mode === 'light') setLightTheme(DEFAULT_LIGHT_THEME as Theme);
    if (mode === 'dark') setDarkTheme(DEFAULT_DARK_THEME as Theme);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="personalization-modal" role="presentation">
      <button className="personalization-modal__backdrop" type="button" aria-label="Close personalization" onClick={onClose} />
      <section className="personalization-modal__panel" role="dialog" aria-modal="true" aria-labelledby="personalization-modal-title">
        <header className="personalization-modal__header">
          <div>
            <p className="personalization-modal__eyebrow">Personalize your journey</p>
            <h2 id="personalization-modal-title">Make the app feel like yours</h2>
          </div>
          <button type="button" className="personalization-modal__close" onClick={onClose} aria-label="Close personalization modal">×</button>
        </header>

        <div className="personalization-modal__grid">
          <label className="personalization-modal__field">
            <span>Your name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Captain name" />
          </label>
          <label className="personalization-modal__field">
            <span>Spaceship name</span>
            <input value={shipName} onChange={(event) => setShipName(event.target.value)} placeholder="The Habit Comet" />
          </label>

          <div className="personalization-modal__rank-card">
            <span>Current rank</span>
            <strong>{rankLabel}</strong>
            <p>{progressLabel}</p>
          </div>

          <div className="personalization-modal__ship-card" style={{ '--ship-color': selectedColor.value } as CSSProperties}>
            <span className="personalization-modal__ship-logo" aria-hidden="true">{shipLogo}</span>
            <div>
              <strong>{shipName.trim() || 'Your spaceship'}</strong>
              <p>{selectedColor.label}</p>
            </div>
          </div>
        </div>

        <div className="personalization-modal__section">
          <h3>Choose spaceship color and logo</h3>
          <div className="personalization-modal__swatches">
            {SHIP_COLORS.map(color => (
              <button key={color.id} type="button" className={color.id === shipColor ? 'is-selected' : ''} onClick={() => setShipColor(color.id)} aria-label={`Choose ${color.label}`} style={{ '--swatch': color.value } as CSSProperties} />
            ))}
          </div>
          <div className="personalization-modal__logos">
            {SHIP_LOGOS.map(logo => (
              <button key={logo} type="button" className={logo === shipLogo ? 'is-selected' : ''} onClick={() => setShipLogo(logo)}>{logo}</button>
            ))}
          </div>
        </div>

        <div className="personalization-modal__section">
          <h3>Pick an app theme</h3>
          <div className="personalization-modal__themes">
            <button type="button" onClick={() => chooseTheme('light')}>🌿 Bio Day</button>
            <button type="button" onClick={() => chooseTheme('dark')}>🌌 Flow Night</button>
          </div>
        </div>

        <div className="personalization-modal__section">
          <h3>Choose up to 4 traits</h3>
          <div className="personalization-modal__traits">
            {TRAITS.map(trait => (
              <button key={trait} type="button" className={traits.includes(trait) ? 'is-selected' : ''} onClick={() => toggleTrait(trait)}>{trait}</button>
            ))}
          </div>
        </div>

        <footer className="personalization-modal__footer">
          {status ? <p>{status}</p> : <p>These choices personalize your profile, spaceship vibe, and app look.</p>}
          <button type="button" className="btn btn--secondary" onClick={onClose}>Done</button>
          <button type="button" className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save personalization'}</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
