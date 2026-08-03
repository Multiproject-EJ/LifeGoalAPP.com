export function shouldRenderFirstRunCelebration(options: {
  requested: boolean;
  storyReaderOpen: boolean;
}): boolean {
  return options.requested && !options.storyReaderOpen;
}

export function shouldRenderActiveStopModal(options: {
  hasActiveStop: boolean;
  storyReaderOpen: boolean;
  firstRunCelebrationOpen: boolean;
}): boolean {
  return options.hasActiveStop
    && !options.storyReaderOpen
    && !options.firstRunCelebrationOpen;
}

export function shouldRenderPerfectCompanionHint(options: {
  requested: boolean;
  hatchRevealOpen: boolean;
  creatureCardOpen: boolean;
}): boolean {
  return options.requested
    && !options.hatchRevealOpen
    && !options.creatureCardOpen;
}
