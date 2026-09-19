/** Authored visual rotation; themes never alter reward odds or simulation. */
export const MINER_THEMES = [
  { id:'grove', name:'Emerald Roots', top:'#163d35', bottom:'#071c21', glow:'#80e5a6', rock:'#496f60', edge:'#1b3834', accent:'#b8d9a0' },
  { id:'glacier', name:'Frostglass Cavern', top:'#213e66', bottom:'#0c1733', glow:'#a3eaff', rock:'#55869f', edge:'#253e60', accent:'#bdecff' },
  { id:'ember', name:'Emberforge', top:'#542d30', bottom:'#211326', glow:'#ff9252', rock:'#895449', edge:'#462730', accent:'#ffc388' },
  { id:'ruins', name:'Sunken Gold', top:'#174a58', bottom:'#0b233a', glow:'#75dbdb', rock:'#747864', edge:'#354e50', accent:'#efd19a' },
  { id:'amethyst', name:'Amethyst Hollow', top:'#442c60', bottom:'#1a1533', glow:'#d6a0ff', rock:'#77548e', edge:'#362648', accent:'#edc4ff' },
  { id:'cosmos', name:'Starlight Rift', top:'#252653', bottom:'#100f25', glow:'#9bbcff', rock:'#555782', edge:'#292b4e', accent:'#dfd5ff' },
] as const;
export function getMinerTheme(level:number) {return MINER_THEMES[(Math.max(1,Math.floor(level))-1)%MINER_THEMES.length];}
