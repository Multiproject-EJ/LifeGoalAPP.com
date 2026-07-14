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
const appIconDir = path.join(repoRoot, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const splashDir = path.join(repoRoot, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
const temporaryDir = await mkdtemp(path.join(os.tmpdir(), 'habitgame-ios-assets-'));

async function runSips(...args) {
  await execFileAsync('/usr/bin/sips', args);
}

try {
  await access(sourceIcon);
  await mkdir(appIconDir, { recursive: true });
  await mkdir(splashDir, { recursive: true });

  // App Store icons cannot contain an alpha channel. A lossless PNG-to-PNG
  // conversion preserves alpha, so flatten through a maximum-quality JPEG.
  const flattenedJpeg = path.join(temporaryDir, 'HabitGame-AppIcon.jpg');
  const flattenedPng = path.join(temporaryDir, 'HabitGame-AppIcon.png');
  await runSips('-s', 'format', 'jpeg', '-s', 'formatOptions', '100', sourceIcon, '--out', flattenedJpeg);
  await runSips('-s', 'format', 'png', flattenedJpeg, '--out', flattenedPng);
  await copyFile(flattenedPng, path.join(appIconDir, 'AppIcon-512@2x.png'));

  // Capacitor's launch storyboard expects the three files in Splash.imageset.
  // Keep the crest comfortably inside the safe area on a dark brand field.
  const smallIcon = path.join(temporaryDir, 'HabitGame-Splash-Icon.png');
  const paddedSplash = path.join(temporaryDir, 'HabitGame-Splash-Alpha.png');
  const splashJpeg = path.join(temporaryDir, 'HabitGame-Splash.jpg');
  const splashPng = path.join(temporaryDir, 'HabitGame-Splash.png');
  await runSips('-z', '820', '820', sourceIcon, '--out', smallIcon);
  await runSips('-p', '2732', '2732', '--padColor', '020817', smallIcon, '--out', paddedSplash);
  await runSips('-s', 'format', 'jpeg', '-s', 'formatOptions', '100', paddedSplash, '--out', splashJpeg);
  await runSips('-s', 'format', 'png', splashJpeg, '--out', splashPng);

  await Promise.all([
    copyFile(splashPng, path.join(splashDir, 'splash-2732x2732.png')),
    copyFile(splashPng, path.join(splashDir, 'splash-2732x2732-1.png')),
    copyFile(splashPng, path.join(splashDir, 'splash-2732x2732-2.png')),
  ]);

  console.log('[ios-assets] Synced the HabitGame icon and launch screen.');
} finally {
  await rm(temporaryDir, { recursive: true, force: true });
}
