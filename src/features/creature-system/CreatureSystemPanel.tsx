import { useMemo, useState } from 'react';
import { FAMILIES, MASKS, getFamily, getMask, MASK_FACE_BRIEFS, contentReadiness, SUIT_GLYPHS, SUIT_COLORS } from './content';
import { CreatureCard, MaskCard, MASK_CANDIDATES } from './Card';
import { StudyCreatureCard } from './StudyCreatureCard';
import { CreatureModal } from './Modal';
import { rankKindred, rankComplements, targetsForProfile, TEAM_ROLES, type CreatureTeam, type TeamRole } from './matching';
import type { EvidenceProfile } from './personality';
import { getEggStageArtSrc, getEggSellRewardOptions, type EggSellRewardChoice } from '../gamification/level-worlds/services/eggService';
import type { LabEgg } from './labStore';
import './creature-system.css';
import { candidateFormArt, MASK_ART_CANDIDATES } from './artCandidates';
import { RosterMap } from './RosterMap';
import { MatchStatistics } from './MatchStatisticsPanel';
import { ArtProduction } from './ArtProduction';
import { visualIdentityFor } from './visualIdentity';
import { matchStatistics, sortMatchRows, CREATURE_SORTS, type CreatureSort } from './matchStatistics';

export type CreatureSystemPanelProps = {
  profile: EvidenceProfile; owned: Record<string, { copies: number; form: number }>; team: CreatureTeam;
  eggs: LabEgg[]; notice?: string | null;
  onEquip?: (role: TeamRole, id: string | null) => void;
  onCollect?: (eggId: string) => void;
  onSell?: (eggId: string, choice: EggSellRewardChoice) => void;
};
const ROLE_COPY = { kindred: 'A reflection of your mix.', complement: 'Adds approaches your current team represents less.', favourite: 'Because you like them. No justification needed.' };

