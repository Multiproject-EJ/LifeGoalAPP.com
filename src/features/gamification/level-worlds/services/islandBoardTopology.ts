export function resolveWrappedTokenIndex(currentIndex: number, stepDelta: number, tileCount: number): number {
  const safeTileCount = Math.max(1, Math.floor(tileCount));
  const baseIndex = Math.max(0, Math.floor(currentIndex));
  const safeStepDelta = Math.floor(stepDelta);
  const nextIndex = baseIndex + safeStepDelta;
  return ((nextIndex % safeTileCount) + safeTileCount) % safeTileCount;
}
