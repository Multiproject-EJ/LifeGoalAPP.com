import {
  getSkyboundCourseObjects,
  getSkyboundGroundHeight,
  type SkyboundCourseObject,
  type SkyboundFlightState,
  type SkyboundLevelDefinition,
  type SkyboundUpgrades,
} from '../../level-worlds/services/skyboundExpeditionFlight';

export const SKYBOUND_CANVAS_WIDTH = 390;
export const SKYBOUND_CANVAS_HEIGHT = 520;
export const SKYBOUND_LAUNCH_ORIGIN = { x: 126, y: 414 } as const;

export interface SkyboundAimView {
  power: number;
  angleDeg: number;
  pullX: number;
  pullY: number;
  dragging: boolean;
}

interface DrawSkyboundSceneInput {
  context: CanvasRenderingContext2D;
  level: SkyboundLevelDefinition;
  phase: 'aiming' | 'flying' | 'result';
  aim: SkyboundAimView;
  flight: SkyboundFlightState | null;
  upgrades: SkyboundUpgrades;
  controlPitch: number;
  boosting: boolean;
  reducedMotion: boolean;
  timeMs: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function drawCloud(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number,
) {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(x, y, 17 * scale, 0, Math.PI * 2);
  context.arc(x + (19 * scale), y - (9 * scale), 23 * scale, 0, Math.PI * 2);
  context.arc(x + (44 * scale), y, 18 * scale, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawPlane(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  upgrades: SkyboundUpgrades,
  boosting: boolean,
  ghost = false,
) {
  const scale = 0.82 + (upgrades.airframe * 0.035);
  context.save();
  context.translate(x, y);
  context.rotate(-rotation);
  context.scale(scale, scale);
  context.globalAlpha = ghost ? 0.62 : 1;

  if (boosting && !ghost) {
    const flame = 22 + (upgrades.engine * 3);
    const flameGradient = context.createLinearGradient(-17, 0, -17 - flame, 0);
    flameGradient.addColorStop(0, '#ffffff');
    flameGradient.addColorStop(0.35, '#59f4ff');
    flameGradient.addColorStop(1, 'rgba(89, 244, 255, 0)');
    context.fillStyle = flameGradient;
    context.beginPath();
    context.moveTo(-16, -4);
    context.lineTo(-16 - flame, 0);
    context.lineTo(-16, 4);
    context.closePath();
    context.fill();
  }

  context.fillStyle = '#183251';
  context.beginPath();
  context.ellipse(1, 8, 22, 6, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#f6fbff';
  context.strokeStyle = '#102b4a';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-20, -6);
  context.quadraticCurveTo(6, -12, 27, -1);
  context.quadraticCurveTo(7, 10, -21, 5);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = '#39d8ed';
  context.beginPath();
  context.moveTo(-2, -4);
  context.lineTo(9, -27 - (upgrades.airframe * 2));
  context.lineTo(18, -25 - (upgrades.airframe * 2));
  context.lineTo(10, 1);
  context.closePath();
  context.fill();
  context.stroke();

  if (upgrades.airframe >= 2) {
    context.strokeStyle = 'rgba(220, 255, 255, 0.92)';
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(4, -8);
    context.lineTo(11, -23 - (upgrades.airframe * 2));
    context.moveTo(8, -7);
    context.lineTo(16, -21 - (upgrades.airframe * 2));
    context.stroke();
  }

  if (upgrades.airframe >= 3) {
    context.fillStyle = '#2a9fbf';
    context.beginPath();
    context.moveTo(1, 2);
    context.lineTo(10, 18 + upgrades.airframe);
    context.lineTo(18, 17 + upgrades.airframe);
    context.lineTo(10, 1);
    context.closePath();
    context.fill();
    context.stroke();
  }

  context.fillStyle = '#ffcc4d';
  context.beginPath();
  context.moveTo(-15, -5);
  context.lineTo(-20, -18 - upgrades.airframe);
  context.lineTo(-12, -17);
  context.lineTo(-5, 1);
  context.closePath();
  context.fill();

  if (upgrades.airframe >= 4) {
    context.fillStyle = '#ffe077';
    context.beginPath();
    context.moveTo(-14, -5);
    context.lineTo(-17, -23);
    context.lineTo(-10, -21);
    context.lineTo(-7, -2);
    context.closePath();
    context.fill();
    context.stroke();
  }
  context.stroke();

  context.fillStyle = '#234f75';
  context.beginPath();
  context.ellipse(10, -6, 8, 5, -0.2, 0, Math.PI * 2);
  context.fill();

  if (upgrades.launcher > 0) {
    context.strokeStyle = upgrades.launcher >= 3 ? '#83fbff' : '#f9d76d';
    context.lineWidth = 2 + (upgrades.launcher * 0.3);
    context.beginPath();
    context.arc(23, -1, 5 + (upgrades.launcher * 0.35), -1.25, 1.25);
    context.stroke();
  }

  if (upgrades.engine > 0) {
    const engineLength = 7 + (upgrades.engine * 1.4);
    context.fillStyle = '#fc7c4a';
    context.fillRect(-16 - engineLength, -5, engineLength, 9);
    context.strokeRect(-16 - engineLength, -5, engineLength, 9);
    context.fillStyle = '#ffd3a6';
    context.beginPath();
    context.arc(-16 - engineLength, -0.5, 2.2 + (upgrades.engine * 0.35), 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawSalvageCrystal(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  timeMs: number,
  index: number,
) {
  const pulse = 1 + (Math.sin((timeMs * 0.006) + index) * 0.09);
  context.save();
  context.translate(x, y);
  context.scale(pulse, pulse);
  context.shadowColor = '#ffd84f';
  context.shadowBlur = 12;
  context.fillStyle = '#ffd84f';
  context.strokeStyle = '#fff2a6';
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(0, -10);
  context.lineTo(7, 0);
  context.lineTo(0, 12);
  context.lineTo(-7, 0);
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(111, 71, 6, 0.45)';
  context.beginPath();
  context.moveTo(0, -8);
  context.lineTo(0, 9);
  context.moveTo(-5, 0);
  context.lineTo(5, 0);
  context.stroke();
  context.restore();
}

function drawWindRing(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  timeMs: number,
) {
  const pulse = Math.sin(timeMs * 0.005) * 2;
  context.save();
  context.strokeStyle = '#79f5ff';
  context.shadowColor = '#28ddeb';
  context.shadowBlur = 15;
  context.lineWidth = 5;
  context.beginPath();
  context.arc(x, y, radius + pulse, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 0.5;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, radius - 8 + pulse, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 0.72;
  for (let arc = 0; arc < 3; arc += 1) {
    context.beginPath();
    context.arc(x, y, radius + 8 + (arc * 6), -0.7 + (arc * 0.12), 0.7 + (arc * 0.12));
    context.stroke();
  }
  context.restore();
}

function drawRockHazard(
  context: CanvasRenderingContext2D,
  object: SkyboundCourseObject,
  screenX: number,
  centerY: number,
  groundY: number,
) {
  const topY = centerY - (object.radius * 2.15);
  context.save();
  context.fillStyle = '#34465a';
  context.strokeStyle = '#1a2b3d';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(screenX - 16, groundY + 3);
  context.lineTo(screenX - 11, centerY + 8);
  context.lineTo(screenX - 5, centerY - 9);
  context.lineTo(screenX, topY);
  context.lineTo(screenX + 7, centerY - 5);
  context.lineTo(screenX + 15, groundY + 3);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = '#fc6f65';
  context.shadowColor = '#fc6f65';
  context.shadowBlur = 8;
  context.beginPath();
  context.moveTo(screenX, centerY - 10);
  context.lineTo(screenX + 5, centerY);
  context.lineTo(screenX, centerY + 7);
  context.lineTo(screenX - 5, centerY);
  context.closePath();
  context.fill();
  context.restore();
}

function drawCourseObjects(
  context: CanvasRenderingContext2D,
  level: SkyboundLevelDefinition,
  flight: SkyboundFlightState | null,
  cameraX: number,
  cameraY: number,
  groundBaseY: number,
  timeMs: number,
) {
  const resolved = new Set(flight?.resolvedObjectIds ?? []);
  getSkyboundCourseObjects(level.id).forEach((object, index) => {
    if (resolved.has(object.id)) return;
    const screenX = SKYBOUND_LAUNCH_ORIGIN.x + object.x - cameraX;
    if (screenX < -70 || screenX > SKYBOUND_CANVAS_WIDTH + 70) return;
    const screenY = groundBaseY - ((object.y - cameraY) * 3);
    if (object.kind === 'salvage') {
      drawSalvageCrystal(context, screenX, screenY, timeMs, index);
      return;
    }
    if (object.kind === 'wind_ring') {
      drawWindRing(context, screenX, screenY, object.radius * 2, timeMs);
      return;
    }
    const ground = getSkyboundGroundHeight(level.id, object.x);
    const groundY = groundBaseY - ((ground - cameraY) * 3);
    drawRockHazard(context, object, screenX, screenY, groundY);
  });
}

function drawLauncher(
  context: CanvasRenderingContext2D,
  aim: SkyboundAimView,
  upgrades: SkyboundUpgrades,
) {
  const origin = SKYBOUND_LAUNCH_ORIGIN;
  const planeX = aim.dragging ? origin.x - aim.pullX : origin.x;
  const planeY = aim.dragging ? origin.y + aim.pullY : origin.y;
  const mastHeight = 53 + (upgrades.launcher * 3);

  context.strokeStyle = '#59361f';
  context.lineWidth = 10;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(origin.x - 18, origin.y + 45);
  context.lineTo(origin.x - 26, origin.y - mastHeight);
  context.moveTo(origin.x + 18, origin.y + 45);
  context.lineTo(origin.x + 26, origin.y - mastHeight);
  context.stroke();

  context.strokeStyle = upgrades.launcher >= 3 ? '#72f5ff' : '#ffcf72';
  context.lineWidth = 3 + (upgrades.launcher * 0.45);
  context.beginPath();
  context.moveTo(origin.x - 26, origin.y - mastHeight);
  context.lineTo(planeX - 9, planeY);
  context.lineTo(origin.x + 26, origin.y - mastHeight);
  context.stroke();

  const angle = (aim.angleDeg * Math.PI) / 180;
  drawPlane(context, planeX, planeY, angle, upgrades, false, !aim.dragging);

  if (aim.dragging) {
    context.save();
    context.setLineDash([7, 7]);
    context.lineWidth = 3;
    context.strokeStyle = 'rgba(255,255,255,0.8)';
    context.beginPath();
    context.moveTo(origin.x + 8, origin.y - 12);
    for (let marker = 1; marker <= 5; marker += 1) {
      const distance = marker * (22 + (aim.power * 6));
      const x = origin.x + (Math.cos(angle) * distance);
      const y = origin.y - (Math.sin(angle) * distance) + (marker * marker * 1.8);
      context.lineTo(x, y);
    }
    context.stroke();
    context.restore();
  }
}

function drawFinishGate(
  context: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  accent: string,
  label: string,
) {
  context.save();
  context.strokeStyle = accent;
  context.lineWidth = 5;
  context.shadowColor = accent;
  context.shadowBlur = 12;
  context.beginPath();
  context.moveTo(x - 19, groundY);
  context.lineTo(x - 19, groundY - 95);
  context.quadraticCurveTo(x, groundY - 117, x + 19, groundY - 95);
  context.lineTo(x + 19, groundY);
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = '#102640';
  context.font = '700 11px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText(label, x, groundY - 122);
  context.restore();
}

export function drawSkyboundScene(input: DrawSkyboundSceneInput) {
  const {
    context,
    level,
    phase,
    aim,
    flight,
    upgrades,
    controlPitch,
    boosting,
    reducedMotion,
    timeMs,
  } = input;
  const width = SKYBOUND_CANVAS_WIDTH;
  const height = SKYBOUND_CANVAS_HEIGHT;
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, level.skyTop);
  sky.addColorStop(0.72, level.skyBottom);
  sky.addColorStop(1, '#eef8db');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const cameraX = phase === 'aiming' || !flight ? 0 : Math.max(0, flight.x - 24);
  const cameraY = phase === 'aiming' || !flight ? 0 : Math.max(0, flight.y - 76);
  const drift = reducedMotion ? 0 : (timeMs * 0.008);
  drawCloud(context, 40 - ((cameraX * 0.13 + drift) % 470), 96, 0.8, 0.55);
  drawCloud(context, 265 - ((cameraX * 0.08 + drift * 0.6) % 520), 148, 0.55, 0.42);
  drawCloud(context, 430 - ((cameraX * 0.18 + drift * 1.2) % 540), 62, 1.05, 0.34);

  if (level.id !== 'meadow') {
    context.fillStyle = level.id === 'storm' ? 'rgba(20,34,58,0.3)' : 'rgba(100,55,64,0.28)';
    context.beginPath();
    context.moveTo(0, 410);
    for (let screenX = 0; screenX <= width + 20; screenX += 20) {
      const worldX = Math.max(0, cameraX + screenX - SKYBOUND_LAUNCH_ORIGIN.x);
      const ridge = 320 + (Math.sin(worldX / 67) * 28) + (Math.sin(worldX / 23) * 10);
      context.lineTo(screenX, ridge + (cameraY * 0.8));
    }
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    context.fill();
  }

  if (phase === 'flying' && flight && flight.vx > 35 && !reducedMotion) {
    const speedAlpha = clamp((flight.vx - 35) / 45, 0, 0.42);
    context.strokeStyle = `rgba(255,255,255,${speedAlpha})`;
    context.lineWidth = 2;
    for (let index = 0; index < 9; index += 1) {
      const y = 54 + ((index * 53 + timeMs * 0.14) % 360);
      const x = 45 + ((index * 83 + timeMs * 0.18) % 330);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - 24 - (flight.vx * 0.25), y + 2);
      context.stroke();
    }
  }

  const groundBaseY = 466;
  context.fillStyle = level.ground;
  context.beginPath();
  context.moveTo(0, height);
  for (let screenX = -12; screenX <= width + 12; screenX += 8) {
    const worldX = Math.max(0, cameraX + screenX - SKYBOUND_LAUNCH_ORIGIN.x);
    const ground = getSkyboundGroundHeight(level.id, worldX);
    const screenY = groundBaseY - ((ground - cameraY) * 3);
    context.lineTo(screenX, screenY);
  }
  context.lineTo(width, height);
  context.closePath();
  context.fill();

  context.strokeStyle = 'rgba(255,255,255,0.35)';
  context.lineWidth = 2;
  context.beginPath();
  for (let screenX = -12; screenX <= width + 12; screenX += 8) {
    const worldX = Math.max(0, cameraX + screenX - SKYBOUND_LAUNCH_ORIGIN.x);
    const ground = getSkyboundGroundHeight(level.id, worldX);
    const screenY = groundBaseY - ((ground - cameraY) * 3);
    if (screenX === -12) context.moveTo(screenX, screenY);
    else context.lineTo(screenX, screenY);
  }
  context.stroke();

  drawCourseObjects(context, level, flight, cameraX, cameraY, groundBaseY, timeMs);

  for (let marker = 100; marker < level.goalDistance; marker += 100) {
    const screenX = SKYBOUND_LAUNCH_ORIGIN.x + marker - cameraX;
    if (screenX < -40 || screenX > width + 40) continue;
    const ground = getSkyboundGroundHeight(level.id, marker);
    const screenY = groundBaseY - ((ground - cameraY) * 3);
    context.fillStyle = 'rgba(12,31,50,0.72)';
    context.fillRect(screenX - 1, screenY - 25, 2, 25);
    context.font = '700 10px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(`${marker}m`, screenX, screenY - 31);
  }

  const goalX = SKYBOUND_LAUNCH_ORIGIN.x + level.goalDistance - cameraX;
  if (goalX > -50 && goalX < width + 50) {
    const goalGround = getSkyboundGroundHeight(level.id, level.goalDistance);
    const goalY = groundBaseY - ((goalGround - cameraY) * 3);
    drawFinishGate(context, goalX, goalY, level.accent, 'SKY GATE');
  }

  if (phase === 'aiming') {
    drawLauncher(context, aim, upgrades);
  } else if (flight) {
    const planeX = SKYBOUND_LAUNCH_ORIGIN.x + flight.x - cameraX;
    const planeY = groundBaseY - ((flight.y - cameraY) * 3);
    const pitch = flight.status === 'crashed' ? -0.65 : flight.pitchRad;
    if (flight.status === 'flying' && !reducedMotion) {
      context.strokeStyle = 'rgba(98,239,255,0.34)';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(planeX - 16, planeY + 5);
      context.lineTo(planeX - 70 - clamp(flight.vx, 0, 70), planeY + 10);
      context.stroke();
    }
    drawPlane(context, planeX, planeY, pitch, upgrades, boosting && flight.fuel > 0);
  }

  if (phase === 'flying') {
    context.save();
    context.translate(width - 27, 225);
    context.fillStyle = 'rgba(11,29,49,0.44)';
    context.fillRect(-8, -66, 16, 132);
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(0, -controlPitch * 58, 9, 0, Math.PI * 2);
    context.fill();
    context.font = '800 9px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText('LIFT', 0, -77);
    context.fillText('DIVE', 0, 83);
    context.restore();
  }
}
