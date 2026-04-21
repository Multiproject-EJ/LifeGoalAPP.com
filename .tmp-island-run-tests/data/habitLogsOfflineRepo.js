"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHabitLogKey = buildHabitLogKey;
exports.upsertLocalHabitLogRecord = upsertLocalHabitLogRecord;
exports.removeLocalHabitLogRecord = removeLocalHabitLogRecord;
exports.getLocalHabitLogRecord = getLocalHabitLogRecord;
exports.listLocalHabitLogRecordsForUser = listLocalHabitLogRecordsForUser;
exports.enqueueHabitLogMutation = enqueueHabitLogMutation;
exports.updateHabitLogMutation = updateHabitLogMutation;
exports.removeHabitLogMutation = removeHabitLogMutation;
exports.listPendingHabitLogMutations = listPendingHabitLogMutations;
exports.getHabitLogMutationCounts = getHabitLogMutationCounts;
const idb_1 = require("idb");
const DB_NAME = 'lifegoalapp-habit-logs-offline';
const DB_VERSION = 1;
let dbPromise = null;
function getDb() {
    if (!dbPromise) {
        dbPromise = (0, idb_1.openDB)(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('habit_logs_local')) {
                    const store = db.createObjectStore('habit_logs_local', { keyPath: 'id' });
                    store.createIndex('by-user', 'user_id');
                }
                if (!db.objectStoreNames.contains('habit_log_mutations')) {
                    const store = db.createObjectStore('habit_log_mutations', { keyPath: 'id' });
                    store.createIndex('by-user', 'user_id');
                }
            },
        });
    }
    return dbPromise;
}
function buildHabitLogKey(userId, habitId, date) {
    return `${userId}:${habitId}:${date}`;
}
async function upsertLocalHabitLogRecord(record) {
    const db = await getDb();
    await db.put('habit_logs_local', record);
}
async function removeLocalHabitLogRecord(id) {
    const db = await getDb();
    await db.delete('habit_logs_local', id);
}
async function getLocalHabitLogRecord(id) {
    const db = await getDb();
    return (await db.get('habit_logs_local', id)) ?? null;
}
async function listLocalHabitLogRecordsForUser(userId) {
    const db = await getDb();
    return db.getAllFromIndex('habit_logs_local', 'by-user', IDBKeyRange.only(userId));
}
async function enqueueHabitLogMutation(record) {
    const db = await getDb();
    await db.put('habit_log_mutations', record);
}
async function updateHabitLogMutation(id, patch) {
    const db = await getDb();
    const current = await db.get('habit_log_mutations', id);
    if (!current)
        return;
    await db.put('habit_log_mutations', { ...current, ...patch });
}
async function removeHabitLogMutation(id) {
    const db = await getDb();
    await db.delete('habit_log_mutations', id);
}
async function listPendingHabitLogMutations(userId) {
    const db = await getDb();
    const records = await db.getAllFromIndex('habit_log_mutations', 'by-user', IDBKeyRange.only(userId));
    return records
        .filter((record) => record.status === 'pending' || record.status === 'failed')
        .sort((a, b) => a.created_at_ms - b.created_at_ms);
}
async function getHabitLogMutationCounts(userId) {
    const db = await getDb();
    const records = await db.getAllFromIndex('habit_log_mutations', 'by-user', IDBKeyRange.only(userId));
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
