import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [outputArgument, ...flags] = process.argv.slice(2);
if (!outputArgument || flags.some((flag) => !['--reduced-motion', '--mission', '--validation', '--angles'].includes(flag))) {
  throw Error('Usage: node scripts/capture-island004-v2-local.mjs NEW_OUTPUT_DIR [--reduced-motion] [--mission] [--validation] [--angles]');
}
const outputDirectory = path.resolve(outputArgument);
if (existsSync(outputDirectory)) throw Error(`Evidence directory already exists: ${outputDirectory}`);
const reducedMotion = flags.includes('--reduced-motion');
const mission = flags.includes('--mission');
const validation = flags.includes('--validation');
const angles = flags.includes('--angles');
const origin = new URL(process.env.ISLAND004_CAPTURE_ORIGIN || 'http://127.0.0.1:5176');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)) throw Error('Capture origin must be loopback');

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
function sourceSnapshot() {
  const files = git(['ls-files', '--cached', '--others', '--exclude-standard', '--',
    'src/features/gamification/level-worlds/dev/CrownCitadelThreeModel.ts',
    'src/features/gamification/level-worlds/dev/Island4*',
    'src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx',
    'src/features/gamification/level-worlds/dev/IslandTemplateKitPage.tsx',
    'src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts',
    'src/features/gamification/level-worlds/dev/IslandStagedRestorationThreePresentation.ts',
    'src/features/gamification/level-worlds/components/IslandRunMissionPhone.tsx',
    'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx',
    'src/features/gamification/level-worlds/services/islandRunSignatureMission*',
    'src/features/gamification/level-worlds/services/islandRunMissionBriefing.ts',
    'scripts/capture-island004-v2-local.mjs',
  ]).split('\n').filter(Boolean).sort();
  const sources = Object.fromEntries(files.map((file) => [file, hash(readFileSync(path.join(repository, file)))]));
  return {
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    head: git(['rev-parse', 'HEAD']),
    sources,
    sourceSetSha256: hash(JSON.stringify(sources)),
  };
}

const sourceStart = sourceSnapshot();
mkdirSync(path.dirname(outputDirectory), { recursive: true });
mkdirSync(outputDirectory);
const result = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  status: 'pending',
  scope: 'Actual Island 004 browser runtime at desktop-hosted phone viewport; not physical-device evidence.',
  finalVisualAcceptance: false,
  physicalDeviceAcceptance: false,
  browserViewport: { width: 1440, height: 1080 },
  dpr: 2,
  quality: 'high',
  reducedMotion,
  mission,
  sourceStart,
  captures: [],
  console: [],
  errors: [],
};

const views = angles ? Array.from({length:8},(_,i)=>[`angle-${i*45}`,String(i*45)]) : [
  ['overview', 'Overview'],
  ['survey', 'High survey'],
  ['left', 'Left orbit'],
  ['right', 'Right orbit'],
  ['boss', 'boss'],
  ['hatchery', 'hatchery'],
  ['habit', 'habit'],
  ['wisdom', 'wisdom'],
  ['event', 'event'],
];

