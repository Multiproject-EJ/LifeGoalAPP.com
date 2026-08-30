import type { CSSProperties, ChangeEvent } from 'react';

import './VaultIslandBuildTuner.css';

export type VaultIslandBuildTunerProps = {
  exteriorFill: number;
  vaultInteriorFill: number;
  gigaCharmFill: number;
  onExteriorFillChange: (value: number) => void;
  onVaultInteriorFillChange: (value: number) => void;
  onGigaCharmFillChange: (value: number) => void;
  className?: string;
};

type BuildSliderProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
};

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value));

function BuildSlider({ id, label, value, onChange }: BuildSliderProps) {
  const safeValue = clampPercentage(value);
  const sliderStyle = { '--vault-build-fill': `${safeValue}%` } as CSSProperties;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.currentTarget.value));
  };

  return (
    <div className="vault-build-tuner__control">
      <div className="vault-build-tuner__label-row">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} aria-live="off">
          {Math.round(safeValue)}%
        </output>
      </div>
      <input
        id={id}
        className="vault-build-tuner__range"
        type="range"
        min="0"
        max="100"
        step="1"
        value={safeValue}
        onChange={handleChange}
        style={sliderStyle}
        aria-valuetext={`${Math.round(safeValue)} percent`}
      />
    </div>
  );
}

export function VaultIslandBuildTuner({
  exteriorFill,
  vaultInteriorFill,
  gigaCharmFill,
  onExteriorFillChange,
  onVaultInteriorFillChange,
  onGigaCharmFillChange,
  className = '',
}: VaultIslandBuildTunerProps) {
  const setAll = (value: number) => {
    onExteriorFillChange(value);
    onVaultInteriorFillChange(value);
    onGigaCharmFillChange(value);
  };

  const rootClassName = ['vault-build-tuner', className].filter(Boolean).join(' ');

  return (
    <section className={rootClassName} aria-label="Vault Island build tuner">
      <header className="vault-build-tuner__header">
        <div>
          <p className="vault-build-tuner__eyebrow">Dev build tuner</p>
          <h2>Vault Island</h2>
        </div>
        <div className="vault-build-tuner__actions" aria-label="Build fill presets">
          <button
            type="button"
            className="vault-build-tuner__icon-button"
            onClick={() => setAll(0)}
            aria-label="Reset all build fills to zero"
            title="Reset all fills"
          >
            <span aria-hidden="true">↺</span>
          </button>
          <button
            type="button"
            className="vault-build-tuner__icon-button"
            onClick={() => setAll(100)}
            aria-label="Set all build fills to maximum"
            title="Max all fills"
          >
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <div className="vault-build-tuner__controls">
        <BuildSlider
          id="vault-island-exterior-fill"
          label="Exterior fill"
          value={exteriorFill}
          onChange={onExteriorFillChange}
        />
        <BuildSlider
          id="vault-island-interior-fill"
          label="Vault interior fill"
          value={vaultInteriorFill}
          onChange={onVaultInteriorFillChange}
        />
        <BuildSlider
          id="vault-island-charm-fill"
          label="Giga Charm fill"
          value={gigaCharmFill}
          onChange={onGigaCharmFillChange}
        />
      </div>
    </section>
  );
}

export default VaultIslandBuildTuner;
