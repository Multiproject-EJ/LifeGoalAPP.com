import { sampleOpeningCeremony, OPENING_CEREMONY_DURATION_MS, OPENING_CEREMONY_REDUCED_DURATION_MS } from '../islandRunOpeningCeremonyPresentation';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunOpeningCeremonyPresentationTests: TestCase[] = [
  { name: 'opening show has ordered, bounded beats and a terminal frame', run() {
    for (const [time, phase] of [[0, 'welcome'], [2000, 'beacon'], [4800, 'celebration'], [9500, 'introduction'], [12000, 'complete']] as const) {
      assertEqual(sampleOpeningCeremony(time).phase, phase, `phase at ${time}`);
    }
    assert(!sampleOpeningCeremony(OPENING_CEREMONY_DURATION_MS - 1).done, 'not early');
    assert(sampleOpeningCeremony(OPENING_CEREMONY_DURATION_MS).done, 'ends on boundary');
  } },
  { name: 'quiet opening has no fireworks and no forced twelve-second wait', run() {
    for (let ms = 0; ms <= OPENING_CEREMONY_REDUCED_DURATION_MS; ms += 100) {
      const sample = sampleOpeningCeremony(ms, true);
      assert(!sample.fireworks, 'quiet means no particles');
      assertEqual(sample.beacon, 1, 'constant flame');
      assert(sample.revealReady, 'introduction visible immediately');
    }
    assert(sampleOpeningCeremony(OPENING_CEREMONY_REDUCED_DURATION_MS, true).done, 'quiet ends');
  } },
  { name: 'normal reveal follows the celebration rather than preceding it', run() {
    assert(!sampleOpeningCeremony(9499).revealReady, 'still celebrating');
    assert(sampleOpeningCeremony(9500).revealReady, 'introduce channels');
    assert(!sampleOpeningCeremony(9500).fireworks, 'no fireworks behind explanation');
  } },
  { name: 'presentation sampling is deterministic, finite and monotonically bounded', run() {
    let previous = 0;
    for (let ms = -100; ms <= 14000; ms += 73) {
      const sample = sampleOpeningCeremony(ms);
      assert(sample.progress >= previous && sample.progress <= 1, 'bounded clock');
      assert(sample.beacon >= 0 && sample.beacon <= 1, 'bounded beacon');
      assertEqual(JSON.stringify(sample), JSON.stringify(sampleOpeningCeremony(ms)), 'replay same sample');
      previous = sample.progress;
    }
    for (const invalid of [NaN, Infinity, -Infinity]) assertEqual(sampleOpeningCeremony(invalid).progress, 0, 'invalid is safe start');
  } },
];
