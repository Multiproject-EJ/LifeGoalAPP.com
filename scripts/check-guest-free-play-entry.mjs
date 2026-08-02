import { readFileSync } from 'node:fs';

const checks = [];
const authShell = readFileSync('src/components/HabitGameLandingShell.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const authProvider = readFileSync('src/features/auth/SupabaseAuthProvider.tsx', 'utf8');
const guestClaimService = readFileSync('src/features/gamification/level-worlds/services/islandRunGuestClaimService.ts', 'utf8');
const levelWorldsCss = readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');
const appCss = readFileSync('src/index.css', 'utf8');

function check(name, condition) {
  checks.push({ name, condition });
}

check('Play CTA opens the local guest setup', authShell.includes('Play as guest') && authShell.includes("setGuestStep('audio')"));
check('Timeline completion stores hasSeenGuestTimeline', app.includes('hasSeenGuestTimeline: true'));
check('Customization stores displayName and shipName', app.includes('displayName: payload.displayName') && app.includes('shipName: payload.shipName'));
check('Guest can enter Island Run before choosing names', authShell.includes("onPlayFree({ displayName: '', shipName: '' })") && authShell.includes('Choose my captain'));
check('No gameplay fields written to guest funnel in entry flow', !app.includes('dice:') && !app.includes('essence:') && !app.includes('runtimeState:'));
check('Existing signup path remains accessible', authShell.includes('Create free account now') && authShell.includes("onTabChange('signup')"));
check('Guest entry stays local and never creates a Supabase anonymous user', app.includes('setLocalGuestSession(createDemoSession())') && !authProvider.includes('signInAnonymously'));
check('Local guest claim verifies a permanent UUID and remote snapshot', guestClaimService.includes('isPermanentSupabaseUser') && guestClaimService.includes('verifiedRemote: true'));
check('Exit save prompt stays above the Island Run gesture layer', levelWorldsCss.includes('z-index: 10010'));
check('Signup overlay renders in both mobile and regular app shells', (app.match(/\{authOverlay\}/g) ?? []).length >= 2);
check('Signup overlay stays above fullscreen Island Run', appCss.includes('z-index: 2147483200'));

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'} ${item.name}`);
if (failed.length) process.exit(1);
