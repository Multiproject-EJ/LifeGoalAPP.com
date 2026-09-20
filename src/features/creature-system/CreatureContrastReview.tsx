import { useState } from 'react';
import { getFamily } from './content';
import { LEGACY_FORM_ART_CANDIDATES } from './artCandidates';
import { CreatureModal } from './Modal';
const candidateFormArt = (id:string, form:number) => LEGACY_FORM_ART_CANDIDATES[id]?.[form] ?? null;

const studies = [
  { key: 'bloom', id: 'common-bloom-mite', mix: 'Caregiver · Empath · Mentor', anatomy: 'Low petal body · tiny amber sensory slits', change: 'Flatter petal mask, no muzzle, raised inner ridges and six grounding pads.', risk: 'Concern reads more strongly than affection. The next expression pass needs warmth without baby eyes.' },
  { key: 'twilight', id: 'common-twilight-seed', mix: 'Dreamer · Creator · Explorer', anatomy: 'Upright seed · searching cyan eye windows', change: 'Smaller eyes follow the opening leaf cradle; uneven crown leaves carry the searching gesture.', risk: 'Paired eyes and pointed crown can still suggest a cute animal. Push the seed-mask anatomy further.' },
  { key: 'echo', id: 'mythic-echo-phoenix', mix: 'Champion · Pioneer · Commander', anatomy: 'Asymmetric resonance body · eyeless aperture', change: 'Organic curled membranes replace rivets and mechanical ornament. No borrowed face template.', risk: 'Still too sculpture-like. Determined hope is not yet readable without the label; this needs the most work.' },
] as const;
const asset = (key: string, style: 'original' | 'clay') => `/assets/creatures/comparisons/mature-trio-v2/${key}-${style}.png`;

/** Review-only alternatives: never changes active art, ownership, forms or approval state. */
export function CreatureContrastReview() {
  const [style, setStyle] = useState<'original' | 'clay'>('clay');
  const [greyscale, setGreyscale] = useState(false);
  const [small, setSmall] = useState(false);
  const [blind, setBlind] = useState(false);
  const [expanded, setExpanded] = useState<{src: string; title: string} | null>(null);
  const before = style === 'original' ? 'Previous candidate' : 'New original';
  const after = style === 'original' ? 'New original' : 'Rounded clay image';
  return <section className="cs-contrast-review" aria-labelledby="cs-contrast-title">
    <p className="cs-eyebrow">Earlier style comparison · designs under review</p>
    <h3 id="cs-contrast-title">Three personalities. Three different bodies.</h3>
    <p>First compare the anatomy and expression. Then check whether the same identity survives a simpler, rounded style. Tap any image to inspect it.</p>
    <div className="cs-contrast-controls">
      <div role="group" aria-label="Comparison style">
        <button type="button" aria-pressed={style === 'original'} onClick={() => setStyle('original')}>Before → new original</button>
        <button type="button" aria-pressed={style === 'clay'} onClick={() => setStyle('clay')}>Original → rounded clay</button>
      </div>
      <div className="cs-contrast-checks">
        <label><input type="checkbox" checked={greyscale} onChange={e => setGreyscale(e.target.checked)} /> Greyscale</label>
        <label><input type="checkbox" checked={small} onChange={e => setSmall(e.target.checked)} /> 96px test</label>
        <label><input type="checkbox" checked={blind} onChange={e => setBlind(e.target.checked)} /> Hide identity hints</label>
      </div>
    </div>
    <p className="cs-note" role="status">{style === 'clay' ? 'Clay studies are flat images, not rotatable 3D models. The separate Bloom pop-out prototype below is unchanged.' : 'Left: the previous candidate. Right: a new proposal. Neither is approved; active card artwork is unchanged.'}</p>
    {blind && <p className="cs-note">Before revealing the hints: what emotion do you see? Which shapes still feel like animals or objects?</p>}
    <div className={`cs-contrast-grid${greyscale ? ' is-grey' : ''}${small ? ' is-small' : ''}`}>
      {studies.map((study, index) => {
        const family = getFamily(study.id)!;
        const label = blind ? `Study ${String.fromCharCode(65 + index)}` : family.name;
        return <article key={study.id} className="cs-contrast-item">
          <header><small>{blind ? 'Identity hints hidden' : `F${String(family.number).padStart(2, '0')} · form 2`}</small><h4>{label}</h4></header>
          <div className="cs-contrast-pair">
            {[{src: style === 'original' ? candidateFormArt(study.id, 2)! : asset(study.key, 'original'), caption: before}, {src: asset(study.key, style), caption: after}].map(item => <figure key={item.caption}>
              <figcaption>{item.caption}</figcaption>
              <button type="button" aria-label={`Enlarge ${label}: ${item.caption}`} onClick={() => setExpanded({src: item.src, title: `${label} · ${item.caption}`})}>
                <img src={item.src} alt={`${label}: ${item.caption}`} />
              </button>
            </figure>)}
          </div>
          {!blind && <div className="cs-contrast-notes"><p className="cs-contrast-emotion">{family.emotions[0]}</p><p className="cs-contrast-secondary">{family.emotions.slice(1).join(' · ')}</p><p><strong>Art mix:</strong> {study.mix}</p><p><strong>Identity:</strong> {study.anatomy}</p><p>{study.change}</p><p className="cs-contrast-risk"><strong>Still unresolved:</strong> {study.risk}</p></div>}
        </article>;
      })}
    </div>
    <p className="cs-note">Approval gate: distinct at thumbnail size, recognisable across styles, mature expression without a caption, and no ordinary animal or decorative-object read. These three are comparison proposals, not six new completed forms.</p>
    {expanded && <CreatureModal title={expanded.title} onClose={() => setExpanded(null)}><img className={`cs-contrast-expanded${greyscale ? ' is-grey' : ''}`} src={expanded.src} alt={expanded.title} /><p className="cs-note">Image study · review pending · no 3D model is opened here.</p></CreatureModal>}
  </section>;
}
