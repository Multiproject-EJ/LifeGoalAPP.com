import { useState } from 'react';
import { getMask } from './content';
import { CREATURE_SORTS, sortMatchRows, type CreatureSort, type matchStatistics } from './matchStatistics';

export function MatchStatistics({stats,onOpen}:{stats:ReturnType<typeof matchStatistics>;onOpen:(id:string)=>void}) {
  const [sort,setSort]=useState<CreatureSort>('owned-name'),[scope,setScope]=useState('all'),[query,setQuery]=useState('');
  const rows=sortMatchRows(stats.rows,sort).filter(row=>(scope==='all'||(scope==='owned'?row.owned:!row.owned))&&(!query||row.family.name.toLowerCase().includes(query.toLowerCase())));
  return <section className="cs-match-stats">
    <div className="cs-section-title"><div><h2>Your creature matches</h2><p>Compare a reflection of your personality with what a companion adds to your team.</p></div></div>
    <div className="cs-stat-summary">
      <article><span>Best current match · all families</span><strong>{stats.best[0]?.family.name??'Not available'}</strong><small>{stats.best.length?`${stats.best[0].affinity!.toFixed(1)} / 100 affinity${stats.best.length>1?` · ${stats.best.length} tied first`:''}`:'Complete differentiated answers first'}</small></article>
      <article><span>Best match you own</span><strong>{stats.bestOwned[0]?.family.name??'Not available'}</strong><small>{stats.bestOwned.length?`${stats.bestOwned[0].affinity!.toFixed(1)} / 100 affinity${stats.bestOwned.length>1?` · ${stats.bestOwned.length} tied`:''}`:'No scored owned family yet'}</small></article>
      <article><span>Scored catalogue</span><strong>{stats.scored} / {stats.rows.length}</strong><small>{stats.ownedScored} owned · {stats.closeCount} within two points of best</small></article>
      <article><span>Selected team breadth</span><strong>{stats.teamBreadth===null?'—':`${stats.teamBreadth.toFixed(1)} / 100`}</strong><small>Represented approaches, not personal completeness</small></article>
    </div>
    <p className="cs-note">{stats.model}. These scores compare draft targets, not psychological probabilities. A sparse creature target may give a broad personality a low score. No reward depends on scoring higher.</p>
    <div className="cs-filters"><label>Search matches<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Creature name" /></label><label>Match collection<select value={scope} onChange={e=>setScope(e.target.value)}><option value="all">All creatures</option><option value="owned">Owned only</option><option value="unowned">Not owned</option></select></label><label>Sort matches<select value={sort} onChange={e=>setSort(e.target.value as CreatureSort)}>{CREATURE_SORTS.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label></div>
    <p className="cs-note">{rows.length} shown. Rank is among all scored families in this model and does not change with filters. Scores tied at one decimal share a rank. Team addition is measured after your current Kindred and Favourite; it previews replacing the Complement slot, not adding a fourth creature.</p>
    <div className="cs-stats-table-wrap"><table className="cs-stats-table"><caption>Creature affinity and marginal team breadth</caption><thead><tr><th scope="col">Match rank</th><th scope="col">Creature</th><th scope="col">Affinity / 100</th><th scope="col">Added breadth</th><th scope="col">Shared motivations</th></tr></thead><tbody>{rows.map(row=><tr key={row.family.id} data-family-id={row.family.id} data-owned={String(row.owned)}><td>{row.rank===null?'—':`#${row.rank}`}</td><th scope="row"><button type="button" onClick={()=>onOpen(row.family.id)}>{row.family.name}</button><small>{row.owned?'Owned':'Not owned'} · {row.family.rarity} · F{String(row.family.number).padStart(2,'0')}</small></th><td>{row.affinity===null?'Not scored':row.affinity.toFixed(1)}</td><td>{row.anchor?'Already in anchor slots':row.complement===null?'Unavailable':`+${row.complement.toFixed(1)}`}</td><td>{row.shared.map(id=>getMask(id)?.name??id).join(' · ')||'—'}</td></tr>)}</tbody></table></div>
    {!rows.length&&<p>No creatures match this filter.</p>}
  </section>;
}
