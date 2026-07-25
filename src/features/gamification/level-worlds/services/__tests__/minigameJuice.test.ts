/**
 * Shared mini-game "game feel" primitives tests.
 * Covers: deterministic RNG threading, particle bursts + stepping/expiry,
 * screen-shake decay and re-trigger precedence, number tweening convergence,
 * combo/chain escalation, and pop-scale easing bounds.
 */
import {
  createMinigameCelebrationQueue,
  createMinigameParticleBurst,
  createMinigameShake,
  dismissActiveMinigameCelebration,
  enqueueMinigameCelebration,
  MINIGAME_CELEBRATION_MAX_PENDING,
  easeOutBack,
  easeOutCubic,
  MINIGAME_COMBO_TIERS,
  nextMinigameJuiceRng,
  resolveMinigameChainCount,
  resolveMinigameComboTier,
  resolveMinigameParticleFade,
  resolveMinigamePopScale,
  stepMinigameNumberTween,
  stepMinigameParticles,
  stepMinigameShake,
} from '../minigameJuice';
import { assert, assertEqual, type TestCase } from './testHarness';

export const minigameJuiceTests: TestCase[] = [
  {
    name: 'rng advances deterministically and never latches on zero',
    run: () => {
      assertEqual(nextMinigameJuiceRng(12345), nextMinigameJuiceRng(12345), 'same seed yields same next state');
      assert(nextMinigameJuiceRng(0) !== 0, 'zero seed must not produce zero');
      let state = 1;
      const seen = new Set<number>();
      for (let i = 0; i < 200; i += 1) {
        state = nextMinigameJuiceRng(state);
        assert(state !== 0, 'state never becomes zero');
        seen.add(state);
      }
      assert(seen.size > 150, 'rng should not collapse into a short cycle');
    },
  },
  {
    name: 'particle burst is deterministic for a given seed and threads its state',
    run: () => {
      const options = { x: 10, y: 20, count: 8, speed: 100, lifeMs: 500, radius: 3, rngState: 99 };
      const [first, firstNext] = createMinigameParticleBurst(options);
      const [second, secondNext] = createMinigameParticleBurst(options);
      assertEqual(first.length, 8, 'burst emits the requested count');
      assertEqual(firstNext, secondNext, 'same seed returns the same next rng state');
      assert(firstNext !== 99, 'rng state advances past the seed');
      for (let i = 0; i < first.length; i += 1) {
        assertEqual(first[i].x, second[i].x, `particle ${i} x is deterministic`);
        assertEqual(first[i].vx, second[i].vx, `particle ${i} vx is deterministic`);
      }
    },
  },
  {
    name: 'particle burst spawns at the origin with non-zero velocity spread',
    run: () => {
      const [particles] = createMinigameParticleBurst({
        x: 40, y: 60, count: 12, speed: 120, lifeMs: 400, radius: 2, rngState: 7,
      });
      for (const particle of particles) {
        assertEqual(particle.x, 40, 'particles start at the burst origin x');
        assertEqual(particle.y, 60, 'particles start at the burst origin y');
        assert(Math.abs(particle.vx) + Math.abs(particle.vy) > 0, 'particles receive velocity');
        assert(particle.lifeMsRemaining === particle.lifeMsTotal, 'life starts full');
      }
      const distinctAngles = new Set(particles.map((p) => Math.round(Math.atan2(p.vy, p.vx) * 100)));
      assert(distinctAngles.size > 6, 'a full-circle burst spreads across many angles');
    },
  },
  {
    name: 'zero-count burst returns no particles and leaves the seed usable',
    run: () => {
      const [particles, next] = createMinigameParticleBurst({
        x: 0, y: 0, count: 0, speed: 10, lifeMs: 10, radius: 1, rngState: 5,
      });
      assertEqual(particles.length, 0, 'no particles emitted');
      assertEqual(next, 5, 'seed passes through untouched when nothing is spawned');
    },
  },
  {
    name: 'stepping particles advances position, applies gravity, and expires them',
    run: () => {
      const [particles] = createMinigameParticleBurst({
        x: 0, y: 0, count: 4, speed: 50, lifeMs: 100, radius: 2, rngState: 3,
      });
      const stepped = stepMinigameParticles(particles, { dtMs: 16, gravity: 900 });
      assertEqual(stepped.length, 4, 'particles survive a short step');
      assert(stepped[0] !== particles[0], 'step returns new objects (pure)');
      assertEqual(particles[0].lifeMsRemaining, particles[0].lifeMsTotal, 'input array is not mutated');

      // Gravity must bias velocity downward over time.
      let current = particles;
      let totalVy = 0;
      for (let i = 0; i < 3; i += 1) current = stepMinigameParticles(current, { dtMs: 16, gravity: 2000 });
      for (const p of current) totalVy += p.vy;
      assert(totalVy > 0, 'gravity pulls particles downward');

      const expired = stepMinigameParticles(particles, { dtMs: 64 });
      assert(expired.length < 4, 'short-lived particles expire once their life elapses');
    },
  },
  {
    name: 'particle fade reports a clamped 0..1 remaining ratio',
    run: () => {
      const [particles] = createMinigameParticleBurst({
        x: 0, y: 0, count: 2, speed: 10, lifeMs: 200, radius: 1, rngState: 11,
      });
      assertEqual(resolveMinigameParticleFade(particles[0]), 1, 'fresh particle is fully opaque');
      const stepped = stepMinigameParticles(particles, { dtMs: 32 });
      for (const p of stepped) {
        const fade = resolveMinigameParticleFade(p);
        assert(fade > 0 && fade < 1, 'partially aged particle fades between 0 and 1');
      }
    },
  },
  {
    name: 'screen shake decays to exactly zero and stops producing offset',
    run: () => {
      let shake = createMinigameShake({ magnitude: 10, durationMs: 100, rngState: 42 });
      let sawOffset = false;
      for (let i = 0; i < 6; i += 1) {
        const result = stepMinigameShake(shake, 16);
        shake = result.state;
        if (Math.abs(result.offsetX) + Math.abs(result.offsetY) > 0) sawOffset = true;
        assert(Math.abs(result.offsetX) <= 10, 'offset never exceeds magnitude');
      }
      assert(sawOffset, 'an active shake produces movement');

      const settled = stepMinigameShake(shake, 500);
      assertEqual(settled.state.remainingMs, 0, 'shake fully settles');
      assertEqual(settled.offsetX, 0, 'settled shake has no x offset');
      assertEqual(settled.offsetY, 0, 'settled shake has no y offset');
    },
  },
  {
    name: 'a stronger shake overrides a live weaker one, but not the reverse',
    run: () => {
      const weak = createMinigameShake({ magnitude: 2, durationMs: 200, rngState: 1 });
      const strong = createMinigameShake({ magnitude: 9, durationMs: 200, rngState: 1, previous: weak });
      assertEqual(strong.magnitude, 9, 'stronger shake takes over');

      const keptStrong = createMinigameShake({ magnitude: 1, durationMs: 200, rngState: 1, previous: strong });
      assertEqual(keptStrong.magnitude, 9, 'a weaker shake does not soften a live strong one');

      const settledStrong = { ...strong, remainingMs: 0 };
      const afterSettle = createMinigameShake({ magnitude: 1, durationMs: 200, rngState: 1, previous: settledStrong });
      assertEqual(afterSettle.magnitude, 1, 'once settled, a new weak shake is allowed');
    },
  },
  {
    name: 'number tween converges to the target and snaps exactly',
    run: () => {
      let value = 0;
      for (let i = 0; i < 400; i += 1) {
        value = stepMinigameNumberTween({ current: value, target: 250, dtMs: 16 });
        assert(value <= 250, 'tween never overshoots the target');
      }
      assertEqual(value, 250, 'tween lands exactly on the target');

      let down = 100;
      for (let i = 0; i < 400; i += 1) {
        down = stepMinigameNumberTween({ current: down, target: 0, dtMs: 16 });
      }
      assertEqual(down, 0, 'tween converges downward too');

      assertEqual(
        stepMinigameNumberTween({ current: 5, target: 5, dtMs: 16 }),
        5,
        'no movement when already at target',
      );
      assertEqual(
        stepMinigameNumberTween({ current: 1, target: 9, dtMs: 0 }),
        1,
        'a zero-length frame does not advance the tween',
      );
    },
  },
  {
    name: 'combo tiers escalate and resolve to the highest reached tier',
    run: () => {
      assertEqual(resolveMinigameComboTier(1), null, 'a single action is not a combo');
      assertEqual(resolveMinigameComboTier(0), null, 'zero is not a combo');
      assertEqual(resolveMinigameComboTier(2)?.label, 'Nice', 'two chains into the first tier');
      assertEqual(resolveMinigameComboTier(99)?.label, 'LEGENDARY', 'large chains reach the top tier');

      for (let i = 1; i < MINIGAME_COMBO_TIERS.length; i += 1) {
        assert(
          MINIGAME_COMBO_TIERS[i].minCount > MINIGAME_COMBO_TIERS[i - 1].minCount,
          'tier thresholds strictly increase',
        );
        assert(
          MINIGAME_COMBO_TIERS[i].intensity > MINIGAME_COMBO_TIERS[i - 1].intensity,
          'tier intensity strictly increases',
        );
      }
      assertEqual(MINIGAME_COMBO_TIERS[MINIGAME_COMBO_TIERS.length - 1].intensity, 1, 'top tier is full intensity');
    },
  },
  {
    name: 'chain count continues inside the window and resets outside it',
    run: () => {
      assertEqual(
        resolveMinigameChainCount({ previousCount: 3, lastActionAtMs: 1000, nowMs: 1500, windowMs: 1000 }),
        4,
        'an action inside the window extends the chain',
      );
      assertEqual(
        resolveMinigameChainCount({ previousCount: 3, lastActionAtMs: 1000, nowMs: 2500, windowMs: 1000 }),
        1,
        'an action past the window starts a fresh chain',
      );
      assertEqual(
        resolveMinigameChainCount({ previousCount: 0, lastActionAtMs: 1000, nowMs: 1100, windowMs: 1000 }),
        1,
        'the first action of a run is chain 1',
      );
      assertEqual(
        resolveMinigameChainCount({ previousCount: 5, lastActionAtMs: 2000, nowMs: 1000, windowMs: 1000 }),
        1,
        'a clock that runs backwards restarts the chain rather than extending it',
      );
    },
  },
  {
    name: 'celebrations queue in sequence instead of overwriting each other',
    run: () => {
      // The Island Workshop bug: one placement can award a score milestone, a
      // level-up and a gem at once. All three must be seen.
      let queue = createMinigameCelebrationQueue<{ title: string }>();
      assertEqual(queue.active, null, 'a fresh queue shows nothing');

      queue = enqueueMinigameCelebration(queue, { title: 'milestone' });
      assertEqual(queue.active?.title, 'milestone', 'the first celebration displays immediately');
      assertEqual(queue.pending.length, 0, 'nothing is waiting yet');

      queue = enqueueMinigameCelebration(queue, { title: 'level-up' });
      queue = enqueueMinigameCelebration(queue, { title: 'gem' });
      assertEqual(queue.active?.title, 'milestone', 'the active celebration is not displaced mid-display');
      assertEqual(queue.pending.length, 2, 'later celebrations wait their turn');

      queue = dismissActiveMinigameCelebration(queue);
      assertEqual(queue.active?.title, 'level-up', 'dismissing promotes the next in order');
      queue = dismissActiveMinigameCelebration(queue);
      assertEqual(queue.active?.title, 'gem', 'the third celebration is still shown');
      queue = dismissActiveMinigameCelebration(queue);
      assertEqual(queue.active, null, 'the queue empties cleanly');
      assertEqual(queue.droppedCount, 0, 'nothing was dropped in a normal chain');
    },
  },
  {
    name: 'celebration queue ids are unique and monotonic across the run',
    run: () => {
      let queue = createMinigameCelebrationQueue<{ title: string }>();
      const ids: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        queue = enqueueMinigameCelebration(queue, { title: `c${i}` });
        const id = queue.active?.queueId;
        if (i === 0 && id !== undefined) ids.push(id);
      }
      // Drain, collecting every id that surfaces.
      while (queue.active !== null) {
        const id = queue.active.queueId;
        if (!ids.includes(id)) ids.push(id);
        queue = dismissActiveMinigameCelebration(queue);
      }
      assertEqual(new Set(ids).size, ids.length, 'queue ids never repeat (React keys depend on this)');
      for (let i = 1; i < ids.length; i += 1) {
        assert(ids[i] > ids[i - 1], 'queue ids increase in display order');
      }
    },
  },
  {
    name: 'a reward burst caps its backlog and drops the oldest waiting item',
    run: () => {
      let queue = createMinigameCelebrationQueue<{ title: string }>();
      queue = enqueueMinigameCelebration(queue, { title: 'active' });
      for (let i = 0; i < MINIGAME_CELEBRATION_MAX_PENDING + 2; i += 1) {
        queue = enqueueMinigameCelebration(queue, { title: `pending-${i}` });
      }
      assertEqual(
        queue.pending.length,
        MINIGAME_CELEBRATION_MAX_PENDING,
        'the backlog never grows past the cap',
      );
      assertEqual(queue.droppedCount, 2, 'overflow is counted rather than silently lost');
      assertEqual(queue.active?.title, 'active', 'the displayed item survives the burst');
      // The newest rewards are the ones kept.
      assertEqual(
        queue.pending[queue.pending.length - 1].title,
        `pending-${MINIGAME_CELEBRATION_MAX_PENDING + 1}`,
        'the most recent reward is retained',
      );
      assertEqual(queue.pending[0].title, 'pending-2', 'the oldest waiting reward is the one dropped');
    },
  },
  {
    name: 'a zero-length backlog still shows the first celebration and counts the rest',
    run: () => {
      let queue = createMinigameCelebrationQueue<{ title: string }>();
      queue = enqueueMinigameCelebration(queue, { title: 'first' }, 0);
      queue = enqueueMinigameCelebration(queue, { title: 'second' }, 0);
      assertEqual(queue.active?.title, 'first', 'the active celebration still displays');
      assertEqual(queue.pending.length, 0, 'nothing queues when the cap is zero');
      assertEqual(queue.droppedCount, 1, 'the skipped celebration is counted');
      queue = dismissActiveMinigameCelebration(queue);
      assertEqual(queue.active, null, 'dismissing an empty-backlog queue idles cleanly');
    },
  },
  {
    name: 'easing helpers stay within bounds and hit their endpoints',
    run: () => {
      assertEqual(easeOutCubic(0), 0, 'cubic starts at 0');
      assertEqual(easeOutCubic(1), 1, 'cubic ends at 1');
      assertEqual(easeOutCubic(-3), 0, 'cubic clamps below 0');
      assertEqual(easeOutCubic(4), 1, 'cubic clamps above 1');
      assert(easeOutCubic(0.5) > 0.5, 'ease-out is ahead of linear at the midpoint');

      assertEqual(easeOutBack(0), 0, 'back easing starts at 0');
      assertEqual(easeOutBack(1), 1, 'back easing ends at 1');
      let overshot = false;
      for (let t = 0.1; t < 1; t += 0.05) {
        if (easeOutBack(t) > 1) overshot = true;
      }
      assert(overshot, 'back easing overshoots past 1 before settling');
    },
  },
  {
    name: 'pop scale overshoots then settles back to exactly 1',
    run: () => {
      assertEqual(
        resolveMinigamePopScale({ ageMs: 0, durationMs: 300, amplitude: 0.4 }),
        1.4,
        'pop starts at full overshoot',
      );
      assertEqual(
        resolveMinigamePopScale({ ageMs: 300, durationMs: 300, amplitude: 0.4 }),
        1,
        'pop settles to neutral at the end',
      );
      assertEqual(
        resolveMinigamePopScale({ ageMs: 9999, durationMs: 300, amplitude: 0.4 }),
        1,
        'pop stays neutral after it elapses',
      );
      assertEqual(
        resolveMinigamePopScale({ ageMs: 10, durationMs: 0, amplitude: 0.4 }),
        1,
        'a zero-length pop is a no-op',
      );
      for (let age = 0; age <= 300; age += 10) {
        const scale = resolveMinigamePopScale({ ageMs: age, durationMs: 300, amplitude: 0.4 });
        assert(scale > 0.4 && scale <= 1.4, `pop scale stays in a sane range at ${age}ms`);
      }
    },
  },
];
