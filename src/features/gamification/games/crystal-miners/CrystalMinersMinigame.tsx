import { getMinerTheme } from './crystalMinersThemes';
import { MinerBlockImpact } from './CrystalMinersEffects';
import { EVENT_GAME_PLAYS_PER_TICKET } from '../../level-worlds/services/eventGameTicketEconomy';
import { SafeErrorBoundary } from '../../../../components/SafeErrorBoundary';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import type { CrystalMinersBridge } from '../../level-worlds/services/islandRunCrystalMinersActions';
import { isMinerMergePair, MINER_GROUP_MERGE_LEVEL, minerBlockY, getMinerReadiness, minerForgeCost, MINER_FORGE_UNLOCKS, MINER_MAX_TIER, MINER_CHEST_REWARDS, minerChestsRequired, MINER_LEVEL_COUNT, minerRecommendedTier, minerBuyTier, isMinerBossCavern, MINER_TIER_COLORS, MINER_TIER_NAMES, MINER_ROWS, MINER_HEIGHT, MINER_LEAGUES, MINER_EVENT_MILESTONES, getMinerLeague, isMinerRewardCavern, MINER_BLOCK_TOP, MINER_BLOCK_HEIGHT, minerBuyCost, minerToolPower,
  type MinerBossAttack, type MinerFrame, type MinerCommand, type MinerBlock, type MinerSimulation } from '../../level-worlds/services/crystalMinersGame';
import { playIslandRunSound, triggerIslandRunHaptic } from '../../level-worlds/services/islandRunAudio';
import { createMinerReplayTiming, minerReplayFrameAt, createMinerReplayCamera } from '../../level-worlds/services/crystalMinersReplay';
import './crystalMiners.css';

export function MinerToolArt({ tier, className = '' }: { tier: number; className?: string }) {
  const color = MINER_TIER_COLORS[Math.max(0, tier - 1)];
  return <svg className={className} viewBox="0 0 64 70" fill="none" aria-hidden="true">
    <path d="M35 17 25 61" stroke="#0b1f29" strokeWidth="13" strokeLinecap="round" />
    <path d="M35 17 25 61" stroke="#ad784f" strokeWidth="8" strokeLinecap="round" />
    <path d="m28 47 7 2m-8 4 7 2" stroke="#e6bc7f" strokeWidth="3" />
    {tier < 3 ? <><path d="M26 9q11-10 19 2l-3 10-16-3z" stroke={color} strokeWidth="5" />
      <path d="m17 40 22 5-4 17-14 6-9-13z" fill={color} stroke="#294552" strokeWidth="2" />
      <path d="m27 44-5 19 10-6 3-11" fill="#fff" opacity=".3" /></>
      : <><path d="M5 28Q25-1 52 12l8 16-17-8-9 5-8-6z" fill={color} stroke="#294552" strokeWidth="2" />
        <path d="M7 26Q28 3 51 14l-16 2-9-1z" fill="white" opacity=".5" />
        <path d="m27 11 15 4-3 14-14-4z" fill={color} stroke="#294552" strokeWidth="2" /></>}
    {tier >= 5 && <path d="m33 5 6 10-8 7-5-9z" fill="#effffc" />}
    {tier >= 7 && <path d="m10 35 5-7 4 8-5 7zm37-2 4-6 5 7-4 5z" fill={color} />}
  </svg>;
}

function TreasureChest({ opened = false }: { opened?: boolean }) {
  return <svg viewBox="0 0 60 48" aria-hidden="true" className={`cm-chest-art${opened ? ' is-open' : ''}`}>
    <ellipse cx="30" cy="42" rx="25" ry="5" fill="#06171e" opacity=".5"/>
    {opened && <><path d="m30 6 3 9 10-3-7 7 7 7-10-3-3 9-3-9-10 3 7-7-7-7 10 3z" fill="#fff0a2"/><path d="M13 9 7 3m40 6 6-6M30 7V0" stroke="#ffeeb6" strokeWidth="2"/></>}
    <path d="M8 25h44v16H8z" fill="#9b572e" stroke="#edba68" strokeWidth="2"/>
    <path className="cm-chest-lid" d={opened ? 'M7 20 12 7h37l4 13z' : 'M7 25v-8q0-8 10-8h26q10 0 10 8v8z'} fill="#c78c40" stroke="#ffe1a0" strokeWidth="2"/>
    <path d={opened ? 'M16 8v12m27-12v12M7 21h46M16 27v13m27-13v13' : 'M16 10v30m27-30v30M7 25h46'} stroke="#ffe0a0" strokeWidth="4"/>
    {!opened && <><rect x="25" y="21" width="10" height="12" rx="2" fill="#fff0b0"/><circle cx="30" cy="26" r="2" fill="#784423"/></>}
    {opened && <path d="m23 34 5 4 10-10" stroke="#dcffc6" strokeWidth="3" fill="none"/>}
  </svg>;
}

