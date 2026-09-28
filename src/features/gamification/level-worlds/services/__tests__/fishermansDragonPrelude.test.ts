import {
  DRAGON_PRELUDE_END_SECONDS,
  dragonPreludeBeat,
  dragonPreludeTalk,
  isDragonPreludePanic,
} from '../fishermansDragonPrelude';
import { assert, assertEqual, type TestCase } from './testHarness';

export const fishermansDragonPreludeTests: TestCase[] = [
  {
    name: 'dragon prelude: siren, draining pond, "not a drill", and it closes when the dragon breaks the surface',
    run: () => {
      assertEqual(dragonPreludeBeat(0.2)?.speaker, 'Siren', 'the alarm goes first');
      assert(/draining/.test(dragonPreludeBeat(1.5)?.text ?? ''), 'the water starts going down');
      assert(/hurry home/.test(dragonPreludeBeat(2.6)?.text ?? ''), 'some villagers leave, most watch');
      assertEqual(dragonPreludeBeat(5)?.text, 'NOT A DRILL! NOT A DRILL!', 'then the panic');
      assert(isDragonPreludePanic(5) && !isDragonPreludePanic(3), 'panic only after the realisation');
      assertEqual(dragonPreludeBeat(DRAGON_PRELUDE_END_SECONDS), null, 'talk stops as the dragon erupts (7.2 s)');
      assertEqual(DRAGON_PRELUDE_END_SECONDS, 7.2, 'aligned with the cinematic eruption');
    },
  },
  {
    name: 'dragon prelude: "Why?" gets an answer that depends on how far the scene has gone',
    run: () => {
      assertEqual(dragonPreludeTalk(1, 0, null).kind, 'ask', 'the player can ask why');
      const early = dragonPreludeTalk(1.5, 1, 1.2);
      const middle = dragonPreludeTalk(3.5, 1, 3.2);
      const late = dragonPreludeTalk(5.5, 1, 5.2);
      assert(early.kind === 'reply' && /siren/.test(early.text), 'early: the siren explanation');
      assert(middle.kind === 'reply' && /bait/.test(middle.text), 'middle: the catch was bait');
      assert(late.kind === 'reply' && late.text === 'Step away, and prepare to run!' && late.followUp === 'Prepare to run??', 'late: prepare to run, with a follow-up');
      const run = dragonPreludeTalk(6, 2, 5.2);
      assert(run.kind === 'reply' && /RUN!/.test(run.text), 'the follow-up gets RUN!');
      assertEqual(dragonPreludeTalk(7.3, 2, 5.2).kind, 'closed', 'conversation ends when the dragon is out');
    },
  },
];
