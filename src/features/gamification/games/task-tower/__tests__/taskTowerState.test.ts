import type { Action, ActionCategory } from '../../../../../types/actions';
import {
  buildTower,
  settleBlocks,
  removeBlock,
  checkLineClears,
  calculateBlockRewards,
  calculateLineClearRewards,
  calculateAllClearRewards,
} from '../taskTowerState';
import { TOWER_GRID, TASK_TOWER_REWARDS, type TowerBlock } from '../taskTowerTypes';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

let actionCounter = 0;

function makeAction(category: ActionCategory, overrides: Partial<Action> = {}): Action {
  actionCounter += 1;
  return {
    id: `action-${actionCounter}`,
    user_id: 'user-1',
    title: `Test action ${actionCounter}`,
    category,
    completed: false,
    completed_at: null,
    created_at: '2026-07-11T08:00:00Z',
    expires_at: '2026-07-14T08:00:00Z',
    migrated_to_project_id: null,
    project_id: null,
    order_index: actionCounter,
    notes: null,
    xp_awarded: 0,
    ...overrides,
  };
}

function overlapsHorizontally(a: TowerBlock, b: TowerBlock): boolean {
  return !(a.col >= b.col + b.width || b.col >= a.col + a.width);
}

/**
 * Grid invariants that must hold after any build or settle:
 * no two blocks share a cell, every block fits the grid, and every block
 * above row 0 rests on at least one horizontally-overlapping block below it.
 */
function assertGridInvariants(blocks: TowerBlock[], context: string): void {
  for (const block of blocks) {
    assert(block.col >= 0 && block.col + block.width <= TOWER_GRID.COLS,
      `${context}: block ${block.id} exceeds grid width (col=${block.col}, width=${block.width})`);
    assert(block.row >= 0, `${context}: block ${block.id} has negative row`);
  }

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      assert(!(a.row === b.row && overlapsHorizontally(a, b)),
        `${context}: blocks ${a.id} and ${b.id} overlap at row ${a.row}`);
    }
  }

  for (const block of blocks) {
    if (block.row === 0) continue;
    const supported = blocks.some(
      other => other.row === block.row - 1 && overlapsHorizontally(block, other),
    );
    assert(supported, `${context}: block ${block.id} floats at row ${block.row} with no support`);
  }
}

/** Deterministic pseudo-random generator so failures are reproducible. */
function makeLcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function testBuildTowerPacking(): void {
  const actions = [
    makeAction('project', { title: 'Project A' }),
    makeAction('must_do', { title: 'Urgent thing' }),
    makeAction('nice_to_do', { title: 'Nice thing' }),
    makeAction('project', { title: 'Project B' }),
  ];

  const blocks = buildTower(actions);
  assert(blocks.length === 4, `expected 4 blocks, got ${blocks.length}`);

  // must_do sorts first and spans 3 of 4 columns on the bottom row.
  const mustDo = blocks[0];
  assert(mustDo.category === 'must_do', 'must_do should be packed first');
  assert(mustDo.row === 0 && mustDo.col === 0 && mustDo.width === 3,
    `must_do should sit at row 0, col 0, width 3 (got row=${mustDo.row}, col=${mustDo.col}, width=${mustDo.width})`);

  // nice_to_do (width 2) does not fit next to the must_do (3+2 > 4) → next row.
  const niceToDo = blocks[1];
  assert(niceToDo.category === 'nice_to_do', 'nice_to_do should be packed second');
  assert(niceToDo.row === 1 && niceToDo.col === 0 && niceToDo.width === 2,
    `nice_to_do should wrap to row 1, col 0 (got row=${niceToDo.row}, col=${niceToDo.col})`);

  // First project (width 1) rests on the must_do block at row 1, col 2.
  assert(blocks[2].row === 1 && blocks[2].col === 2, 'first project should fill row 1, col 2');

  // Second project lands in column 3 where nothing sits below it, so the
  // post-pack settle drops it to the ground instead of leaving it floating.
  assert(blocks[3].row === 0 && blocks[3].col === 3,
    `second project should settle to row 0, col 3 (got row=${blocks[3].row}, col=${blocks[3].col})`);

  assertGridInvariants(blocks, 'buildTower packing');
}

