import { useEffect, useRef } from 'react';
import type { TileAnchor } from '../../services/islandBoardLayout';
import type { IslandBoardTheme } from '../../services/islandBoardThemes';

export interface BoardPathCanvasProps {
  anchors: TileAnchor[];
  boardWidth: number;
  boardHeight: number;
  theme: IslandBoardTheme;
  showDebug: boolean;
  toScreen: (anchor: TileAnchor) => { x: number; y: number };
}

/**
 * Canvas-rendered smooth path connecting all tiles.
 * Uses quadratic Bezier curves for smooth arcs + gradient glow + animated dash flow.
 */
export function BoardPathCanvas(props: BoardPathCanvasProps) {
  const { anchors, boardWidth, boardHeight, theme, showDebug, toScreen } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dashOffsetRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(boardWidth * ratio);
    canvas.height = Math.floor(boardHeight * ratio);
    canvas.style.width = `${boardWidth}px`;
    canvas.style.height = `${boardHeight}px`;

    const points = anchors.map((a) => toScreen(a));
    if (points.length < 2) return;

    // Draw function — called every frame for animated dash
    function draw() {
      const ctx = canvas!.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, boardWidth, boardHeight);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Build the path
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const current = points[i];
        const midX = (prev.x + current.x) / 2;
        const midY = (prev.y + current.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      // Close path — curve from last through midpoint and back to first
      const last = points[points.length - 1];
      const first = points[0];
      const closeMidX = (last.x + first.x) / 2;
      const closeMidY = (last.y + first.y) / 2;
      ctx.quadraticCurveTo(last.x, last.y, closeMidX, closeMidY);
      ctx.quadraticCurveTo(closeMidX, closeMidY, first.x, first.y);
      ctx.closePath();

      // Layer 1: Outer glow (wide, translucent)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 30;
      ctx.setLineDash([]);
      ctx.stroke();

      // Layer 2: Gradient path
      const gradient = ctx.createLinearGradient(0, 0, 0, boardHeight);
      gradient.addColorStop(0, theme.pathGlowStops[0]);
      gradient.addColorStop(0.5, theme.pathGlowStops[1]);
      gradient.addColorStop(1, theme.pathGlowStops[2]);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 14;
      ctx.stroke();

      // Layer 3: Inner bright core
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Layer 4: Animated flowing dash
      dashOffsetRef.current -= 0.6;
      ctx.setLineDash([6, 14]);
      ctx.lineDashOffset = dashOffsetRef.current;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      if (showDebug) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => cancelAnimationFrame(rafRef.current);
  }, [anchors, boardWidth, boardHeight, theme.pathGlowStops, showDebug, toScreen]);

  return <canvas ref={canvasRef} className="island-run-board__path" />;
}
