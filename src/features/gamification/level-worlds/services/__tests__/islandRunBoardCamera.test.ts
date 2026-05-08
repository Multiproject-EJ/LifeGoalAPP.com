import { CAMERA_ZOOM, RESET_CAMERA_ZOOM } from '../../components/board/cameraDirector';
import { clampCameraPan, DEFAULT_CAMERA_ZOOM, MANUAL_MIN_CAMERA_ZOOM } from '../../components/board/useBoardCamera';
import { assert, assertEqual, type TestCase } from './testHarness';

function assertClose(actual: number, expected: number, message: string): void {
  if (Math.abs(actual - expected) > 0.000001) {
    throw new Error(`${message} (expected ${expected}, received ${actual})`);
  }
}

export const islandRunBoardCameraTests: TestCase[] = [
  {
    name: 'reset/default camera zoom uses wider-than-overview framing',
    run: () => {
      const expectedWideResetZoom = CAMERA_ZOOM.overview * 0.8;
      assertClose(RESET_CAMERA_ZOOM, expectedWideResetZoom, 'Expected reset camera zoom to be 20% wider than overview');
      assertClose(DEFAULT_CAMERA_ZOOM, expectedWideResetZoom, 'Expected default camera zoom to be 20% wider than overview');
      assert(
        DEFAULT_CAMERA_ZOOM < CAMERA_ZOOM.overview,
        'Expected default camera zoom to sit below overview for a wider reset framing',
      );
    },
  },
  {
    name: 'manual minimum zoom uses reset/default zoom floor',
    run: () => {
      assertClose(MANUAL_MIN_CAMERA_ZOOM, DEFAULT_CAMERA_ZOOM, 'Expected manual zoom floor to match default zoom');
      assertClose(MANUAL_MIN_CAMERA_ZOOM, RESET_CAMERA_ZOOM, 'Expected manual zoom floor to match reset zoom');
    },
  },
  {
    name: 'pan stays centered when zoomed out to reset/default framing',
    run: () => {
      const clamped = clampCameraPan(120, -180, DEFAULT_CAMERA_ZOOM, 400, 800);
      assertClose(clamped.x, 0, 'Expected horizontal pan to be locked at reset/default zoom');
      assertClose(clamped.y, 0, 'Expected vertical pan to be locked at reset/default zoom');
    },
  },
  {
    name: 'pan is allowed but bounded when zoomed in',
    run: () => {
      const clampedInside = clampCameraPan(150, -300, 2, 400, 800);
      assertEqual(clampedInside.x, 150, 'Expected horizontal pan inside zoomed-in bounds to be preserved');
      assertEqual(clampedInside.y, -300, 'Expected vertical pan inside zoomed-in bounds to be preserved');

      const clampedOutside = clampCameraPan(999, -999, 2, 400, 800);
      assertEqual(clampedOutside.x, 200, 'Expected horizontal pan to clamp to zoomed-in right bound');
      assertEqual(clampedOutside.y, -400, 'Expected vertical pan to clamp to zoomed-in top bound');
    },
  },
];
