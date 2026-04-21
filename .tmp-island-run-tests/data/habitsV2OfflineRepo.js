"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLocalHabitV2Id = buildLocalHabitV2Id;
exports.upsertLocalHabitV2Record = upsertLocalHabitV2Record;
exports.getLocalHabitV2Record = getLocalHabitV2Record;
exports.removeLocalHabitV2Record = removeLocalHabitV2Record;
exports.listLocalHabitsV2ForUser = listLocalHabitsV2ForUser;
exports.enqueueHabitV2Mutation = enqueueHabitV2Mutation;
exports.updateHabitV2Mutation = updateHabitV2Mutation;
exports.removeHabitV2Mutation = removeHabitV2Mutation;
exports.listPendingHabitV2Mutations = listPendingHabitV2Mutations;
exports.getHabitV2MutationCounts = getHabitV2MutationCounts;
const idb_1 = require("idb");
const DB_NAME = 'lifegoalapp-habits-v2-offline';
const DB_VERSION = 1;
let dbPromise = null;
function getDb() {
    if (!dbPromise) {
        dbPromise = (0, idb_1.openDB)(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('habits_v2_local')) {
                    const store = db.createObjectStore('habits_v2_local', { keyPath: 'id' });
                    store.createIndex('by-user', 'user_id');
                }
                if (!db.objectStoreNames.contains('habits_v2_mutations')) {
                    const store = db.createObjectStore('habits_v2_mutations', { keyPath: 'id' });
                    store.createIndex('by-user', 'user_id');
                }
            },
        });
    }
    return dbPromise;
}
function buildLocalHabitV2Id() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        return `local-habit-v2-${crypto.randomUUID()}`;
    return `local-habit-v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
async function upsertLocalHabitV2Record(record) {
    const db = await getDb();
    await db.put('habits_v2_local', record);
}
async function getLocalHabitV2Record(id) {
    const db = await getDb();
    return (await db.get('habits_v2_local', id)) ?? null;
}
async function removeLocalHabitV2Record(id) {
    const db = await getDb();
    await db.delete('habits_v2_local', id);
}
async function listLocalHabitsV2ForUser(userId) {
    const db = await getDb();
    return db.getAllFromIndex('habits_v2_local', 'by-user', IDBKeyRange.only(userId));
}
async function enqueueHabitV2Mutation(record) {
    const db = await getDb();
    await db.put('habits_v2_mutations', record);
}
async function updateHabitV2Mutation(id, patch) {
    const db = await getDb();
    const current = await db.get('habits_v2_mutations', id);
    if (!current)
        return;
    await db.put('habits_v2_mutations', { ...current, ...patch });
}
async function removeHabitV2Mutation(id) {
    const db = await getDb();
    await db.delete('habits_v2_mutations', id);
}
async function listPendingHabitV2Mutations(userId) {
    const db = await getDb();
    const records = await db.getAllFromIndex('habits_v2_mutations', 'by-user', IDBKeyRange.only(userId));
    return records
        .filter((record) => record.status === 'pending' || record.status === 'failed')
        .sort((a, b) => a.created_at_ms - b.created_at_ms);
}
async function getHabitV2MutationCounts(userId) {
    const db = await getDb();
    const records = await db.getAllFromIndex('habits_v2_mutations', 'by-user', IDBKeyRange.only(userId));
    let pending = 0;
    let failed = 0;
    for (const record of records) {
        if (record.status === 'pending' || record.status === 'processing')
            pending += 1;
        if (record.status === 'failed')
            failed += 1;
    }
    return { pending, failed };
}
