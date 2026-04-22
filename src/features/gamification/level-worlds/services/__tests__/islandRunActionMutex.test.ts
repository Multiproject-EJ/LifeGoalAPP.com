import {
  __resetIslandRunActionMutexesForTests,
  beginIslandRunActionBarrier,
  endIslandRunActionBarrier,
  withIslandRunActionLock,
} from '../islandRunActionMutex';
import { assert, assertEqual, type TestCase } from './testHarness';

const USER_ID = 'action-mutex-test-user';

export const islandRunActionMutexTests: TestCase[] = [
  {
    name: 'barrier blocks queued action-lock work until released',
    run: async () => {
      __resetIslandRunActionMutexesForTests();
      beginIslandRunActionBarrier(USER_ID);

      let didRun = false;
      const workPromise = withIslandRunActionLock(USER_ID, async () => {
        didRun = true;
        return 123;
      });

      await Promise.resolve();
      await Promise.resolve();
      assertEqual(didRun, false, 'Work should not run while barrier is active');

      endIslandRunActionBarrier(USER_ID);
      const result = await workPromise;
      assertEqual(result, 123, 'Work result should resolve after barrier release');
      assertEqual(didRun, true, 'Work should run once barrier clears');
    },
  },
  {
    name: 'nested barriers require matching number of releases',
    run: async () => {
      __resetIslandRunActionMutexesForTests();
      beginIslandRunActionBarrier(USER_ID);
      beginIslandRunActionBarrier(USER_ID);

      let completed = false;
      const workPromise = withIslandRunActionLock(USER_ID, async () => {
        completed = true;
        return 'ok';
      });

      endIslandRunActionBarrier(USER_ID);
      await Promise.resolve();
      assertEqual(completed, false, 'One release should not clear nested barrier');

      endIslandRunActionBarrier(USER_ID);
      const result = await workPromise;
      assertEqual(result, 'ok', 'Work should run only after final release');
      assert(completed, 'Work should complete after final barrier release');
    },
  },
];
