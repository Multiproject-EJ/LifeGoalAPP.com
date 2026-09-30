/**
 * App wiring for the shared AI runtime (see aiRuntimeCore.ts for the order of
 * attempts). Every AI feature goes through `runAiTask` / `runAiJsonTask`; no
 * code outside the `ai-task` edge function holds a provider API key.
 */

import { Capacitor } from '@capacitor/core';
import { canUseSupabaseData, getSupabaseClient } from '../../lib/supabaseClient';
import { resolveAiEntitlement } from '../aiEntitlementService';
import { isOnDeviceAiTask } from '../aiTaskRouting';
import { readAiPreferences } from './aiPreferences';
import type { AiTaskKey } from '../aiTaskKeys';
import {
  createAiRuntime,
  type AiJsonResult,
  type AiServerResponse,
  type AiTaskRequest,
  type AiTaskResult,
} from './aiRuntimeCore';

export type { AiJsonResult, AiSource, AiTaskRequest, AiTaskResult } from './aiRuntimeCore';
export { extractJson } from './aiRuntimeCore';

// The on-device model needs a few seconds for a few hundred tokens.
const ON_DEVICE_TIMEOUT_MS = 15000;

let onDeviceAvailability: Promise<boolean> | null = null;

/** Apple Intelligence on iPhone, Gemini Nano on Android; none in browsers. */
function onDeviceModel(): string {
  return Capacitor.getPlatform() === 'android' ? 'gemini-nano' : 'apple-foundation-models';
}

function isOnDeviceAvailable(): Promise<boolean> {
  if (!readAiPreferences().aiEnabled) return Promise.resolve(false);
  if (!Capacitor.isNativePlatform()) return Promise.resolve(false);
  const platform = Capacitor.getPlatform();
  if (platform !== 'ios' && platform !== 'android') return Promise.resolve(false);
  if (!onDeviceAvailability) {
    onDeviceAvailability = import('../../features/compass-book/services/nativeCompassAI')
      .then((module) => module.getNativeCompassAIStatus())
      .then((status) => {
        // "model_not_ready" can change while the app runs; ask again next time.
        if (!status.available) onDeviceAvailability = null;
        return status.available;
      })
      .catch(() => {
        onDeviceAvailability = null;
        return false;
      });
  }
  return onDeviceAvailability;
}

async function generateOnDevice(input: {
  instructions: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
}): Promise<string> {
  const module = await import('../../features/compass-book/services/nativeCompassAI');
  return module.generateOnDevice(input);
}

async function callServer(request: AiTaskRequest): Promise<AiServerResponse> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<{
    text?: unknown;
    model?: unknown;
    usage?: { input?: unknown; output?: unknown };
  }>('ai-task', {
    body: {
      task: request.task,
      instructions: request.instructions,
      prompt: request.prompt,
      json: Boolean(request.json),
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    },
  });
  if (error) throw error;
  if (!data || typeof data.text !== 'string') throw new Error('ai-task returned no text');
  return {
    text: data.text,
    model: typeof data.model === 'string' ? data.model : 'server',
    tokenInput: typeof data.usage?.input === 'number' ? data.usage.input : null,
    tokenOutput: typeof data.usage?.output === 'number' ? data.usage.output : null,
  };
}

// Created on first use so importing this module stays side-effect free.
let runtime: ReturnType<typeof createAiRuntime> | null = null;

function getRuntime() {
  runtime ??= createAiRuntime({
    isOnDeviceTask: isOnDeviceAiTask,
    isOnDeviceAvailable,
    generateOnDevice,
    onDeviceModel,
    isServerAvailable: isServerAiAvailable,
    isServerEntitled: (task) => resolveAiEntitlement(task, true).allowed,
    callServer,
    now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    onDeviceTimeoutMs: ON_DEVICE_TIMEOUT_MS,
  });
  return runtime;
}

export function runAiTask(request: AiTaskRequest): Promise<AiTaskResult | null> {
  return getRuntime().runAiTask(request);
}

export function runAiJsonTask<T>(
  request: AiTaskRequest,
  validate: (value: unknown) => T | null,
): Promise<AiJsonResult<T> | null> {
  return getRuntime().runAiJsonTask(request, validate);
}

export function isAiAvailableFor(task: AiTaskKey): Promise<boolean> {
  return getRuntime().isAiAvailableFor(task);
}

/**
 * Whether the cloud AI path can be used: AI and cloud AI are allowed in
 * Settings → AI & privacy, and the user is signed in with Supabase configured.
 */
export function isServerAiAvailable(): boolean {
  const preferences = readAiPreferences();
  return preferences.aiEnabled && preferences.cloudFallback && canUseSupabaseData();
}