const PALETTES: Record<MinerBlock['kind'], [string, string, string]> = {
  obsidian:['#322743','#9e80d2','#17152d'],
  ticket:['#bd9452','#fff0a7','#6b502b'], spawner:['#6855a8','#d0b7ff','#342655'], balloon:['#b968a2','#ffb0eb','#76385c'], ember:['#9e4a35','#ffbd67','#542a29'],
  deflector: ['#7371ba', '#b8b8ff', '#3d4179'],
  boss: ['#637b85', '#a2bcc0', '#344f60'],
  ice: ['#6ac8df', '#b3f9ff', '#3588b4'], brick: ['#b76c4b', '#e8a26a', '#75432e'], iron: ['#586577', '#9aa5b2', '#303b4c'], tnt: ['#b55049', '#f2a071', '#753d3e'], gift: ['#7761a7', '#be9fe7', '#473966'],
  stone: ['#48636b', '#6c8588', '#263f49'], ore: ['#8c6847', '#c49a62', '#574935'],
  crystal: ['#338782', '#69c8b2', '#1b555b'], treasure: ['#bd873c', '#f8d47a', '#755129'],
};
const GUARDIAN_STYLES = [
  {name:'Moss Guardian',stone:'#789f8d',edge:'#344e48',light:'#bdebb0',eye:'#d5ffc5',accent:'#91ba81'},
  {name:'Iron Warden',stone:'#778d9f',edge:'#263d53',light:'#b2d5eb',eye:'#ffd57a',accent:'#ceaa75'},
  {name:'Ember Colossus',stone:'#87594c',edge:'#392a35',light:'#bf8c71',eye:'#ff9a53',accent:'#ef6d3d'},
  {name:'Prism Tyrant',stone:'#685478',edge:'#231f3e',light:'#a98fb5',eye:'#ff6376',accent:'#dc507c'},
] as const;
function GuardianArt({block,level,hit,attack}:{block:MinerBlock;level:number;hit:boolean;attack?:MinerBossAttack}) {
  const stage=Math.max(0,Math.min(3,Math.floor(level/10)-1));const style=GUARDIAN_STYLES[stage];const enraged=block.hp<block.maxHp*.35;
  return <g className={`cm-boss cm-boss-stage-${stage+1}${hit?' is-hit':''}${enraged?' is-enraged':''}${attack ? ` is-${attack.phase}` : ''}`} style={{'--boss-accent':style.accent,'--boss-speed':`${2.5-stage*.35}s`} as CSSProperties}>
    <g transform="translate(22.5 0) scale(.85 1.15)"><ellipse cx="150" cy="142" rx={83+stage*8} ry="12" fill={style.accent} opacity=".2"/>
    {stage>=2 && <g className="cm-boss-aura" fill={style.accent} opacity=".45"><path d="m48 132-12-30 16 8-5-40 22 25 9 35zm204 0 12-30-16 8 5-40-22 25-9 35z"/>{stage===3&&<path d="m81 37-9-45 28 22 7-24 14 30h58l14-30 7 24 28-22-9 45z"/>}</g>}
    <g className="cm-boss-left-arm"><path d="m88 52-32-8-29 24 2 46 26 20 29-18-8-28 18-13z" fill={style.stone} stroke={style.edge} strokeWidth="4"/><path d="m34 72 23-17 24 8-17 20z" fill={style.light}/><path d="m33 106 6 24 18 5 15-9-5-22z" fill={style.edge}/>{stage>0&&<path d="m30 66-12-25 25 12m12-9-4-22 21 25" fill={style.accent}/>}</g>
    <g className="cm-boss-right-arm"><path d="m212 52 32-8 29 24-2 46-26 20-29-18 8-28-18-13z" fill={style.stone} stroke={style.edge} strokeWidth="4"/><path d="m266 72-23-17-24 8 17 20z" fill={style.light}/><path d="m267 106-6 24-18 5-15-9 5-22z" fill={style.edge}/>{stage>0&&<path d="m270 66 12-25-25 12m-12-9 4-22-21 25" fill={style.accent}/>}</g>
    <path d="m100 54 50-11 50 11 15 47-22 27-43 10-43-10-22-27z" fill={style.stone} stroke={style.edge} strokeWidth="5"/>
    <path d="m99 70 30 12-9 40-22-21zm102 0-30 12 9 40 22-21z" fill={style.light} opacity=".6"/>
    <path d="m109 122-8 23h36l5-20m49-3 8 23h-36l-5-20" fill={style.edge} stroke={style.light} strokeWidth="3"/>
    <path className="cm-boss-core" d="m150 78 15 20-15 22-15-22z" fill={style.eye}/>
    <g className="cm-boss-head"><path d="m109 11 20-12h42l20 12 8 34-15 28-34 9-34-9-15-28z" fill={style.stone} stroke={style.edge} strokeWidth="5"/><path d="m111 13 19-9h40l19 9-38 12z" fill={style.light}/>
    {stage>0&&<path d={`M110 20 96 ${4-stage*8} 123 7m67 13 14 ${-16-stage*8}L177 7`} fill={style.accent} stroke={style.edge} strokeWidth="2"/>}
    <path d={stage<2 ? 'm114 35 23 3-3 12-17-2zm49 3 23-3-3 13-17 2z' : 'm112 29 28 13-6 11-18-6zm48 13 28-13-4 18-18 6z'} fill={style.eye}/>
    <path d={enraged||stage>=2 ? 'm128 61 9-5 13 6 13-6 9 5-8 9h-28z' : 'M131 64h38'} fill={style.edge} stroke={style.edge} strokeWidth="4"/>
    {stage===3&&<path d="m139 16 11-9 11 9-11 13zM118 56l-6 10m70-10 6 10" fill={style.eye} stroke={style.eye} strokeWidth="2"/>}</g>
    <g className="cm-boss-cannon" transform={`translate(150 109) rotate(${attack?(attack.lane-2)*18:0})`}>
      <circle r="22" fill={style.edge} stroke={style.light} strokeWidth="3"/>
      <path d="M-14 5-11-47h22L14 5Z" fill={style.edge} stroke={style.accent} strokeWidth="3"/>
      <path d="M-16-45h32v-12h-32Z" fill={style.stone} stroke={style.light} strokeWidth="3"/>
      <ellipse className="cm-cannon-charge" cy="-55" rx={attack?.phase==='charge'?5+attack.progress*13:8} ry="7" fill={style.eye} opacity={attack?.phase==='reload'?.25:1}/>
      <circle r="10" fill={style.eye}/>
    </g>
    </g><rect x="48" y="-34" width="204" height="8" rx="4" fill="#142532"/><rect x="48" y="-34" width={204*block.hp/block.maxHp} height="8" rx="4" fill={enraged?'#ff6f61':style.eye}/>
    <text x="150" y="-43" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="1" fill="#f1d79b">{style.name.toUpperCase()} · {block.hp.toLocaleString()}</text>
  </g>;
}
function CaveScenery({level}:{level:number}) {
  const theme=getMinerTheme(level);
  return <g opacity=".55" aria-hidden="true">{Array.from({length:7},(_,i)=>{
    const y=55+i*150;const x=i%2?290:10;
    return <g key={i} transform={`translate(${x},${y})`} fill={theme.accent} stroke={theme.glow}>
      {theme.id==='grove'?<><path d={`M0-50Q${i%2?-22:22} 0 0 65`} fill="none" strokeWidth="3"/><path d="M0-8Q28-35 20-6Q5 4 0-8M0 23Q-25 0-20 25Q-5 37 0 23" stroke="none"/></>:theme.id==='glacier'?<><path d="m-12-30 24 4-13 65z" opacity=".6"/><path d="m-12-30 11 69 3-63" fill="white" opacity=".3"/></>:theme.id==='ember'?<><path d="m0-55 10 25-12 19 13 29-9 43" strokeWidth="5" fill="none"/><circle cy="-20" cx={i%2?-32:32} r="2"/><circle cy="24" cx={i%2?-22:22} r="3"/></>:theme.id==='ruins'?<><path d="M-9-35h18v70H-9zM-14-35h28v8h-28zM-14 28h28v8h-28z" fill={theme.rock} strokeWidth="2"/><circle cx={i%2?-24:24} cy="-14" r="6" fill="none"/><circle cx={i%2?-34:34} cy="14" r="3" fill="none"/></>:theme.id==='amethyst'?<><path d="m0 32-16-22 4-35L1-7l14-36 7 46z" opacity=".75"/><path d="M0 32 1-7l14-36-4 49Z" fill="white" opacity=".2"/></>:<><path d="m0-26 4 17 15 5-15 5-4 17-4-17-15-5 15-5z" stroke="none"/><circle cx={i%2?-35:35} cy="28" r="2"/><path d="m-30 55 18 6 9-12" fill="none" opacity=".4"/></>}
    </g>;
  })}</g>;
}
function MineScene({ blocks, frame, digging, survey = 'top', camera, level, freshChests = [] }: { freshChests?:number[]; level: number; camera?: { y: number; toolId: number | null; returning: boolean }; blocks: MinerBlock[]; frame: MinerFrame | null; digging: boolean; survey?: 'top' | 'all' | 'bottom' | 'guardian' }) {
  const theme=getMinerTheme(level);
  const cameraY = frame ? camera?.y ?? 0 : survey === 'bottom' ? MINER_HEIGHT - 386 : survey === 'guardian' ? MINER_BLOCK_TOP + 8*MINER_BLOCK_HEIGHT - 80 : 0;
  const liveHits = frame?.hits ?? [];
  const recentOre = liveHits.filter(h=>h.broken).reduce((sum,h)=>sum+(h.kind === 'treasure' ? MINER_CHEST_REWARDS[h.blockId%5].ore : h.kind === 'boss' ? 120 : h.kind === 'gift' ? 5 : h.kind === 'crystal' ? 14 : h.kind === 'ore' ? 8 : 3),0);
  return <svg className="cm-mine" viewBox={`-22 ${cameraY} 344 ${!digging && survey === 'all' ? MINER_HEIGHT : 386}`} role="img" aria-label={digging ? 'Tools bouncing through the mine' : 'Layered mine with five finish-line treasure chests'}>
    <defs>
      <linearGradient id="cm-cave" x2="0" y2="1"><stop stopColor={theme.top}/><stop offset="1" stopColor={theme.bottom}/></linearGradient>
      <radialGradient id="cm-glow"><stop stopColor={theme.glow} stopOpacity=".25"/><stop offset="1" stopColor={theme.glow} stopOpacity="0"/></radialGradient>
    </defs>
    <rect x="-22" width="344" height={MINER_HEIGHT} rx="14" fill="url(#cm-cave)" />
    <ellipse cx="150" cy={cameraY+180} rx="180" ry="260" fill="url(#cm-glow)"/>
    <CaveScenery level={level}/>
    <path d={`M-10 ${MINER_HEIGHT}V25Q-10 12 2 12H298Q310 12 310 25V${MINER_HEIGHT}`} stroke="#846d50" strokeWidth="8" fill="none" />
    <path d="M-10 47h320M-10 150h9m302 0h9M-10 260h9m302 0h9" stroke="#c0a578" strokeWidth="4" />
    {[0,5,10,15,20,25].map(row=><text key={row} x="-17" y={MINER_BLOCK_TOP + row*MINER_BLOCK_HEIGHT+10} fill="#9abeb5" fontSize="7" textAnchor="middle">{row}</text>)}
    {[0,1,2,3,4].map(i => <g key={i} opacity=".22"><path d={`M${i*60+30} 20v1040`} stroke="#a5d3d1" strokeDasharray="2 9"/><circle cx={i*60+30} cy="23" r="3" fill="#bbded0"/></g>)}
    {blocks.map(block => {
      const x = block.id % 5 * 60 + 1; const y = minerBlockY(block);
      if ((survey !== 'all' || digging) && (y + (block.kind === 'boss' ? 175 : 35) < cameraY || y > cameraY + 400)) return null;
      if (block.kind === 'treasure') {
        const approaching = block.hp > 0 && frame?.bodies.some(body=>body.active && body.lane === block.id%5 && body.y > y-220 && body.y < y);
        const prize = MINER_CHEST_REWARDS[block.id%5];
        return <g key={block.id} transform={`translate(${x},${y-9})`} className={`${approaching ? 'cm-chest-approach' : block.hp === 0 ? 'cm-chest-revealed' : ''}${freshChests.includes(block.id)?' is-fresh-treasure':''}`}><ellipse className="cm-chest-halo" cx="29" cy="25" rx="29" ry="28" fill={prize.color} opacity={approaching ? '.6' : '.15'}/>{approaching && <path d="m29-14 3 11 10-3-7 8 7 8-10-3-3 11-3-11-10 3 7-8-7-8 10 3z" fill="#fff2ab"/>}<svg width="58" height="46" viewBox="0 0 60 48"><TreasureChest opened={block.hp === 0}/></svg>{block.hp === 0 && <><text className="cm-chest-prize" x="29" y="-10" textAnchor="middle" fill="#fff3b3" fontSize="8" fontWeight="800">{prize.gifts ? '🎁 +25 ore' : `+${prize.ore} ore`}</text><path d="M8-7 5-15m45 8 4-8M29-20v-8" stroke="#fff3b3" strokeWidth="2"/></>}</g>;
      }
      if (block.hp === 0) return null;
      if (block.kind === 'boss') return <g key={block.id} transform={`translate(0,${y})`}><GuardianArt block={block} level={level} attack={frame?.bossAttack} hit={Boolean(frame?.hits.some(h=>h.blockId===block.id))}/></g>;
      const [face, top, edge] = block.kind==='stone'||block.kind==='brick' ? [theme.rock,theme.accent,theme.edge] : PALETTES[block.kind];
      return <g key={block.id} transform={`translate(${x},${y})`}>
        <path d="M0 5 6 0h52v23l-6 5H0z" fill={edge} stroke="#102530" strokeWidth="1.5"/>
        <path d="m0 5 6-5h52l-6 5z" fill={top}/><path d="M0 5h52v23H0z" fill={face}/>
        <path d="m52 5 6-5v23l-6 5z" fill={edge}/>
        {block.kind==='obsidian'?<><path d="m4 22 7-14 13 4 8-9 18 16-10 6-14-4-10 5z" fill="#66508c"/><path className="cm-obsidian-vein" d="m8 20 15-6 5 5 8-11 10 11m-23-5-4-7" fill="none" stroke="#e1baff" strokeWidth="2"/></>:block.kind==='ticket'?<><rect x="10" y="7" width="32" height="18" rx="5" fill="#fff0b0"/><path d="M20 7v18" stroke="#886631" strokeDasharray="2 2"/><text x="32" y="21" textAnchor="middle" fontSize="12" fill="#624728" fontWeight="900">+1</text></>:block.kind==='spawner'?<><circle className="cm-spawner-core" cx="26" cy="16" r="10" fill="#c4a4fa"/><path d="M18 16h16m-8-8v16" stroke="#fff4f8" strokeWidth="3"/></>:block.kind==='balloon'?<><ellipse cx="26" cy="12" rx="13" ry="11" fill="#f4aee0"/><path d="m24 21 2 4 3-4m-3 3v5" stroke="#ffdaf2"/><ellipse cx="21" cy="8" rx="3" ry="4" fill="white" opacity=".6"/></>:block.kind==='ember'?<path className="cm-ember-core" d="M26 26C5 18 17 6 24 2c-2 10 8 9 7-1C47 17 36 26 26 26Z" fill="#ffbe63"/>:block.kind === 'deflector' ? <><path d={block.id % 5 === 4 ? 'M43 16H12m0 0 9-7m-9 7 9 7' : 'M10 16h31m0 0-9-7m9 7-9 7'} stroke="#f1e5ff" strokeWidth="4" fill="none"/><circle cx="26" cy="16" r="12" stroke="#e0d3ff" opacity=".3" fill="none"/></> : block.kind === 'ice' ? <><path d="m8 8 5 9 5-8 3 12 7-9 8 9 7-10" fill="none" stroke="#caffff" strokeWidth="2" opacity=".7"/><path d="M2 8h47" stroke="white" opacity=".4"/></>
          : block.kind === 'brick' ? <path d="M0 15h52M18 5v10m19 0v13" stroke="#663e30" strokeWidth="2"/>
          : block.kind === 'iron' ? <><path d="M8 10h36v13H8z" fill="none" stroke="#a8b9c5" opacity=".6"/>{[9,44].map(x=><g key={x}><circle cx={x} cy="10" r="2" fill="#c6d6d7"/><circle cx={x} cy="22" r="2" fill="#c6d6d7"/></g>)}</>
          : block.kind === 'tnt' ? <><path d="M9 7v18m34-18v18" stroke="#ebba89" strokeWidth="3"/><text x="26" y="21" textAnchor="middle" fontSize="12" fill="#fff4d2" fontWeight="900">TNT</text></>
          : block.kind === 'gift' ? <><rect x="14" y="8" width="25" height="17" rx="2" fill="#e6bd6f"/><path d="M25 8v17M14 15h25m-14-7q-12-12 0-6 12-6 3 6" stroke="#8d56ad" strokeWidth="4" fill="none"/></>
          : block.kind === 'crystal' ? <path d="m15 18 6-10 7 6 5-5 6 10-15 5z" fill="#affce0" opacity=".8"/>
          : block.kind === 'ore' ? <path d="m12 14 5-4 5 5-5 4zm18 4 5-6 5 5-5 5" fill="#f6d493"/>
          : <path d="m8 13 5-3m22 9 5 2m5-11 3 2" stroke={top} strokeWidth="2" opacity=".55"/>}
        {block.hp < block.maxHp && <path d="m30 5-5 8 5 5-8 10m3-15-8 1" stroke="#132d38" strokeWidth="2" fill="none"/>}
        {block.maxHp > 2 && (block.kind === 'stone' || block.kind === 'iron' || block.kind === 'obsidian') && <text x="27" y="22" fill="#d6e6df" textAnchor="middle" fontSize="9" fontWeight="700">{block.hp}</text>}
      </g>;
    })}
    {frame?.bossAttack && frame.bossAttack.phase!=='reload' && <g className={`cm-boss-lane cm-boss-lane-${frame.bossAttack.phase}`} aria-hidden="true">
      <rect x={frame.bossAttack.lane*60+2} y="0" width="56" height={MINER_BLOCK_TOP+8*MINER_BLOCK_HEIGHT+150} fill={frame.bossAttack.phase==='fire'?'#ffd8b0':'#ff4865'} opacity={frame.bossAttack.phase==='fire'?.75:.08+frame.bossAttack.progress*.15}/>
      <path d={`M${frame.bossAttack.lane*60+30} 0V${MINER_BLOCK_TOP+8*MINER_BLOCK_HEIGHT+108}L150 ${MINER_BLOCK_TOP+8*MINER_BLOCK_HEIGHT+108}`} fill="none" stroke={frame.bossAttack.phase==='fire'?'#fff4d2':'#ff7d91'} strokeWidth={frame.bossAttack.phase==='fire'?16:2} strokeDasharray={frame.bossAttack.phase==='charge'?'5 7':undefined}/>
      {frame.bossAttack.phase==='charge'&&<g transform={`translate(${frame.bossAttack.lane*60+30},${cameraY+120})`}><circle r="17" fill="none" stroke="#ff9baa" strokeWidth="2"/><path d="M-24 0h13m22 0h13M0-24v13m0 22v13" stroke="#ffd9df" strokeWidth="2"/></g>}
    </g>}
    {frame?.hits.slice(-24).map(hit=><MinerBlockImpact key={`${hit.step}-${hit.blockId}`} hit={hit}/>)}
    {frame?.bodies.filter(b=>b.active).map(body => <g key={body.id} transform={`translate(${body.x},${body.y}) rotate(${body.angle*180/Math.PI})`}>
      {body.vy > 120 && <path d="M0-13v-26m-5 17v-10m10 13v-18" stroke={MINER_TIER_COLORS[body.tier-1]} strokeWidth="2" opacity=".35"/>}
      <circle r="14" fill={MINER_TIER_COLORS[body.tier-1]} opacity=".12"/><svg x="-14" y="-18" width="28" height="36" viewBox="0 0 64 70"><MinerToolArt tier={body.tier}/></svg>
    </g>)}
    {digging && <g transform={`translate(0,${cameraY})`}><rect x="91" y="5" width="118" height="23" rx="10" fill="#091d28dd" stroke="#b9e3b84a"/><text x="150" y="20" textAnchor="middle" fill="#e8edca" fontSize="10" fontWeight="700">{frame?.bodies.filter(b=>b.active).length ?? 0} tools still falling</text></g>}
    {digging && frame?.bossAttack && <g className={`cm-boss-alert is-${frame.bossAttack.phase}`} transform={`translate(150,${cameraY+91})`} role="status" aria-label={frame.bossAttack.phase==='charge'?`Guardian targeting lane ${frame.bossAttack.lane+1}`:frame.bossAttack.phase==='fire'?`Guardian fired: ${frame.bossAttack.destroyed} tools lost`:'Guardian reloading'}>
      <rect x="-110" y="-16" width="220" height="32" rx="10" fill="#321d30ee" stroke="#ed7892"/>
      <text textAnchor="middle" y="-2" fill="#fff2d4" fontSize="10" fontWeight="800">{frame.bossAttack.phase==='charge'?`LANE ${frame.bossAttack.lane+1} · CHARGING`:frame.bossAttack.phase==='fire'?frame.bossAttack.destroyed?`BLAST! ${frame.bossAttack.destroyed} TOOLS LOST`:'MISSED! EMPTY LANE':'RELOADING · BREAK THE GUARDIAN!'}</text>
      <rect x="-94" y="5" width="188" height="4" rx="2" fill="#56324b"/><rect x="-94" y="5" width={188*(frame.bossAttack.phase==='fire'?1:frame.bossAttack.progress)} height="4" rx="2" fill="#ffc189"/>
    </g>}
    {digging && camera?.returning && <text x="150" y={cameraY+66} textAnchor="middle" fill="#d7f7e7" fontSize="10" fontWeight="700">↑ Following another falling tool</text>}
    {digging && recentOre > 0 && <g transform={`translate(150,${cameraY+43})`}><rect x="-51" y="-13" width="102" height="22" rx="10" fill="#624e29e8"/><text textAnchor="middle" y="2" fill="#fff3b8" fontSize="11" fontWeight="800">+{recentOre} ore collected</text></g>}
    <text x="150" y={MINER_HEIGHT-18} textAnchor="middle" fill="#85a7a8" fontSize="9" letterSpacing="3">THE CRYSTAL DEPTHS</text>
  </svg>;
}

