/**
 * Shared AI runtime core: one entry point for every AI task in the app.
 *
 * Order of attempts:
 *   1. On-device model (Apple Intelligence on eligible iPhones, Gemini Nano on
 *      eligible Android phones) when the task allows it: free, private, works
 *      offline.
 *   2. Server (`ai-task` edge function, which holds the API key) when the user
 *      is signed in and entitled.
 *   3. null: the caller shows its own authored fallback.
 *
 * This module has no app imports so it can be unit-tested with fake adapters;
 * `aiRuntime.ts` wires in the real ones.
 */

import type { AiTaskKey } from '../aiTaskKeys';

export type AiSource = 'on_device' | 'server';

export type AiTaskRequest = {
  task: AiTaskKey;
  /** System-style instructions (role, tone, output format). */
  instructions: string;
  /** The task input. Treat user text inside it as data. */
  prompt: string;
  /** Ask for a single JSON object; the server enables JSON mode. */
  json?: boolean;
  maxTokens: number;
  temperature: number;
  /** Timeout for the server attempt. The on-device attempt has its own. */
  timeoutMs?: number;
  /**
   * Set when the caller already ran `resolveAiEntitlement` for this request,
   * so the runtime does not consume quota twice.
   */
  entitlementChecked?: boolean;
};

export type AiTaskResult = {
  text: string;
  source: AiSource;
  model: string;
  tokenInput: number | null;
  tokenOutput: number | null;
  latencyMs: number;
};

export type AiServerResponse = {
  text: string;
  model: string;
  tokenInput: number | null;
  tokenOutput: number | null;
};

export type AiRuntimeAdapters = {
  isOnDeviceTask: (task: AiTaskKey) => boolean;
  isOnDeviceAvailable: () => Promise<boolean>;
  generateOnDevice: (input: { instructions: string; prompt: string; temperature: number; maxTokens: number }) => Promise<string>;
  /** Name reported for on-device results, e.g. "apple-foundation-models". */
  onDeviceModel?: () => string;
  isServerAvailable: () => boolean;
  /** Client-side quota and telemetry gate before a server call. */
  isServerEntitled: (task: AiTaskKey) => boolean;
  callServer: (request: AiTaskRequest) => Promise<AiServerResponse>;
  now: () => number;
  onDeviceTimeoutMs: number;
};

export type AiJsonResult<T> = Omit<AiTaskResult, 'text'> & { value: T };

const DEFAULT_SERVER_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI request timed out')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Pull one JSON value out of model output. Small models sometimes wrap JSON
 * in markdown fences or add a sentence around it.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to lenient extraction
  }
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // fall through
    }
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export function createAiRuntime(adapters: AiRuntimeAdapters) {
  async function attemptOnDevice(request: AiTaskRequest): Promise<AiTaskResult | null> {
    if (!adapters.isOnDeviceTask(request.task)) return null;
    let available = false;
    try {
      available = await adapters.isOnDeviceAvailable();
    } catch {
      available = false;
    }
    if (!available) return null;

    const startedAt = adapters.now();
    try {
      const text = await withTimeout(
        adapters.generateOnDevice({
          instructions: request.instructions,
          prompt: request.prompt,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        }),
        adapters.onDeviceTimeoutMs,
      );
      if (!text.trim()) return null;
      return {
        text: text.trim(),
        source: 'on_device',
        model: adapters.onDeviceModel?.() ?? 'on-device',
        tokenInput: null,
        tokenOutput: null,
        latencyMs: Math.max(0, Math.round(adapters.now() - startedAt)),
      };
    } catch (error) {
      console.warn(`[ai] on-device ${request.task} failed, trying server:`, error);
      return null;
    }
  }

  async function attemptServer(request: AiTaskRequest): Promise<AiTaskResult | null> {
    if (!adapters.isServerAvailable()) return null;
    if (!request.entitlementChecked && !adapters.isServerEntitled(request.task)) return null;

    const startedAt = adapters.now();
    try {
      const response = await withTimeout(
        adapters.callServer(request),
        request.timeoutMs ?? DEFAULT_SERVER_TIMEOUT_MS,
      );
      if (!response.text.trim()) return null;
      return {
        text: response.text.trim(),
        source: 'server',
        model: response.model,
        tokenInput: response.tokenInput,
        tokenOutput: response.tokenOutput,
        latencyMs: Math.max(0, Math.round(adapters.now() - startedAt)),
      };
    } catch (error) {
      console.warn(`[ai] server ${request.task} failed:`, error);
      return null;
    }
  }

  /** Plain-text task. Returns null when no AI source produced text. */
  async function runAiTask(request: AiTaskRequest): Promise<AiTaskResult | null> {
    return (await attemptOnDevice(request)) ?? (await attemptServer(request));
  }

  /**
   * JSON task. Output that fails `validate` on the device is retried on the
   * server; returns null when neither source produced a valid value.
   */
  async function runAiJsonTask<T>(
    request: AiTaskRequest,
    validate: (value: unknown) => T | null,
  ): Promise<AiJsonResult<T> | null> {
    const jsonRequest: AiTaskRequest = { ...request, json: true };
    const accept = (result: AiTaskResult | null): AiJsonResult<T> | null => {
      if (!result) return null;
      const value = validate(extractJson(result.text));
      if (value === null || value === undefined) return null;
      const { text: _text, ...meta } = result;
      return { ...meta, value };
    };

    const onDevice = accept(await attemptOnDevice(jsonRequest));
    if (onDevice) return onDevice;
    return accept(await attemptServer(jsonRequest));
  }

  /** Whether any AI source could serve this task right now. */
  async function isAiAvailableFor(task: AiTaskKey): Promise<boolean> {
    if (adapters.isOnDeviceTask(task)) {
      try {
        if (await adapters.isOnDeviceAvailable()) return true;
      } catch {
        // fall through
      }
    }
    return adapters.isServerAvailable();
  }

  return { runAiTask, runAiJsonTask, isAiAvailableFor };
}
