/** Smooth overflight envelope around the entire post/arch/coral ring.
 * Bounds come from the current articulated creature, including wings and rolls.
 */
export function sunshoreCreatureClearanceLift(minX: number, maxX: number, minZ: number, maxZ: number, bottom: number, crownTop: number) {
  const closestX = Math.max(minX, Math.min(0, maxX));
  const closestZ = Math.max(minZ, Math.min(0, maxZ));
  const near = Math.hypot(closestX, closestZ);
  const far = Math.hypot(Math.max(Math.abs(minX), Math.abs(maxX)), Math.max(Math.abs(minZ), Math.abs(maxZ)));
  const inner = 1.28, outer = 2.12, approach = .8;
  const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t*t*(3-2*t); };
  // Reach full clearance before any part crosses the annulus.
  const envelope = smooth((outer + approach - near) / approach) * smooth((far - inner + approach) / approach);
  return Math.max(0, crownTop + .14 - bottom) * envelope;
}
