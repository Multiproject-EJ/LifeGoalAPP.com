import React, { useMemo } from 'react';
import { GAME_AXES, type GameAxisKey } from './personalityTestDataV2';

export type PlaystyleSigilProps = {
  axisScores: Record<GameAxisKey, number>;
  /** Axes with real data. Unmeasured axes are drawn at the centre-line and dimmed. */
  measuredAxes: Set<GameAxisKey>;
  /** Optional previous reading, drawn as a ghost outline (#20 groundwork). */
  previousAxisScores?: Record<GameAxisKey, number> | null;
  size?: number;
};

const RINGS = [0.25, 0.5, 0.75, 1];

/**
 * The five game axes as a pentagon radar — the shape is unique to the player,
 * which makes it far more identity-forming (and far more screenshottable) than
 * five separate bars.
 *
 * Geometry note: each axis is a spoke from the centre, and the score maps to
 * distance along it. 50 (dead centre of an axis) sits at half radius, so a
 * perfectly balanced player draws a regular pentagon rather than a dot.
 */
export function PlaystyleSigil({
  axisScores,
  measuredAxes,
  previousAxisScores,
  size = 240,
}: PlaystyleSigilProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;

  const points = useMemo(() => {
    return GAME_AXES.map((axis, index) => {
      // Start at 12 o'clock and go clockwise.
      const angle = (Math.PI * 2 * index) / GAME_AXES.length - Math.PI / 2;
      const score = axisScores[axis.key] ?? 50;
      // Keep a visible floor so an extreme low score still draws a shape.
      const magnitude = 0.18 + (score / 100) * 0.82;
      return {
        axis,
        angle,
        score,
        measured: measuredAxes.has(axis.key),
        x: cx + Math.cos(angle) * radius * magnitude,
        y: cy + Math.sin(angle) * radius * magnitude,
        labelX: cx + Math.cos(angle) * (radius + 18),
        labelY: cy + Math.sin(angle) * (radius + 18),
        axisX: cx + Math.cos(angle) * radius,
        axisY: cy + Math.sin(angle) * radius,
      };
    });
  }, [axisScores, measuredAxes, cx, cy, radius]);

  const previousPoints = useMemo(() => {
    if (!previousAxisScores) return null;
    return GAME_AXES.map((axis, index) => {
      const angle = (Math.PI * 2 * index) / GAME_AXES.length - Math.PI / 2;
      const magnitude = 0.18 + ((previousAxisScores[axis.key] ?? 50) / 100) * 0.82;
      return `${cx + Math.cos(angle) * radius * magnitude},${cy + Math.sin(angle) * radius * magnitude}`;
    }).join(' ');
  }, [previousAxisScores, cx, cy, radius]);

  const polygon = points.map((point) => `${point.x},${point.y}`).join(' ');

  // Blend the shape fill from the axes the player actually leans into.
  const dominant = [...points]
    .filter((point) => point.measured)
    .sort((a, b) => b.score - a.score)[0];
  const shapeColor = dominant?.axis.color ?? '#4f46e5';

  return (
    <svg
      className="identity-hub__sigil"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Playstyle sigil across ${GAME_AXES.length} axes`}
    >
      {/* Web rings */}
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          className="identity-hub__sigil-ring"
          points={GAME_AXES.map((_, index) => {
            const angle = (Math.PI * 2 * index) / GAME_AXES.length - Math.PI / 2;
            return `${cx + Math.cos(angle) * radius * ring},${cy + Math.sin(angle) * radius * ring}`;
          }).join(' ')}
        />
      ))}

      {/* Spokes */}
      {points.map((point) => (
        <line
          key={`spoke-${point.axis.key}`}
          className="identity-hub__sigil-spoke"
          x1={cx}
          y1={cy}
          x2={point.axisX}
          y2={point.axisY}
        />
      ))}

      {/* Previous reading, if any */}
      {previousPoints && (
        <polygon className="identity-hub__sigil-ghost" points={previousPoints} />
      )}

      {/* The shape itself */}
      <polygon
        className="identity-hub__sigil-shape"
        points={polygon}
        style={{ fill: shapeColor, stroke: shapeColor }}
      />

      {/* Vertices + axis icons */}
      {points.map((point) => (
        <g key={point.axis.key}>
          <circle
            className={`identity-hub__sigil-node${
              point.measured ? '' : ' identity-hub__sigil-node--unmeasured'
            }`}
            cx={point.x}
            cy={point.y}
            r={4}
            style={{ fill: point.axis.color }}
          />
          <text
            className="identity-hub__sigil-label"
            x={point.labelX}
            y={point.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {point.axis.icon}
          </text>
        </g>
      ))}
    </svg>
  );
}