export function CreatureSystemPanel({ profile, owned, team, eggs, notice, onEquip, onCollect, onSell }: CreatureSystemPanelProps) {
  const [tab, setTab] = useState('trio'), [detail, setDetail] = useState<string | null>(null), [maskId, setMaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all'), [search, setSearch] = useState(''), [form, setForm] = useState(1);
  const [dexSort,setDexSort]=useState<CreatureSort>('owned-name');
  const stats=useMemo(()=>matchStatistics(profile,owned,team),[profile,owned,team]);
  const kindred = useMemo(() => rankKindred(profile), [profile]);
  const targets = targetsForProfile(profile);
  const closeAlternatives=kindred.ranked.filter(row=>kindred.ranked[0].score-row.score<=2+1e-9);
  const evidenceLabel = profile.refinement ? `${profile.refinement.answeredCount}/32 motivation ratings · ${profile.refinement.status}` : `${profile.answeredCount}/${profile.totalQuestions} foundation answers · ${profile.status}`;
  const unrepresented = profile.refinement?.mix ? profile.refinement.archetypes.filter(a => a.score! > 0 && !targets.some(t => (t.profile.refinement?.mix?.[a.id] ?? 0) > 0)) : [];
  const remaining = Object.entries(team).filter(([role]) => role !== 'complement').flatMap(([, id]) => id ? [id] : []);
  const complements = rankComplements(profile, remaining);
  const allSelected = Object.values(team).filter((id): id is string => !!id);
  const breadth = rankComplements(profile, allSelected).baseline;
  const bestOwned = kindred.ranked.find(row => owned[row.id] && (!allSelected.includes(row.id) || team.kindred === row.id));
  const bestComplementOwned = complements.ranked.find(row => owned[row.id]);
  const family = detail ? getFamily(detail) : undefined, mask = maskId ? getMask(maskId) : undefined;
  const openFamily = (id: string,previewForm?:number) => { setDetail(id); setForm(previewForm??owned[id]?.form??1); };
  const ready = contentReadiness();
  const filtered = sortMatchRows(stats.rows,dexSort).filter(row => (!search || `${row.family.name} ${row.family.emotions?.join(' ') ?? ''}`.toLowerCase().includes(search.toLowerCase())) && (filter === 'all' || filter === 'mine' && row.owned || filter === 'unowned' && !row.owned || row.family.rarity === filter)).map(row=>row.family);
  return <section className="cs-theme cs-system">
    <header className="cs-hero"><div><p className="cs-eyebrow">HABITGAME · PERSONALITY & COMPANIONS</p><h1>Different by nature.<br /><em>Stronger together.</em></h1><p>Your masks describe approaches. Your creatures bring them to life.<br /> Your trio is a choice—not a personality grade.</p></div><div className="cs-hero-aside"><strong>{Object.keys(owned).length} / {ready.families}</strong><span>families in this collection</span><small>{evidenceLabel}<br />Experimental game model · not a diagnosis</small></div></header>
    <nav className="cs-tabs" aria-label="Creature system views">{[['trio','My trio'],['dex','Creature dex'],['matches','Match statistics'],['art','Art production'],['masks','Personality masks'],['roster','Roster map'],['eggs','Eggs & discovery']].map(([id,label]) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {notice && <p className="cs-notice" role="status">{notice}</p>}
    {tab === 'roster' && <RosterMap onOpen={openFamily} />}
    {tab === 'matches' && <MatchStatistics stats={stats} onOpen={openFamily} />}
    {tab === 'art' && <ArtProduction onOpen={openFamily} />}
    {tab === 'trio' && <>
      <div className="cs-section-title"><div><h2>Three roles. One team.</h2><p>Recommendations never replace your saved selections.</p></div><div className="cs-breadth"><strong>{breadth === null ? '—' : breadth.toFixed(1)}</strong><span>team breadth / 100</span></div></div>
      <div className="cs-trio-grid">{TEAM_ROLES.map(role => {
        const recommendation = role === 'kindred' ? bestOwned : role === 'complement' ? bestComplementOwned : null;
        const id = team[role], selected = id ? getFamily(id) : undefined;
        return <article key={role} className="cs-role"><span className="cs-eyebrow">{role === 'kindred' ? '01 · REFLECT' : role === 'complement' ? '02 · BROADEN' : '03 · ENJOY'}</span><h3>{role}</h3><p>{ROLE_COPY[role]}</p>
          {selected ? <CreatureCard family={selected} owned={owned[selected.id]} affinity={kindred.ranked.find(r=>r.id===selected.id)?.score} onOpen={() => openFamily(selected.id)} /> : <div className="cs-empty-slot"><span>＋</span><p>{id ? `Preserved family: ${id}` : 'An open place in your team'}</p></div>}
          <label>Choose {role}<select aria-label={`Choose ${role}`} value={id ?? ''} disabled={!onEquip} onChange={e => onEquip?.(role, e.target.value || null)}><option value="">Leave open</option>{Object.keys(owned).map(key => <option key={key} value={key} disabled={allSelected.includes(key) && key !== id}>{getFamily(key)?.name ?? key}</option>)}</select></label>
          {recommendation && !id && <button className="cs-suggest" type="button" disabled={!onEquip || allSelected.includes(recommendation.id)} onClick={()=>onEquip?.(role, recommendation.id)}>Try {getFamily(recommendation.id)?.name} · {role === 'kindred' ? `${recommendation.score.toFixed(0)} affinity` : `+${recommendation.score.toFixed(1)} breadth`}</button>}
        </article>;
      })}</div>
      {allSelected.some(id=>!targets.some(t=>t.id===id)) && <p className="cs-note">Your team includes a creature whose target is not ready. Team breadth and Complement suggestions are unavailable until that target is authored; your choice is preserved.</p>}
      <p className="cs-note">{profile.refinement ? `Motivation refinement: ${profile.refinement.answeredCount}/32 rated · ${profile.refinement.status}. Directly reported motives are used for matching; foundation traits remain separate.` : 'Foundation diagnostic: inferred trait weights. Known mismatches with the intended art direction remain in this older model.'}</p>
      {closeAlternatives.length>1 && <details className="cs-explanation"><summary>{closeAlternatives.length} close Kindred alternatives · within two points</summary><p>These are near-equal options, not a confident single winner. Alphabetical order only breaks numerical ties; your choice stays yours.</p><div className="cs-close-options">{closeAlternatives.map(row=><button type="button" key={row.id} onClick={()=>openFamily(row.id)}>{getFamily(row.id)?.name} · {row.score.toFixed(1)} affinity</button>)}</div></details>}
      {unrepresented.length > 0 && <p className="cs-note">The current target catalogue does not yet represent these motivations you rated: {unrepresented.map(a=>a.name).join(', ')}. Low affinity can reflect this catalogue gap—not a problem with your personality.</p>}
      <details className="cs-explanation"><summary>Why these companions—and what do the numbers mean?</summary><p>{profile.refinement ? 'Affinity compares your 32 directly rated motivations with an authored creature mix. Ratings 1–5 become 0–4 points, then each profile shares one fixed budget. Agreement with an authored target is by construction—not evidence that the questionnaire is valid.' : 'Affinity compares the full 32-archetype mix on shared measured dimensions.'} It is a game score, not a probability. Rarity and form do not increase it.</p><p>Breadth measures the union of equal-budget profiles: you alone begin at 25; 100 is a theoretical ceiling for four entirely different profiles, not a goal or a measure of personal completeness. Complement is the largest additional contribution after your other selected creatures.</p><p>{targets.length} experimental target profiles are being tested. {profile.refinement ? 'All 50 families now have draft motivation links; full coverage is not proof of a good match for every combination.' : 'The foundation diagnostic still scores only its original six targets.'} Close results within two points are shown as alternatives; no currency is awarded for a higher match.</p></details>
      <div className="cs-comparison"><section><h3>Kindred alternatives {kindred.status === 'close' ? '· close result' : ''}</h3>{kindred.ranked.length ? kindred.ranked.slice(0,3).map(row => <button type="button" key={row.id} onClick={()=>openFamily(row.id)}><span>{getFamily(row.id)?.name}<small>{owned[row.id] ? 'Owned' : 'Not owned · discovery needed'}</small></span><strong>{row.score.toFixed(1)} affinity</strong></button>) : <p>There is not enough differentiated evidence to suggest a Kindred yet.</p>}</section><section><h3>What a Complement adds</h3>{complements.ranked.slice(0,3).map(row => <button type="button" key={row.id} onClick={()=>openFamily(row.id)}><span>{getFamily(row.id)?.name}<small>{row.contributions.filter(c=>c.gain>0).slice(0,2).map(c=>getMask(c.id)?.name).join(' + ')}</small></span><strong>+{row.score.toFixed(1)} breadth</strong></button>)}</section></div>
    </>}
    {tab === 'dex' && <>
      <div className="cs-section-title"><div><h2>Your creature dex</h2><p>One entry per family. Forms belong together; rarity stays separate.</p></div></div>
      <div className="cs-filters"><label>Find a creature<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or emotional tone" /></label><label>Show<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All 50 families</option><option value="mine">My collection</option><option value="unowned">Not owned</option><option value="common">Common</option><option value="rare">Rare</option><option value="mythic">Mythic</option></select></label><label>Sort creatures<select value={dexSort} onChange={e=>setDexSort(e.target.value as CreatureSort)}>{CREATURE_SORTS.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label><span>{filtered.length} families</span></div>
      {(dexSort==='affinity'||dexSort==='complement')&&<p className="cs-note">Experimental scores; unavailable values appear last. {dexSort==='complement'?'Added breadth after your Kindred and Favourite, not a least-similar ranking.':'Affinity is a game overlap score, not a match probability.'}</p>}
      <div className="cs-dex-grid">{filtered.map(f => <CreatureCard key={f.id} family={f} owned={owned[f.id]} affinity={kindred.ranked.find(r=>r.id===f.id)?.score} onOpen={()=>openFamily(f.id)} />)}</div>{!filtered.length && <p>No families match this filter.</p>}
    </>}
    {tab === 'masks' && <>
      <div className="cs-section-title"><div><h2>A language for your personality</h2><p>Suit color = orientation. Face = emotion. The labels remain readable without color.</p><p>{profile.refinement ? 'Alignment shows your direct motivation rating on a 0–100 scale, not a measured trait or emotion.' : 'Alignment is inferred from the foundation questions, with known overlapping archetype weights.'}</p></div></div>
      <div className="cs-mask-grid">{MASK_CANDIDATES.map(id => <MaskCard key={id} id={id} score={profile.archetypes.find(a=>a.id===id)?.score} onOpen={()=>setMaskId(id)} />)}</div>
      <h3>All 32 archetype lenses</h3><div className="cs-mask-index">{MASKS.map(m => { const value=profile.archetypes.find(a=>a.id===m.id); const suit=m.suit as keyof typeof SUIT_COLORS; return <button type="button" key={m.id} onClick={()=>setMaskId(m.id)}><span style={{color:SUIT_COLORS[suit]}}>{SUIT_GLYPHS[suit]}</span><span>{m.name}<small>{m.emotions[0]}</small></span><span>{value?.score == null ? '—' : value.score.toFixed(0)}</span></button>; })}</div>
      <p className="cs-note">Four individual mask candidates; 28 still need artwork. All 32 have expression briefs. These are authored character lenses, not diagnoses.</p>
    </>}
    {tab === 'eggs' && <>
      <div className="cs-section-title"><div><h2>Three ways rarity appears.</h2><p>Common, Rare and Mythic eggs. Any tier can be a Kindred, Complement or Favourite.</p></div></div>
      <div className="cs-egg-grid">{eggs.map(egg => <article key={egg.id} className="cs-egg"><span className="cs-eyebrow">{egg.tier} EGG</span><img src={getEggStageArtSrc(egg.tier,egg.status==='incubating'?1:4)} alt={`${egg.tier} egg`} /><h3>{egg.status === 'ready' ? 'Ready to discover' : egg.status}</h3><p>{egg.status === 'collected' ? getFamily(egg.familyId)?.name : egg.status === 'sold' ? `Settled: ${egg.reward?.amount} ${egg.reward?.choice}` : 'The outcome is fixed; retrying does not reroll it.'}</p>
        {egg.status === 'ready' && <><button type="button" disabled={!onCollect} onClick={()=>onCollect?.(egg.id)}>Collect {egg.tier} egg</button><details><summary>Sell instead</summary>{getEggSellRewardOptions(egg.tier).map(r=><button type="button" key={r.choice} disabled={!onSell} onClick={()=>onSell?.(egg.id,r.choice)}>Sell for {r.amount} {r.choice}</button>)}</details></>}
        <div className="cs-egg-stages" aria-label={`${egg.tier} egg's four visual stages`}>{[1,2,3,4].map(s=><img key={s} src={getEggStageArtSrc(egg.tier,s)} alt={`Stage ${s}`} />)}</div>
      </article>)}</div><p className="cs-note">Acquisition rules are unchanged. Fixture sales demonstrate the existing reward choices; they do not credit a real wallet.</p>
    </>}
    {family && <CreatureModal title={`${family.name} · Family F${String(family.number).padStart(2,'0')}`} onClose={()=>setDetail(null)}>
      <p className="cs-note">Your affinity: {stats.rows.find(row=>row.family.id===family.id)?.affinity?.toFixed(1)??'unavailable'} / 100 · catalogue rank {stats.rows.find(row=>row.family.id===family.id)?.rank??'—'}. Form and rarity do not increase personality affinity.</p>
      <details className="cs-explanation"><summary>Distinct visual identity · production brief</summary><p>Silhouette: {visualIdentityFor(family.id)?.silhouette}</p><p>Material: {visualIdentityFor(family.id)?.material}</p><p>Mature eyes / attention: {visualIdentityFor(family.id)?.matureAttention}</p><p>Movement: {visualIdentityFor(family.id)?.motion}</p><p>{visualIdentityFor(family.id)?.matureRule} This is a draft brief, not a claim that the old reference artwork already complies.</p></details>
      <div className="cs-detail-grid"><div><StudyCreatureCard key={`${family.id}:${form}`} family={family} owned={owned[family.id]} affinity={kindred.ranked.find(r=>r.id===family.id)?.score} previewForm={form} /></div><section><p className="cs-eyebrow">{family.rarity} · {owned[family.id] ? `${owned[family.id].copies} copies owned` : 'Not owned'}</p><h3>{family.emotions?.[0]}</h3><p>{family.expressionCue}</p><p>Supporting / pressure direction: {family.emotions?.slice(1).join(' · ')}</p><h3>One family, connected forms</h3><div className="cs-form-buttons">{family.forms.map(f=><button type="button" key={f.id} aria-pressed={form===f.ordinal} onClick={()=>setForm(f.ordinal)}>{f.ordinal} · {f.name}</button>)}</div><p><strong>Form {form} · {family.forms[form-1]?.name ?? 'Legacy form'}</strong></p><p>{candidateFormArt(family.id,form) ? 'Individual form candidate shown for review. Previewing this form does not unlock it or change your owned form.' : form === 1 ? 'Existing first-form reference shown. Replacement artwork is not yet approved.' : 'Planned form: artwork and progression integration pending. The first-form reference is not an evolved illustration.'}</p><h3>{family.ability?.name ?? 'Practice direction'}</h3><p>{family.ability?.practicePrompt ?? 'Practice brief pending.'}</p><p className="cs-note">Higher affinity does not pay extra currency. Existing bond rewards stay unchanged; new form rewards are not active.</p>
      </section></div>
      {targets.some(t=>t.id===family.id) && <details className="cs-explanation"><summary>Inspect this experimental personality target</summary><p>{family.mixRationale}</p>{!profile.refinement && <p>{targets.find(t=>t.id===family.id)?.intent}</p>}<p>Computed leading lenses: {targets.find(t=>t.id===family.id)!.profile.archetypes.slice().sort((a,b)=>(b.score??0)-(a.score??0)).slice(0,3).map(a=>`${a.name} ${a.score?.toFixed(0)}`).join(' · ')}</p><p>{profile.refinement ? 'This synthetic target explicitly encodes the three authored motivations. Real-player testing is still needed.' : 'Art-direction mix and measured target are being reconciled.'} This target is not release-calibrated.</p></details>}
    </CreatureModal>}
    {mask && <CreatureModal title={`${mask.name} · ${mask.suit}`} onClose={()=>setMaskId(null)}><div className="cs-mask-detail">{MASK_CANDIDATES.includes(mask.id) && <img src={MASK_ART_CANDIDATES[mask.id]} alt={`${mask.name} mask candidate`} />}<section><h3>{mask.drive}</h3><p>Dominant: {mask.emotions[0]}<br />Supporting: {mask.emotions[1]}<br />Under pressure: {mask.emotions[2]}</p><h3>Visual expression brief</h3><p>{MASK_FACE_BRIEFS[mask.id]}</p><h3>A useful growth invitation</h3><p>{mask.growthStrategy}</p><p className="cs-note">{profile.archetypes.find(a=>a.id===mask.id)?.missing.length ? `Not measured by these answers: ${profile.archetypes.find(a=>a.id===mask.id)?.missing.join(', ')}.` : (profile.refinement ? 'This alignment comes from one direct motivation rating, not an inferred trait or a measured emotion.' : 'All weighted dimensions have some evidence.')} Alignment is not a percentage of who you are.</p></section></div></CreatureModal>}
  </section>;
}
