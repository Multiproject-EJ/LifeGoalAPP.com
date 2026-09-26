import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const bundle = await build({
  stdin: { contents: `
    import React, { StrictMode } from 'react';
    import { createRoot } from 'react-dom/client';
    import { useEarnedJourneyXp } from './src/features/gamification/level-worlds/hooks/useEarnedJourneyXp';
    const root = createRoot(document.getElementById('root'));
    function Checkpoint({owner, milestone, persisted}) {
      const xp = useEarnedJourneyXp(owner, milestone, persisted);
      return <output id="xp" data-owner={owner || ''}>{xp}</output>;
    }
    window.renderCheckpoint = (owner, milestone = 0, persisted = 0) => {
      root.render(<StrictMode><Checkpoint owner={owner} milestone={milestone} persisted={persisted}/></StrictMode>);
    };
  `, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, format: 'iife', platform: 'browser', write: false,
});
const server = createServer((_request, response) => {
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html><body><div id="root"></div><script>' + bundle.outputFiles[0].text.replaceAll('</script>', '<\\/script>') + '</script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({headless:true, ...(process.env.JOURNEY_BROWSER_CHANNEL ? {channel:process.env.JOURNEY_BROWSER_CHANNEL} : {})});
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = 'http://127.0.0.1:' + server.address().port;
  const show = async (owner, milestone, persisted, expected) => {
    await page.evaluate(args => window.renderCheckpoint(...args), [owner,milestone,persisted]);
    await page.waitForFunction(value => document.getElementById('xp')?.textContent === String(value),expected);
  };
  await page.goto(url);
  await show('alice',3950,0,3950);
  await show('alice',0,0,3950);
  await show('bob',0,0,0);
  await show('bob',150,0,150);
  await show('alice',0,0,3950);
  await show(null,0,0,0);
  await page.reload();
  await show('alice',0,0,3950);
  await show('alice',0,5000,5000);
  const other = await context.newPage();
  await other.goto(url);
  await other.evaluate(() => window.renderCheckpoint('alice',7000,0));
  await page.waitForFunction(() => document.getElementById('xp')?.textContent === '7000');
  assert.deepEqual(errors,[]);
  console.log('journey-browser: actual React hook + StrictMode passed owner switches, missing milestones, sign-out, reload, profile recovery and cross-tab updates');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
