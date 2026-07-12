/**
 * SupabaseErrorTranslator (Part 2).
 *
 * Every provider failure is classified into an application-level AppError
 * before it can reach feature code or UI. Classification is heuristic on
 * purpose: it inspects HTTP status codes and message text without importing
 * Supabase types, so it also covers plain fetch/network failures and stays
 * usable in the Node test harness and the future Capacitor build.
 */

import type { AppError, AppErrorCategory, ServiceKind } from './types';

/** Loose shape covering Supabase AuthError/PostgrestError/StorageError/fetch errors. */
export interface ProviderErrorLike {
  message?: string;
  status?: number | string;
  statusCode?: number | string;
  code?: string | number;
  name?: string;
  error_description?: string;
  details?: string;
}

interface CategoryDefinition {
  code: string;
  severity: AppError['severity'];
  retryable: boolean;
  safeLocalMode: boolean;
  title: string;
  explanation: string;
}

const CATEGORY_DEFINITIONS: Record<AppErrorCategory, CategoryDefinition> = {
  offline: {
    code: 'SVC_OFFLINE',
    severity: 'warning',
    retryable: true,
    safeLocalMode: true,
    title: 'You are offline',
    explanation:
      'No internet connection was detected. Your work on this device is safe and will sync automatically when you reconnect.',
  },
  timeout: {
    code: 'SVC_TIMEOUT',
    severity: 'warning',
    retryable: true,
    safeLocalMode: true,
    title: 'Cloud services are slow to respond',
    explanation:
      'The cloud did not answer in time. Your work is saved on this device and syncing will retry automatically.',
  },
  quota_exceeded: {
    code: 'SVC_QUOTA_EXCEEDED',
    severity: 'error',
    retryable: false,
    safeLocalMode: true,
    title: 'Cloud sync is temporarily limited',
    explanation:
      'Cloud services are temporarily limited. Your work on this device is safe, supported features keep working, and everything will sync when full service returns.',
  },
  project_restricted: {
    code: 'SVC_PROJECT_RESTRICTED',
    severity: 'critical',
    retryable: false,
    safeLocalMode: true,
    title: 'Cloud services are temporarily unavailable',
    explanation:
      'Cloud services are temporarily unavailable. Your work on this device is safe and will sync automatically when services return.',
  },
  maintenance: {
    code: 'SVC_MAINTENANCE',
    severity: 'warning',
    retryable: true,
    safeLocalMode: true,
    title: 'Scheduled maintenance in progress',
    explanation:
      'Cloud services are undergoing maintenance. Supported features keep working on this device and everything will sync afterwards.',
  },
  auth_expired: {
    code: 'AUTH_SESSION_EXPIRED',
    severity: 'warning',
    retryable: false,
    safeLocalMode: true,
    title: 'Your session expired',
    explanation:
      'Please sign in again to keep your account in sync. Work saved on this device is not lost.',
  },
  invalid_credentials: {
    code: 'AUTH_INVALID_CREDENTIALS',
    severity: 'info',
    retryable: false,
    safeLocalMode: false,
    title: 'Sign-in failed',
    explanation: 'The email or password did not match. Please try again.',
  },
  permission_denied: {
    code: 'AUTH_PERMISSION_DENIED',
    severity: 'error',
    retryable: false,
    safeLocalMode: false,
    title: 'Action not allowed',
    explanation: 'Your account does not have permission for this action.',
  },
  storage_unavailable: {
    code: 'SVC_STORAGE_UNAVAILABLE',
    severity: 'warning',
    retryable: true,
    safeLocalMode: true,
    title: 'File uploads are delayed',
    explanation:
      'Cloud file storage is temporarily unavailable. Uploads are kept on this device and will finish automatically later.',
  },
  realtime_unavailable: {
    code: 'SVC_REALTIME_UNAVAILABLE',
    severity: 'info',
    retryable: true,
    safeLocalMode: true,
    title: 'Live updates are paused',
    explanation:
      'Live updates are temporarily paused. Everything else keeps working and updates resume automatically.',
  },
  edge_function_unavailable: {
    code: 'SVC_EDGE_FUNCTION_UNAVAILABLE',
    severity: 'warning',
    retryable: true,
    safeLocalMode: true,
    title: 'Some cloud features are unavailable',
    explanation:
      'A cloud feature is temporarily unavailable. Local features keep working and the feature returns automatically.',
  },
  rate_limited: {
    code: 'SVC_RATE_LIMITED',
    severity: 'warning',
    retryable: true,
    safeLocalMode: true,
    title: 'Syncing is slowing down briefly',
    explanation:
      'The cloud asked us to slow down. Syncing continues automatically in a moment; nothing is lost.',
  },
  conflict: {
    code: 'SYNC_CONFLICT',
    severity: 'warning',
    retryable: false,
    safeLocalMode: true,
    title: 'A change needs review',
    explanation:
      'This item was changed on another device. The newer version was kept; nothing was deleted.',
  },
  user_limit_reached: {
    code: 'USER_DATA_LIMIT_REACHED',
    severity: 'warning',
    retryable: false,
    safeLocalMode: false,
    title: 'Storage limit reached for this feature',
    explanation:
      'This item was not saved because your account reached the maximum amount of stored data for this feature. Delete items you no longer need and try again.',
  },
  unknown: {
    code: 'SVC_UNKNOWN',
    severity: 'error',
    retryable: true,
    safeLocalMode: true,
    title: 'Something went wrong in the cloud',
    explanation:
      'An unexpected cloud problem occurred. Your work on this device is safe and syncing will retry automatically.',
  },
};

