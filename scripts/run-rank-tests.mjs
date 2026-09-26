import { compileWithProjectTsc } from './lib/project-tsc.mjs';
import { createRequire } from 'node:module';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { writeRankProgressionAudit } from './lib/rank-progression-audit.mjs';

const outDir = path.resolve('.tmp-rank-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  compileWithProjectTsc('tsconfig.rank-tests.json');
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllRankTests } = require(
    path.join(outDir, 'features/rank/__tests__/rankModel.test.js'),
  );
  runAllRankTests();
  const { runRankExpansionTests } = require(
    path.join(outDir, 'features/rank/__tests__/rankExpansion.test.js'),
  );
  runRankExpansionTests();
  // Exercise the real component, not just the registry. CSS is presentation-only
  // and is stubbed in this disposable compiler output for server rendering.
  writeFileSync(path.join(outDir, 'features/rank/components/RankBadge.css'), '');
  const previousCssLoader = require.extensions['.css'];
  require.extensions['.css'] = () => {};
  try {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { RankBadge } = require(path.join(outDir, 'features/rank/components/RankBadge.js'));
    const { MIN_RANK } = require(path.join(outDir, 'features/rank/rankModel.js'));
    const { rankBadgeSrc } = require(path.join(outDir, 'features/rank/rankAssets.js'));
    for (const [size, variant, expected] of [[24,'auto','pin'],[48,'auto','pin'],[96,'auto','medal'],[32,'medal','medal']]) {
      const html = renderToStaticMarkup(React.createElement(RankBadge,{rank:MIN_RANK,size,variant}));
      assert(html.includes(rankBadgeSrc(MIN_RANK.id,expected)), `Incorrect ${size}px ${variant} source`);
      assert(html.includes('alt="Rank: Deckhand"'), 'Missing accessible rank text');
      assert(existsSync(path.resolve('public',rankBadgeSrc(MIN_RANK.id,expected).slice(1))), 'Missing actual paired asset');
    }
    console.log('rank-badge: real component compact/large/explicit variants, accessible text and asset existence passed');
  } finally {
    if (previousCssLoader) require.extensions['.css'] = previousCssLoader;
    else delete require.extensions['.css'];
  }
  console.log('rank-tests: all assertions passed');
  if (process.argv.includes('--audit')) writeRankProgressionAudit(outDir);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
