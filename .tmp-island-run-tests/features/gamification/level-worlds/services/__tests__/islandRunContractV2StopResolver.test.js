"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunContractV2StopResolverTests = void 0;
const islandRunContractV2StopResolver_1 = require("../islandRunContractV2StopResolver");
const islandRunContractV2EssenceBuild_1 = require("../islandRunContractV2EssenceBuild");
const testHarness_1 = require("./testHarness");
const FULL_BUILD_STATES = Array.from({ length: 5 }, () => ({
    requiredEssence: 50,
    spentEssence: 50,
    buildLevel: islandRunContractV2EssenceBuild_1.MAX_BUILD_LEVEL,
}));
const EMPTY_BUILD_STATES = Array.from({ length: 5 }, () => ({
    requiredEssence: 50,
    spentEssence: 0,
    buildLevel: 0,
}));
exports.islandRunContractV2StopResolverTests = [
    {
        name: 'resolver picks first stop without objective complete as active and locks all later stops',
        run: () => {
            const result = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [
                    { objectiveComplete: true, buildComplete: false }, // objective done, build pending — still counted as done for sequencing
                    { objectiveComplete: false, buildComplete: false }, // objective not done → active
                    { objectiveComplete: true, buildComplete: true },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                ],
            });
            (0, testHarness_1.assertEqual)(result.activeStopIndex, 1, 'Expected stop index 1 to be active (first stop without objective)');
            (0, testHarness_1.assertEqual)(result.activeStopType, 'habit', 'Expected active stop type to match index 1');
            (0, testHarness_1.assertDeepEqual)(result.statusesByIndex, ['completed', 'active', 'locked', 'locked', 'locked'], 'Expected stop 0 completed (objective done) and stop 1 active');
        },
    },
    {
        name: 'resolver advances on objectiveComplete alone — build does not gate stop unlock',
        run: () => {
            const result = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [
                    { objectiveComplete: true, buildComplete: false }, // objective done, no build
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                ],
            });
            (0, testHarness_1.assertEqual)(result.activeStopIndex, 1, 'Expected stop 1 to be active — stop 0 objective done even without build');
            (0, testHarness_1.assertEqual)(result.activeStopType, 'habit', 'Expected hatchery to be followed by habit');
            (0, testHarness_1.assertDeepEqual)(result.statusesByIndex, ['completed', 'active', 'locked', 'locked', 'locked'], 'Expected stop 0 completed when objective complete, regardless of build');
        },
    },
    {
        name: 'resolver returns last index when all objectives are complete while marking every stop completed',
        run: () => {
            const result = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [
                    { objectiveComplete: true, buildComplete: true },
                    { objectiveComplete: true, buildComplete: true },
                    { objectiveComplete: true, buildComplete: true },
                    { objectiveComplete: true, buildComplete: true },
                    { objectiveComplete: true, buildComplete: true },
                ],
            });
            (0, testHarness_1.assertEqual)(result.activeStopIndex, 4, 'Expected final stop index to be returned after full completion');
            (0, testHarness_1.assertEqual)(result.activeStopType, 'boss', 'Expected boss type for final stop index');
            (0, testHarness_1.assertDeepEqual)(result.statusesByIndex, ['completed', 'completed', 'completed', 'completed', 'completed'], 'Expected all stop statuses to remain completed after full completion');
        },
    },
    {
        name: 'resolver treats malformed truthy values as incomplete because completion requires explicit booleans',
        run: () => {
            const result = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [
                    { objectiveComplete: 'true', buildComplete: 'true' },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                ],
            });
            (0, testHarness_1.assertEqual)(result.activeStopIndex, 0, 'Expected malformed truthy values to remain incomplete');
            (0, testHarness_1.assertDeepEqual)(result.statusesByIndex, ['active', 'locked', 'locked', 'locked', 'locked'], 'Expected strict boolean completion checks');
        },
    },
    {
        name: 'resolver handles missing or short stop arrays deterministically',
        run: () => {
            const result = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [],
            });
            (0, testHarness_1.assertEqual)(result.activeStopIndex, 0, 'Expected first stop to remain active with missing state');
            (0, testHarness_1.assertEqual)(result.activeStopType, 'hatchery', 'Expected hatchery as deterministic fallback active type');
            (0, testHarness_1.assertDeepEqual)(result.statusesByIndex, ['active', 'locked', 'locked', 'locked', 'locked'], 'Expected missing entries to remain locked after step 1');
        },
    },
    {
        name: 'progression gating uses v2 stop state and ignores legacy completion values when v2 is on',
        run: () => {
            const stopStatesByIndex = [
                { objectiveComplete: false, buildComplete: false },
                { objectiveComplete: false, buildComplete: false },
                { objectiveComplete: false, buildComplete: false },
                { objectiveComplete: false, buildComplete: false },
                { objectiveComplete: false, buildComplete: false },
            ];
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.resolveIslandRunStep1CompleteForProgression)({
                islandRunContractV2Enabled: true,
                stopStatesByIndex,
                legacyStep1Complete: true,
            }), false, 'Expected v2 mode to ignore legacy-complete step1 without hatchery flag and stay incomplete');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.resolveIslandRunFullClearForProgression)({
                islandRunContractV2Enabled: true,
                stopStatesByIndex,
                stopBuildStateByIndex: FULL_BUILD_STATES,
                hatcheryEggResolved: true,
                legacyIslandFullyCleared: true,
            }), false, 'Expected v2 mode to ignore legacy full-clear when objectives are not done');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.resolveIslandRunStep1CompleteForProgression)({
                islandRunContractV2Enabled: false,
                stopStatesByIndex,
                legacyStep1Complete: true,
            }), true, 'Expected legacy mode to preserve existing step1 behavior');
        },
    },
    {
        name: 'v2 full clear requires objectives + builds + hatchery egg resolved',
        run: () => {
            const allObjectives = Array.from({ length: 5 }, () => ({ objectiveComplete: true, buildComplete: false }));
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.resolveIslandRunFullClearForProgression)({
                islandRunContractV2Enabled: true,
                stopStatesByIndex: allObjectives,
                stopBuildStateByIndex: EMPTY_BUILD_STATES,
                hatcheryEggResolved: true,
                legacyIslandFullyCleared: false,
            }), false, 'Expected not cleared: builds not done');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.resolveIslandRunFullClearForProgression)({
                islandRunContractV2Enabled: true,
                stopStatesByIndex: allObjectives,
                stopBuildStateByIndex: FULL_BUILD_STATES,
                hatcheryEggResolved: false,
                legacyIslandFullyCleared: false,
            }), false, 'Expected not cleared: hatchery egg not resolved');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.resolveIslandRunFullClearForProgression)({
                islandRunContractV2Enabled: true,
                stopStatesByIndex: allObjectives,
                stopBuildStateByIndex: FULL_BUILD_STATES,
                hatcheryEggResolved: true,
                legacyIslandFullyCleared: false,
            }), true, 'Expected cleared when all objectives + all builds + egg resolved');
        },
    },
    {
        name: 'v2 step1 resolves from stopStatesByIndex[0].objectiveComplete only',
        run: () => {
            const incompleteStates = [
                { objectiveComplete: false, buildComplete: false },
                { objectiveComplete: false, buildComplete: false },
                { objectiveComplete: false, buildComplete: false },
                { objectiveComplete: false, buildComplete: false },
                { objectiveComplete: false, buildComplete: false },
            ];
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.resolveIslandRunStep1CompleteForProgression)({
                islandRunContractV2Enabled: true,
                stopStatesByIndex: incompleteStates,
                legacyStep1Complete: true,
            }), false, 'Expected step1 to remain incomplete when v2 stop 0 objective is false, regardless of legacy flag');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.resolveIslandRunStep1CompleteForProgression)({
                islandRunContractV2Enabled: true,
                stopStatesByIndex: [
                    { objectiveComplete: true, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                ],
                legacyStep1Complete: false,
            }), true, 'Expected step1 to resolve true when v2 stop 0 objective is complete');
        },
    },
    // ── P1-11: ticket_required status ────────────────────────────────────────
    {
        name: 'ticket_required: emitted when active stop (index > 0) has no paid ticket on current island',
        run: () => {
            const result = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [
                    { objectiveComplete: true, buildComplete: false }, // hatchery done → stop 1 is next
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                ],
                stopTicketsPaidByIsland: { '1': [] }, // no tickets paid on island 1
                islandNumber: 1,
            });
            (0, testHarness_1.assertEqual)(result.activeStopIndex, 1, 'Expected stop 1 to be active');
            (0, testHarness_1.assertDeepEqual)(result.statusesByIndex, ['completed', 'ticket_required', 'locked', 'locked', 'locked'], 'Expected ticket_required for the active stop when its ticket is unpaid');
        },
    },
    {
        name: 'ticket_required: collapses back to active once ticket is paid for that stop index on this island',
        run: () => {
            const result = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [
                    { objectiveComplete: true, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                ],
                stopTicketsPaidByIsland: { '1': [1] },
                islandNumber: 1,
            });
            (0, testHarness_1.assertDeepEqual)(result.statusesByIndex, ['completed', 'active', 'locked', 'locked', 'locked'], 'Paid ticket on active stop keeps legacy active status');
        },
    },
    {
        name: 'ticket_required: hatchery (index 0) never reports ticket_required — it is implicitly free',
        run: () => {
            const result = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                ],
                // Even a malformed ledger that tries to "un-pay" hatchery should be ignored.
                stopTicketsPaidByIsland: { '1': [] },
                islandNumber: 1,
            });
            (0, testHarness_1.assertDeepEqual)(result.statusesByIndex, ['active', 'locked', 'locked', 'locked', 'locked'], 'Hatchery active stays active regardless of ticket ledger');
        },
    },
    {
        name: 'ticket_required: omitted ticket params preserve legacy active/locked two-state behaviour',
        run: () => {
            const result = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [
                    { objectiveComplete: true, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                ],
            });
            (0, testHarness_1.assertDeepEqual)(result.statusesByIndex, ['completed', 'active', 'locked', 'locked', 'locked'], 'Without ticket params, resolver falls back to legacy two-state behaviour');
        },
    },
    {
        name: 'ticket_required: ledger is scoped per island — a ticket paid on island 2 does not unlock island 1',
        run: () => {
            const result = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [
                    { objectiveComplete: true, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                    { objectiveComplete: false, buildComplete: false },
                ],
                stopTicketsPaidByIsland: { '2': [1] }, // paid on island 2 only
                islandNumber: 1,
            });
            (0, testHarness_1.assertDeepEqual)(result.statusesByIndex, ['completed', 'ticket_required', 'locked', 'locked', 'locked'], 'Paid ticket on a different island must not leak into another island');
        },
    },
    {
        name: 'ticket_required: not emitted when all objectives are complete (final-state has no active stop)',
        run: () => {
            const result = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [
                    { objectiveComplete: true, buildComplete: false },
                    { objectiveComplete: true, buildComplete: false },
                    { objectiveComplete: true, buildComplete: false },
                    { objectiveComplete: true, buildComplete: false },
                    { objectiveComplete: true, buildComplete: false },
                ],
                stopTicketsPaidByIsland: { '1': [] },
                islandNumber: 1,
            });
            (0, testHarness_1.assertDeepEqual)(result.statusesByIndex, ['completed', 'completed', 'completed', 'completed', 'completed'], 'All-complete state reports completed across the board — no ticket_required synthesized');
        },
    },
];
