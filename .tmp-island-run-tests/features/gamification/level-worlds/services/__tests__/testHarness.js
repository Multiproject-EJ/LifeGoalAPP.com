"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = assert;
exports.assertEqual = assertEqual;
exports.assertDeepEqual = assertDeepEqual;
exports.createMemoryStorage = createMemoryStorage;
exports.installWindowWithStorage = installWindowWithStorage;
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
function assertEqual(actual, expected, message) {
    if (!Object.is(actual, expected)) {
        throw new Error(`${message} (expected ${String(expected)}, received ${String(actual)})`);
    }
}
function assertDeepEqual(actual, expected, message) {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(`${message} (expected ${expectedJson}, received ${actualJson})`);
    }
}
function createMemoryStorage(initial = {}) {
    const store = new Map(Object.entries(initial));
    return {
        get length() {
            return store.size;
        },
        clear() {
            store.clear();
        },
        getItem(key) {
            return store.has(key) ? store.get(key) ?? null : null;
        },
        key(index) {
            return Array.from(store.keys())[index] ?? null;
        },
        removeItem(key) {
            store.delete(key);
        },
        setItem(key, value) {
            store.set(key, value);
        },
    };
}
function installWindowWithStorage(storage) {
    const sessionStorage = createMemoryStorage();
    Object.defineProperty(globalThis, 'window', {
        value: {
            localStorage: storage,
            sessionStorage,
            location: { pathname: '/app', search: '', hash: '' },
        },
        configurable: true,
        writable: true,
    });
}
