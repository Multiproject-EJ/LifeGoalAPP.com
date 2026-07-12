import type { Action, ActionCategory } from '../../../../../types/actions';
import {
  buildTower,
  buildTowerAndQueue,
  settleBlocks,
  removeBlock,
  placeQueuedBlock,
  getTowerHeight,
  getComboMultiplier,
  applyComboMultiplier,
  calculateBlockRewards,
  calculateLineClearRewards,
  calculateAllClearRewards,
} from '../taskTowerState';
import { TOWER_GRID, TASK_TOWER_REWARDS, TASK_TOWER_COMBO, type TowerBlock } from '../taskTowerTypes';

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

  // Priority packs bottom-up: nice_to_do forms the base of the tower.
  const niceToDo = blocks.find(b => b.category === 'nice_to_do');
  assert(niceToDo !== undefined && niceToDo.row === 0 && niceToDo.col === 0 && niceToDo.width === 2,
    `nice_to_do should form the base at row 0, col 0 (got row=${niceToDo?.row}, col=${niceToDo?.col})`);

  // The two projects (width 1) fill out the ground storey beside it.
  const projects = blocks.filter(b => b.category === 'project');
  assert(projects.length === 2 && projects.every(b => b.row === 0),
    'projects should fill the remaining ground-storey columns');
  assert(projects.some(b => b.col === 2) && projects.some(b => b.col === 3),
    'projects should sit at cols 2 and 3');

  // must_do stacks on TOP — highest priority sits highest in the tower.
  const mustDo = blocks.find(b => b.category === 'must_do');
  assert(mustDo !== undefined && mustDo.width === 3,
    'must_do should span 3 columns');
  assert(mustDo !== undefined && blocks.every(b => b.id === mustDo.id || mustDo.row > b.row),
    `must_do should sit above every other block (got row=${mustDo?.row})`);

  assertGridInvariants(blocks, 'buildTower packing');
}

function testPriorityBandsStackUpward(): void {
  // 2 nice + 3 projects + 2 must_do: the tower should read bottom-up as
  // nice_to_do base → project middle → must_do top.
  const actions = [
    makeAction('must_do'),
    makeAction('nice_to_do'),
    makeAction('project'),
    makeAction('must_do'),
    makeAction('project'),
    makeAction('nice_to_do'),
    makeAction('project'),
  ];

  const blocks = buildTower(actions);
  assertGridInvariants(blocks, 'priority bands');

  const rowsOf = (category: string) => blocks.filter(b => b.category === category).map(b => b.row);
  const maxNice = Math.max(...rowsOf('nice_to_do'));
  const minProject = Math.min(...rowsOf('project'));
  const minMust = Math.min(...rowsOf('must_do'));
  const maxProject = Math.max(...rowsOf('project'));

  assert(minProject >= maxNice, `projects (${minProject}) should sit at or above the nice_to_do base (${maxNice})`);
  assert(minMust > maxProject, `must_do (${minMust}) should sit above the project band (${maxProject})`);
}

function testProjectSiblingsPackAdjacently(): void {
  // Two actions of the same project separated by an unrelated one should
  // still end up side by side in the tower.
  const first = makeAction('project', { project_id: 'proj-42' });
  const loner = makeAction('project');
  const second = makeAction('project', { project_id: 'proj-42' });

  const blocks = buildTower([first, loner, second]);
  const a = blocks.find(b => b.id === first.id);
  const c = blocks.find(b => b.id === second.id);
  const b = blocks.find(bl => bl.id === loner.id);

  assert(a !== undefined && c !== undefined && b !== undefined, 'all three blocks placed');
  assert(a!.projectId === 'proj-42' && c!.projectId === 'proj-42' && b!.projectId === null,
    'projectId should carry through to the blocks');
  assert(a!.row === 0 && a!.col === 0 && c!.row === 0 && c!.col === 1,
    `project siblings should pack adjacently (got ${a!.col} and ${c!.col})`);
  assert(b!.col === 2, `the unrelated block should pack after the cluster (got col ${b!.col})`);
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
  // Each must_do (width 3) forces its own row, so 70 actions overflow the
  // safety cap by 6.
  const actions = Array.from({ length: TOWER_GRID.MAX_ROWS + 6 }, () => makeAction('must_do'));
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
  // Row 0: nice(0-1), nice(2-3). Row 1: proj(0), proj(1).
  const projectRows = tower.filter(b => b.category === 'project').map(b => b.row);
  assert(projectRows.every(row => row === 1), 'both projects should start on row 1');

  // Remove the ground nice_to_do under the projects → they drop to ground.
  const groundNice = tower.find(b => b.category === 'nice_to_do' && b.col === 0);
  assert(groundNice !== undefined, 'ground nice_to_do exists');

  const settled = removeBlock(tower, groundNice!.id);
  assert(settled.length === tower.length - 1, 'removed block should be gone');

  const settledProjects = settled.filter(b => b.category === 'project');
  assert(settledProjects.every(b => b.row === 0),
    `projects above the removed block should drop to row 0, got [${settledProjects.map(b => b.row).join(', ')}]`);
  assertGridInvariants(settled, 'settle simple drop');
}

