import { useMemo, useState } from 'react';
import { CreatureHatchThreeExperience } from '../components/CreatureHatchThreeExperience';
import { EGG_HATCH_TIER_PROFILES, parseEggHatchPreviewTime, type EggHatchTier } from '../services/eggHatchThreePresentation';
import './EggHatchThreeLab.css';

const SPROUTLING_REFERENCE_ROOT = '/docs/visual-references/creatures/sproutling-form1';

const SPROUTLING_FORM_PREVIEWS = [
  {
    level: 1,
    name: 'Sproutling',
    status: 'In game',
    statusClass: 'live',
    src: '/assets/creatures/common-sproutling.webp',
    note: 'Canonical hatchling artwork currently used by HabitGame.',
  },
  {
    level: 2,
    name: 'Sproutling Guardian',
    status: 'Candidate',
    statusClass: 'candidate',
    src: '/assets/creatures/candidates/common-sproutling-form2-v1.webp',
    note: 'Three-leaf crown, stronger moss-stone arms and young guardian stance.',
  },
  {
    level: 3,
    name: 'Stonebloom Sproutling',
    status: 'Candidate',
    statusClass: 'candidate',
    src: '/assets/creatures/candidates/common-sproutling-form3-v1.webp',
    note: 'Five-leaf crown, flower mantle, root vines and mature guardian mass.',
  },
] as const;

const SPROUTLING_RECONSTRUCTION_REFERENCES = [
  {
    name: 'Full-character turnaround',
    src: `${SPROUTLING_REFERENCE_ROOT}/sproutling-form1-turnaround-v1.png`,
    note: 'Front, three-quarter, profile and rear silhouette continuity.',
  },
  {
    name: 'Head and face',
    src: `${SPROUTLING_REFERENCE_ROOT}/sproutling-form1-head-turnaround-v1.png`,
    note: 'Eye seating, cheek volume, leaf-cap coverage and rear construction.',
  },
  {
    name: 'Bifurcating crown',
    src: `${SPROUTLING_REFERENCE_ROOT}/sproutling-form1-crown-turnaround-v1.png`,
    note: 'Two-leaf crown curvature, stem socket and underside construction.',
  },
  {
    name: 'Torso and collar',
    src: `${SPROUTLING_REFERENCE_ROOT}/sproutling-form1-torso-turnaround-v1.png`,
    note: 'Pear torso, conforming belly panel and full radial leaf mantle.',
  },
  {
    name: 'Stone arm assemblies',
    src: `${SPROUTLING_REFERENCE_ROOT}/sproutling-form1-arms-turnaround-v1.png`,
    note: 'Continuous arm shells, inset moss, three knuckles and attachment sockets.',
  },
  {
    name: 'Legs and feet',
    src: `${SPROUTLING_REFERENCE_ROOT}/sproutling-form1-legs-feet-turnaround-v1.png`,
    note: 'Boot-shaped feet, planted stance and three-toe spacing.',
  },
  {
    name: 'Professional assembly guide',
    src: `${SPROUTLING_REFERENCE_ROOT}/sproutling-form1-assembly-guide-v1.png`,
    note: 'Whole-character sockets and overlap order for a coherent animation rig.',
  },
] as const;

function readInitialTier(): EggHatchTier {
  const requested = new URLSearchParams(window.location.search).get('tier');
  return requested === 'rare' || requested === 'mythic' ? requested : 'common';
}

function readPausedAtSeconds() {
  return parseEggHatchPreviewTime(new URLSearchParams(window.location.search).get('time'));
}

function readPreviewOrbitDegrees() {
  const parsed = Number.parseFloat(new URLSearchParams(window.location.search).get('orbit') ?? '0');
  return Number.isFinite(parsed) ? Math.max(-180, Math.min(180, parsed)) : 0;
}

function readInitialQuality(): 'low' | 'high' {
  return new URLSearchParams(window.location.search).get('quality') === 'low' ? 'low' : 'high';
}

function readProfileEnabled() {
  return new URLSearchParams(window.location.search).get('profile') === '1';
}

function readReducedMotionOverride(): boolean | undefined {
  return new URLSearchParams(window.location.search).get('reduced') === '1' ? true : undefined;
}

