import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.VAULT_ISLAND_LAB_BASE_URL || 'http://127.0.0.1:5182';
const OUT_DIR = process.env.VAULT_ISLAND_QA_OUT_DIR || 'docs/visual-references/island-special-vault-treasure/gauntlet/qa/raw/browser-captures-v001';
const EXTERNAL_CDP_PORT = process.env.VAULT_ISLAND_QA_EXTERNAL_CDP_PORT;
const PORT = Number(EXTERNAL_CDP_PORT || process.env.VAULT_ISLAND_QA_CDP_PORT || 9334);
const USE_EXTERNAL_CDP = Boolean(EXTERNAL_CDP_PORT);
const USER_DATA_DIR = join('/tmp', `vault-island-browser-qa-${process.pid}-${Date.now()}`);
const PHONE = { width: 390, height: 844, deviceScaleFactor: 1, mobile: false };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const logStep = (message) => console.log(`[vault-browser-qa] ${message}`);

async function waitForEndpoint(path, timeoutMs = 12000) {
  const started = Date.now();
  let lastError = null;
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
  throw new Error(`Timed out waiting for Chrome DevTools endpoint ${path}: ${lastError?.message ?? 'unknown error'}`);
}

async function openDebugPage() {
  const tabs = await waitForEndpoint('/json/list');
  const page = tabs.find((tab) => tab.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('Chrome did not expose a debuggable page target.');
  return page.webSocketDebuggerUrl;
}

function createCdpClient(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const eventWaiters = new Map();
  const events = [];

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method) events.push(message);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ''}`));
      else resolve(message.result ?? {});
      return;
    }

    const waiters = eventWaiters.get(message.method);
    if (waiters?.length) {
      const waiter = waiters.shift();
      waiter.resolve(message.params ?? {});
    }
  });

  const opened = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  return {
    async send(method, params = {}) {
      await opened;
      const id = nextId;
      nextId += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
    waitForEvent(method, timeoutMs = 10000) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timed out waiting for CDP event ${method}`));
        }, timeoutMs);
        const waiter = {
          resolve: (params) => {
            clearTimeout(timeout);
            resolve(params);
          },
        };
        const waiters = eventWaiters.get(method) ?? [];
        waiters.push(waiter);
        eventWaiters.set(method, waiters);
      });
    },
    close() {
      socket.close();
    },
    events,
  };
}

async function evaluate(client, expression, timeoutMs = 10000) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: timeoutMs,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Runtime.evaluate failed');
  }
  return result.result?.value;
}

async function navigate(client, path) {
  await client.send('Emulation.setDeviceMetricsOverride', PHONE);
  const loadEvent = client.waitForEvent('Page.loadEventFired', 20000).catch(() => null);
  await client.send('Page.navigate', { url: `${BASE_URL}${path}` });
  await loadEvent;
  await sleep(500);
}

