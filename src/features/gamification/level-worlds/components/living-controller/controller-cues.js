// Presentation-only selectors for the isolated study, not gameplay authority.
export function diceCue(state) {
  if (state.dice === 0) return {kind:'empty', title:'OUT OF DICE', detail:'Waiting for dice recharge', suggestedMultiplier:null};
  if (state.dice < state.multiplier) return {kind:'insufficient', title:'TRY ×1', detail:`${state.dice} dice available · lower multiplier`, suggestedMultiplier:1};
  return {kind:'ready', title:'ROLL', detail:`${state.dice} dice · ${state.multiplier} per roll`, suggestedMultiplier:null};
}
export function buildCue(affordable, jackpot) {
  return {active:affordable && !jackpot, label:affordable?'Build — next step affordable':'Build'};
}
