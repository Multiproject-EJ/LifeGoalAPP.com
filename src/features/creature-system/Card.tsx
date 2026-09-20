import { useState, type CSSProperties } from 'react';
import { getMask, getSuit, SUIT_COLORS, SUIT_GLYPHS, type Family } from './content';
import { candidateFormArt, MASK_ART_CANDIDATES } from './artCandidates';

export function CreatureCard({ family, owned, affinity, onOpen, previewForm, artOverride, artCaption, onArtClick }: { family: Family; owned?: { copies: number; form: number }; affinity?: number; onOpen?: () => void; previewForm?: number; artOverride?: string; artCaption?: string; onArtClick?: (element: HTMLButtonElement) => void }) {
  const [failed, setFailed] = useState(false);
  const suit = getSuit(family);
  const displayForm = previewForm ?? owned?.form ?? 1;
  const candidate = candidateFormArt(family.id, displayForm);
  const Element = onOpen ? 'button' : 'article';
  return <Element type={onOpen ? 'button' : undefined} className={`cs-creature-card cs-rarity-${family.rarity}`} style={{ '--cs-suit': family.mix ? SUIT_COLORS[suit] : '#9baab7' } as CSSProperties} onClick={onOpen} aria-label={`View ${family.name}, family ${family.number}, ${owned ? `${owned.copies} owned` : 'not owned'}`}>
    <span className="cs-card-heading"><span className="cs-family-code">F{String(family.number).padStart(2, '0')}</span><span>{family.rarity}</span></span>
    <strong className="cs-card-name">{family.name}</strong>
    <span className="cs-card-art">{!onOpen && onArtClick ? <button className="cs-pop-trigger" type="button" aria-label="Lift Bloom figure out of card" onClick={e=>onArtClick(e.currentTarget)}><img src={artOverride ?? candidate ?? family.referenceArt} alt="Bloom rounded 3D study, frozen card pose"/><span>Tap figure · lift into 3D ↗</span></button> : failed ? <span>Reference unavailable</span> : <img src={artOverride ?? candidate ?? family.referenceArt} alt="" loading="lazy" onError={() => setFailed(true)} />}</span>
    <span className="cs-art-caption">{artCaption ?? (artOverride ? '3D study edition · rough blockout' : candidate ? `Form ${displayForm} candidate · review pending` : 'Existing reference · redesign pending')}</span>
    <span className="cs-card-tone">{family.emotions?.[0] ?? 'Emotion brief pending'}</span>
    <span className="cs-card-mix">{family.mix ? `${family.mixStatus==='draft'?'Draft mix':'Art mix'}: ${family.mix.map(id => getMask(id)?.name ?? id).join(' · ')}` : 'Personality target pending'}</span>
    <span className="cs-card-bottom"><span className="cs-form-path" aria-label={`Viewing form ${displayForm} of ${family.forms.length}; future forms planned`}>{family.forms.map(f => <span key={f.id} className={f.ordinal === displayForm ? 'cs-current-form' : ''}>{f.ordinal}</span>)}</span><span>{affinity !== undefined ? `${affinity.toFixed(0)} affinity` : 'Not scored'}</span></span>
    <span className="cs-card-ownership">{owned ? `${owned.copies} ${owned.copies === 1 ? 'copy' : 'copies'} owned · current form ${owned.form}` : 'Not owned'}</span>
  </Element>;
}

export const MASK_CANDIDATES = ['dreamer', 'guardian', 'caregiver', 'analyst'];
export function MaskCard({ id, score, onOpen }: { id: string; score?: number | null; onOpen: () => void }) {
  const mask = getMask(id)!;
  const suit = mask.suit as keyof typeof SUIT_COLORS;
  return <button type="button" className="cs-mask-card" onClick={onOpen} style={{ '--cs-suit': SUIT_COLORS[suit] } as CSSProperties} aria-label={`Explore ${mask.name} archetype`}>
    <span className="cs-card-heading"><span>{SUIT_GLYPHS[suit]} {mask.suit}</span><span>{score == null ? 'Unmeasured' : `${score.toFixed(0)} alignment`}</span></span>
    <strong className="cs-card-name">{mask.name}</strong>
    <img src={MASK_ART_CANDIDATES[id]} alt={`${mask.name} expressive mask candidate`} />
    <span className="cs-card-tone">{mask.emotions[0]}</span>
    <span className="cs-card-mix">{mask.emotions[1]} · under pressure: {mask.emotions[2]}</span>
    <span className="cs-art-caption">Mask candidate · review pending</span>
  </button>;
}
