import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const helperUrl = new URL('../supabase/functions/_shared/minigame-ticket-checkout.ts', import.meta.url);
const helperSource = await readFile(helperUrl, 'utf8');
const helperJs = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  fileName: helperUrl.pathname,
}).outputText;
const helper = await import(`data:text/javascript;base64,${Buffer.from(helperJs).toString('base64')}`);

assert.equal(helper.isValidMinigameTicketSkuId('space_excavator_tickets_10'), true);
assert.equal(helper.isValidMinigameTicketSkuId('made_up_price'), false);
assert.equal(helper.isValidMinigameTicketEventId('space_excavator'), true);
assert.equal(helper.isValidMinigameTicketEventId('made_up_event'), false);
assert.equal(
  helper.isMinigameTicketSkuCompatibleWithEvent('space_excavator_tickets_10', 'space_excavator'),
  true,
);
assert.equal(
  helper.isMinigameTicketSkuCompatibleWithEvent('lucky_spin_tickets_10', 'space_excavator'),
  false,
);
assert.equal(
  helper.resolveMinigameTicketPriceEnvName('space_excavator_tickets_10'),
  'STRIPE_PRICE_SPACE_EXCAVATOR_TICKETS_10',
  'checkout resolves only a secret name; no Stripe price is invented in source',
);
assert.deepEqual(
  helper.buildMinigameTicketCheckoutMetadata({
    userId: '11111111-1111-4111-8111-111111111111',
    skuId: 'space_excavator_tickets_10',
    eventId: 'space_excavator',
  }),
  {
    user_id: '11111111-1111-4111-8111-111111111111',
    product_type: 'minigame_ticket_pack',
    sku_id: 'space_excavator_tickets_10',
    event_id: 'space_excavator',
    tickets: '10',
  },
);

const read = async (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [flags, store, board, migration] = await Promise.all([
  read('src/config/islandRunFeatureFlags.ts'),
  read('src/services/minigameTicketStore.ts'),
  read('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx'),
  read('supabase/migrations/20260811211349_harden_minigame_ticket_fulfillment.sql'),
]);

assert.match(flags, /minigameTicketPurchasesReady:\s*false/);
assert.match(
  store,
  /!isIslandRunFeatureEnabled\('minigameTicketPurchasesReady'\)[\s\S]{0,260}return[\s\S]{0,500}createGuardedCheckoutSession/,
  'service must fail closed before invoking the checkout Edge Function',
);
assert.match(
  board,
  /isIslandRunFeatureEnabled\('minigameTicketPurchasesReady'\)[\s\S]{0,220}activeTimedEvent[\s\S]{0,420}Buy Tickets/,
  'frontend must hide the purchase entry point while readiness is off',
);
assert.match(migration, /set search_path = ''/i);
assert.match(migration, /from public, anon, authenticated/i);
assert.match(migration, /to service_role/i);

console.log('minigame-ticket-commerce-readiness: all assertions passed');