function testBuildTowerTitleTruncation(): void {
  const longTitle = 'A'.repeat(55);
  const blocks = buildTower([makeAction('must_do', { title: longTitle })]);
  assert(blocks[0].title === `${'A'.repeat(40)}...`,
    `long titles should truncate to 40 chars + ellipsis, got "${blocks[0].title}"`);

  const shortTitle = 'Short title';
  const shortBlocks = buildTower([makeAction('must_do', { title: shortTitle })]);
  assert(shortBlocks[0].title === shortTitle, 'short titles should be untouched');
}

function testBuildTowerRowCap(): void {
  // Each must_do (width 3) forces its own row, so 10 actions overflow the cap.
  const actions = Array.from({ length: 10 }, () => makeAction('must_do'));
  const blocks = buildTower(actions);

  assert(blocks.length === TOWER_GRID.MAX_ROWS,
    `tower should cap at ${TOWER_GRID.MAX_ROWS} rows of must_do blocks, got ${blocks.length}`);
  const maxRow = Math.max(...blocks.map(b => b.row));
  assert(maxRow === TOWER_GRID.MAX_ROWS - 1,
    `highest row should be ${TOWER_GRID.MAX_ROWS - 1}, got ${maxRow}`);
}

function testSettleSimpleDrop(): void {
  const tower = buildTower([
    makeAction('nice_to_do'),
    makeAction('project'),
    makeAction('project'),
    makeAction('nice_to_do'),
  ]);
  // Row 0: nice(0-1), proj(2), proj(3). Row 1: nice(0-1).
  const bottomNice = tower[0];

  const settled = removeBlock(tower, bottomNice.id);
  assert(settled.length === tower.length - 1, 'removed block should be gone');

  const upperNice = settled.find(b => b.category === 'nice_to_do');
  assert(upperNice !== undefined && upperNice.row === 0,
    `block above the removed one should drop to row 0, got row ${upperNice?.row}`);
  assertGridInvariants(settled, 'settle simple drop');
}

function testSettleWideBlockRestsOnPartialSupport(): void {
  // A wide block stays up as long as any block below overlaps it.
  const wide: TowerBlock = {
    id: 'wide', actionId: 'wide', title: 'Wide', category: 'must_do',
    size: 'large', row: 1, col: 0, width: 3, completed: false, animating: false,
  };
  const support: TowerBlock = {
    id: 'support', actionId: 'support', title: 'Support', category: 'project',
    size: 'small', row: 0, col: 2, width: 1, completed: false, animating: false,
  };

  const settled = settleBlocks([wide, support]);
  const settledWide = settled.find(b => b.id === 'wide');
  assert(settledWide !== undefined && settledWide.row === 1,
    `wide block should rest on the single overlapping support, got row ${settledWide?.row}`);
  assertGridInvariants(settled, 'wide block partial support');
}

function testSettleDoesNotMutateInput(): void {
  const tower = buildTower([
    makeAction('must_do'),
    makeAction('nice_to_do'),
    makeAction('project'),
  ]);
  const rowsBefore = tower.map(b => b.row);

  removeBlock(tower, tower[0].id);

  const rowsAfter = tower.map(b => b.row);
  assert(rowsBefore.every((row, i) => row === rowsAfter[i]),
    'removeBlock must not mutate the input blocks');
}