async function waitForExpression(client, expression, timeoutMs = 18000) {
  const started = Date.now();
  let lastValue = null;
  while (Date.now() - started < timeoutMs) {
    lastValue = await evaluate(client, expression);
    if (lastValue) return lastValue;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for expression: ${expression}. Last value: ${JSON.stringify(lastValue)}`);
}

async function screenshot(client, filename) {
  const result = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true,
  });
  const filePath = join(OUT_DIR, filename);
  await writeFile(filePath, Buffer.from(result.data, 'base64'));
  return filePath;
}

async function clickButtonContaining(client, text, selector = 'button') {
  return evaluate(client, `
    (() => {
      const needle = ${JSON.stringify(text)}.toLowerCase();
      const buttons = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const button = buttons.find((candidate) => (candidate.textContent || '').toLowerCase().includes(needle));
      if (!button) return { ok: false, text: ${JSON.stringify(text)}, available: buttons.map((button) => (button.textContent || '').trim()).filter(Boolean) };
      button.click();
      return { ok: true, text: (button.textContent || '').trim() };
    })()
  `);
}

async function clickDiscoveryAt(client, index) {
  return evaluate(client, `
    (() => {
      const buttons = [...document.querySelectorAll('.vault-island-lab__contract button')];
      const button = buttons[${index}];
      if (!button) return { ok: false, index: ${index}, count: buttons.length };
      button.click();
      return { ok: true, index: ${index}, text: (button.textContent || '').trim() };
    })()
  `);
}

async function clickTreasureCanvasAt(client, xRatio, yRatio) {
  return evaluate(client, `
    (() => {
      const canvas = document.querySelector('.vault-treasure-lab canvas');
      if (!canvas) return { ok: false, reason: 'missing-canvas' };
      const rect = canvas.getBoundingClientRect();
      const clientX = rect.left + rect.width * ${xRatio};
      const clientY = rect.top + rect.height * ${yRatio};
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX, clientY, pointerId: 1, pointerType: 'mouse' }));
      return { ok: true, clientX: Math.round(clientX), clientY: Math.round(clientY) };
    })()
  `);
}

async function snapshotVaultQa(client) {
  return evaluate(client, 'window.__vaultIslandLabQa ? JSON.parse(JSON.stringify(window.__vaultIslandLabQa)) : null');
}

async function collectPageDiagnostics(client) {
  return evaluate(client, `({
    href: window.location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: document.body?.innerText?.slice(0, 1000) || '',
    bodyClass: document.body?.className || '',
    rootHtml: document.getElementById('root')?.innerHTML?.slice(0, 1400) || '',
    scripts: [...document.scripts].map((script) => script.src || script.textContent?.slice(0, 80) || '').slice(0, 20),
    hasVaultQa: Boolean(window.__vaultIslandLabQa),
    vaultQa: window.__vaultIslandLabQa ? JSON.parse(JSON.stringify(window.__vaultIslandLabQa)) : null,
    hasTreasureQa: Boolean(window.__vaultTreasureLabQa),
    treasureQa: window.__vaultTreasureLabQa ? JSON.parse(JSON.stringify(window.__vaultTreasureLabQa)) : null,
    canvases: [...document.querySelectorAll('canvas')].map((canvas) => ({ width: canvas.width, height: canvas.height, className: canvas.className || '' })),
    performanceEntries: performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      duration: Math.round(entry.duration),
      transferSize: entry.transferSize
    })).slice(-40),
    viteError: document.querySelector('vite-error-overlay')?.shadowRoot?.textContent?.slice(0, 1500) || ''
  })`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await rm(USER_DATA_DIR, { recursive: true, force: true });

  const chrome = USE_EXTERNAL_CDP
    ? null
    : spawn(CHROME_PATH, [
      '--headless=new',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${USER_DATA_DIR}`,
      `--window-size=${PHONE.width},${PHONE.height}`,
      'about:blank',
    ], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

  const chromeErrors = [];
  chrome?.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.trim()) chromeErrors.push(text.trim());
  });

  const manifest = {
    schemaVersion: 1,
    created: new Date().toISOString(),
    baseUrl: BASE_URL,
    viewport: PHONE,
    captures: [],
    interactions: [],
    qaSnapshots: [],
    notes: [],
    diagnostics: [],
  };

  let client;
  const closeChrome = async () => {
    if (!chrome || chrome.exitCode !== null) return;
    const exited = new Promise((resolve) => {
      chrome.once('exit', resolve);
    });
    chrome.kill();
    await Promise.race([exited, sleep(2500)]);
  };

  try {
    logStep(`waiting for Chrome DevTools page on port ${PORT}`);
    const wsUrl = await openDebugPage();
    client = createCdpClient(wsUrl);
    logStep('enabling CDP domains');
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable').catch(() => null);
    await client.send('Log.enable').catch(() => null);
    logStep(`CDP ready on port ${PORT}`);

    logStep('navigating exterior route');
    await navigate(client, '/dev/vault-island-lab?quality=high&yaw=-0.08');
    logStep('waiting for exterior QA hook');
    const exteriorQa = await waitForExpression(
      client,
      '(() => { const qa = window.__vaultIslandLabQa; return qa && qa.frameCount >= 45 && qa.variedPixelPairs >= 2 && qa.palaceReady === true ? JSON.parse(JSON.stringify(qa)) : null; })()',
      120000,
    );
    manifest.qaSnapshots.push({ label: 'exterior-ready', snapshot: exteriorQa });
    logStep('capturing exterior screenshot');
    manifest.captures.push({ label: 'exterior', path: await screenshot(client, 'exterior-390x844.png') });

    for (const perimeter of [
      { label: 'Garden', id: 'garden', capture: 'exterior-garden-ring' },
      { label: 'Gold', id: 'gold-castle', capture: 'exterior-gold-castle' },
    ]) {
      logStep(`selecting ${perimeter.capture}`);
      const selection = await clickButtonContaining(client, perimeter.label, '.vault-island-lab__perimeter-selector button');
      manifest.interactions.push({ label: `click-${perimeter.capture}`, result: selection });
      const perimeterQa = await waitForExpression(
        client,
        `(() => { const qa = window.__vaultIslandLabQa; return qa && qa.perimeterStyle === ${JSON.stringify(perimeter.id)} ? JSON.parse(JSON.stringify(qa)) : null; })()`,
      );
      manifest.qaSnapshots.push({ label: `${perimeter.capture}-ready`, snapshot: perimeterQa });
      manifest.captures.push({ label: perimeter.capture, path: await screenshot(client, `${perimeter.capture}-390x844.png`) });
    }

    const restoreCharms = await clickButtonContaining(client, 'Charms', '.vault-island-lab__perimeter-selector button');
    manifest.interactions.push({ label: 'click-exterior-charms-restore', result: restoreCharms });
    await waitForExpression(client, '(() => { const qa = window.__vaultIslandLabQa; return qa && qa.perimeterStyle === "charms" ? JSON.parse(JSON.stringify(qa)) : null; })()');

    const exteriorOrbitViews = [
      { label: 'exterior-left-three-quarter', yaw: -0.78, camera: 'phone' },
      { label: 'exterior-right-three-quarter', yaw: 0.72, camera: 'phone' },
      { label: 'exterior-rear', yaw: 3.06, camera: 'phone' },
      { label: 'exterior-top-oblique', yaw: -0.08, camera: 'top' },
    ];
    for (const orbitView of exteriorOrbitViews) {
      logStep(`capturing ${orbitView.label}`);
      await evaluate(
        client,
        `(() => { const controls = window.__vaultIslandLabQaControls; if (!controls) return false; controls.setYaw(${orbitView.yaw}); controls.setCamera(${JSON.stringify(orbitView.camera)}); return true; })()`,
      );
      await sleep(1100);
      const orbitQa = await evaluate(
        client,
        '(() => { const qa = window.__vaultIslandLabQa; return qa ? JSON.parse(JSON.stringify(qa)) : null; })()',
      );
      manifest.qaSnapshots.push({
        label: `${orbitView.label}-ready`,
        requestedYaw: orbitView.yaw,
        requestedCamera: orbitView.camera,
        snapshot: orbitQa,
      });
      manifest.captures.push({ label: orbitView.label, path: await screenshot(client, `${orbitView.label}-390x844.png`) });
    }

    await evaluate(
      client,
      '(() => { const controls = window.__vaultIslandLabQaControls; if (!controls) return false; controls.setYaw(-0.08); controls.setCamera("phone"); return true; })()',
    );
    await sleep(1100);

    logStep('entering palace atrium');
    const enterPalace = await clickButtonContaining(client, 'Enter palace', '.vault-island-lab__hud--bottom button');
    manifest.interactions.push({ label: 'click-enter-palace', result: enterPalace });
    const atriumQa = await waitForExpression(
      client,
      '(() => { const qa = window.__vaultIslandLabQa; return qa && qa.view === "atrium" && qa.frameCount >= 45 && qa.variedPixelPairs >= 2 ? JSON.parse(JSON.stringify(qa)) : null; })()',
      120000,
    );
    manifest.qaSnapshots.push({ label: 'atrium-ready', snapshot: atriumQa });
    logStep('capturing palace atrium screenshot');
    manifest.captures.push({ label: 'atrium', path: await screenshot(client, 'atrium-390x844.png') });

    logStep('descending from atrium to vault');
    const descendToVault = await clickButtonContaining(client, 'Descend to vault', '.vault-island-lab__hud--bottom button');
    manifest.interactions.push({ label: 'click-descend-to-vault', result: descendToVault });
    logStep('waiting for vault QA hook');
    const interiorQa = await waitForExpression(
      client,
      '(() => { const qa = window.__vaultIslandLabQa; return qa && qa.view === "vault" && qa.clickableDisplays >= 8 && qa.variedPixelPairs >= 2 ? JSON.parse(JSON.stringify(qa)) : null; })()',
      120000,
    );
    manifest.qaSnapshots.push({ label: 'vault-ready', snapshot: interiorQa });
    logStep('capturing initial vault screenshot');
    manifest.captures.push({ label: 'vault-initial', path: await screenshot(client, 'vault-initial-390x844.png') });

    logStep('clicking first discovery button');
    const firstDiscovery = await clickDiscoveryAt(client, 1);
    manifest.interactions.push({ label: 'click-discovery-1', result: firstDiscovery });
    await waitForExpression(client, '(() => { const qa = window.__vaultIslandLabQa; return qa && qa.selectedTreasureId !== "crown" && qa.revealRun >= 1 ? JSON.parse(JSON.stringify(qa)) : null; })()');
    manifest.qaSnapshots.push({ label: 'vault-after-discovery-1', snapshot: await snapshotVaultQa(client) });
    logStep('capturing first discovery screenshot');
    manifest.captures.push({ label: 'vault-after-discovery-1', path: await screenshot(client, 'vault-after-discovery-1-390x844.png') });

    logStep('clicking second discovery button');
    const secondDiscovery = await clickDiscoveryAt(client, 2);
    manifest.interactions.push({ label: 'click-discovery-2', result: secondDiscovery });
    await waitForExpression(client, '(() => { const qa = window.__vaultIslandLabQa; return qa && qa.revealRun >= 2 ? JSON.parse(JSON.stringify(qa)) : null; })()');
    manifest.qaSnapshots.push({ label: 'vault-after-discovery-2', snapshot: await snapshotVaultQa(client) });

    logStep('clicking vault reveal button');
    const revealClick = await clickButtonContaining(client, 'Reveal', '.vault-island-lab__treasure-card button');
    manifest.interactions.push({ label: 'click-vault-reveal', result: revealClick });
    await waitForExpression(client, '(() => { const qa = window.__vaultIslandLabQa; return qa && qa.revealRun >= 3 ? JSON.parse(JSON.stringify(qa)) : null; })()');
    manifest.qaSnapshots.push({ label: 'vault-after-reveal', snapshot: await snapshotVaultQa(client) });
    logStep('capturing vault reveal screenshot');
    manifest.captures.push({ label: 'vault-after-reveal', path: await screenshot(client, 'vault-after-reveal-390x844.png') });

    for (const collectionState of [
      { label: 'production-collection-empty', owned: 0 },
      { label: 'production-collection-partial', owned: 3 },
    ]) {
      logStep(`navigating ${collectionState.label}`);
      await navigate(client, `/dev/vault-island-collection-preview?owned=${collectionState.owned}`);
      await waitForExpression(
        client,
        `(() => { const qa = window.__vaultIslandLabQa; return qa && qa.view === "exterior" && qa.frameCount >= 30 && qa.route.includes("owned=${collectionState.owned}") ? JSON.parse(JSON.stringify(qa)) : null; })()`,
        120000,
      );
      const previewEnter = await clickButtonContaining(client, 'Enter palace', '.vault-island-lab__hud--bottom button');
      manifest.interactions.push({ label: `${collectionState.label}-enter-palace`, result: previewEnter });
      await waitForExpression(
        client,
        '(() => { const qa = window.__vaultIslandLabQa; return qa && qa.view === "atrium" && qa.frameCount >= 30 ? JSON.parse(JSON.stringify(qa)) : null; })()',
        120000,
      );
      const previewDescend = await clickButtonContaining(client, 'Descend to vault', '.vault-island-lab__hud--bottom button');
      manifest.interactions.push({ label: `${collectionState.label}-descend-to-vault`, result: previewDescend });
      const collectionQa = await waitForExpression(
        client,
        `(() => { const qa = window.__vaultIslandLabQa; return qa && qa.view === "vault" && qa.clickableDisplays === ${collectionState.owned} && qa.frameCount >= 45 && qa.variedPixelPairs >= 2 ? JSON.parse(JSON.stringify(qa)) : null; })()`,
        120000,
      );
      manifest.qaSnapshots.push({ label: `${collectionState.label}-ready`, snapshot: collectionQa });
      manifest.captures.push({ label: collectionState.label, path: await screenshot(client, `${collectionState.label}-390x844.png`) });
    }

    logStep('navigating production-new-relic-ceremony');
    await navigate(client, '/dev/vault-island-collection-preview?owned=3&featured=1&island=7');
    const featuredRelicQa = await waitForExpression(
      client,
      '(() => { const qa = window.__vaultIslandLabQa; const copy = document.querySelector(".vault-island-lab__treasure-card p")?.textContent || ""; return qa && qa.view === "vault" && qa.clickableDisplays === 3 && qa.selectedTreasureId === "obelisk" && qa.revealRun >= 1 && copy.includes("Island 7") ? { qa: JSON.parse(JSON.stringify(qa)), copy } : null; })()',
      120000,
    );
    manifest.qaSnapshots.push({ label: 'production-new-relic-ceremony-ready', snapshot: featuredRelicQa });
    manifest.captures.push({ label: 'production-new-relic-ceremony', path: await screenshot(client, 'production-new-relic-ceremony-390x844.png') });

    const reserveStates = [
      {
        label: 'production-reserve-empty',
        holdings: 0,
        tier: 'empty',
        ingots: 0,
        coins: 0,
        gems: 0,
      },
      {
        label: 'production-reserve-legendary',
        holdings: 25_000,
        tier: 'legendary',
        ingots: 56,
        coins: 64,
        gems: 26,
      },
    ];
    for (const reserveState of reserveStates) {
      logStep(`navigating ${reserveState.label}`);
      await navigate(
        client,
        `/dev/vault-island-collection-preview?owned=3&featured=1&island=7&holdings=${reserveState.holdings}`,
      );
      const reserveQa = await waitForExpression(
        client,
        `(() => {
          const qa = window.__vaultIslandLabQa;
          const header = document.querySelector('.vault-island-lab__hud--top span')?.textContent || '';
          return qa
            && qa.view === 'vault'
            && qa.frameCount >= 45
            && qa.holdingsValue === ${reserveState.holdings}
            && qa.wealthTier === ${JSON.stringify(reserveState.tier)}
            && qa.wealthIngotCount === ${reserveState.ingots}
            && qa.wealthCoinCount === ${reserveState.coins}
            && qa.wealthGemCount === ${reserveState.gems}
            && header.includes(${JSON.stringify(`${reserveState.holdings.toLocaleString()} reserve`)})
            ? { qa: JSON.parse(JSON.stringify(qa)), header }
            : null;
        })()`,
        120000,
      );
      manifest.qaSnapshots.push({ label: `${reserveState.label}-ready`, snapshot: reserveQa });
      manifest.captures.push({
        label: reserveState.label,
        path: await screenshot(client, `${reserveState.label}-390x844.png`),
      });
    }

    logStep('navigating treasure lab route');
    await navigate(client, '/dev/vault-treasure-lab');
    await waitForExpression(
      client,
      '(() => { const canvas = document.querySelector(".vault-treasure-lab canvas"); const title = document.querySelector(".vault-treasure-lab__card h1")?.textContent || ""; const qa = window.__vaultTreasureLabQa; return canvas && title && qa && qa.frameCount >= 30 && qa.treasureCount === 8 ? { title, canvas: { width: canvas.width, height: canvas.height }, qa: JSON.parse(JSON.stringify(qa)) } : null; })()',
      120000,
    );
    logStep('capturing treasure lab screenshot');
    manifest.captures.push({ label: 'treasure-lab-initial', path: await screenshot(client, 'treasure-lab-initial-390x844.png') });
    logStep('clicking treasure lab compass/reveal');
    const treasureClick = await clickButtonContaining(client, 'Sapphire', '.vault-treasure-lab__dock button');
    manifest.interactions.push({ label: 'click-treasure-lab-sapphire-compass', result: treasureClick });
    const shineClick = await clickButtonContaining(client, 'Reveal shine', '.vault-treasure-lab__reveal');
    manifest.interactions.push({ label: 'click-treasure-lab-reveal', result: shineClick });
    await sleep(700);
    manifest.captures.push({ label: 'treasure-lab-after-reveal', path: await screenshot(client, 'treasure-lab-after-reveal-390x844.png') });
    manifest.qaSnapshots.push({
      label: 'treasure-lab-dom-state',
      snapshot: await evaluate(client, `({
        title: document.querySelector('.vault-treasure-lab__card h1')?.textContent || '',
        activeDock: document.querySelector('.vault-treasure-lab__dock button.is-active')?.textContent || '',
        canvasSize: (() => {
          const canvas = document.querySelector('.vault-treasure-lab canvas');
          return canvas ? { width: canvas.width, height: canvas.height } : null;
        })(),
        qa: window.__vaultTreasureLabQa ? JSON.parse(JSON.stringify(window.__vaultTreasureLabQa)) : null
      })`),
    });

    logStep('opening treasure inspect zoom');
    const inspectClick = await clickButtonContaining(client, 'Inspect', '.vault-treasure-lab__inspect');
    manifest.interactions.push({ label: 'click-treasure-lab-inspect', result: inspectClick });
    const inspectQa = await waitForExpression(
      client,
      '(() => { const qa = window.__vaultTreasureLabQa; return qa && qa.inspectMode === true && qa.selectedTreasureId === "compass" ? JSON.parse(JSON.stringify(qa)) : null; })()',
    );
    manifest.qaSnapshots.push({ label: 'treasure-lab-inspect-ready', snapshot: inspectQa });
    await sleep(650);
    manifest.captures.push({ label: 'treasure-lab-inspect', path: await screenshot(client, 'treasure-lab-inspect-390x844.png') });

    logStep('returning from treasure inspect zoom');
    const galleryClick = await clickButtonContaining(client, 'Gallery', '.vault-treasure-lab__inspect');
    manifest.interactions.push({ label: 'click-treasure-lab-gallery', result: galleryClick });
    await waitForExpression(
      client,
      '(() => { const qa = window.__vaultTreasureLabQa; return qa && qa.inspectMode === false ? JSON.parse(JSON.stringify(qa)) : null; })()',
    );

    logStep('clicking selected treasure directly on the 3D canvas');
    const canvasTreasureClick = await clickTreasureCanvasAt(client, 0.5, 0.52);
    manifest.interactions.push({ label: 'click-treasure-lab-canvas-selected', result: canvasTreasureClick });
    const pointerInspectQa = await waitForExpression(
      client,
      '(() => { const qa = window.__vaultTreasureLabQa; return qa && qa.inspectMode === true && qa.selectedTreasureId === "compass" ? JSON.parse(JSON.stringify(qa)) : null; })()',
    );
    manifest.qaSnapshots.push({ label: 'treasure-lab-pointer-inspect-ready', snapshot: pointerInspectQa });
    await sleep(450);
    manifest.captures.push({ label: 'treasure-lab-pointer-inspect', path: await screenshot(client, 'treasure-lab-pointer-inspect-390x844.png') });
    const pointerGalleryClick = await clickButtonContaining(client, 'Gallery', '.vault-treasure-lab__inspect');
    manifest.interactions.push({ label: 'click-treasure-lab-pointer-gallery', result: pointerGalleryClick });
    await waitForExpression(
      client,
      '(() => { const qa = window.__vaultTreasureLabQa; return qa && qa.inspectMode === false ? JSON.parse(JSON.stringify(qa)) : null; })()',
    );

    logStep('capturing wisdom crystal treasure');
    const obeliskClick = await clickButtonContaining(client, 'Wisdom', '.vault-treasure-lab__dock button');
    manifest.interactions.push({ label: 'click-treasure-lab-obelisk', result: obeliskClick });
    await sleep(850);
    manifest.captures.push({ label: 'treasure-lab-obelisk', path: await screenshot(client, 'treasure-lab-obelisk-390x844.png') });

    logStep('capturing jeweled creature egg treasure');
    const eggClick = await clickButtonContaining(client, 'Jeweled', '.vault-treasure-lab__dock button');
    manifest.interactions.push({ label: 'click-treasure-lab-egg', result: eggClick });
    await sleep(850);
    manifest.captures.push({ label: 'treasure-lab-egg', path: await screenshot(client, 'treasure-lab-egg-390x844.png') });

    logStep('capturing new hourglass treasure');
    const hourglassClick = await clickButtonContaining(client, 'Hourglass', '.vault-treasure-lab__dock button');
    manifest.interactions.push({ label: 'click-treasure-lab-hourglass', result: hourglassClick });
    await sleep(900);
    manifest.captures.push({ label: 'treasure-lab-hourglass', path: await screenshot(client, 'treasure-lab-hourglass-390x844.png') });

    logStep('capturing new celestial key treasure');
    const keyClick = await clickButtonContaining(client, 'Celestial', '.vault-treasure-lab__dock button');
    manifest.interactions.push({ label: 'click-treasure-lab-key', result: keyClick });
    await sleep(850);
    manifest.captures.push({ label: 'treasure-lab-key', path: await screenshot(client, 'treasure-lab-key-390x844.png') });

    logStep('capturing new sun medallion treasure');
    const medallionClick = await clickButtonContaining(client, 'Sun', '.vault-treasure-lab__dock button');
    manifest.interactions.push({ label: 'click-treasure-lab-medallion', result: medallionClick });
    await sleep(850);
    manifest.captures.push({ label: 'treasure-lab-medallion', path: await screenshot(client, 'treasure-lab-medallion-390x844.png') });

    logStep('capturing new prosperity chalice treasure');
    const chaliceClick = await clickButtonContaining(client, 'Prosperity', '.vault-treasure-lab__dock button');
    manifest.interactions.push({ label: 'click-treasure-lab-chalice', result: chaliceClick });
    const chaliceRevealClick = await clickButtonContaining(client, 'Reveal shine', '.vault-treasure-lab__reveal');
    manifest.interactions.push({ label: 'click-treasure-lab-chalice-reveal', result: chaliceRevealClick });
    await sleep(750);
    manifest.captures.push({ label: 'treasure-lab-chalice', path: await screenshot(client, 'treasure-lab-chalice-390x844.png') });

    const failedInteractions = manifest.interactions.filter((interaction) => interaction.result?.ok === false);
    if (failedInteractions.length > 0) {
      throw new Error(`Some browser interactions failed: ${JSON.stringify(failedInteractions)}`);
    }
  } catch (error) {
    if (client) {
      const diagnostics = await collectPageDiagnostics(client).catch((diagnosticError) => ({ diagnosticError: diagnosticError.message }));
      manifest.diagnostics.push({
        label: 'failure-page-state',
        error: error.message,
        diagnostics,
        recentEvents: client.events
          .filter((event) => ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Log.entryAdded', 'Network.loadingFailed', 'Network.responseReceived'].includes(event.method))
          .slice(-20),
      });
      await screenshot(client, 'failure-state-390x844.png').catch(() => null);
      await writeFile(join(OUT_DIR, 'capture-error.v1.json'), `${JSON.stringify(manifest, null, 2)}\n`).catch(() => null);
    } else {
      manifest.diagnostics.push({
        label: 'startup-failure',
        error: error.message,
        chromeExitCode: chrome?.exitCode ?? null,
        chromeStderr: chromeErrors.slice(-20),
      });
      await writeFile(join(OUT_DIR, 'capture-error.v1.json'), `${JSON.stringify(manifest, null, 2)}\n`).catch(() => null);
    }
    throw error;
  } finally {
    if (client) client.close();
    await closeChrome();
    if (!USE_EXTERNAL_CDP) {
      await rm(USER_DATA_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }).catch((error) => {
        manifest.notes.push(`Temporary Chrome profile cleanup was incomplete: ${error.message}`);
      });
    }
  }

  if (chromeErrors.length > 0) {
    manifest.notes.push(`Chrome stderr included ${chromeErrors.length} diagnostic line(s); first line: ${chromeErrors[0].slice(0, 240)}`);
  }

  const manifestPath = join(OUT_DIR, 'capture-manifest.v1.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Vault Island browser QA capture complete: ${manifestPath}`);
  console.log(`Captures: ${manifest.captures.map((capture) => capture.label).join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