function readStatus(error: ProviderErrorLike): number | null {
  for (const candidate of [error.status, error.statusCode]) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'string' && /^\d+$/.test(candidate)) return Number(candidate);
  }
  if (typeof error.code === 'number' && error.code >= 100 && error.code < 600) return error.code;
  return null;
}

function collectText(error: ProviderErrorLike): string {
  return [error.message, error.error_description, error.details, String(error.code ?? ''), error.name]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();
}

function matchesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

export interface TranslateOptions {
  /** Service the call targeted; refines classification of generic failures. */
  service?: ServiceKind;
  /** Report of the network layer at the time of failure, when known. */
  networkOnline?: boolean;
}

/** Classify a provider error into an application category. */
export function classifyProviderError(
  error: unknown,
  options: TranslateOptions = {},
): AppErrorCategory {
  const providerError: ProviderErrorLike =
    error && typeof error === 'object' ? (error as ProviderErrorLike) : { message: String(error) };
  const text = collectText(providerError);
  const status = readStatus(providerError);

  if (options.networkOnline === false) return 'offline';
  if (matchesAny(text, ['failed to fetch', 'networkerror', 'network request failed', 'load failed', 'fetch failed', 'err_internet_disconnected'])) {
    return 'offline';
  }
  if (matchesAny(text, ['abort', 'timeout', 'timed out', 'deadline exceeded', 'etimedout', '57014'])) {
    return 'timeout';
  }
  // Per-account data cap raised by the enforce_user_data_limit() database
  // trigger (migration 0278). Checked before the platform-quota needles
  // because both mention "limit", but this one is the user's own cap.
  if (matchesAny(text, ['user_data_limit_exceeded'])) {
    return 'user_limit_reached';
  }
  if (status === 540 || matchesAny(text, ['quota', 'exceeded the limit', 'egress limit', 'usage limit', 'db_size', 'disk quota', 'over_request_rate_limit_quota'])) {
    return 'quota_exceeded';
  }
  if (matchesAny(text, ['project is paused', 'project paused', 'project not found', 'project is restricted', 'project restricted', 'suspended'])) {
    return 'project_restricted';
  }
  if (status === 503 || matchesAny(text, ['maintenance', 'service unavailable'])) {
    return 'maintenance';
  }
  if (matchesAny(text, ['invalid login credentials', 'invalid_grant', 'email not confirmed', 'invalid password', 'user not found'])) {
    return 'invalid_credentials';
  }
  if (matchesAny(text, ['jwt expired', 'refresh_token_not_found', 'invalid refresh token', 'session expired', 'refresh token', 'token is expired'])) {
    return 'auth_expired';
  }
  if (status === 401) {
    return options.service === 'auth' ? 'invalid_credentials' : 'auth_expired';
  }
  if (status === 429 || matchesAny(text, ['rate limit', 'too many requests', 'over_request_rate_limit'])) {
    return 'rate_limited';
  }
  if (status === 403 || matchesAny(text, ['permission denied', 'row-level security', 'rls', 'not authorized', '42501'])) {
    return 'permission_denied';
  }
  if (status === 409 || matchesAny(text, ['conflict', 'duplicate key', '23505', 'version mismatch'])) {
    return 'conflict';
  }
  if (options.service === 'storage' || matchesAny(text, ['bucket', 'storage/'])) {
    return 'storage_unavailable';
  }
  if (options.service === 'realtime' || matchesAny(text, ['realtime', 'websocket', 'channel error'])) {
    return 'realtime_unavailable';
  }
  if (options.service === 'edgeFunctions' || matchesAny(text, ['edge function', 'functionsfetcherror', 'functionshttperror', 'functionsrelayerror'])) {
    return 'edge_function_unavailable';
  }
  if (status !== null && status >= 500) {
    return 'unknown';
  }
  return 'unknown';
}

/**
 * Translate any provider failure into the AppError shape UI is allowed to see.
 * The raw message survives only in `technicalDetail` for diagnostics export.
 */
export function translateProviderError(error: unknown, options: TranslateOptions = {}): AppError {
  const category = classifyProviderError(error, options);
  const definition = CATEGORY_DEFINITIONS[category];
  const providerError: ProviderErrorLike =
    error && typeof error === 'object' ? (error as ProviderErrorLike) : { message: String(error) };
  const status = readStatus(providerError);

  return {
    ...definition,
    category,
    service: options.service,
    technicalDetail: [
      providerError.name,
      status !== null ? `status=${status}` : null,
      providerError.message ?? String(error),
    ]
      .filter(Boolean)
      .join(' '),
  };
}

/** True when a value already is a translated AppError. */
export function isAppError(value: unknown): value is AppError {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as AppError).code === 'string' &&
      typeof (value as AppError).category === 'string' &&
      typeof (value as AppError).title === 'string' &&
      typeof (value as AppError).explanation === 'string',
  );
}

/** Get the static definition for a category (used by UI previews and tests). */
export function getCategoryDefinition(category: AppErrorCategory): CategoryDefinition {
  return CATEGORY_DEFINITIONS[category];
}
