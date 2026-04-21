"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setIslandRunDebugRuntimeSnapshotProvider = setIslandRunDebugRuntimeSnapshotProvider;
exports.isIslandRunEntryDebugEnabled = isIslandRunEntryDebugEnabled;
exports.logIslandRunEntryDebug = logIslandRunEntryDebug;
exports.getIslandRunExportableDebugLog = getIslandRunExportableDebugLog;
exports.clearIslandRunExportableDebugLog = clearIslandRunExportableDebugLog;
exports.downloadIslandRunExportableDebugLog = downloadIslandRunExportableDebugLog;
exports.getIslandRunExportableDebugLogText = getIslandRunExportableDebugLogText;
exports.downloadIslandRunExportableDebugLogText = downloadIslandRunExportableDebugLogText;
const ISLAND_RUN_ENTRY_DEBUG_PARAM = 'islandRunEntryDebug';
const ISLAND_RUN_ENTRY_DEBUG_BUFFER_KEY = 'island_run_entry_debug_buffer_v1';
const ISLAND_RUN_ENTRY_DEBUG_MAX_BUFFER_ITEMS = 200;
const ISLAND_RUN_ENTRY_DEBUG_MAX_NETWORK_ITEMS = 80;
function getLocationSnapshot() {
    if (typeof window === 'undefined') {
        return {
            pathname: '',
            search: '',
            hash: '',
        };
    }
    return {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
    };
}
function readDebugBuffer() {
    if (typeof window === 'undefined')
        return [];
    try {
        const raw = window.sessionStorage.getItem(ISLAND_RUN_ENTRY_DEBUG_BUFFER_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function writeDebugBuffer(entries) {
    if (typeof window === 'undefined')
        return;
    try {
        const trimmed = entries.slice(-ISLAND_RUN_ENTRY_DEBUG_MAX_BUFFER_ITEMS);
        window.sessionStorage.setItem(ISLAND_RUN_ENTRY_DEBUG_BUFFER_KEY, JSON.stringify(trimmed));
    }
    catch {
        // ignore debug buffer persistence failures
    }
}
function collectNetworkEntries() {
    if (typeof window === 'undefined' || typeof window.performance === 'undefined') {
        return [];
    }
    const resources = window.performance
        .getEntriesByType('resource')
        .filter((entry) => {
        if (!('name' in entry) || typeof entry.name !== 'string')
            return false;
        return (entry.name.includes('supabase.co') ||
            entry.name.includes('/rest/v1/') ||
            entry.name.includes('island_run_runtime_state'));
    })
        .slice(-ISLAND_RUN_ENTRY_DEBUG_MAX_NETWORK_ITEMS)
        .map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        startTime: Number(entry.startTime.toFixed(2)),
        duration: Number(entry.duration.toFixed(2)),
        transferSize: entry.transferSize,
    }));
    return resources;
}
let islandRunRuntimeSnapshotProvider = null;
function setIslandRunDebugRuntimeSnapshotProvider(provider) {
    islandRunRuntimeSnapshotProvider = provider;
}
function collectEnvironmentSnapshot() {
    if (typeof window === 'undefined') {
        return {
            userAgent: 'unknown',
            language: 'unknown',
            viewport: {
                width: 0,
                height: 0,
                devicePixelRatio: 1,
            },
            screen: {
                width: 0,
                height: 0,
            },
        };
    }
    return {
        userAgent: window.navigator.userAgent,
        language: window.navigator.language,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
        },
        screen: {
            width: window.screen?.width ?? 0,
            height: window.screen?.height ?? 0,
        },
    };
}
function collectRuntimeSnapshot() {
    try {
        return islandRunRuntimeSnapshotProvider?.();
    }
    catch (error) {
        return {
            runtimeSnapshotError: error instanceof Error ? error.message : typeof error === 'string' ? error : 'unknown_runtime_snapshot_error',
        };
    }
}
function collectDebugEvidence() {
    return {
        generatedAt: new Date().toISOString(),
        location: getLocationSnapshot(),
        visibilityState: typeof document === 'undefined' ? 'unknown' : document.visibilityState,
        environment: collectEnvironmentSnapshot(),
        runtimeSnapshot: collectRuntimeSnapshot(),
        events: readDebugBuffer(),
        network: collectNetworkEntries(),
    };
}
function createDebugRunId(scenario) {
    const normalizedScenario = scenario.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const safeScenario = normalizedScenario || 'island-run-login';
    return `${safeScenario}-${Date.now().toString(36)}`;
}
function isIslandRunEntryDebugEnabled(search) {
    const effectiveSearch = typeof search === 'string' ? search : typeof window !== 'undefined' ? window.location.search : '';
    const params = new URLSearchParams(effectiveSearch);
    return params.get(ISLAND_RUN_ENTRY_DEBUG_PARAM) === '1';
}
function logIslandRunEntryDebug(stage, payload) {
    const entry = {
        stage,
        timestamp: new Date().toISOString(),
        ...getLocationSnapshot(),
        payload,
    };
    const nextBuffer = [...readDebugBuffer(), entry];
    writeDebugBuffer(nextBuffer);
    if (isIslandRunEntryDebugEnabled()) {
        console.info('[IslandRunEntryDebug]', {
            ...entry,
            ...(payload ?? {}),
        });
    }
}
function getIslandRunExportableDebugLog() {
    return collectDebugEvidence();
}
function clearIslandRunExportableDebugLog() {
    writeDebugBuffer([]);
}
function downloadIslandRunExportableDebugLog() {
    if (typeof window === 'undefined' || typeof document === 'undefined')
        return null;
    const evidence = collectDebugEvidence();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `island-run-debug-log-${stamp}.json`;
    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
    return { filename, eventCount: evidence.events.length, networkCount: evidence.network.length };
}
function getIslandRunExportableDebugLogText() {
    const evidence = collectDebugEvidence();
    const condensedEvents = condenseDebugEvents(evidence.events);
    const condensedNetwork = condenseNetworkEntries(evidence.network);
    const lines = [
        'Island Run Debug Log',
        `Generated At: ${evidence.generatedAt}`,
        `Visibility: ${evidence.visibilityState}`,
        `Path: ${evidence.location.pathname}${evidence.location.search}${evidence.location.hash}`,
        `User Agent: ${evidence.environment.userAgent}`,
        `Language: ${evidence.environment.language}`,
        `Viewport: ${evidence.environment.viewport.width}x${evidence.environment.viewport.height} @${evidence.environment.viewport.devicePixelRatio}x`,
        `Screen: ${evidence.environment.screen.width}x${evidence.environment.screen.height}`,
        '',
        'Runtime Snapshot:',
        JSON.stringify(evidence.runtimeSnapshot ?? {}, null, 2),
        '',
        `Events (${evidence.events.length} raw, ${condensedEvents.length} condensed):`,
    ];
    condensedEvents.forEach((event, index) => {
        lines.push(`${index + 1}. [${event.firstTimestamp}] ${event.stage}${event.repeatCount > 1 ? ` x${event.repeatCount}` : ''}`, `   route=${event.pathname}${event.search}${event.hash}`, `   payload=${JSON.stringify(event.payload ?? {}, null, 2)}`, ...(event.repeatCount > 1 ? [`   lastSeen=${event.lastTimestamp}`] : []));
    });
    lines.push('', `Network (${evidence.network.length} raw, ${condensedNetwork.length} condensed):`);
    condensedNetwork.forEach((entry, index) => {
        lines.push(`${index + 1}. ${entry.initiatorType || 'unknown'} ${entry.name}${entry.repeatCount > 1 ? ` x${entry.repeatCount}` : ''}`, `   start=${entry.firstStartTime}ms duration=${entry.lastDuration}ms transferSize=${entry.transferSize ?? 'n/a'}`);
    });
    return lines.join('\n');
}
function condenseDebugEvents(events) {
    return events.reduce((acc, event) => {
        const previous = acc[acc.length - 1];
        const sameAsPrevious = previous
            && previous.stage === event.stage
            && previous.pathname === event.pathname
            && previous.search === event.search
            && previous.hash === event.hash
            && JSON.stringify(previous.payload ?? {}) === JSON.stringify(event.payload ?? {});
        if (sameAsPrevious) {
            previous.lastTimestamp = event.timestamp;
            previous.repeatCount += 1;
            return acc;
        }
        acc.push({
            stage: event.stage,
            pathname: event.pathname,
            search: event.search,
            hash: event.hash,
            payload: event.payload,
            firstTimestamp: event.timestamp,
            lastTimestamp: event.timestamp,
            repeatCount: 1,
        });
        return acc;
    }, []);
}
function condenseNetworkEntries(entries) {
    return entries.reduce((acc, entry) => {
        const previous = acc[acc.length - 1];
        const sameAsPrevious = previous
            && previous.name === entry.name
            && previous.initiatorType === (entry.initiatorType || 'unknown');
        if (sameAsPrevious) {
            previous.lastDuration = entry.duration;
            previous.transferSize = entry.transferSize;
            previous.repeatCount += 1;
            return acc;
        }
        acc.push({
            name: entry.name,
            initiatorType: entry.initiatorType || 'unknown',
            firstStartTime: entry.startTime,
            lastDuration: entry.duration,
            transferSize: entry.transferSize,
            repeatCount: 1,
        });
        return acc;
    }, []);
}
function downloadIslandRunExportableDebugLogText() {
    if (typeof window === 'undefined' || typeof document === 'undefined')
        return null;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `island-run-debug-log-${stamp}.txt`;
    const blob = new Blob([getIslandRunExportableDebugLogText()], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
    return { filename };
}
function findNextEventIndex(events, startIndex, predicate) {
    for (let index = Math.max(0, startIndex); index < events.length; index += 1) {
        if (predicate(events[index])) {
            return index;
        }
    }
    return -1;
}
function getLatestRuntimeStateEvent(events, stage) {
    for (let index = events.length - 1; index >= 0; index -= 1) {
        if (events[index].stage === stage) {
            return events[index];
        }
    }
    return null;
}
function summarizeRuntimeVerification(events) {
    const hydrationEvent = getLatestRuntimeStateEvent(events, 'island_run_runtime_hydration_result');
    const persistEvent = getLatestRuntimeStateEvent(events, 'runtime_state_persist_success');
    return {
        generatedAt: new Date().toISOString(),
        latestHydrationResult: hydrationEvent
            ? {
                timestamp: hydrationEvent.timestamp,
                source: hydrationEvent.payload?.source,
                currentIslandNumber: hydrationEvent.payload?.currentIslandNumber,
                bossTrialResolvedIslandNumber: hydrationEvent.payload?.bossTrialResolvedIslandNumber,
                cycleIndex: hydrationEvent.payload?.cycleIndex,
                tokenIndex: hydrationEvent.payload?.tokenIndex,
                spinTokens: hydrationEvent.payload?.spinTokens,
                dicePool: hydrationEvent.payload?.dicePool,
            }
            : undefined,
        latestPersistSuccess: persistEvent
            ? {
                timestamp: persistEvent.timestamp,
                currentIslandNumber: persistEvent.payload?.currentIslandNumber,
                bossTrialResolvedIslandNumber: persistEvent.payload?.bossTrialResolvedIslandNumber,
                cycleIndex: persistEvent.payload?.cycleIndex,
                tokenIndex: persistEvent.payload?.tokenIndex,
                spinTokens: persistEvent.payload?.spinTokens,
                dicePool: persistEvent.payload?.dicePool,
            }
            : undefined,
    };
}
function assertProgressionSequence(events, mode = 'table', scope = 'full_buffer') {
    const checks = [];
    let cursor = 0;
    const expect = (name, predicate, detail) => {
        const matchedEventIndex = findNextEventIndex(events, cursor, predicate);
        const passed = matchedEventIndex >= 0;
        checks.push({
            name,
            passed,
            detail,
            matchedEventIndex: passed ? matchedEventIndex : undefined,
        });
        if (passed) {
            cursor = matchedEventIndex + 1;
        }
    };
    expect('baseline_reset_persist', (event) => event.stage === 'runtime_state_persist_success' &&
        event.payload?.currentIslandNumber === 1 &&
        event.payload?.bossTrialResolvedIslandNumber === null, 'Expected persist success with island=1 and boss marker null.');
    expect('boss_marker_persist', (event) => event.stage === 'runtime_state_persist_success' &&
        event.payload?.currentIslandNumber === 1 &&
        event.payload?.bossTrialResolvedIslandNumber === 1, 'Expected persist success with island=1 and boss marker=1.');
    expect('advance_island_persist', (event) => event.stage === 'runtime_state_persist_success' &&
        event.payload?.currentIslandNumber === 2 &&
        event.payload?.bossTrialResolvedIslandNumber === null, 'Expected persist success with island=2 and boss marker null.');
    expect('refresh_hydration_marker_state', (event) => mode === 'table'
        ? event.stage === 'runtime_state_hydrate_query_success' &&
            event.payload?.currentIslandNumber === 2 &&
            event.payload?.bossTrialResolvedIslandNumber === null
        : (event.stage === 'runtime_state_hydrate_skipped_remote' ||
            event.stage === 'runtime_state_hydrate_query_error' ||
            event.stage === 'runtime_state_hydrate_no_row') &&
            event.payload?.fallbackCurrentIslandNumber === 2 &&
            event.payload?.fallbackBossTrialResolvedIslandNumber === null, mode === 'table'
        ? 'Expected table hydration success with island=2 and boss marker null after refresh.'
        : 'Expected fallback hydration event with fallback island=2 and fallback boss marker null after refresh.');
    return {
        passed: checks.every((check) => check.passed),
        generatedAt: new Date().toISOString(),
        mode,
        scope,
        checks,
    };
}
function summarizeProgressionAssertionReport(report) {
    const failedChecks = report.checks.filter((check) => !check.passed).map((check) => check.name);
    const passedChecks = report.checks.length - failedChecks.length;
    return {
        passed: report.passed,
        mode: report.mode,
        scope: report.scope,
        generatedAt: report.generatedAt,
        totalChecks: report.checks.length,
        passedChecks,
        failedChecks,
        summaryLine: report.passed
            ? `PASS [${report.mode}] ${passedChecks}/${report.checks.length} checks`
            : `FAIL [${report.mode}] ${passedChecks}/${report.checks.length} checks | failed: ${failedChecks.join(', ')}`,
    };
}
function isProgressionRelevantEvent(event) {
    return event.stage.startsWith('runtime_state_');
}
function findRunWindow(events, ref) {
    const defaultWindow = {
        startIndex: 0,
        endIndex: events.length,
        matchedRunId: undefined,
        matchedScenario: undefined,
    };
    const normalizedRef = typeof ref === 'string' ? ref.trim() : '';
    if (!normalizedRef) {
        return defaultWindow;
    }
    let startIndex = -1;
    let matchedRunId;
    let matchedScenario;
    for (let index = events.length - 1; index >= 0; index -= 1) {
        const event = events[index];
        if (event.stage !== 'repro_run_started')
            continue;
        const runId = typeof event.payload?.runId === 'string' ? event.payload.runId : undefined;
        const scenario = typeof event.payload?.scenario === 'string' ? event.payload.scenario : undefined;
        if (runId === normalizedRef || scenario === normalizedRef) {
            startIndex = index;
            matchedRunId = runId;
            matchedScenario = scenario;
            break;
        }
    }
    if (startIndex < 0) {
        return defaultWindow;
    }
    let endIndex = events.length;
    for (let index = startIndex + 1; index < events.length; index += 1) {
        if (events[index].stage === 'repro_run_started') {
            endIndex = index;
            break;
        }
    }
    return {
        startIndex,
        endIndex,
        matchedRunId,
        matchedScenario,
    };
}
function filterProgressionRunEvents(events, ref) {
    const runWindow = findRunWindow(events, ref);
    const filteredEvents = events
        .slice(runWindow.startIndex, runWindow.endIndex)
        .filter((event) => isProgressionRelevantEvent(event));
    return {
        ...runWindow,
        filteredEvents,
    };
}
function installGlobalDebugListeners() {
    if (typeof window === 'undefined')
        return;
    if (window.__islandRunEntryDebugListenersInstalled)
        return;
    window.__islandRunEntryDebugListenersInstalled = true;
    window.addEventListener('error', (event) => {
        logIslandRunEntryDebug('window_error', {
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno,
            stack: event.error instanceof Error ? event.error.stack : undefined,
            errorName: event.error instanceof Error ? event.error.name : undefined,
            runtimeSnapshot: collectRuntimeSnapshot(),
        });
    });
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        logIslandRunEntryDebug('window_unhandled_rejection', {
            reason: reason instanceof Error
                ? reason.message
                : typeof reason === 'string'
                    ? reason
                    : 'unknown_rejection_reason',
            stack: reason instanceof Error ? reason.stack : undefined,
            errorName: reason instanceof Error ? reason.name : undefined,
            runtimeSnapshot: collectRuntimeSnapshot(),
        });
    });
    document.addEventListener('visibilitychange', () => {
        logIslandRunEntryDebug('document_visibility_change', {
            visibilityState: document.visibilityState,
        });
    });
    window.addEventListener('pageshow', () => {
        logIslandRunEntryDebug('window_pageshow', {
            visibilityState: document.visibilityState,
        });
    });
    window.addEventListener('pagehide', () => {
        logIslandRunEntryDebug('window_pagehide', {
            visibilityState: document.visibilityState,
        });
    });
}
function installDebugWindowHelpers() {
    if (typeof window === 'undefined')
        return;
    if (!isIslandRunEntryDebugEnabled())
        return;
    if (window.__islandRunEntryDebugDump &&
        window.__islandRunEntryDebugClear &&
        window.__islandRunEntryDebugEvidence &&
        window.__islandRunEntryDebugAssertProgressionSequence &&
        window.__islandRunEntryDebugAssertProgressionSummary &&
        window.__islandRunEntryDebugExportProgressionBundle &&
        window.__islandRunEntryDebugFilterProgressionRun) {
        return;
    }
    installGlobalDebugListeners();
    window.__islandRunEntryDebugDump = () => readDebugBuffer();
    window.__islandRunEntryDebugClear = () => writeDebugBuffer([]);
    window.__islandRunEntryDebugEvidence = () => collectDebugEvidence();
    window.__islandRunEntryDebugMark = (label, payload) => {
        logIslandRunEntryDebug('manual_mark', {
            label,
            ...payload,
        });
    };
    window.__islandRunEntryDebugStartRun = (scenario) => {
        const runId = createDebugRunId(scenario);
        logIslandRunEntryDebug('repro_run_started', { scenario, runId });
        return runId;
    };
    window.__islandRunEntryDebugMarkCheckpoint = (checkpoint, payload) => {
        logIslandRunEntryDebug('repro_checkpoint', {
            checkpoint,
            ...payload,
        });
    };
    window.__islandRunEntryDebugAssertProgressionSequence = (mode = 'table') => {
        return assertProgressionSequence(readDebugBuffer(), mode, 'full_buffer');
    };
    window.__islandRunEntryDebugAssertProgressionSummary = (mode = 'table') => {
        const report = assertProgressionSequence(readDebugBuffer(), mode, 'full_buffer');
        const summary = summarizeProgressionAssertionReport(report);
        console.info('[IslandRunEntryDebugAssertionSummary]', summary.summaryLine, summary);
        return summary;
    };
    window.__islandRunEntryDebugExportProgressionBundle = (mode = 'table', ref) => {
        const buffer = readDebugBuffer();
        const runScoped = filterProgressionRunEvents(buffer, ref);
        const hasRunFilterRef = typeof ref === 'string' && ref.trim().length > 0;
        const hasMatchedRunWindow = Boolean(runScoped.matchedRunId || runScoped.matchedScenario);
        const filterApplied = hasRunFilterRef;
        const filterMatched = hasRunFilterRef && hasMatchedRunWindow;
        const scope = filterMatched ? 'run_filtered' : 'full_buffer';
        const scopedEvents = scope === 'run_filtered' ? runScoped.filteredEvents : undefined;
        const report = assertProgressionSequence(scopedEvents ?? buffer, mode, scope);
        const summary = summarizeProgressionAssertionReport(report);
        const evidence = collectDebugEvidence();
        const bundle = {
            mode,
            scope,
            summary,
            evidence: {
                ...evidence,
                events: scopedEvents ?? evidence.events,
            },
            runFilterRef: ref,
            filterApplied,
            filterMatched,
            matchedRunId: runScoped.matchedRunId,
            matchedScenario: runScoped.matchedScenario,
            filteredEventCount: scopedEvents?.length,
        };
        console.info('[IslandRunEntryDebugProgressionBundle]', {
            mode,
            scope,
            runFilterRef: ref,
            filterApplied,
            filterMatched,
            matchedRunId: runScoped.matchedRunId,
            matchedScenario: runScoped.matchedScenario,
            summaryLine: summary.summaryLine,
            generatedAt: evidence.generatedAt,
            eventCount: bundle.evidence.events.length,
            networkCount: evidence.network.length,
        });
        return bundle;
    };
    window.__islandRunEntryDebugRuntimeStateSummary = () => summarizeRuntimeVerification(readDebugBuffer());
    window.__islandRunEntryDebugFilterProgressionRun = (ref, mode = 'table') => {
        const buffer = readDebugBuffer();
        const { filteredEvents, matchedRunId, matchedScenario } = filterProgressionRunEvents(buffer, ref);
        const hasRunFilterRef = typeof ref === 'string' && ref.trim().length > 0;
        const hasMatchedRunWindow = Boolean(matchedRunId || matchedScenario);
        const filterApplied = hasRunFilterRef;
        const filterMatched = hasRunFilterRef && hasMatchedRunWindow;
        const scope = filterMatched ? 'run_filtered' : 'full_buffer';
        const report = assertProgressionSequence(filteredEvents, mode, scope);
        const result = {
            ref,
            filterApplied,
            filterMatched,
            matchedRunId,
            matchedScenario,
            mode,
            scope,
            eventCount: filteredEvents.length,
            events: filteredEvents,
            report,
        };
        console.info('[IslandRunEntryDebugProgressionRunFilter]', {
            ref,
            mode,
            scope,
            filterApplied,
            filterMatched,
            matchedRunId,
            matchedScenario,
            eventCount: filteredEvents.length,
            passed: report.passed,
        });
        return result;
    };
    logIslandRunEntryDebug('debug_helpers_installed', {
        visibilityState: typeof document === 'undefined' ? 'unknown' : document.visibilityState,
    });
}
installGlobalDebugListeners();
installDebugWindowHelpers();
