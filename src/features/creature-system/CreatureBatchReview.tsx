import { useState } from 'react';
import { getFamily } from './content';
import { CreatureCard } from './Card';
import { CreatureModal } from './Modal';
import { CREATURE_BATCH, TWILIGHT_EVOLUTION } from './creatureBatch';

type Pair = {familyId:string; form:number; card:string; clay:string};
export function CreatureBatchReview() {
  const [edition, setEdition] = useState<'card'|'clay'>('card');
  const [selected, setSelected] = useState<Pair|null>(null);
  const [grey, setGrey] = useState(false);
  const [hints, setHints] = useState(true);
  const caption = edition === 'card' ? 'Cinematic card art · candidate' : 'Clay model study · image only';
  const renderCard = (entry: Pair) => <CreatureCard family={getFamily(entry.familyId)!} previewForm={entry.form} artOverride={entry[edition]} artCaption={caption} onOpen={() => setSelected(entry)} />;
  return <section className="cs-batch-review" aria-labelledby="cs-batch-title">
    <p className="cs-eyebrow">10 new families · 2 interpretations · 1 complete three-form line</p>
    <h3 id="cs-batch-title">The card tells the story.<br/>The figure makes it tangible.</h3>
    <p>Cinematic, realistic fantasy artwork for the card. Rounded clay as the physical interpretation. Same creature, emotional direction and pose—not necessarily the same material or rendering style.</p>
    <div className="cs-batch-controls"><div role="group" aria-label="Batch art edition"><button type="button" aria-pressed={edition==='card'} onClick={() => setEdition('card')}>Cinematic cards</button><button type="button" aria-pressed={edition==='clay'} onClick={() => setEdition('clay')}>Clay studies</button></div><label><input type="checkbox" checked={grey} onChange={e=>setGrey(e.target.checked)} /> Greyscale batch</label><label><input type="checkbox" checked={!hints} onChange={e=>setHints(!e.target.checked)} /> Hide batch emotion hints</label></div>
    <p className="cs-note">All are review candidates. Clay views here are raster studies, not rotatable meshes. Tap a card to compare both images. No form is unlocked or ownership granted by viewing it.</p>
    <div className={`cs-batch-grid${grey?' is-grey':''}${!hints?' hide-hints':''}`}>
      {CREATURE_BATCH.map(entry => <article key={entry.familyId} data-family-id={entry.familyId}>{renderCard(entry)}{hints&&<p className="cs-batch-review-note">{entry.review}</p>}</article>)}
    </div>
    <section className="cs-batch-evolution" aria-labelledby="cs-evolution-title">
      <p className="cs-eyebrow">F13 · same family at every level</p>
      <h3 id="cs-evolution-title">Twilight Seed · all 3 planned forms</h3>
      <p>Little potential → emerging ability → powerful actualisation. A protected seed becomes an active root-limbed explorer, then a commanding creature with a fully unfurled canopy. Violet leaf anatomy, cyan attention and the spiral crest connect the family; body proportions and silhouette genuinely transform.</p>
      <div className={`cs-evolution-grid${grey?' is-grey':''}${!hints?' hide-hints':''}`}>{TWILIGHT_EVOLUTION.map(entry=><article key={entry.form} data-form={entry.form}><h4>{entry.form} · {entry.stage}</h4>{renderCard(entry)}{hints&&<p className="cs-batch-review-note">{entry.growth}</p>}</article>)}</div>
      <p className="cs-note">Revised transformation study: stages 2 and 3 replace the earlier near-identical seed shapes. Stage names here describe the art direction, not new gameplay unlocks. The middle face still needs a stricter maturity pass; the final canopy must be checked for dragon-like associations. These are image candidates, not approved art or live models.</p>
    </section>
    <details className="cs-explanation"><summary>Face, originality and identity checks</summary><p>Each family has its own body and attention anatomy. No Pokémon artwork or names were supplied as generation references. Crescent, plant and architectural motifs still need look-alike screening: changing a material or colour alone is not enough. Initial reference checks are limited, not exhaustive originality clearance.</p><p>Before approval: identify the dominant emotion without its label; reject repeated mature baby faces; compare silhouette, anatomy and colour landmarks against neighbouring creatures and known characters. Experimental aperture designs must feel alive, not merely decorative.</p></details>
    {selected&&<CreatureModal title={`${getFamily(selected.familyId)!.name} · form ${selected.form} · two interpretations`} onClose={()=>setSelected(null)}><div className="cs-batch-pair">{(['card','clay'] as const).map(kind=><figure key={kind}><figcaption>{kind==='card'?'Cinematic card artwork':'Clay model study · image only'}</figcaption><img src={selected[kind]} alt={`${getFamily(selected.familyId)!.name}, form ${selected.form}, ${kind==='card'?'cinematic artwork':'clay study'}`} /></figure>)}</div><p className="cs-note">Pose and identity are designed to correspond, but these are separate generated images. Exact card-to-live-model registration is a later 3D verification step; no substitute model opens here.</p></CreatureModal>}
  </section>;
}
