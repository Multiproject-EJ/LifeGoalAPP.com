import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const screen = read('src/features/compass-book/components/CompassBookScreen.tsx');
const shell = read('src/features/compass-book/components/CompassBookThreeShell.tsx');
const model = read('src/features/compass-book/three/CompassBookThreeModel.ts');
const availability = read('src/config/featureAvailability.ts');

const compassEntryStart = availability.indexOf("'app.compass_book':");
const compassEntryEnd = availability.indexOf("'today.visionStar':", compassEntryStart);
if (compassEntryStart < 0 || compassEntryEnd < 0) {
  throw new Error('Could not isolate the Compass Book availability entry.');
}
const compassAvailability = availability.slice(compassEntryStart, compassEntryEnd);

const requireText = (source, needle, message) => {
  if (!source.includes(needle)) throw new Error(message);
};
const rejectText = (source, needle, message) => {
  if (source.includes(needle)) throw new Error(message);
};

requireText(screen, 'createPortal(', 'Compass Book must use a top-level portal.');
requireText(screen, 'document.body', 'Compass Book portal must target document.body.');
requireText(screen, "lockPageScroll(['body', 'documentElement'])", 'Compass Book must lock viewport scrolling.');
requireText(screen, 'lastFocusedRef.current?.focus?.()', 'Compass Book must restore prior focus.');
requireText(screen, '<CompassBookThreeShell', 'Production Compass Book must mount its 3D shell.');
requireText(screen, "import('./CompassBookThreeShell')", 'Production 3D must be lazy-loaded.');
requireText(shell, 'createCompassBookThreeModel(quality)', 'Production shell must build the reusable model.');
requireText(shell, 'model.getPageTarget', 'Production 3D tabs must route canonical navigation intent.');
requireText(shell, "setStatus('fallback')", 'Production shell must retain a WebGL fallback path.');
rejectText(shell, '../dev/', 'Production 3D must not depend on developer-lab modules.');
requireText(model, 'includeLettering ?? false', 'Production 3D lettering must be opt-in and default off.');
requireText(compassAvailability, "status: 'live'", 'Compass Book must not ship behind a stale coming-soon status.');
requireText(compassAvailability, "publicAccess: 'open'", 'Compass Book public access must be open.');
requireText(compassAvailability, "adminAccess: 'open'", 'Compass Book admin access must be open.');

console.log('compass-book-launch-contract: all assertions passed');
