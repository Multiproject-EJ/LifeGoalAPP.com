import { readFileSync } from 'node:fs';

const checks = [];
const authShell = readFileSync('src/components/HabitGameLandingShell.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const authProvider = readFileSync('src/features/auth/SupabaseAuthProvider.tsx', 'utf8');

function check(name, condition) {
  checks.push({ name, condition });
}

check('Play CTA opens timeline', authShell.includes('Play My Game for Free') && authShell.includes("setGuestStep('timeline')"));
check('Timeline completion stores hasSeenGuestTimeline', app.includes('hasSeenGuestTimeline: true'));
check('Customization stores displayName and shipName', app.includes('displayName: payload.displayName') && app.includes('shipName: payload.shipName'));
check('Skip customization still enters Island Run', authShell.includes('Skip for now') && authShell.match(/onClick=\{handleSailToLumaIsle\}/g)?.length >= 2);
check('No gameplay fields written to guest funnel in entry flow', !app.includes('dice:') && !app.includes('essence:') && !app.includes('runtimeState:'));
check('Existing signup path remains accessible', authShell.includes('Create free account now') && authShell.includes("onTabChange('signup')"));
check('Anonymous auth uses Supabase API and does not fake sessions', authProvider.includes('supabase.auth.signInAnonymously()') && !app.includes('access_token:') && !app.toLowerCase().includes('fake session'));

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'} ${item.name}`);
if (failed.length) process.exit(1);
