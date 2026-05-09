import {
  clampCameraPan,
  computeManualMinCameraZoom,
  computeSceneCameraFrame,
  MANUAL_MIN_CAMERA_ZOOM,
  type CameraVisualBounds,
} from '../../components/board/useBoardCamera';
import { assert, assertEqual, type TestCase } from './testHarness';

const boardWidth = 400;
const boardHeight = 700;
const sceneBounds: CameraVisualBounds = {
  left: -80,
  top: -120,
  right: 480,
  bottom: 520,
};

function nearlyEqual(actual: number, expected: number, message: string, epsilon = 0.0001): void {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${message} (expected ${expected}, received ${actual})`);
  }
}

export const useBoardCameraTests: TestCase[] = [
  {
    name: 'computes scene-aware reset frame that fits full wider/taller scene bounds',
    run: () => {
      const frame = computeSceneCameraFrame(boardWidth, boardHeight, sceneBounds);
      const expectedZoom = (boardWidth / (sceneBounds.right - sceneBounds.left)) * 0.96;
      nearlyEqual(frame.zoom, expectedZoom, 'Expected reset/default zoom to fit scene width with a safety margin');
      nearlyEqual(frame.x, expectedZoom * (boardWidth / 2 - 200), 'Expected reset/default x to center scene bounds');
      nearlyEqual(frame.y, expectedZoom * (boardHeight / 2 - 200), 'Expected reset/default y to center scene bounds');

      const transformedLeft = frame.zoom * sceneBounds.left + (1 - frame.zoom) * (boardWidth / 2) + frame.x;
      const transformedRight = frame.zoom * sceneBounds.right + (1 - frame.zoom) * (boardWidth / 2) + frame.x;
      const transformedTop = frame.zoom * sceneBounds.top + (1 - frame.zoom) * (boardHeight / 2) + frame.y;
      const transformedBottom = frame.zoom * sceneBounds.bottom + (1 - frame.zoom) * (boardHeight / 2) + frame.y;
      assert(transformedLeft >= 0, 'Expected scene left edge to remain visible at reset framing');
      assert(transformedRight <= boardWidth, 'Expected scene right edge to remain visible at reset framing');
      assert(transformedTop >= 0, 'Expected scene top edge to remain visible at reset framing');
      assert(transformedBottom <= boardHeight, 'Expected scene bottom edge to remain visible at reset framing');
    },
  },

  {
    name: 'uses scene-fit reset zoom as the manual minimum zoom-out floor',
    run: () => {
      const frame = computeSceneCameraFrame(boardWidth, boardHeight, sceneBounds);
      const manualMinZoom = computeManualMinCameraZoom(boardWidth, boardHeight, sceneBounds);
      nearlyEqual(manualMinZoom, frame.zoom, 'Expected manual min zoom to match scene-fit reset zoom');
      assert(manualMinZoom < MANUAL_MIN_CAMERA_ZOOM, 'Expected wider scene to lower the manual zoom-out floor');
    },
  },
  {
    name: 'clamps pan against full scene bounds when zoomed in',
    run: () => {
      const zoom = 1.4;
      const clampedLeft = clampCameraPan(9999, 0, zoom, boardWidth, boardHeight, sceneBounds);
      const transformedLeft = zoom * sceneBounds.left + (1 - zoom) * (boardWidth / 2) + clampedLeft.x;
      nearlyEqual(transformedLeft, 0, 'Expected max rightward pan to align scene left edge with viewport');

      const clampedRight = clampCameraPan(-9999, 0, zoom, boardWidth, boardHeight, sceneBounds);
      const transformedRight = zoom * sceneBounds.right + (1 - zoom) * (boardWidth / 2) + clampedRight.x;
      nearlyEqual(transformedRight, boardWidth, 'Expected max leftward pan to align scene right edge with viewport');
    },
  },
  {
    name: 'keeps legacy board-only pan clamp when no scene bounds are provided',
    run: () => {
      const clamped = clampCameraPan(999, -999, 2, boardWidth, boardHeight);
      assertEqual(clamped.x, 200, 'Expected legacy clamp to use half extra board width');
      assertEqual(clamped.y, -350, 'Expected legacy clamp to use half extra board height');
    },
  },
  {
    name: 'keeps legacy default frame when no scene bounds are provided',
    run: () => {
      const frame = computeSceneCameraFrame(boardWidth, boardHeight, null);
      assertEqual(frame.x, 0, 'Expected legacy default x to remain centered');
      assertEqual(frame.y, 0, 'Expected legacy default y to remain centered');
      assertEqual(frame.zoom, MANUAL_MIN_CAMERA_ZOOM, 'Expected legacy default zoom to remain at the exported manual minimum');
    },
  },
];
