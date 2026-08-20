import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const screen = read('src/features/compass-book/components/CompassBookScreen.tsx');
const shell = read('src/features/compass-book/components/CompassBookThreeShell.tsx');
const model = read('src/features/compass-book/three/CompassBookThreeModel.ts');
const styles = read('src/features/compass-book/components/compassBook.css');
const availability = read('src/config/featureAvailability.ts');
const preview = read('compass-preview.html');

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
requireText(model, 'createLivingWheelRelief(', 'Chapter I must retain its production Living Wheel relief.');
requireText(model, "root.userData.compassPageId = 'living_wheel'", 'The Living Wheel relief must map to the canonical Chapter I page ID.');
requireText(model, "'living-wheel-relief': livingWheel.root", 'The Living Wheel must remain a named runtime part.');
requireText(model, "selectedPageId === 'living_wheel'", 'The Living Wheel must be visibility-gated by canonical active page.');
requireText(model, 'createInnerCompassRelief(', 'Chapter II must retain its production Inner Compass relief.');
requireText(model, "root.userData.compassPageId = 'inner_compass'", 'The Inner Compass relief must map to the canonical Chapter II page ID.');
requireText(model, "'inner-compass-relief': innerCompass.root", 'The Inner Compass must remain a named runtime part.');
requireText(model, "selectedPageId === 'inner_compass'", 'The Inner Compass must be visibility-gated by canonical active page.');
requireText(model, 'tabs.visible = eased < 0.72', 'Open spreads must hand tab navigation from the physical rail to the accessible DOM rail.');
requireText(styles, ":not([data-page-id='living_wheel'])", 'Chapter I must retain the approved wide hybrid spread.');
requireText(styles, ":not([data-page-id='inner_compass'])", 'Chapter II must retain the approved wide hybrid spread.');
requireText(preview, "window.location.protocol !== 'file:'", 'The preview must distinguish direct file launches from Vite-served launches.');
requireText(preview, 'http://127.0.0.1:5174/compass-preview.html', 'The direct-file launcher must route to the local preview server.');
requireText(preview, "entry.src = '/src/scripts/compassPreviewHarness.tsx'", 'The Vite-served preview must retain its React entry module.');
requireText(compassAvailability, "status: 'live'", 'Compass Book must not ship behind a stale coming-soon status.');
requireText(compassAvailability, "publicAccess: 'open'", 'Compass Book public access must be open.');
requireText(compassAvailability, "adminAccess: 'open'", 'Compass Book admin access must be open.');

console.log('compass-book-launch-contract: all assertions passed');
