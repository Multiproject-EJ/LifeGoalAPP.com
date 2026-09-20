import { useState } from 'react';
import { getFamily } from './content';
import { CreatureCard } from './Card';
import { CreatureModal } from './Modal';

const examples = [
  {id:'common-bloom-mite', key:'bloom', note:'Low, broad petal crawler. Keep the small amber eyes; soften concern into affection.'},
  {id:'common-twilight-seed', key:'twilight', note:'Upright seed with an opening cradle. Keep the inquisitive gaze and asymmetric crown.'},
  {id:'mythic-echo-phoenix', key:'echo', note:'Eyeless resonance organism. Test a compact, grounded alternative without borrowing the other faces.'},
] as const;
const studyPath = (key: string) => `/assets/creatures/comparisons/mature-trio-v2/${key}-clay.png`;
const echoAlternative = '/assets/creatures/style-studies/rounded-clay-v1/echo-grounded-alternative.png';

export function ClayDirection() {
  const [grounded, setGrounded] = useState(false);
  const [expanded, setExpanded] = useState<{src:string; title:string} | null>(null);
  return <section className="cs-clay-direction" aria-labelledby="cs-clay-title">
    <p className="cs-eyebrow">Earlier trio · clay interpretation studies</p>
    <h3 id="cs-clay-title">Small creatures. Clear personalities.</h3>
    <p>Clay is the direction for simplified physical figures, not a mandatory card-art style. These earlier form-2 image studies show one interpretation of the same identities—not final approvals or changes to your collection.</p>
    <div className="cs-clay-rules"><p><strong>Share the material</strong><span>Soft matte clay, rounded edges, quiet lighting and restrained detail.</span></p><p><strong>Keep each identity</strong><span>Different body plan, palette, attention anatomy and emotional gesture.</span></p><p><strong>Grow the expression</strong><span>Baby eyes may recur in form 1. Mature forms need their own readable emotion.</span></p></div>
    <div className="cs-clay-cards">{examples.map(example => {
      const family = getFamily(example.id)!;
      const src = example.key === 'echo' && grounded ? echoAlternative : studyPath(example.key);
      return <div key={example.id}>
        <CreatureCard family={family} previewForm={2} artOverride={src} artCaption={example.key === 'echo' && grounded ? 'Clay alternative · review pending' : 'Rounded clay image · review pending'} onOpen={() => setExpanded({src, title:`${family.name} · clay image study`})} />
        <p className="cs-note">{example.note}</p>
      </div>;
    })}</div>
    <div className="cs-clay-echo"><div><h4>Echo: airy or grounded?</h4><p>The version you liked is preserved. The alternative replaces thin curls with three substantial lobes and a focused aperture. It reads as more alert to me, but hope is still less clear than determination.</p></div><div role="group" aria-label="Echo clay variant"><button type="button" aria-pressed={!grounded} onClick={() => setGrounded(false)}>Keep airy Echo</button><button type="button" aria-pressed={grounded} onClick={() => setGrounded(true)}>Try grounded Echo</button></div></div>
    <p className="cs-note">These cards contain flat images. Clicking enlarges the chosen clay image; it does not launch the earlier Bloom model or promise a matching 3D figure. No match score is invented for an art preview.</p>
    <details className="cs-explanation"><summary>Identity across card art and figures</summary><ol><li>Keep family anatomy, colour landmarks and dominant emotion recognisable.</li><li>Use cinematic, realistic and dramatic card artwork; simplify the physical figure into rounded clay.</li><li>Complete form progression without repeating one mature face across families.</li><li>Build real models, align each card pose and verify the pop-out transition. Identical surface materials are not required.</li></ol></details>
    {expanded && <CreatureModal title={expanded.title} onClose={() => setExpanded(null)}><img className="cs-contrast-expanded" src={expanded.src} alt={expanded.title} /><p className="cs-note">Clay interpretation · individual design still under review · raster image, not a 3D model.</p></CreatureModal>}
  </section>;
}
