"use strict";
/**
 * islandRunActionMutex — shared per-user async serialisation primitive.
 *
 * Every Island Run "gameplay action" that performs a read-modify-write against
 * the authoritative state record (roll, tile reward, encounter resolve, stop
 * ticket pay, …) must run under this mutex so that:
 *
 *  1. Two actions fired in the same React tick cannot both read the same
 *     pre-action state and then write full records that clobber each other's
 *     delta. `persistIslandRunRuntimeStatePatch` already does a read-modify-
 *     write internally, but without serialisation two disjoint patches can
 *     both hydrate the same `current`, build two `nextState`s from it, and
 *     persist two full-record writes where the second wipes the first's
 *     fields. The mutex forces the second action's `current` read to observe
 *     the first action's committed write.
 *
 *  2. A tile-reward write cannot interleave with an in-flight roll commit —
 *     landing essence / reward-bar progress are computed in the same React
 *     tick as the roll's `dicePool`/`tokenIndex` decrement, so they must
 *     serialise with the roll to avoid ABA races on `runtimeVersion`.
 *
 * The mutex is keyed by `session.user.id`, so users on different devices
 * never block each other. On a single device, two tabs for the same user
 * (extremely rare) serialise through the same in-memory chain; Supabase's
 * `runtimeVersion` optimistic check catches any cross-device race the local
 * mutex cannot see.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withIslandRunActionLock = withIslandRunActionLock;
exports.__resetIslandRunActionMutexesForTests = __resetIslandRunActionMutexesForTests;
// Per-user async mutex tail. The stored promise resolves when the last queued
// action for this user has finished persisting. Appending a new action means
// chaining a `.then(work)` onto the tail and storing the new tail.
const actionMutexes = new Map();
/**
 * Run `work` exclusive-of any other `withIslandRunActionLock` call for the
 * same `userId`. Resolves with `work`'s result; rejects with `work`'s error.
 *
 * The queue survives failures: if `work` throws, later callers still run.
 * The entry is evicted from the Map once the queue drains (no later caller
 * has appended itself), so long-lived multi-user processes never leak.
 */
function withIslandRunActionLock(userId, work) {
    const previous = actionMutexes.get(userId) ?? Promise.resolve();
    // `catch(() => undefined)` on the predecessor chain prevents an earlier
    // rejection from aborting this caller (each caller gets its own outcome).
    const next = previous.catch(() => undefined).then(() => work());
    // Swallow this tail's rejection for Map bookkeeping, otherwise a rejected
    // promise would sit at the head of the queue unreferenced.
    const tail = next.catch(() => undefined);
    actionMutexes.set(userId, tail);
    void tail.finally(() => {
        // Only evict if no later caller has already replaced the tail, otherwise
        // the newer caller would lose its place in the chain.
        if (actionMutexes.get(userId) === tail) {
            actionMutexes.delete(userId);
        }
    });
    return next;
}
/** @internal Test hook — resets the mutex map so concurrent-case tests start clean. */
function __resetIslandRunActionMutexesForTests() {
    actionMutexes.clear();
}