function testRandomRemovalSequencesKeepGridValid(): void {
  // Regression for the v1 per-column gravity that mutated shared block
  // references and could overlap wide blocks: demolish full towers in many
  // deterministic-random orders and assert grid invariants after every step.
  const random = makeLcg(20260711);

  for (let run = 0; run < 50; run++) {
    const actions: Action[] = Array.from({ length: 12 }, () => {
      const roll = random();
      const category: ActionCategory = roll < 0.34 ? 'must_do' : roll < 0.67 ? 'nice_to_do' : 'project';
      return makeAction(category);
    });

    let blocks = buildTower(actions);
    assertGridInvariants(blocks, `run ${run} initial build`);

    let step = 0;
    while (blocks.length > 0) {
      const victim = blocks[Math.floor(random() * blocks.length)];
      blocks = removeBlock(blocks, victim.id);
      assertGridInvariants(blocks, `run ${run} after removal ${step}`);
      const { blocks: compacted } = checkLineClears(blocks);
      blocks = compacted;
      assertGridInvariants(blocks, `run ${run} after line clear ${step}`);
      step += 1;
    }
  }
}

function testCheckLineClears(): void {
  const empty = checkLineClears([]);
  assert(empty.clearedRows.length === 0 && empty.blocks.length === 0,
    'empty tower should produce no cleared rows');

  const makeBlock = (id: string, row: number): TowerBlock => ({
    id, actionId: id, title: id, category: 'project',
    size: 'small', row, col: 0, width: 1, completed: false, animating: false,
  });

  // Gap at row 1: block above should compact down, row 1 counts as cleared.
  const withGap = checkLineClears([makeBlock('a', 0), makeBlock('b', 2)]);
  assert(withGap.clearedRows.length === 1 && withGap.clearedRows[0] === 1,
    `expected row 1 cleared, got [${withGap.clearedRows.join(', ')}]`);
  const compactedB = withGap.blocks.find(b => b.id === 'b');
  assert(compactedB !== undefined && compactedB.row === 1,
    `block above the gap should compact to row 1, got ${compactedB?.row}`);

  // No gaps → nothing cleared, rows untouched.
  const solid = checkLineClears([makeBlock('a', 0), makeBlock('b', 1)]);
  assert(solid.clearedRows.length === 0, 'solid tower should clear no rows');
  assert(solid.blocks.every(b => (b.id === 'a' ? b.row === 0 : b.row === 1)),
    'solid tower rows should be unchanged');
}

function testRewardCalculations(): void {
  const categories: ActionCategory[] = ['must_do', 'nice_to_do', 'project'];
  for (const category of categories) {
    const rewards = calculateBlockRewards(category);
    assert(rewards.coins === TASK_TOWER_REWARDS.CLEAR_BLOCK_COINS[category],
      `${category} block coins should match TASK_TOWER_REWARDS`);
    assert(rewards.dice === TASK_TOWER_REWARDS.CLEAR_BLOCK_DICE[category],
      `${category} block dice should match TASK_TOWER_REWARDS`);
  }

  const twoLines = calculateLineClearRewards(2);
  assert(twoLines.coins === TASK_TOWER_REWARDS.LINE_CLEAR_BONUS_COINS * 2,
    'line clear coins should scale with line count');
  assert(twoLines.dice === TASK_TOWER_REWARDS.LINE_CLEAR_BONUS_DICE * 2,
    'line clear dice should scale with line count');

  const allClear = calculateAllClearRewards();
  assert(allClear.coins === TASK_TOWER_REWARDS.ALL_CLEAR_BONUS_COINS, 'all clear coins mismatch');
  assert(allClear.dice === TASK_TOWER_REWARDS.ALL_CLEAR_BONUS_DICE, 'all clear dice mismatch');
  assert(allClear.tokens === TASK_TOWER_REWARDS.ALL_CLEAR_BONUS_TOKENS, 'all clear tokens mismatch');
}

export function runAllTaskTowerStateTests(): void {
  testBuildTowerPacking();
  testBuildTowerTitleTruncation();
  testBuildTowerRowCap();
  testSettleSimpleDrop();
  testSettleWideBlockRestsOnPartialSupport();
  testSettleDoesNotMutateInput();
  testRandomRemovalSequencesKeepGridValid();
  testCheckLineClears();
  testRewardCalculations();
}
