import { useMemo } from 'react';
import { ExpeditionShipCanvas } from '../dev/ExpeditionShipThreeLab';
import { ExpeditionShipGarageQualitySelector } from './ExpeditionShipGarageQualitySelector';
import {
  resolveExpeditionShipGarageQuality,
  type ExpeditionShipGarageQualityPreference,
} from './expeditionShipGarageQuality';
import './ExpeditionShipGarageEntrance.css';

interface ExpeditionShipGarageEntranceProps {
  doorOpen: boolean;
  entering: boolean;
  qualityPreference: ExpeditionShipGarageQualityPreference;
  onQualityPreferenceChange: (preference: ExpeditionShipGarageQualityPreference) => void;
  onEnter: () => void;
}

export default function ExpeditionShipGarageEntrance({
  doorOpen,
  entering,
  qualityPreference,
  onQualityPreferenceChange,
  onEnter,
}: ExpeditionShipGarageEntranceProps) {
  const quality = useMemo(
    () => resolveExpeditionShipGarageQuality(qualityPreference),
    [qualityPreference],
  );

  return (
    <section
      className={`expedition-garage-entrance${doorOpen ? ' is-open' : ''}${entering ? ' is-entering' : ''}`}
      aria-labelledby="expedition-garage-entrance-title"
    >
      <div className="expedition-garage-entrance__viewport">
        <div className="expedition-garage-entrance__ship" aria-hidden="true">
          <ExpeditionShipCanvas
            pose="docked"
            quality={quality}
            orbitDegrees={24}
            thrust={0}
            boost={0}
            hover={0}
            walk={0}
            stabilize={0.76}
            transformProgress={null}
            pov="orbit"
            cameraProbe={null}
            onOrbitChange={() => undefined}
          />
        </div>

        <div className="expedition-garage-entrance__depth" aria-hidden="true" />
        <div className="expedition-garage-entrance__frame" aria-hidden="true">
          <span className="expedition-garage-entrance__beam expedition-garage-entrance__beam--top" />
          <span className="expedition-garage-entrance__beam expedition-garage-entrance__beam--left" />
          <span className="expedition-garage-entrance__beam expedition-garage-entrance__beam--right" />
          <span className="expedition-garage-entrance__light expedition-garage-entrance__light--left" />
          <span className="expedition-garage-entrance__light expedition-garage-entrance__light--right" />
        </div>

        <div className="expedition-garage-entrance__door" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
        </div>

        <div className="expedition-garage-entrance__sign">
          <p>Hangar 01 · Expedition class</p>
          <h3 id="expedition-garage-entrance-title">Spaceship Garage</h3>
          <span><i /> {doorOpen ? 'Hangar open' : 'Pressure door secured'}</span>
        </div>

        <div className="expedition-garage-entrance__quality">
          <ExpeditionShipGarageQualitySelector
            compact
            value={qualityPreference}
            onChange={onQualityPreferenceChange}
          />
        </div>

        <button
          type="button"
          className="expedition-garage-entrance__enter"
          onClick={onEnter}
          disabled={entering}
        >
          <span>{entering ? 'Entering…' : 'Enter Garage'}</span>
          <i aria-hidden="true">→</i>
        </button>
      </div>
      <p className="expedition-garage-entrance__caption">
        Walk into the live 3D hangar to inspect travel modes, rooms, upgrades, and customisation.
      </p>
    </section>
  );
}
