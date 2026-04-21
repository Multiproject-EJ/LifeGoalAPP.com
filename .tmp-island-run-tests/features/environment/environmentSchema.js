"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRecord = isRecord;
exports.normalizeEnvironmentContext = normalizeEnvironmentContext;
exports.environmentContextToJson = environmentContextToJson;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function asTrimmedString(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function asStringArray(value) {
    if (!Array.isArray(value))
        return undefined;
    const normalized = value.map(asTrimmedString).filter((item) => Boolean(item));
    return normalized.length > 0 ? normalized : undefined;
}
function normalizeEnvironmentContext(input, options) {
    const fallbackText = asTrimmedString(options?.fallbackText);
    const updatedAt = options?.updatedAt ?? new Date().toISOString();
    if (!isRecord(input)) {
        return fallbackText
            ? {
                version: 1,
                legacyNote: fallbackText,
                source: options?.source,
                updatedAt,
            }
            : null;
    }
    const cue = isRecord(input.cue)
        ? {
            type: ['time', 'location', 'event', 'person', 'custom'].includes(input.cue.type)
                ? input.cue.type
                : undefined,
            label: asTrimmedString(input.cue.label),
        }
        : undefined;
    const blocker = isRecord(input.blocker)
        ? {
            label: asTrimmedString(input.blocker.label),
            tags: asStringArray(input.blocker.tags),
        }
        : undefined;
    const hackPlan = isRecord(input.hackPlan)
        ? {
            summary: asTrimmedString(input.hackPlan.summary),
            selectedHackIds: asStringArray(input.hackPlan.selectedHackIds),
        }
        : undefined;
    const fallback = isRecord(input.fallback)
        ? {
            label: asTrimmedString(input.fallback.label),
            durationMinutes: typeof input.fallback.durationMinutes === 'number' && Number.isFinite(input.fallback.durationMinutes)
                ? input.fallback.durationMinutes
                : null,
        }
        : undefined;
    const normalized = {
        version: 1,
        place: asTrimmedString(input.place),
        cue: cue?.type || cue?.label ? cue : undefined,
        blocker: blocker?.label || blocker?.tags?.length ? blocker : undefined,
        hackPlan: hackPlan?.summary || hackPlan?.selectedHackIds?.length ? hackPlan : undefined,
        fallback: fallback?.label || fallback?.durationMinutes !== null ? fallback : undefined,
        source: ['setup', 'edit', 'weekly_review', 'ai'].includes(input.source)
            ? input.source
            : options?.source,
        updatedAt,
        legacyNote: asTrimmedString(input.legacyNote) ?? fallbackText,
    };
    const hasMeaningfulFields = Boolean(normalized.place ||
        normalized.cue?.label ||
        normalized.blocker?.label ||
        normalized.blocker?.tags?.length ||
        normalized.hackPlan?.summary ||
        normalized.hackPlan?.selectedHackIds?.length ||
        normalized.fallback?.label ||
        normalized.legacyNote);
    return hasMeaningfulFields ? normalized : null;
}
function environmentContextToJson(context) {
    return context ? context : null;
}
