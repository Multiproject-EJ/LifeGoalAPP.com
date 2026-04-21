"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLocalVisionImageId = buildLocalVisionImageId;
exports.upsertLocalVisionImageRecord = upsertLocalVisionImageRecord;
exports.removeLocalVisionImageRecord = removeLocalVisionImageRecord;
exports.listLocalVisionImageRecordsForUser = listLocalVisionImageRecordsForUser;
exports.enqueueVisionImageMutation = enqueueVisionImageMutation;
exports.updateVisionImageMutation = updateVisionImageMutation;
exports.removeVisionImageMutation = removeVisionImageMutation;
exports.listPendingVisionImageMutations = listPendingVisionImageMutations;
exports.getVisionImageMutationCounts = getVisionImageMutationCounts;
exports.clearVisionImageMutationsForUser = clearVisionImageMutationsForUser;
exports.retryFailedVisionImageMutationsForUser = retryFailedVisionImageMutationsForUser;
const idb_1 = require("idb");
const DB_NAME = 'lifegoalapp-vision-board-offline';
const DB_VERSION = 1;
let dbPromise = null;
function getDb() {
    if (!dbPromise) {
        dbPromise = (0, idb_1.openDB)(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('vision_images_local')) {
                    const store = db.createObjectStore('vision_images_local', { keyPath: 'id' });
                    store.createIndex('by-user', 'user_id');
                }
                if (!db.objectStoreNames.contains('vision_images_mutations')) {
                    const store = db.createObjectStore('vision_images_mutations', { keyPath: 'id' });
                    store.createIndex('by-user', 'user_id');
                }
            },
        });
    }
    return dbPromise;
}
function buildLocalVisionImageId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        return `local-vision-${crypto.randomUUID()}`;
    return `local-vision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
async function upsertLocalVisionImageRecord(record) {
    const db = await getDb();
    await db.put('vision_images_local', record);
}
async function removeLocalVisionImageRecord(id) {
    const db = await getDb();
    await db.delete('vision_images_local', id);
}
async function listLocalVisionImageRecordsForUser(userId) {
    const db = await getDb();
    return db.getAllFromIndex('vision_images_local', 'by-user', IDBKeyRange.only(userId));
}
async function enqueueVisionImageMutation(record) {
    const db = await getDb();
    await db.put('vision_images_mutations', record);
}
async function updateVisionImageMutation(id, patch) {
    const db = await getDb();
    const current = await db.get('vision_images_mutations', id);
    if (!current)
        return;
    await db.put('vision_images_mutations', { ...current, ...patch });
}
async function removeVisionImageMutation(id) {
    const db = await getDb();
    await db.delete('vision_images_mutations', id);
}
async function listPendingVisionImageMutations(userId) {
    const db = await getDb();
    const records = await db.getAllFromIndex('vision_images_mutations', 'by-user', IDBKeyRange.only(userId));
    return records
        .filter((record) => record.status === 'pending' || record.status === 'failed')
        .sort((a, b) => a.created_at_ms - b.created_at_ms);
}
async function getVisionImageMutationCounts(userId) {
    const db = await getDb();
    const records = await db.getAllFromIndex('vision_images_mutations', 'by-user', IDBKeyRange.only(userId));
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
async function clearVisionImageMutationsForUser(userId) {
    const db = await getDb();
    const records = await db.getAllFromIndex('vision_images_mutations', 'by-user', IDBKeyRange.only(userId));
    await Promise.all(records.map((record) => db.delete('vision_images_mutations', record.id)));
}
async function retryFailedVisionImageMutationsForUser(userId) {
    const db = await getDb();
    const records = await db.getAllFromIndex('vision_images_mutations', 'by-user', IDBKeyRange.only(userId));
    const nowMs = Date.now();
    await Promise.all(records
        .filter((record) => record.status === 'failed')
        .map((record) => db.put('vision_images_mutations', {
        ...record,
        status: 'pending',
        updated_at_ms: nowMs,
        last_error: null,
    })));
}