let browser;
try {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.ISLAND_PLAYWRIGHT || '/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.ISLAND_CHROME || '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  });
  result.browser = { engine: 'Chromium', version: browser.version(), headless: true };
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: result.dpr, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  page.on('pageerror', (error) => result.errors.push(error.stack || String(error)));
  page.on('console', (message) => {
    if (!['warning', 'error'].includes(message.type())) return;
    result.console.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  const url = new URL('/dev/island-template-kit', origin);
  url.search = new URLSearchParams({
    island: '4', mode: '3d', level: '3', island3dQuality: 'high',
    ...(mission ? { causewayMissionStage: '3' } : {}),
  }).toString();
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const canvas = page.locator('canvas[aria-label^="Interactive 3D"]').first();
  await canvas.waitFor({ state: 'visible', timeout: 60_000 });
  await page.waitForTimeout(3_000);
  await page.getByRole('button', { name: 'Hide overlays for evidence', exact: true }).click({ force: true });
  result.canvasViewport=await canvas.evaluate(el=>({width:el.clientWidth,height:el.clientHeight,pixelWidth:el.width,pixelHeight:el.height}));
  for (const [name, control] of views) {
    if(angles) {
      url.searchParams.set('island3dEvidence','1');
      url.searchParams.set('island3dEvidencePreset','overview');
      url.searchParams.set('island3dEvidenceAzimuth',control);
      url.searchParams.set('island3dEvidenceDistanceScale','1');
      await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:90000});
      await canvas.waitFor({state:'visible',timeout:90000});
      await page.waitForTimeout(1200);
      await page.getByRole('button',{name:'Hide overlays for evidence',exact:true}).click({force:true});
    } else if (['Overview', 'High survey', 'Left orbit', 'Right orbit'].includes(control)) {
      await page.getByRole('button', { name: control, exact: true }).click({ force: true });
    } else {
      await page.getByLabel('Focus a landmark', { exact: true }).selectOption(control, { force: true });
    }
    await page.waitForTimeout(name === 'overview' ? 1_900 : 1_450);
    const metrics = await page.getByLabel('3D renderer performance', { exact: true }).innerText();
    const dataset = await canvas.evaluate((element) => ({ ...element.dataset }));
    const outputPath = path.join(outputDirectory, `${name}.png`);
    await canvas.screenshot({ path: outputPath });
    result.captures.push({ name, control, url: url.href, file: `${name}.png`, sha256: hash(readFileSync(outputPath)), metrics, dataset });
  }
  if(validation) {
    const scenarios=[
      ...[0,1,2,3].map(stage=>[`mission-${stage}`,{causewayMissionStage:String(stage)}]),
      ['archive-interior',{focus:'wisdom',archiveInterior:'1'}],
      ...[1,2].map(level=>[`level-${level}`,{level:String(level)}]),
      ...['boss','hatchery','habit','wisdom','mystery'].map(landmark=>[`construction-${landmark}`,{level:'2',landmark,construction:'1',constructionProgress:'.68',reduced:'1'}]),
      ['construction-roof',{level:'2',landmark:'wisdom',construction:'1',constructionProgress:'.98',reduced:'1'}],
      ['clay',{island3dMapStripped:'1'}],
    ];
    for(const [name,params]of scenarios) {
      const sceneUrl=new URL(url);sceneUrl.search=new URLSearchParams({island:'4',mode:'3d',level:'3',island3dQuality:'high',...params}).toString();
      await page.goto(sceneUrl.href,{waitUntil:'domcontentloaded',timeout:90_000});await canvas.waitFor({state:'visible',timeout:90_000});
      await page.waitForTimeout(2200);
      await page.getByRole('button',{name:'Hide overlays for evidence',exact:true}).click({force:true});
      await page.waitForTimeout(700);
      const outputPath=path.join(outputDirectory,`${name}.png`);await canvas.screenshot({path:outputPath});
      result.captures.push({name,url:sceneUrl.href,file:`${name}.png`,sha256:hash(readFileSync(outputPath)),metrics:await page.getByLabel('3D renderer performance',{exact:true}).innerText(),dataset:await canvas.evaluate(el=>({...el.dataset}))});
    }
    // Use the actual profile controls. These are desktop-hosted timing results,
    // never substituted for a physical-phone acceptance gate.
    await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:90_000});await canvas.waitFor({state:'visible',timeout:90_000});await page.waitForTimeout(3000);
    await page.getByRole('button',{name:'Run 30s profile',exact:true}).click({force:true});
    await page.getByRole('button',{name:'Run again',exact:true}).waitFor({state:'visible',timeout:55_000});
    result.profile=await page.locator('.island-5-three-pilot__profiler').innerText();
    await canvas.screenshot({path:path.join(outputDirectory,'profile.png')});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:90_000});await canvas.waitFor({state:'visible',timeout:90_000});await page.waitForTimeout(2200);
    await page.getByRole('button',{name:'Hide overlays for evidence',exact:true}).click({force:true});
    await canvas.screenshot({path:path.join(outputDirectory,'reduced-motion.png')});
    result.reducedMotionDataset=await canvas.evaluate(el=>({...el.dataset}));
  }
  await page.close();
} catch (error) {
  result.errors.push(error.stack || String(error));
} finally {
  if (browser) await browser.close();
  result.sourceEnd = sourceSnapshot();
  result.changedDuringCapture = sourceStart.sourceSetSha256 !== result.sourceEnd.sourceSetSha256;
  if (result.changedDuringCapture) result.errors.push('Source changed during capture');
  const webglDiagnostics = result.console.filter((entry) => /webgl|context.?lost|gl_invalid|shader.*error/i.test(entry.text));
  if (webglDiagnostics.length) result.errors.push(`WebGL diagnostics present: ${webglDiagnostics.length}`);
  result.status = result.errors.length ? 'failed' : 'captured-unreviewed';
  result.finishedAt = new Date().toISOString();
  writeFileSync(path.join(outputDirectory, 'capture.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ status: result.status, outputDirectory, captures: result.captures.length, errors: result.errors }));
  if (result.errors.length) process.exitCode = 1;
}
