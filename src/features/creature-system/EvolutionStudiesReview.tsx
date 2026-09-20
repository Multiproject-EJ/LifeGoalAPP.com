import { useState } from 'react';
import { getFamily } from './content';
import { CreatureCard } from './Card';
import { CreatureModal } from './Modal';
import { EVOLUTION_STUDIES } from './evolutionStudies';

type Study = { familyId: string; form: number; card: string; clay: string };

export function EvolutionStudiesReview() {
  const [edition, setEdition] = useState<'card' | 'clay'>('card');
  const [grey, setGrey] = useState(false);
  const [hints, setHints] = useState(true);
  const [selected, setSelected] = useState<Study | null>(null);
  return <section className="cs-growth-review" aria-labelledby="cs-growth-title">
    <p className="cs-eyebrow">Evolution studies · eleven distinct families</p>
    <h3 id="cs-growth-title">Different personalities. Different kinds of power.</h3>
    <p>Echo unfolds its voice. Bloom develops shelter. Cinder opens into protection. Celest breaks its frame. Lux turns control into living architecture. Fern directs attention. Dreamroot becomes a world. Nightbloom chooses refuge. Prism expands care. Aurora broadcasts feeling. Cosmos opens into chorus. The transformation principle is shared; the bodies, attention systems and emotional expression are not.</p>
    <div className="cs-batch-controls">
      <div role="group" aria-label="Evolution art edition">
        <button type="button" aria-pressed={edition === 'card'} onClick={() => setEdition('card')}>Cinematic evolution</button>
        <button type="button" aria-pressed={edition === 'clay'} onClick={() => setEdition('clay')}>Clay evolution</button>
      </div>
      <label><input type="checkbox" checked={grey} onChange={e => setGrey(e.target.checked)} /> Greyscale evolution</label>
      <label><input type="checkbox" checked={!hints} onChange={e => setHints(!e.target.checked)} /> Hide evolution emotion hints</label>
    </div>
    <p className="cs-note">Cinematic cards and clay image studies—not rotatable models or approved art. Tap a card for both treatments. Viewing does not unlock a form.</p>
    {EVOLUTION_STUDIES.map(line => <section key={line.familyId} className="cs-growth-line" data-family-id={line.familyId}>
      <h4>{line.title}</h4><p>{line.mechanism}</p>
      <div className={`cs-evolution-grid${line.forms.length === 2 ? ' cs-growth-two' : ''}${line.forms.length === 4 ? ' cs-growth-four' : ''}${grey ? ' is-grey' : ''}${!hints ? ' hide-hints' : ''}`}>
        {line.forms.map(entry => <article key={entry.form} data-form={entry.form}>
          <h4>{entry.form} · {entry.stage}</h4>
          <CreatureCard family={getFamily(entry.familyId)!} previewForm={entry.form} artOverride={entry[edition]} artCaption={edition === 'card' ? 'Cinematic evolution · candidate' : 'Clay evolution · image only'} onOpen={() => setSelected(entry)} />
          {hints && <p className="cs-batch-review-note">{entry.growth}</p>}
        </article>)}
      </div>
      {hints && <p className="cs-note">Review: {line.review}</p>}
    </section>)}
    <p className="cs-note">Earlier artwork is preserved below. Bloom’s existing pop-out model is an older geometry study, not a model of this redesign. Originality and emotional readability remain review gates; no exhaustive look-alike clearance is claimed.</p>
    {selected && <CreatureModal title={`${getFamily(selected.familyId)!.name} · form ${selected.form} · evolution study`} onClose={() => setSelected(null)}>
      <div className="cs-batch-pair">{(['card', 'clay'] as const).map(kind => <figure key={kind}><figcaption>{kind === 'card' ? 'Cinematic card artwork' : 'Rounded clay image study'}</figcaption><img src={selected[kind]} alt={`${getFamily(selected.familyId)!.name}, form ${selected.form}, ${kind}`} /></figure>)}</div>
      <p className="cs-note">Separate image interpretations of the same stage. No live mesh is represented here; exact pose registration is a later modelling check.</p>
    </CreatureModal>}
  </section>;
}
