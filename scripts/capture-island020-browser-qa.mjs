import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.ISLAND_020_QA_BASE_URL || 'http://127.0.0.1:5182';
const CAPTURE_VERSION = process.env.ISLAND_020_QA_VERSION || 'v10';
const OUT_DIR = process.env.ISLAND_020_QA_OUT_DIR || `docs/visual-references/island-020-lava-labyrinth/gauntlet/qa/browser-${CAPTURE_VERSION}`;
const PORT = Number(process.env.ISLAND_020_QA_CDP_PORT || 9340);
const USER_DATA_DIR = join('/tmp', `island-020-browser-qa-${process.pid}-${Date.now()}`);
const PHONE = { width: 390, height: 844, deviceScaleFactor: 1, mobile: false };
const ROUTE = `/dev/island-template-kit?island=20&mode=3d&level=3&firebridgeMissionStage=4&firebridgeEscape=1&island3dEvidence=1&island3dQuality=medium&family=${CAPTURE_VERSION}-lava-lookdev`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForEndpoint(path, timeoutMs = 15_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}${path}`);
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }
  throw new Error(`Chrome DevTools endpoint did not start: ${lastError?.message ?? 'unknown error'}`);
}

function createCdpClient(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const opened = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  const events = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method) events.push(message);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result ?? {});
  });
  return {
    events,
    async send(method, params = {}) {
      await opened;
      const id = nextId++;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() { socket.close(); },
  };
}

async function evaluate(client, expression) {
  const response = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: 10_000,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Runtime.evaluate failed');
  return response.result?.value;
}

async function waitForReady(client, timeoutMs = 120_000) {
  const started = Date.now();
  let snapshot = null;
  while (Date.now() - started < timeoutMs) {
    snapshot = await evaluate(client, `(() => {
      const canvas = document.querySelector('canvas');
      const loadingText = document.body?.innerText || '';
      if (
        !canvas
        || canvas.dataset.island20AuthoredCityStatus !== 'loaded'
        || Number(canvas.dataset.island20AuthoredCityParts || 0) < 8
        || Number(canvas.dataset.island20LavaFlowTime || 0) < 4.5
      ) return null;
      return {
        canvas: { width: canvas.width, height: canvas.height, dataset: { ...canvas.dataset } },
        bodyText: loadingText.slice(0, 1600),
        size: [window.innerWidth, window.innerHeight],
        readyState: document.readyState,
        resources: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('lava-labyrinth-v10')).map((entry) => ({
          name: entry.name,
          duration: Math.round(entry.duration),
          transferSize: entry.transferSize,
        })),
      };
    })()`);
    if (snapshot) return snapshot;
    await sleep(300);
  }
  throw new Error(`Island 020 did not become capture-ready. Last snapshot: ${JSON.stringify(snapshot)}`);
}

async function capture(client, filename) {
  const result = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true,
  });
  const path = join(OUT_DIR, filename);
  await writeFile(path, Buffer.from(result.data, 'base64'));
  return path;
}

async function clickButton(client, label) {
  return evaluate(client, `(() => {
    const label = ${JSON.stringify(label)};
    const button = [...document.querySelectorAll('button')].find((candidate) => (candidate.textContent || '').trim() === label);
    if (!button) return false;
    button.click();
    return true;
  })()`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await rm(USER_DATA_DIR, { recursive: true, force: true });
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    `--window-size=${PHONE.width},${PHONE.height}`,
    'about:blank',
  ], { stdio: 'ignore' });
  const chromeErrors = [];
  let client;
  try {
    let tabs;
    try {
      tabs = await waitForEndpoint('/json/list');
    } catch (error) {
      throw new Error(`${error.message}\n${chromeErrors.join('').slice(0, 4000)}`);
    }
    const page = tabs.find((candidate) => candidate.type === 'page');
    if (!page?.webSocketDebuggerUrl) throw new Error('Chrome did not expose a page target.');
    client = createCdpClient(page.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Log.enable');
    await client.send('Emulation.setDeviceMetricsOverride', PHONE);
    await client.send('Page.navigate', { url: `${BASE_URL}${ROUTE}` });
    const runtime = await waitForReady(client);
    await sleep(2400);
    const captures = [{
      label: 'overview',
      path: await capture(client, `island-020-${CAPTURE_VERSION}-runtime-overview-390x844.png`),
    }];
    for (const view of [
      { label: 'high-survey', button: 'High survey' },
      { label: 'left-orbit', button: 'Left orbit' },
      { label: 'right-orbit', button: 'Right orbit' },
    ]) {
      const clicked = await clickButton(client, view.button);
      if (!clicked) throw new Error(`Missing camera preset button: ${view.button}`);
      await sleep(1800);
      captures.push({
        label: view.label,
        path: await capture(client, `island-020-${CAPTURE_VERSION}-runtime-${view.label}-390x844.png`),
      });
    }
    const logs = client.events
      .filter((event) => event.method === 'Log.entryAdded' || event.method === 'Runtime.exceptionThrown' || event.method === 'Network.loadingFailed')
      .map((event) => ({ method: event.method, params: event.params }));
    const manifest = {
      schemaVersion: 1,
      created: new Date().toISOString(),
      url: `${BASE_URL}${ROUTE}`,
      viewport: PHONE,
      runtime,
      captures,
      logs,
      chromeErrors: chromeErrors.filter((line) => /error|fatal|webgl/i.test(line)).slice(0, 20),
    };
    await writeFile(join(OUT_DIR, 'capture-manifest.v1.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify(manifest, null, 2));
  } finally {
    client?.close();
    const exited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill();
    await Promise.race([exited, sleep(2500)]);
    if (chrome.exitCode === null) chrome.kill('SIGKILL');
    await rm(USER_DATA_DIR, { recursive: true, force: true }).catch(() => null);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
