"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseUrl = getSupabaseUrl;
exports.hasSupabaseCredentials = hasSupabaseCredentials;
exports.setSupabaseSession = setSupabaseSession;
exports.hasActiveSupabaseSession = hasActiveSupabaseSession;
exports.canUseSupabaseData = canUseSupabaseData;
exports.canUseSupabaseDataAsync = canUseSupabaseDataAsync;
exports.getActiveSupabaseSession = getActiveSupabaseSession;
exports.getSupabaseClient = getSupabaseClient;
exports.getSupabaseRedirectUrl = getSupabaseRedirectUrl;
const supabase_js_1 = require("@supabase/supabase-js");
const defaultCredentials_json_1 = __importDefault(require("../../supabase/defaultCredentials.json"));
let cachedClient = null;
let activeSession = null;
const DEFAULT_AUTH_CALLBACK_PATH = '/auth/callback.html';
function readEnvValue(keys) {
    const env = import.meta.env;
    for (const key of keys) {
        const value = env[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return null;
}
function resolveSupabaseUrl() {
    const configuredUrl = readEnvValue(['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
    if (configuredUrl)
        return configuredUrl;
    return defaultCredentials_json_1.default.url?.trim() || null;
}
function getSupabaseUrl() {
    return resolveSupabaseUrl();
}
function resolveSupabaseAnonKey() {
    const configuredAnonKey = readEnvValue(['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);
    if (configuredAnonKey)
        return configuredAnonKey;
    return defaultCredentials_json_1.default.anonKey?.trim() || null;
}
function hasSupabaseCredentials() {
    return Boolean(resolveSupabaseUrl() && resolveSupabaseAnonKey());
}
function setSupabaseSession(session) {
    activeSession = session;
}
function hasActiveSupabaseSession() {
    return Boolean(activeSession);
}
function canUseSupabaseData() {
    return hasSupabaseCredentials() && hasActiveSupabaseSession();
}
async function canUseSupabaseDataAsync() {
    if (!hasSupabaseCredentials())
        return false;
    if (activeSession)
        return true;
    try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (data.session) {
            activeSession = data.session;
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
function getActiveSupabaseSession() {
    return activeSession;
}
function getSupabaseClient() {
    if (cachedClient)
        return cachedClient;
    const supabaseUrl = resolveSupabaseUrl();
    const supabaseAnonKey = resolveSupabaseAnonKey();
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase credentials are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
    }
    cachedClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    });
    return cachedClient;
}
function getSupabaseRedirectUrl() {
    const configuredRedirect = readEnvValue(['VITE_SUPABASE_REDIRECT_URL', 'NEXT_PUBLIC_SUPABASE_REDIRECT_URL']);
    if (configuredRedirect) {
        return configuredRedirect;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}${DEFAULT_AUTH_CALLBACK_PATH}`;
    }
    return null;
}