export default function EggHatchThreeLab() {
  const [tier, setTier] = useState<EggHatchTier>(readInitialTier);
  const pausedAtSeconds = useMemo(readPausedAtSeconds, []);
  const [previewOrbitDegrees, setPreviewOrbitDegrees] = useState(readPreviewOrbitDegrees);
  const labOptions = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    return {
      focusedPreview: search.get('focus') === 'model',
      isolateCreature: search.get('isolate') === 'creature',
      quality: readInitialQuality(),
      profileEnabled: readProfileEnabled(),
      reducedMotionOverride: readReducedMotionOverride(),
    };
  }, []);
  const {
    focusedPreview,
    isolateCreature,
    quality,
    profileEnabled,
    reducedMotionOverride,
  } = labOptions;

  if (focusedPreview) {
    return (
      <main
        className="egg-hatch-three-lab egg-hatch-three-lab--focused"
        data-quality={quality}
        data-profile={profileEnabled ? 'enabled' : 'disabled'}
        data-reduced-motion={reducedMotionOverride === true ? 'forced' : 'system'}
      >
        <section className="egg-hatch-three-lab__phone" aria-label="Focused phone hatch preview">
          <div className="egg-hatch-three-lab__orbit" aria-label="3D inspection angle">
            {[
              { label: 'Left 30°', value: -30 },
              { label: 'Front', value: 0 },
              { label: 'Right 30°', value: 30 },
              { label: 'Side', value: 90 },
              { label: 'Back', value: 180 },
            ].map((view) => (
              <button
                key={view.value}
                type="button"
                className={previewOrbitDegrees === view.value ? 'is-selected' : ''}
                aria-pressed={previewOrbitDegrees === view.value}
                onClick={() => setPreviewOrbitDegrees(view.value)}
              >
                {view.label}
              </button>
            ))}
          </div>
          <CreatureHatchThreeExperience
            tier={tier}
            quality={quality}
            profile={profileEnabled}
            reducedMotionOverride={reducedMotionOverride}
            pausedAtSeconds={pausedAtSeconds}
            previewOrbitDegrees={previewOrbitDegrees}
            isolateCreature={isolateCreature}
            showPaletteControls={!isolateCreature}
            showReplayControl={!isolateCreature}
          />
        </section>
      </main>
    );
  }

  return (
    <main
      className="egg-hatch-three-lab"
      data-quality={quality}
      data-profile={profileEnabled ? 'enabled' : 'disabled'}
      data-reduced-motion={reducedMotionOverride === true ? 'forced' : 'system'}
    >
      <header className="egg-hatch-three-lab__header">
        <div>
          <p>HabitGame 3D pilot</p>
          <h1>Egg Hatch Lab</h1>
          <span>One level-one Sproutling · three repo-authored egg materials · live colour variants</span>
        </div>
        <div className="egg-hatch-three-lab__tiers" aria-label="Egg tier">
          {(Object.keys(EGG_HATCH_TIER_PROFILES) as EggHatchTier[]).map((candidate) => (
            <button
              key={candidate}
              type="button"
              className={candidate === tier ? 'is-selected' : ''}
              aria-pressed={candidate === tier}
              onClick={() => setTier(candidate)}
            >
              {EGG_HATCH_TIER_PROFILES[candidate].label}
            </button>
          ))}
        </div>
      </header>
      <section className="egg-hatch-three-lab__evolution" aria-labelledby="sproutling-evolution-heading">
        <div className="egg-hatch-three-lab__evolution-heading">
          <div>
            <p>2D creature progression</p>
            <h2 id="sproutling-evolution-heading">Sproutling forms</h2>
          </div>
          <span><b>Form 1</b> is live. Forms 2–3 are new review candidates.</span>
        </div>
        <div className="egg-hatch-three-lab__form-grid">
          {SPROUTLING_FORM_PREVIEWS.map((form) => (
            <article key={form.level} className={`egg-hatch-three-lab__form egg-hatch-three-lab__form--${form.statusClass}`}>
              <div className="egg-hatch-three-lab__form-art">
                <img src={form.src} alt={`${form.name}, creature form ${form.level}`} />
                <span className="egg-hatch-three-lab__form-number">Form {form.level}</span>
                <span className="egg-hatch-three-lab__form-status">{form.status}</span>
              </div>
              <div className="egg-hatch-three-lab__form-copy">
                <h3>{form.name}</h3>
                <p>{form.note}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="egg-hatch-three-lab__phone" aria-label="Phone hatch preview">
        <div className="egg-hatch-three-lab__orbit" aria-label="3D inspection angle">
          {[
            { label: 'Left 30°', value: -30 },
            { label: 'Front', value: 0 },
            { label: 'Right 30°', value: 30 },
            { label: 'Side', value: 90 },
            { label: 'Back', value: 180 },
          ].map((view) => (
            <button
              key={view.value}
              type="button"
              className={previewOrbitDegrees === view.value ? 'is-selected' : ''}
              aria-pressed={previewOrbitDegrees === view.value}
              onClick={() => setPreviewOrbitDegrees(view.value)}
            >
              {view.label}
            </button>
          ))}
        </div>
        <CreatureHatchThreeExperience
          tier={tier}
          quality={quality}
          profile={profileEnabled}
          reducedMotionOverride={reducedMotionOverride}
          pausedAtSeconds={pausedAtSeconds}
          previewOrbitDegrees={previewOrbitDegrees}
          showPaletteControls
          showReplayControl
        />
      </section>
      <details className="egg-hatch-three-lab__reference-pack">
        <summary>
          <span>
            <b>Professional reconstruction pack</b>
            <small>Seven multi-angle sheets · canonical front art remains the likeness authority</small>
          </span>
          <em>7 reference sheets</em>
        </summary>
        <div className="egg-hatch-three-lab__reference-grid">
          {SPROUTLING_RECONSTRUCTION_REFERENCES.map((reference) => (
            <figure key={reference.name}>
              <a href={reference.src} target="_blank" rel="noreferrer">
                <img src={reference.src} alt={`${reference.name} reconstruction reference`} loading="lazy" />
              </a>
              <figcaption>
                <b>{reference.name}</b>
                <span>{reference.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="egg-hatch-three-lab__reference-caveat">
          These generated turnarounds are inferred depth and socket aids. The shipped Form 1 image above remains the strict authority for face, crown, colour and cuteness.
        </p>
      </details>
      <footer className="egg-hatch-three-lab__notes">
        <strong>{EGG_HATCH_TIER_PROFILES[tier].shellFamily}</strong>
        <span>{EGG_HATCH_TIER_PROFILES[tier].silhouetteSignature}</span>
        <span>Reference: {EGG_HATCH_TIER_PROFILES[tier].referenceArtSrc}</span>
      </footer>
    </main>
  );
}
