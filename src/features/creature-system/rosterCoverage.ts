import { FAMILIES, MASKS } from './content';

export function rosterCoverage() {
  const rows = MASKS.map(mask => ({ ...mask,
    dominant: FAMILIES.filter(f=>f.mix?.[0]===mask.id),
    supporting: FAMILIES.filter(f=>f.mix?.slice(1).includes(mask.id)),
  }));
  const groups = new Map<string,string[]>();
  const unordered = new Map<string,string[]>();
  for(const family of FAMILIES) {
    if(!family.mix) continue;
    const key=family.mix.join('/');
    groups.set(key,[...(groups.get(key)??[]),family.id]);
    const setKey=[...family.mix].sort().join('/');
    unordered.set(setKey,[...(unordered.get(setKey)??[]),family.id]);
  }
  return {rows,represented:rows.filter(r=>r.dominant.length+r.supporting.length>0).length,
    primaryRepresented:rows.filter(r=>r.dominant.length>0).length,
    scoredFamilies:FAMILIES.filter(f=>f.mix).length,
    duplicateMixes:[...groups].filter(([,ids])=>ids.length>1),
    sameMotivesDifferentOrder:[...unordered].filter(([,ids])=>ids.length>1),
  };
}
