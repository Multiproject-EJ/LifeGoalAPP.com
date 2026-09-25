/** Presentation-only: never changes the player's manual tucked/open preference. */
export function shouldHideMissionController(missionActive: boolean, modalActive: boolean, interactiveControls: boolean): boolean {
  return !interactiveControls && (missionActive || modalActive);
}
