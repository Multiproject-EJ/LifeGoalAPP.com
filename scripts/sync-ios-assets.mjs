import { access, copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceIcon = path.join(repoRoot, 'public', 'icons', 'app-icon-1024.png');
const sourceSplash = path.join(repoRoot, 'public', 'assets', 'loading', 'island-run-voyage-loading-v1.webp');
const appIconDir = path.join(repoRoot, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const splashDir = path.join(repoRoot, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
const temporaryDir = await mkdtemp(path.join(os.tmpdir(), 'habitgame-ios-assets-'));

async function runSips(...args) {
  await execFileAsync('/usr/bin/sips', args);
}

try {
  await access(sourceIcon);
  await access(sourceSplash);
  await mkdir(appIconDir, { recursive: true });
  await mkdir(splashDir, { recursive: true });

  // App Store icons cannot contain an alpha channel. A lossless PNG-to-PNG
  // conversion preserves alpha, so flatten through a maximum-quality JPEG.
  const flattenedJpeg = path.join(temporaryDir, 'HabitGame-AppIcon.jpg');
  const flattenedPng = path.join(temporaryDir, 'HabitGame-AppIcon.png');
  await runSips('-s', 'format', 'jpeg', '-s', 'formatOptions', '100', sourceIcon, '--out', flattenedJpeg);
  await runSips('-s', 'format', 'png', flattenedJpeg, '--out', flattenedPng);
  await copyFile(flattenedPng, path.join(appIconDir, 'AppIcon-512@2x.png'));

  // Keep the native launch frame visually continuous with the React loading
  // screen. Crop to the 390:844 phone ratio, then provide honest 1x/2x/3x
  // variants so UIKit never has to scale a lower-density slot up.
  const croppedSplash = path.join(temporaryDir, 'HabitGame-Splash-Cropped.png');
  const splash1x = path.join(temporaryDir, 'HabitGame-Splash-1x.png');
  const splash2x = path.join(temporaryDir, 'HabitGame-Splash-2x.png');
  const splash3x = path.join(temporaryDir, 'HabitGame-Splash-3x.png');
  await runSips('-c', '1844', '852', '-s', 'format', 'png', sourceSplash, '--out', croppedSplash);
  await Promise.all([
    runSips('-z', '844', '390', '-s', 'format', 'png', croppedSplash, '--out', splash1x),
    runSips('-z', '1688', '780', '-s', 'format', 'png', croppedSplash, '--out', splash2x),
    runSips('-z', '2532', '1170', '-s', 'format', 'png', croppedSplash, '--out', splash3x),
  ]);

  await Promise.all([
    copyFile(splash3x, path.join(splashDir, 'splash-2732x2732.png')),
    copyFile(splash2x, path.join(splashDir, 'splash-2732x2732-1.png')),
    copyFile(splash1x, path.join(splashDir, 'splash-2732x2732-2.png')),
  ]);

  console.log('[ios-assets] Synced the HabitGame icon and launch screen.');
} finally {
  await rm(temporaryDir, { recursive: true, force: true });
}