function testSettleWideBlockRestsOnPartialSupport(): void {
  // A wide block stays up as long as any block below overlaps it.
  const wide: TowerBlock = {
    id: 'wide', actionId: 'wide', title: 'Wide', category: 'must_do',
    size: 'large', row: 1, col: 0, width: 3, projectId: null, completed: false, animating: false,
  };
  const support: TowerBlock = {
    id: 'support', actionId: 'support', title: 'Support', category: 'project',
    size: 'small', row: 0, col: 2, width: 1, projectId: null, completed: false, animating: false,
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
  // Tower height must also never grow during a demolition.
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
      const heightBefore = getTowerHeight(blocks);
      const victim = blocks[Math.floor(random() * blocks.length)];
      blocks = removeBlock(blocks, victim.id);
      assertGridInvariants(blocks, `run ${run} after removal ${step}`);
      const heightAfter = getTowerHeight(blocks);
      assert(heightAfter <= heightBefore,
        `run ${run} step ${step}: removal must never raise the tower (${heightBefore} -> ${heightAfter})`);
      assert(heightBefore - heightAfter <= 1,
        `run ${run} step ${step}: one removal can shrink the tower by at most one storey (${heightBefore} -> ${heightAfter})`);
      step += 1;
    }
  }
}

function testGetTowerHeight(): void {
  assert(getTowerHeight([]) === 0, 'empty tower should have height 0');

  const tower = buildTower([
    makeAction('must_do'),
    makeAction('nice_to_do'),
    makeAction('project'),
  ]);
  // nice_to_do (width 2) + project (width 1) share the ground storey; the
  // must_do (width 3) stacks on top → 2 storeys.
  assert(getTowerHeight(tower) === 2, `expected height 2, got ${getTowerHeight(tower)}`);
}

function testBuildTowerAndQueue(): void {
  // Each must_do (width 3) forces its own row → cap + 2 overflows by 2.
  const actions = Array.from({ length: TOWER_GRID.MAX_ROWS + 2 }, () => makeAction('must_do'));
  const { blocks, queued } = buildTowerAndQueue(actions);

  assert(blocks.length === TOWER_GRID.MAX_ROWS, `expected ${TOWER_GRID.MAX_ROWS} placed, got ${blocks.length}`);
  assert(queued.length === 2, `expected 2 queued, got ${queued.length}`);

  const placedIds = new Set(blocks.map(b => b.id));
  assert(queued.every(action => !placedIds.has(action.id)),
    'queued actions must not also be placed in the tower');

  // Everything fits → nothing queued.
  const small = buildTowerAndQueue([makeAction('project'), makeAction('nice_to_do')]);
  assert(small.queued.length === 0, 'no overflow should mean an empty queue');
}

function testPlaceQueuedBlock(): void {
  const makeBlock = (id: string, row: number, col: number, width: number): TowerBlock => ({
    id, actionId: id, title: id, category: width === 3 ? 'must_do' : width === 2 ? 'nice_to_do' : 'project',
    size: width === 3 ? 'large' : width === 2 ? 'medium' : 'small',
    row, col, width, projectId: null, completed: false, animating: false,
  });

  // Ground row has a free single column at col 3 → a project lands there.
  const tower = [makeBlock('base', 0, 0, 3)];
  const placedProject = placeQueuedBlock(tower, makeAction('project'));
  assert(placedProject !== null && placedProject.row === 0 && placedProject.col === 3,
    `project should fill the ground gap at col 3, got ${placedProject?.row},${placedProject?.col}`);

  // A must_do (width 3) can't fit beside it, so it stacks on top with support.
  const placedMustDo = placeQueuedBlock(tower, makeAction('must_do'));
  assert(placedMustDo !== null && placedMustDo.row === 1 && placedMustDo.col === 0,
    `must_do should stack supported on row 1, got ${placedMustDo?.row},${placedMustDo?.col}`);

  // Placement never creates a floating block: an empty tower places at ground.
  const groundPlace = placeQueuedBlock([], makeAction('nice_to_do'));
  assert(groundPlace !== null && groundPlace.row === 0, 'empty tower placement should be at ground level');

  // A completely full grid rejects the placement.
  const fullGrid: TowerBlock[] = [];
  for (let row = 0; row < TOWER_GRID.MAX_ROWS; row++) {
    for (let col = 0; col < TOWER_GRID.COLS; col++) {
      fullGrid.push(makeBlock(`full-${row}-${col}`, row, col, 1));
    }
  }
  assert(placeQueuedBlock(fullGrid, makeAction('project')) === null,
    'a full grid should refuse new placements');

  // Placed blocks satisfy the shared grid invariants alongside the tower.
  const combined = [...tower, placedProject as TowerBlock];
  assertGridInvariants(combined, 'placeQueuedBlock result');
}

function testComboMultipliers(): void {
  const tiers = TASK_TOWER_COMBO.MULTIPLIERS;
  assert(getComboMultiplier(1) === tiers[0], 'first clear should be ×1');
  assert(getComboMultiplier(2) === tiers[1], 'second clear in the window should be tier 2');
  assert(getComboMultiplier(3) === tiers[2], 'third clear should be tier 3');
  assert(getComboMultiplier(4) === tiers[3], 'fourth clear should be the cap tier');
  assert(getComboMultiplier(9) === tiers[tiers.length - 1], 'streaks past the last tier stay capped');
  assert(getComboMultiplier(0) === tiers[0], 'counts below 1 clamp to the first tier');

  assert(applyComboMultiplier(30, 1) === 30, '×1 leaves coins unchanged');
  assert(applyComboMultiplier(15, 2) === 18, '15 coins ×1.2 should round to 18');
  assert(applyComboMultiplier(15, 3) === 23, '15 coins ×1.5 should round to 23');
  assert(applyComboMultiplier(30, 4) === 60, '30 coins ×2 should be 60');
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
  testPriorityBandsStackUpward();
  testProjectSiblingsPackAdjacently();
  testBuildTowerTitleTruncation();
  testBuildTowerRowCap();
  testSettleSimpleDrop();
  testSettleWideBlockRestsOnPartialSupport();
  testSettleDoesNotMutateInput();
  testRandomRemovalSequencesKeepGridValid();
  testGetTowerHeight();
  testBuildTowerAndQueue();
  testPlaceQueuedBlock();
  testComboMultipliers();
  testRewardCalculations();
}