type MinerResourceDestination = 'earn' | 'tickets' | 'shop';
function CrystalMinersGame({ bridge, onComplete, requestResources, ticketOffersEnabled = false, inspectEnabled = false }: { inspectEnabled?:boolean; bridge: CrystalMinersBridge; requestResources?: (destination: MinerResourceDestination)=>void; ticketOffersEnabled?: boolean; onComplete: IslandRunMinigameProps['onComplete'] }) {
  const progress = useSyncExternalStore(bridge.subscribe, bridge.getProgress, bridge.getProgress);
  const eventTrack = useSyncExternalStore(bridge.subscribe, bridge.getEventTrack, bridge.getEventTrack);
  const [mergeHover,setMergeHover]=useState<number|null>(null);
  const [chestCelebration,setChestCelebration]=useState(false);
  const skipReplay=useRef(false);
  const [mobileView,setMobileView]=useState<'workshop'|'mine'>('workshop');
  const [ticketFlights,setTicketFlights]=useState<Array<{id:string;x:number;y:number;dx:number;dy:number}>>([]);
  const [revealedTickets,setRevealedTickets]=useState(0);
  const ticketCounter=useRef<HTMLDivElement>(null);
  const flownTickets=useRef(new Set<string>());
  const flightTimers=useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [survey, setSurvey] = useState<'top' | 'all' | 'bottom' | 'guardian'>('top');
  const [claimNotice, setClaimNotice] = useState('');
  const dice = useSyncExternalStore(bridge.subscribe, bridge.getDice, bridge.getDice);
  const tickets = useSyncExternalStore(bridge.subscribe, bridge.getTickets, bridge.getTickets);
  const expiresAt = useSyncExternalStore(bridge.subscribe, bridge.getExpiresAt, bridge.getExpiresAt);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncPending,setSyncPending]=useState(false);
  const [message, setMessage] = useState('');
  const [help, setHelp] = useState(false);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [groupFx,setGroupFx]=useState<number[]>([]);
  const tapSequence=useRef({slot:-1,count:0,at:0});
  const [slotFx, setSlotFx] = useState<number | null>(null);
  const [dragPoint, setDragPoint] = useState<{x:number;y:number;tier:number} | null>(null);
  const [muted, setMuted] = useState(false);
  const [replay, setReplay] = useState<MinerSimulation | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const lock = useRef(false);
  const mounted = useRef(true);
  const drag = useRef<{ from: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const initialDigs = useRef(progress.digs);
  const openedAt = useRef(Date.now());
  const mutedRef = useRef(muted); mutedRef.current = muted;
  const soundAt = useRef(0);
  const slotFxTimer = useRef<ReturnType<typeof setTimeout>>();
  const receipt = progress.lastReceipt;
  const expired = expiresAt <= clock;
  const replayCamera = useMemo(()=>replay ? createMinerReplayCamera(replay.frames) : [],[replay]);
  const replayTiming=useMemo(()=>replay?createMinerReplayTiming(replay.frames):null,[replay]);
  const freshChests=useMemo(()=>replay?replay.frames.flatMap(f=>f.hits).filter(h=>h.kind==='treasure'&&h.broken).map(h=>h.blockId):[],[replay]);
  const replayTicketHits=useMemo(()=>replay?.frames.flatMap(f=>f.hits).filter(h=>h.broken&&h.kind==='ticket')??[],[replay]);
  const sourceFrame = replay?.frames[Math.min(frameIndex, replay.frames.length - 1)] ?? null;
  const frame = sourceFrame && replay ? { ...sourceFrame, hits: replay.frames.slice(Math.max(0, frameIndex-18),frameIndex+1).flatMap(f=>f.hits) } : null;
  const visibleClears = eventTrack.levelsCleared - (replay && receipt?.cleared ? 1 : 0);
  const visibleClaims = eventTrack.claimedMilestones.filter(level=>!replay || level<=visibleClears);
  const nextPrize = MINER_EVENT_MILESTONES.find(m => !visibleClaims.includes(m.levels));
  const claimablePrize = !replay && nextPrize && visibleClears >= nextPrize.levels ? nextPrize : null;
  const visibleScore = progress.totalScore - (replay ? receipt?.score ?? 0 : 0);
  const visibleOre = progress.ore - (replay ? receipt?.ore ?? 0 : 0);
  const campaignComplete = eventTrack.levelsCleared >= MINER_LEVEL_COUNT;
  const visibleLevel = progress.level - (replay && receipt?.cleared && !campaignComplete ? 1 : 0);
  const theme=getMinerTheme(visibleLevel);
  const league = getMinerLeague(visibleScore);
  const promotion = receipt && getMinerLeague(progress.totalScore-receipt.score).index < league.index;
  const toolCount = progress.tools.filter(Boolean).length;
  const readiness = getMinerReadiness(progress);
  const forgeLevel = progress.forgeLevel ?? 0;
  const highestTier = Math.max(...progress.tools);
  const clearedTreasures = (frame?.blocks ?? progress.blocks).filter(b=>b.kind === 'treasure' && b.hp === 0).length;
  const requiredChests = minerChestsRequired(visibleLevel);
  const remainingMs = Math.max(0, expiresAt-clock);
  const eventTime = remainingMs > 3600000 ? `${Math.ceil(remainingMs/3600000)}h left` : `${Math.ceil(remainingMs/60000)}m left`;
  const close = () => {bridge.observe('closed');onComplete({ completed: progress.digs > initialDigs.current && Boolean(receipt?.broken) && !expired,
    arenaPerformance: progress.digs > initialDigs.current && receipt ? { gameId:'crystal_miners', rawScore:receipt.score, mastery:receipt.depth/MINER_ROWS, stars:receipt.cleared ? 3 : receipt.depth >= MINER_ROWS*.6 ? 2 : 1, durationMs:Math.max(0,Date.now()-openedAt.current), mistakes:0, hintsUsed:0 } : undefined });};

  useEffect(() => {
    mounted.current = true; bridge.observe('opened');
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    root.current?.focus();
    const timer = window.setInterval(()=>setClock(Date.now()), 1000);
    return () => { mounted.current = false; clearTimeout(slotFxTimer.current); flightTimers.current.forEach(clearTimeout); clearInterval(timer); document.body.style.overflow = overflow; before?.focus(); };
  }, []);
  useEffect(() => {
    const shell = root.current?.querySelector<HTMLElement>('.cm-shell');
    if (shell) shell.inert = help || leagueOpen || resultVisible;
    if (help || leagueOpen || resultVisible) root.current?.querySelector<HTMLButtonElement>('.cm-sheet button')?.focus();
    else root.current?.focus();
  }, [help, leagueOpen, resultVisible]);
  useEffect(() => {
    if (!replay) return;
    root.current?.scrollTo({top:0,behavior:'instant' as ScrollBehavior});
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timing=createMinerReplayTiming(replay.frames);
    const travelDuration=reduced?300:timing.travelDuration;
    const duration=travelDuration+timing.celebrationMs;
    let tailReported=false;
    let started = performance.now(); let raf = 0;
    const tick = (now: number) => {
      if(skipReplay.current){started=now-travelDuration;skipReplay.current=false;}
      const elapsed=now-started;
      const celebrating=timing.celebrationMs>0&&elapsed>=travelDuration;
      setChestCelebration(celebrating);
      const ratio = Math.min(1,elapsed/duration);
      const index = Math.min(replay.frames.length-1, reduced?Math.floor(Math.min(1,elapsed/travelDuration)*replay.frames.length):minerReplayFrameAt(timing.times,now-started));
      setFrameIndex(index);
      if(!tailReported&&timing.fastFrom>=0&&index>=timing.fastFrom){tailReported=true;bridge.observe('tail_accelerated');}
      const hits = replay.frames[index]?.hits ?? [];
      if (hits.length && now-soundAt.current > 140 && !mutedRef.current) {
        soundAt.current=now; playIslandRunSound(hits.some(h=>h.kind === 'tnt') ? 'sticker_complete' : hits.some(h=>h.broken && ['gift','treasure','crystal','ore'].includes(h.kind)) ? 'reward_bar_cascade' : 'token_move');
      }
      if (ratio < 1) raf = requestAnimationFrame(tick);
      else { setChestCelebration(false);bridge.observe('result_shown'); setReplay(null); setResultVisible(true); if (!mutedRef.current) playIslandRunSound('sticker_complete'); triggerIslandRunHaptic('sticker_complete'); }
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [replay]);

  useEffect(()=>{
    if(!sourceFrame||!replay)return;
    const found=replayTicketHits.filter(h=>h.step<=sourceFrame.step);
    for(const hit of found){const id=`${hit.step}:${hit.blockId}`;if(flownTickets.current.has(id))continue;flownTickets.current.add(id);setRevealedTickets(n=>n+1);
      const svg=root.current?.querySelector<SVGSVGElement>('.cm-mine');const matrix=svg?.getScreenCTM();const target=ticketCounter.current?.getBoundingClientRect();
      if(!matrix||!target)continue;const point=new DOMPoint(hit.x,hit.y).matrixTransform(matrix);const bounds=svg!.getBoundingClientRect();point.x=Math.max(bounds.left+20,Math.min(bounds.right-20,point.x));point.y=Math.max(bounds.top+35,Math.min(bounds.bottom-25,point.y));
      setTicketFlights(items=>[...items.slice(-4),{id,x:point.x,y:point.y,dx:target.x+target.width/2-point.x,dy:target.y+target.height/2-point.y}]);
      flightTimers.current.push(setTimeout(()=>{if(mounted.current)setTicketFlights(items=>items.filter(item=>item.id!==id));},1200));
    }
  },[frameIndex,replay]);

  const act = async (command: MinerCommand) => {
    if (lock.current || replay || expired) return;
    lock.current = true; setBusy(true); setMessage('');
    if(command.kind==='merge_group')setGroupFx(progress.tools.flatMap((tier,index)=>tier===command.tier?[index]:[]));
    try {
      const result = await bridge.act(command, progress.revision);
      if (!mounted.current) return;
      if(result.syncPending!==undefined)setSyncPending(result.syncPending);
      if (!result.ok) {
        setGroupFx([]);
        const messages: Record<string,string> = { group_merge_locked:'Group merge unlocks at cavern 25.', no_merge_pairs:'This tier needs at least two matching tools.', forge_max: 'Your forge is fully upgraded.', forge_locked: 'Reach the next forge unlock cavern first.', last_tool: 'Keep your last tool so you can continue mining.', invalid_tool: 'Select an opened tool to discard.', invalid_save: 'Your saved mine needs to reload before another action.', open_gifts_first: 'Open a wrapped gift before dropping your tools.', insufficient_tickets: 'Earn another event ticket by filling your island reward bar.',
          insufficient_ore: 'Mine more ore to buy a tool.', deck_full: 'Your tool rack is full. Merge a matching pair to make room.',
          invalid_move: 'These tools cannot merge. Choose a different slot.', stale_action: 'Your mine updated. Try that move again.', event_expired: 'This event has ended. Return to the island for the next event.', milestone_locked: 'Finish more caverns to unlock this reward.', already_claimed: 'This reward is already in your inventory.', campaign_complete: 'All 40 caverns are complete! Claim your remaining prizes above.' };
        setMessage(messages[result.failureReason ?? ''] ?? 'The mine could not update. Please try again.'); return;
      }
      setSelected(null);
      const fxIndex = command.kind === 'open' ? command.slot : command.kind === 'move' ? command.to : command.kind === 'buy' || command.kind === 'gift' ? progress.tools.indexOf(0) : null;
      setSlotFx(fxIndex); clearTimeout(slotFxTimer.current); slotFxTimer.current=setTimeout(()=>{if(mounted.current){setSlotFx(null);setGroupFx([]);}},650);
      if (!muted) playIslandRunSound(command.kind === 'dig' ? 'minigame_open' : 'token_move');
      triggerIslandRunHaptic('roll');
      if (result.rewardLabel) { setClaimNotice(`${result.rewardLabel} collected!`); setMessage(`${result.rewardLabel} collected!`); if (!muted) playIslandRunSound('reward_bar_claim_burst'); return; }
      if(command.kind === 'open') {
        const revealedTier=bridge.getProgress().tools[command.slot];
        if((progress.superGiftSlots??[]).includes(command.slot)||revealedTier>=minerBuyTier(progress.level)+3)setClaimNotice(`${(progress.superGiftSlots??[]).includes(command.slot)?'Super gift':'Lucky gift'}: tier ${revealedTier} ${MINER_TIER_NAMES[revealedTier-1]}!`);
      }
      if (result.simulation) { skipReplay.current=false;setChestCelebration(false);setMergeHover(null);flownTickets.current.clear();flightTimers.current.forEach(clearTimeout);flightTimers.current=[];setRevealedTickets(0);setTicketFlights([]);setMobileView('mine');setClaimNotice(''); setSurvey('top'); setFrameIndex(0); setReplay(result.simulation); setResultVisible(false); }
      else setMessage(command.kind === 'merge_group' ? `Merged ${Math.floor(progress.tools.filter(t=>t===command.tier).length/2)} pairs of tier ${command.tier}. Any odd tool stays in place.` : command.kind === 'upgrade' ? 'Forge upgraded! Every tool can now take two more impacts per drop.' : command.kind === 'trash' ? 'Tool removed. Your other tools and upgrades are saved.' : command.kind === 'open' ? `Gift opened: tier ${bridge.getProgress().tools[command.slot]}! Match it to upgrade.` : command.kind === 'gift' ? 'Gift added to the rack.' : command.kind === 'buy' ? `New tier ${minerBuyTier(progress.level)} tool added. Match it to level up.` : 'Tools ready. Each tool stays in its lane unless it hits a violet arrow.');
    } catch(error) { setGroupFx([]);bridge.reportError(error,'ui_action'); if (mounted.current) setMessage('The connection was interrupted. Check your saved mine before trying again.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const inspectMine = (view: 'top' | 'all' | 'bottom' | 'guardian') => {
    setSurvey(view);
    root.current?.querySelector('.cm-mine-frame')?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  };
  const replenish = (destination: MinerResourceDestination) => {
    bridge.observe(`resources_${destination}`); if (requestResources) { close(); requestResources(destination); } else setMessage('Local playtest: return to the preview hub to refill tickets. Live purchases are available only in the island game.'); };
  const choose = (index: number, clickDetail=0) => {
    if (suppressClick.current) { suppressClick.current = false; tapSequence.current={slot:-1,count:0,at:0}; return; }
    const now=performance.now();const taps=tapSequence.current;
    tapSequence.current={slot:index,count:taps.slot===index&&now-taps.at<450?taps.count+1:1,at:now};
    if((tapSequence.current.count>=3||clickDetail>=3)&&progress.level>=MINER_GROUP_MERGE_LEVEL&&progress.tools[index]>0){tapSequence.current={slot:-1,count:0,at:0};void act({kind:'merge_group',tier:progress.tools[index]});return;}
    if (progress.tools[index] < 0) { void act({kind:'open',slot:index}); return; }
    if (selected === null) { if (progress.tools[index] > 0) { setSelected(index); setMessage(''); } }
    else if (selected === index) setSelected(null);
    else void act({ kind: 'move', from: selected, to: index });
  };
  const renderDrop=(extraClass:string)=><button type="button" className={`cm-drop ${extraClass}`} disabled={busy || Boolean(replay) || tickets < 1 || expired || campaignComplete} onClick={()=>void act({kind:'dig'})}><span>{busy ? 'Preparing…' : replay ? 'Mining the depths…' : expired ? 'Event complete' : campaignComplete ? 'All 40 levels complete!' : 'Drop & mine'}<small>{tickets < 1 ? 'Earn tickets from your island reward bar' : '1 drop ticket per dig'}</small></span><span aria-hidden="true">↓</span></button>;
  return <div ref={root} tabIndex={-1} style={{'--cave-top':theme.top,'--cave-bottom':theme.bottom,'--cave-glow':theme.glow,'--cave-accent':theme.accent} as CSSProperties} data-theme={theme.id} className={`cm-overlay cm-focus-layout${inspectEnabled?' cm-inspector':' cm-player-mode'}${replay ? ' cm-is-running' : ' cm-preparing'}${chestCelebration?' cm-celebrating':''}`} role="dialog" aria-modal="true" aria-labelledby="cm-title"
    onKeyDown={e=>{
      if (e.key === 'Escape') { if (help) setHelp(false); else if (leagueOpen) setLeagueOpen(false); else if (selected !== null) setSelected(null); else close(); }
      if (e.key === 'Tab') {
        const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []).filter(x=>x.offsetParent !== null && !x.closest('[inert]'));
        if (!buttons.length) return;
        if (e.shiftKey && (document.activeElement === buttons[0] || document.activeElement === root.current)) { e.preventDefault(); buttons[buttons.length - 1]?.focus(); }
        else if (!e.shiftKey && document.activeElement === buttons[buttons.length - 1]) { e.preventDefault(); buttons[0].focus(); }
      }
    }}>
    <div className="cm-ambient" aria-hidden="true"/>{ticketFlights.map(flight=><div key={flight.id} className="cm-ticket-flight" aria-hidden="true" style={{left:flight.x,top:flight.y,'--fly-x':`${flight.dx}px`,'--fly-y':`${flight.dy}px`} as CSSProperties}>▰ +1 DROP</div>)}
    <div className="cm-shell" aria-hidden={help || leagueOpen || resultVisible || undefined}>
      <header className="cm-header">
        <button type="button" className="cm-icon-button" onClick={close} aria-label="Save and return to island">‹</button>
        <div><p className="cm-eyebrow">HABITGAME · EVENT ARENA</p><h1 id="cm-title">Crystal <em>Miners</em></h1></div>
        <div ref={ticketCounter} className={`cm-pocket${ticketFlights.length?' is-collecting':''}`} aria-label="Mining resources"><span>◆ {visibleOre}</span><strong>▰ {Math.max(0,tickets-(replay?Math.max(0,replay.ticketDrops-revealedTickets):0))}</strong><small>drops</small></div><div className="cm-header-actions"><button type="button" className="cm-icon-button" onClick={()=>setMuted(!muted)} aria-label={muted ? 'Enable game sounds' : 'Mute game sounds'} aria-pressed={muted}>{muted ? '♪̸' : '♪'}</button><button type="button" className="cm-icon-button" onClick={()=>setHelp(!help)} aria-label="How to play Crystal Miners">?</button></div>
      </header>
      <div className="cm-status"><span><i/> {expired ? 'EVENT ENDED' : `LIVE EVENT · ${eventTime}`}</span><span className={syncPending?'cm-save-status is-pending':'cm-save-status'}>{syncPending?'Saved on this device · cloud sync pending':'Permanent workshop · autosaved'}</span></div>
      <section className="cm-event-track" aria-label="Cavern completion rewards">
        <div className="cm-track-heading"><div><p className="cm-eyebrow">THE 40-CAVERN JOURNEY</p><strong>{claimablePrize ? 'Your reward is ready!' : nextPrize ? `Next: ${nextPrize.label}` : 'Grand vault complete · all rewards collected'}</strong></div><span>{visibleClears} / 40 cleared</span></div>
        <div className="cm-event-progress" role="progressbar" aria-label="Forty-cavern journey progress" aria-valuenow={visibleClears} aria-valuemin={0} aria-valuemax={40}><i style={{width:`${Math.min(100,visibleClears/40*100)}%`}}/></div>
        {(inspectEnabled||claimablePrize)&&<div className="cm-track-prizes">{MINER_EVENT_MILESTONES.filter(prize=>inspectEnabled||(!visibleClaims.includes(prize.levels)&&visibleClears>=prize.levels)).map(prize=>{
          const claimed = visibleClaims.includes(prize.levels);
          const ready = visibleClears >= prize.levels && !claimed;
          return <button type="button" key={prize.levels} className={claimed ? 'is-claimed' : ready ? 'is-ready' : ''} disabled={!ready || busy || Boolean(replay) || expired} onClick={()=>void act({kind:'claim',milestone:prize.levels})} aria-label={`${claimed ? 'Collected' : ready ? 'Claim' : 'Unlock after level '+prize.levels}: ${prize.label}`}><b>{claimed ? '✓' : prize.icon}</b><span>{prize.label}</span><small>{claimed ? 'Collected' : ready ? 'Claim reward' : `Level ${prize.levels}`}</small></button>;
        })}</div>}
        {claimNotice && <p className={`cm-claim-notice${claimNotice.startsWith('Mystery gift') ? ' cm-mystery-reveal' : ''}`} role="status">{claimNotice.startsWith('Mystery gift') && <span aria-hidden="true">🎁 ✦ </span>}{claimNotice}</p>}
      </section>
      <button type="button" className="cm-league-strip" disabled={Boolean(replay)} onClick={()=>setLeagueOpen(true)}><span className="cm-league-medal" style={{color:league.color}}>♜</span><span><strong>{league.name} League</strong><small>{visibleScore.toLocaleString()} expedition points</small></span><span className="cm-league-track"><i style={{width:`${league.next ? Math.min(100,(visibleScore-league.threshold)/(league.next.threshold-league.threshold)*100) : 100}%`}}/></span><span>›</span></button>
      {inspectEnabled&&<nav className="cm-mobile-nav" aria-label="Mining view"><button type="button" aria-pressed={mobileView==='workshop'} disabled={Boolean(replay)} onClick={()=>setMobileView('workshop')}>Workshop</button><button type="button" aria-pressed={mobileView==='mine'} onClick={()=>setMobileView('mine')}>Mine · cavern {visibleLevel}</button></nav>}
      <div className="cm-game-layout" data-mobile-view={replay?'mine':inspectEnabled?mobileView:'workshop'}>
        <section className="cm-workshop">
          <div className="cm-section-heading"><div><p className="cm-eyebrow">PREPARE YOUR EXPEDITION</p><h2>Cavern {visibleLevel} · {theme.name}</h2></div><span className="cm-level">{requiredChests} {requiredChests===1?'chest':'chests'}</span></div>
          <div className="cm-resource-row"><div><span className="cm-ore-icon">◆</span><strong>{visibleOre.toLocaleString()}</strong><small>ore</small></div><div><span>▰</span><strong>{tickets}</strong><small>drop tickets · {EVENT_GAME_PLAYS_PER_TICKET.crystal_miners} per event ticket</small></div></div>
          <div className={`cm-tool-rack${replay ? ' is-mining' : ''}`} aria-label="Tool rack. Select a tool, then a matching tool to merge, or an empty slot to move.">
            {progress.tools.map((tier,index)=><button type="button" data-miner-slot={index} key={index}
              className={`cm-slot${selected !== null && selected !== index && tier > 0 && tier < MINER_MAX_TIER && progress.tools[selected] === tier ? ' is-match' : ''} ${tier ? 'has-tool' : ''} ${selected === index ? 'is-selected' : ''} ${slotFx === index ? 'cm-forge-pop' : ''}${groupFx.includes(index)?' cm-group-glow':''}${mergeHover!==null&&(index===mergeHover||index===drag.current?.from)?' is-merge-ready':''}`}
              style={{'--tool-color': MINER_TIER_COLORS[tier-1] ?? '#264652'} as CSSProperties}
              aria-label={`Slot ${index+1}${tier < 0 ? (progress.superGiftSlots??[]).includes(index) ? ', wrapped super gift' : ', wrapped gift' : tier ? `, tier ${tier} ${MINER_TIER_NAMES[tier-1]}` : ', empty'}${selected !== null && selected !== index && tier > 0 && tier < MINER_MAX_TIER && progress.tools[selected] === tier ? ', merge match' : ''}`} aria-pressed={selected === index}
              disabled={busy || Boolean(replay) || expired}
              onClick={e=>choose(index,e.detail)}
              onPointerDown={e=>{ if (tier <= 0 || busy || replay) return; drag.current = {from:index,x:e.clientX,y:e.clientY}; e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerMove={e=>{const start=drag.current;if(start && Math.hypot(e.clientX-start.x,e.clientY-start.y)>8){setDragPoint({x:e.clientX,y:e.clientY,tier:progress.tools[start.from]});const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-miner-slot]');const to=target?Number(target.dataset.minerSlot):-1;setMergeHover(isMinerMergePair(progress.tools,start.from,to)?to:null);}}}
              onPointerUp={e=>{
                const start = drag.current; drag.current = null; setDragPoint(null);setMergeHover(null);
                if (!start || Math.hypot(e.clientX-start.x,e.clientY-start.y)<8) return;
                suppressClick.current = true;
                const hit = document.elementFromPoint(e.clientX,e.clientY);
                if (hit?.closest('[data-miner-trash]')) { void act({kind:'trash',slot:start.from}); return; }
                const target = hit?.closest<HTMLElement>('[data-miner-slot]');
                if (target) void act({kind:'move',from:start.from,to:Number(target.dataset.minerSlot)});
              }} onPointerCancel={()=>{drag.current=null;setDragPoint(null);setMergeHover(null);}}>
              {tier < 0 ? <svg className={`cm-gift${(progress.superGiftSlots??[]).includes(index) ? ' cm-super-gift' : ''}`} viewBox="0 0 50 50" aria-hidden="true">{(progress.superGiftSlots??[]).includes(index) && <path d="m25 0 5 10 12-2-7 10 7 10-12-2-5 10-5-10-12 2 7-10-7-10 12 2z" fill="#fff0a4" opacity=".65"/>}<path d="M7 19h36v26H7z" fill="#d4a764" stroke="#efce91"/><path d="M4 16h42v10H4z" fill="#ecd197"/><path d="M22 16h7v29h-7z" fill="#9b73bb"/><path d="M25 16Q6-3 12 12q4 5 13 4Q45-3 39 12q-4 5-14 4" fill="none" stroke="#c6a0e6" strokeWidth="4"/></svg> : tier > 0 ? <><MinerToolArt tier={tier}/><b>{tier}</b></> : <span className="cm-empty">+</span>}
            </button>)}
          </div>
          {progress.level>=MINER_GROUP_MERGE_LEVEL && <button type="button" className="cm-group-merge" disabled={busy||Boolean(replay)||expired||selected===null||progress.tools[selected]<=0||progress.tools[selected]>=MINER_MAX_TIER||progress.tools.filter(t=>selected!==null&&t===progress.tools[selected]).length<2} onClick={()=>{if(selected!==null)void act({kind:'merge_group',tier:progress.tools[selected]});}}>{selected===null?'Select a tier to group merge':`Merge all tier ${progress.tools[selected]} pairs`}</button>}
          <div className="cm-rack-caption"><span>{toolCount}/25 tools</span><span>POWER <strong>{progress.tools.reduce((n,t)=>n+(t > 0 ? minerToolPower(t):0),0)}</strong></span></div>
          <button type="button" className="cm-buy" disabled={busy || Boolean(replay) || expired || progress.ore < minerBuyCost(progress) || toolCount === 25} onClick={()=>void act({kind:'buy'})}><MinerToolArt tier={minerBuyTier(progress.level)}/><span>Buy a tier {minerBuyTier(progress.level)} tool<small>Merge matching tiers to upgrade</small></span><strong>◆ {minerBuyCost(progress)}</strong></button>
          <button type="button" className="cm-forge-upgrade" disabled={busy || Boolean(replay) || expired || forgeLevel >= 5 || progress.level < MINER_FORGE_UNLOCKS[forgeLevel] || progress.ore < minerForgeCost({...progress,forgeLevel})} onClick={()=>void act({kind:'upgrade'})}><span>Upgrade the forge · {forgeLevel}/5<small>{forgeLevel >= 5 ? '+10 impacts per tool · fully upgraded' : progress.level < MINER_FORGE_UNLOCKS[forgeLevel] ? `Next upgrade unlocks at cavern ${MINER_FORGE_UNLOCKS[forgeLevel]}` : '+2 impacts per tool · permanent on every island'}</small></span><strong>{forgeLevel >= 5 ? 'MAX' : `◆ ${minerForgeCost({...progress,forgeLevel})}`}</strong></button>
          <button type="button" data-miner-trash className={`cm-trash${dragPoint ? ' is-dragging' : ''}`} disabled={busy || Boolean(replay) || expired || (!dragPoint && selected === null)} onClick={()=>{if(selected !== null)void act({kind:'trash',slot:selected});}} aria-label="Trash selected tool. Drag an unwanted tool here. No ore refund."><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg><span>{dragPoint ? 'Drop here to discard' : 'Trash unwanted tool'}<small>Drag here or select a tool, then tap · no ore refund</small></span></button>
          {progress.giftsWaiting > 0 && <button type="button" className="cm-gift-claim" disabled={busy || Boolean(replay) || expired || toolCount === 25} onClick={()=>void act({kind:'gift'})}>Unpack {(progress.superGiftsWaiting??0)>0 ? 'a super gift' : 'a recovered gift'} · {progress.giftsWaiting} waiting</button>}
          <p className="cm-hint" role="status">{mergeHover!==null?'Release to merge these two tools.':message || (selected !== null ? `Tier ${progress.tools[selected]} selected. Tap its match or move it.` : '')}</p>

        </section>
        <section className="cm-expedition">
          <div className="cm-section-heading"><div><p className="cm-eyebrow">{replay ? 'EXPEDITION IN PROGRESS' : 'EXPLORE THE DEPTHS'}</p><h2>{theme.name}</h2></div><span className="cm-depth">{visibleLevel} / 40 · {isMinerBossCavern(visibleLevel)?'GUARDIAN':`${requiredChests} CHESTS`}</span></div>
          {inspectEnabled&&!replay && <p className="cm-course-hint">{campaignComplete ? 'All 40 caverns explored. Your workshop is saved.' : isMinerRewardCavern(visibleLevel) ? `Break the guardian before its cannon reloads. Aim for tier ${minerRecommendedTier(visibleLevel)}+ tools.` : `Aim for tier ${minerRecommendedTier(visibleLevel)}+ tools · ${requiredChests === 2 ? 'Hard approach · reach 2 chests to pass' : 'Reach any chest · tools stay in their lane'}`}</p>}
          {inspectEnabled&&!replay && !campaignComplete && <div className="cm-readiness"><strong>{readiness.stage === 'boss' ? 'Guardian readiness' : readiness.stage === 'approach' ? 'Hard approach readiness' : 'Fleet readiness'}</strong><span>{readiness.readyLanes} paths at target · {readiness.neededLanes} needed · aim for {readiness.targetPower} power per path</span><small>{readiness.readyLanes < readiness.neededLanes ? 'Merge, reposition or upgrade before spending a ticket. Damage stays saved between digs.' : 'Suggested power reached. Forge upgrades, remaining terrain and placement still affect how far you get.'}</small></div>}
          {inspectEnabled&&!replay && <div className="cm-survey" aria-label="Inspect the mine"><button type="button" aria-pressed={survey === 'top'} onClick={()=>inspectMine('top')}>Drop zone</button>{isMinerBossCavern(visibleLevel) && <button type="button" aria-pressed={survey === 'guardian'} onClick={()=>inspectMine('guardian')}>Guardian</button>}<button type="button" aria-pressed={survey === 'all'} onClick={()=>inspectMine('all')}>Full shaft</button><button type="button" aria-pressed={survey === 'bottom'} onClick={()=>inspectMine('bottom')}>Bottom treasure ↓</button></div>}
          <div className="cm-mine-frame"><MineScene freshChests={freshChests} level={visibleLevel} blocks={frame?.blocks ?? progress.blocks} frame={frame} digging={Boolean(replay)} survey={survey} camera={chestCelebration?{y:MINER_HEIGHT-386,toolId:null,returning:false}:replayCamera[frameIndex]}/>
            {replay && <div className="cm-dig-label"><i/> {chestCelebration?'TREASURE SECURED!':replayTiming && replayTiming.fastFrom>=0 && frameIndex>=replayTiming.fastFrom?'Finishing falls · 2.25×':'MINING…'} <button type="button" disabled={chestCelebration} onClick={()=>{skipReplay.current=true;}}>Skip animation</button></div>}
          </div>
          <div className="cm-treasure-goal"><div className="cm-goal-chests">{(frame?.blocks ?? progress.blocks).filter(b=>b.kind === 'treasure').map((chest,i)=><div key={chest.id} className={chestCelebration&&freshChests.includes(chest.id)?'cm-chest-revealed is-fresh-treasure':''} style={{'--chest-color':MINER_CHEST_REWARDS[i].color} as CSSProperties} aria-label={`Path ${i+1} chest: ${chest.hp === 0 ? 'opened' : MINER_CHEST_REWARDS[i].label}`}><TreasureChest opened={chest.hp === 0}/><small>{chest.hp === 0 && !(chestCelebration&&freshChests.includes(chest.id)) ? 'Opened' : MINER_CHEST_REWARDS[i].label}</small></div>)}</div><p><strong>{clearedTreasures} chests reached · {requiredChests} needed</strong><small>{requiredChests === 2 ? 'Hard approach: reach two different finish-line chests.' : 'Any finish-line chest clears the level. Extra paths bring extra rewards.'}</small></p></div>
          {!replay && tickets <= 3 && !expired && !campaignComplete && <div className="cm-supply-pause"><strong>{tickets === 0 ? 'Your next expedition is waiting' : `${tickets} ${tickets === 1 ? 'drop' : 'drops'} remaining`}</strong><p>{tickets === 0 ? 'Your tools, upgrades and cavern damage are safe. Earn event tickets through island play and reward-bar claims. Each event ticket funds three drops.' : `Guardian at cavern ${readiness.nextBoss}. Each drop costs one ticket; prepare your fleet before entering.`}</p>{dice <= 0 && <p>Out of dice? Complete habits or use the island’s normal dice recovery. The Supply Dock has dice offers.</p>}<div><button type="button" onClick={()=>replenish('earn')}>Earn on the island</button>{ticketOffersEnabled && <button type="button" onClick={()=>replenish('tickets')}>View ticket offers</button>}{requestResources && <button type="button" onClick={()=>replenish('shop')}>Dice & supplies</button>}</div></div>}
          {renderDrop('cm-desktop-drop')}
        </section>
      </div>
      {renderDrop('cm-mobile-drop')}{!replay&&tickets<1&&<button type="button" className="cm-mobile-earn" onClick={()=>replenish('earn')}>Earn tickets on the island</button>}
      <footer className="cm-footer"><span>◆ {progress.totalOre.toLocaleString()} ore recovered</span><span>▣ {progress.totalTreasures} treasures</span><span>{progress.digs} digs</span></footer>
    </div>
    {dragPoint && <div className="cm-drag-ghost" style={{left:dragPoint.x,top:dragPoint.y}}><MinerToolArt tier={dragPoint.tier}/></div>}
    {leagueOpen && <div className="cm-sheet-backdrop"><section className="cm-sheet cm-league-sheet"><p className="cm-eyebrow">YOUR LIFETIME EXPEDITION RECORD</p><h2>The Mining League</h2><p>Break blocks, discover gifts and reach deeper to earn points. Climb through five personal leagues across your island journey.</p><div className="cm-league-score">{progress.totalScore.toLocaleString()}<small>total points · best drop {progress.bestScore.toLocaleString()}</small></div><div className="cm-league-ladder">{[...MINER_LEAGUES].reverse().map(rank=><div key={rank.name} className={rank.name === league.name ? 'is-current':''}><span style={{color:rank.color}}>♜</span><strong>{rank.name}</strong><small>{rank.threshold.toLocaleString()} pts</small>{rank.name === league.name && <b>YOU</b>}</div>)}</div><button type="button" className="cm-drop" onClick={()=>setLeagueOpen(false)}>Back to the mine</button></section></div>}
    {help && <div className="cm-sheet-backdrop"><section className="cm-sheet" aria-labelledby="cm-help-title"><p className="cm-eyebrow">YOUR FIELD GUIDE</p><h2 id="cm-help-title">Your mining field guide</h2><p>Cavern {visibleLevel} · {theme.name} · aim for tier {minerRecommendedTier(visibleLevel)}+ tools. Reach {requiredChests} {requiredChests===1?'chest':'different chests'} to clear it. Forge: {forgeLevel}/5 · best tool: tier {highestTier}. Your tools and upgrades travel with you.</p><p>At cavern 25, triple-tap a tool to merge every pair of that tier. Any odd tool stays in place.</p><details><summary>Journey rewards</summary>{MINER_EVENT_MILESTONES.map(prize=><p key={prize.levels}>Level {prize.levels} · {prize.label}{visibleClaims.includes(prize.levels)?' · collected':''}</p>)}</details><ol><li><strong>Open gifts and forge tools.</strong> Tap wrapped gifts to reveal their numbered tool. Drag unwanted tools to the trash can; your last item is protected. Drag two of the same tier together. You can also tap one, then its match.</li><li><strong>Special blocks.</strong> Balloons pop into gifts. Violet spawners release a temporary bonus pick in their lane. Gold ticket blocks add one saved drop. Metal needs repeated hits; deep obsidian seams split into violet shards. Ice shatters, stone crumbles and ember blocks burn away.</li><li><strong>Choose your columns.</strong> Move tools to empty slots or swap them. Tools stay in their chosen column. Rare violet arrow blocks redirect them into the neighboring lane.</li><li><strong>Drop into the mine.</strong> One drop ticket sends your whole rack mining. Ice breaks easily, iron resists, and TNT blasts nearby blocks. Stronger tools hit harder and last longer.</li><li><strong>Build your next expedition.</strong> Spend recovered ore on tools or permanent forge upgrades. Forge upgrades add two impacts to every tool, with five ranks unlocked at caverns 1, 5, 10, 20 and 30. Damage and upgrades are saved. Reach one of the five finish-line chests to pass a normal level; the two levels before each boss require two different chests; the top journey track shows the next rewards, banked automatically when you finish. Uncover gifts to expand your tool rack. Levels 10, 20, 30 and 40 have a guardian guarding a generous reward section. Its cannon marks a lane, charges and destroys every falling tool in that lane, then reloads. It can target an empty lane. Defeat it to interrupt the shot; your permanent tools remain safe. Spread tools across columns to survive and collect the prizes. Your 40-level journey and claimed rewards stay saved across islands. Later caverns need stronger tools; the shop and recovered gifts also improve as you descend.</li></ol><p>Successful digs add to your active event’s reward bar. Each event ticket earned on the island funds {EVENT_GAME_PLAYS_PER_TICKET.crystal_miners} drops. Unused funded drops stay saved with your workshop. Your tools always return.</p><p>Normal gifts: 70% buying tier, 23% one–two tiers higher, 3% lower (down to tier 1), 3.5% three–four higher, 0.5% five–ten higher. Around 5% of recovered boxes are super gifts: 10% buying tier, 40% one–two higher, 35% three–four higher, 15% five–ten higher. Tier 20 is the ceiling. Each opening is saved once.</p><button type="button" className="cm-drop" onClick={()=>setHelp(false)}>Ready to explore</button></section></div>}
    {resultVisible && receipt && <div className="cm-sheet-backdrop"><section className="cm-sheet cm-results" aria-labelledby="cm-result-title"><div className="cm-result-gem">{promotion ? '♜' : receipt.gifts ? '✧' : '◆'}</div><p className="cm-eyebrow">EXPEDITION {receipt.dig} COMPLETE</p><h2 id="cm-result-title">{promotion ? `${league.name} League!` : receipt.cleared ? 'All the way down.' : receipt.treasures ? 'Treasure unearthed.' : 'A little deeper.'}</h2><div className="cm-score-award">+{receipt.score.toLocaleString()}<small>expedition points{promotion ? ' · league promoted!' : ''}</small></div><div className="cm-result-depth"><i style={{width:`${receipt.depth/MINER_ROWS*100}%`}}/></div><p>{receipt.depth}/{MINER_ROWS} m reached{receipt.gifts > 0 ? ` · ${receipt.gifts} gifts recovered` : ''}</p><p className="cm-result-objective">{receipt.cleared ? campaignComplete ? 'The grand vault is yours! All 40 caverns complete.' : 'Cavern complete! +1 level on your 40-level journey.' : `${clearedTreasures}/${requiredChests} required chests reached. ${Math.max(0,requiredChests-clearedTreasures)} more to pass this level.`}</p><div className="cm-result-stats"><div><strong>+{receipt.ore}</strong><span>ore recovered</span></div><div><strong>{receipt.broken}</strong><span>blocks broken</span></div><div><strong>{receipt.treasures}</strong><span>treasures</span></div></div>{receipt.ticketDrops>0&&<p className="cm-ticket-award">▰ +{receipt.ticketDrops} drop ticket added!</p>}<p className="cm-reward-note">{receipt.rewardProgress > 0 ? `+${receipt.rewardProgress} progress added to your event reward bar` : 'Your mine is saved. Merge stronger tools for your next dig.'}</p>{(receipt.milestoneRewards??[]).length>0 && <div className="cm-auto-prizes"><strong>Journey rewards added</strong>{receipt.milestoneRewards.map(label=><p key={label}>✦ {label}</p>)}</div>}{claimNotice && <p className={`cm-claim-notice${claimNotice.startsWith('Mystery gift') ? ' cm-mystery-reveal' : ''}`} role="status">{claimNotice.startsWith('Mystery gift') && <span aria-hidden="true">🎁 ✦ </span>}{claimNotice}</p>}{tickets<1 && !campaignComplete && !expired && <div className="cm-supply-pause"><strong>Your mine is saved. Earn another ticket to continue.</strong><div><button type="button" onClick={()=>replenish('earn')}>Earn on the island</button>{ticketOffersEnabled && <button type="button" onClick={()=>replenish('tickets')}>View ticket offers</button>}{requestResources && <button type="button" onClick={()=>replenish('shop')}>Dice & supplies</button>}</div></div>}<button type="button" className="cm-drop" disabled={busy} onClick={()=>{if(campaignComplete)close();else {bridge.observe('prepared_again');setMobileView('workshop');setResultVisible(false);setSelected(null);setMessage('Arrange your next drop.');root.current?.scrollTo({top:0,behavior:'instant' as ScrollBehavior});}}}>{campaignComplete ? 'Journey complete · return to island' : receipt.cleared ? `Continue · prepare cavern ${progress.level}` : 'Try again · prepare your tools'} <span>↗</span></button><button type="button" className="cm-text-button" onClick={close}>Save & return to island</button></section></div>}
  </div>;
}

function MinerRecovery({onComplete}:Pick<IslandRunMinigameProps,'onComplete'>) {
  useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[]);
  return <div className="cm-overlay" role="dialog" aria-modal="true" aria-label="Mine recovery" style={{display:'grid',placeItems:'center'}}><section className="cm-sheet"><h2>The mine paused.</h2><p>Return to the island and reopen your saved workshop.</p><button autoFocus type="button" className="cm-drop" onClick={()=>onComplete({completed:false})}>Return to island</button></section></div>;
}

export default function CrystalMinersMinigame({ onComplete, launchConfig }: IslandRunMinigameProps) {
  const bridge = launchConfig?.bridge as CrystalMinersBridge | undefined;
  if (!bridge) return <div className="cm-unavailable"><h2>The mine is waiting.</h2><p>Open Crystal Miners from the Event Arena.</p><button type="button" onClick={()=>onComplete({completed:false})}>Return to island</button></div>;
  return createPortal(<SafeErrorBoundary onError={(error)=>bridge.reportError(error,'render')} fallback={<MinerRecovery onComplete={onComplete}/>}><CrystalMinersGame bridge={bridge} onComplete={onComplete} requestResources={launchConfig?.requestResources as ((destination: MinerResourceDestination)=>void) | undefined} ticketOffersEnabled={launchConfig?.ticketOffersEnabled === true} inspectEnabled={launchConfig?.inspectEnabled===true}/></SafeErrorBoundary>, document.body);
}
