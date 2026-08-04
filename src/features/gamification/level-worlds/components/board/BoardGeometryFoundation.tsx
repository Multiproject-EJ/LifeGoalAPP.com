import { memo, useMemo, type CSSProperties } from 'react';
import type { TileAnchor } from '../../services/islandBoardLayout';
import type { IslandArtBoardFoundationManifest } from '../../services/islandArtManifest';

const ROUTE_BED_WIDTH_TO_RADIUS = 112 / 340;

interface BoardGeometryFoundationProps {
  anchors: readonly TileAnchor[];
  toScreen: (anchor: TileAnchor) => { x: number; y: number };
  material: IslandArtBoardFoundationManifest | null;
}

/**
 * Code-owned visual foundation for the live tile route.
 *
 * The centre and radius are derived from the active topology anchors, so the
 * terrain artist can never introduce a second, slightly different circle.
 * Island manifests provide material colours only; they do not own geometry.
 */
export const BoardGeometryFoundation = memo(function BoardGeometryFoundation({
  anchors,
  toScreen,
  material,
}: BoardGeometryFoundationProps) {
  const geometry = useMemo(() => {
    if (!material || anchors.length < 3) return null;

    const points = anchors.map(toScreen);
    const center = points.reduce(
      (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
      { x: 0, y: 0 },
    );
    center.x /= points.length;
    center.y /= points.length;

    const radius = points.reduce(
      (sum, point) => sum + Math.hypot(point.x - center.x, point.y - center.y),
      0,
    ) / points.length;
    const routeWidth = radius * ROUTE_BED_WIDTH_TO_RADIUS;
    const outerDiameter = (radius * 2) + routeWidth;

    return { center, routeWidth, outerDiameter };
  }, [anchors, material, toScreen]);

  if (!material || !geometry) return null;

  const style = {
    left: geometry.center.x,
    top: geometry.center.y,
    width: geometry.outerDiameter,
    height: geometry.outerDiameter,
    borderWidth: geometry.routeWidth,
    ['--route-foundation-surface' as string]: material.surfaceColor,
    ['--route-foundation-highlight' as string]: material.highlightColor,
    ['--route-foundation-edge' as string]: material.edgeColor,
    ['--route-foundation-shadow' as string]: material.shadowColor,
  } satisfies CSSProperties;

  return (
    <div
      className="island-run-board__route-foundation"
      style={style}
      data-route-anchor-count={anchors.length}
      aria-hidden="true"
    />
  );
});
