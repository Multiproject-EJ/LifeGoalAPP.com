import { assert, assertEqual, type TestCase } from './testHarness';
import { CELEBRATION_ROLES, pickCelebrationCrew } from '../buildCelebrationCrew';

const seq = (...values: number[]) => { let i = 0; return () => values[i++ % values.length]; };

export const buildCelebrationCrewTests: TestCase[] = [
  {
    name: 'celebration crew: level wins get one or two random robots; a 100% island gets all three',
    run: () => {
      assertEqual(pickCelebrationCrew('all', Math.random).length, 3, 'whole crew for the island');
      assertEqual(pickCelebrationCrew('random', seq(0.2, 0.99)).length, 1, 'sometimes a solo');
      assertEqual(pickCelebrationCrew('random', seq(0.7, 0.0, 0.99)).length, 2, 'sometimes a pair');
      const seen = new Set<string>();
      for (let i = 0; i < 200; i += 1) {
        const crew = pickCelebrationCrew('random', Math.random);
        assert(crew.length >= 1 && crew.length <= 2, 'never the whole crew for a level');
        assert(new Set(crew).size === crew.length, 'no duplicates');
        assert(crew.every((role, index) => index === 0 || CELEBRATION_ROLES.indexOf(crew[index - 1]) < CELEBRATION_ROLES.indexOf(role)), 'stage order kept');
        crew.forEach((role) => seen.add(role));
      }
      assertEqual(seen.size, 3, 'every robot gets its turn');
    },
  },
  {
    name: 'celebration crew: real jumps, flips, spin bursts, neon cycling and talking faces',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const model = fsMod.readFileSync('src/features/gamification/level-worlds/dev/RobotFamilyThreeModel.ts', 'utf8');
      for (const beat of ['heavy.root.position.y += Math.sin(beat * Math.PI) * 0.85', 'manager.body.rotation.y = ((u * u * (3 - 2 * u)) * Math.PI * 4) % (Math.PI * 2)', 'neonColor.setHSL', 'mini.body.rotation.x = trick === 0', 'const partyFace = motion === \'celebrate\'']) {
        assert(model.includes(beat), `choreography beat: ${beat.slice(0, 40)}`);
      }
      const modal = fsMod.readFileSync('src/features/gamification/level-worlds/components/BuildModalV2.tsx', 'utf8');
      assert(modal.includes("crew={isComplete || fastBuildMode ? 'all' : 'random'}"), 'modal picks the crew size');
    },
  },
];
