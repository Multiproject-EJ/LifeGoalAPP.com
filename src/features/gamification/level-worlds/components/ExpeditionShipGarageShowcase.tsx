import {useMemo, useState} from 'react';
import type {ExpeditionShipPose, ExpeditionShipQuality} from '../dev/ExpeditionShipThreeModel';
import {
  ExpeditionShipCanvas,
  type ExpeditionShipPov,
} from '../dev/ExpeditionShipThreeLab';
import './ExpeditionShipGarageShowcase.css';

const POSE_LABELS: Record<ExpeditionShipPose, string> = {
  docked: 'Haven',
  expedition: 'Walker',
  flight: 'Fast space',
};

const VIEW_OPTIONS: Array<{id: ExpeditionShipPov; label: string}> = [
  {id: 'orbit', label: 'Exterior'},
  {id: 'fabrication', label: 'Workshop'},
  {id: 'fabrication-window', label: 'Forward glass'},
];

interface ExpeditionShipGarageShowcaseProps {
  onOpenUpgrades: () => void;
  onOpenCosmetics: () => void;
}

export default function ExpeditionShipGarageShowcase({
  onOpenUpgrades,
  onOpenCosmetics,
}: ExpeditionShipGarageShowcaseProps) {
  const [pose, setPose] = useState<ExpeditionShipPose>('docked');
  const [pov, setPov] = useState<ExpeditionShipPov>('orbit');
  const [orbit, setOrbit] = useState(28);
  const quality = useMemo<ExpeditionShipQuality>(() => {
    if (typeof window === 'undefined') return 'low';
    return window.matchMedia('(max-width: 820px), (prefers-reduced-motion: reduce)').matches
      ? 'low'
      : 'high';
  }, []);
  const motion = useMemo(() => {
    if (pose === 'flight') return {thrust: 0.62, boost: 0.22, hover: 0.32, walk: 0, stabilize: 0.82};
    if (pose === 'expedition') return {thrust: 0.08, boost: 0, hover: 0.38, walk: 0.28, stabilize: 0.74};
    return {thrust: 0, boost: 0, hover: 0, walk: 0, stabilize: 0.72};
  }, [pose]);

  const choosePose = (nextPose: ExpeditionShipPose) => {
    setPose(nextPose);
    if (nextPose !== 'docked' && pov !== 'orbit') setPov('orbit');
  };

  const chooseView = (nextPov: ExpeditionShipPov) => {
    setPov(nextPov);
    if (nextPov !== 'orbit') setPose('docked');
  };

  const rotate = (delta: number) => {
    setPov('orbit');
    setOrbit((current) => {
      const next = current + delta;
      return next > 180 ? next - 360 : next < -180 ? next + 360 : next;
    });
  };

  return (
    <section className="expedition-ship-garage" aria-labelledby="expedition-ship-garage-title">
      <div className="expedition-ship-garage__hero">
        <div className="expedition-ship-garage__heading">
          <div>
            <p className="expedition-ship-garage__eyebrow">Hangar 01 · Expedition class</p>
            <h3 id="expedition-ship-garage-title">Your transforming sanctuary</h3>
            <p>Inspect the ship, enter key rooms, and preview every travel configuration from one shared 3D model.</p>
          </div>
          <span className="expedition-ship-garage__status"><i /> Systems online</span>
        </div>

        <div className="expedition-ship-garage__stage">
          <ExpeditionShipCanvas
            pose={pose}
            quality={quality}
            orbitDegrees={orbit}
            thrust={motion.thrust}
            boost={motion.boost}
            hover={motion.hover}
            walk={motion.walk}
            stabilize={motion.stabilize}
            transformProgress={null}
            pov={pov}
            cameraProbe={null}
            onOrbitChange={(nextOrbit) => {
              setPov('orbit');
              setOrbit(nextOrbit);
            }}
          />
          <div className="expedition-ship-garage__stage-label">
            <strong>{pov === 'orbit' ? POSE_LABELS[pose] : VIEW_OPTIONS.find((view) => view.id === pov)?.label}</strong>
            <span>{pov === 'orbit' ? `${quality} detail · drag to rotate` : 'Drag to look around inside'}</span>
          </div>
          <div className="expedition-ship-garage__rotate" aria-label="Rotate ship">
            <button type="button" onClick={() => rotate(-30)} aria-label="Rotate ship left">↺</button>
            <button type="button" onClick={() => rotate(30)} aria-label="Rotate ship right">↻</button>
          </div>
        </div>

        <div className="expedition-ship-garage__controls">
          <div className="expedition-ship-garage__control-group" role="group" aria-label="Ship configuration">
            <span>Configuration</span>
            <div>
              {(Object.keys(POSE_LABELS) as ExpeditionShipPose[]).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  className={pose === candidate && pov === 'orbit' ? 'is-active' : ''}
                  aria-pressed={pose === candidate && pov === 'orbit'}
                  onClick={() => choosePose(candidate)}
                >
                  {POSE_LABELS[candidate]}
                </button>
              ))}
            </div>
          </div>
          <div className="expedition-ship-garage__control-group" role="group" aria-label="Ship view">
            <span>Inspection</span>
            <div>
              {VIEW_OPTIONS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={pov === view.id ? 'is-active' : ''}
                  aria-pressed={pov === view.id}
                  onClick={() => chooseView(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="expedition-ship-garage__systems" aria-label="Installed ship systems">
        <article>
          <span>Propulsion</span>
          <strong>Tri-drive</strong>
          <small>Centre keel plus two transforming grip engines</small>
        </article>
        <article>
          <span>Interior</span>
          <strong>Living sanctuary</strong>
          <small>Zen garden, residences, workshop and creature habitats</small>
        </article>
        <article>
          <span>Travel</span>
          <strong>Three configurations</strong>
          <small>Haven, Walker and compressed fast-space form</small>
        </article>
      </div>

      <div className="expedition-ship-garage__actions">
        <button type="button" onClick={onOpenUpgrades}>Browse ship upgrades</button>
        <button type="button" onClick={onOpenCosmetics}>Plan colours &amp; interiors</button>
      </div>
    </section>
  );
}
