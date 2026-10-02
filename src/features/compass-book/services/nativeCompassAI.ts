import { Capacitor, registerPlugin } from '@capacitor/core';

type NativeCompassAIPlugin = {
  availability: () => Promise<{
    available: boolean;
    reason: string;
    model: string;
  }>;
  suggestNextStep: (input: {
    question: string;
    answer: string;
    authoredMeaning: string;
    authoredBridge: string;
  }) => Promise<{
    text: string;
    model: string;
  }>;
  generate: (input: {
    instructions: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
  }) => Promise<{
    text: string;
    model: string;
  }>;
};

const NativeCompassAI = registerPlugin<NativeCompassAIPlugin>('NativeCompassAI');

export type NativeCompassAIStatus = {
  available: boolean;
  reason: string;
  model: 'apple-foundation-models' | 'gemini-nano' | 'authored-fallback';
};

/**
 * The same plugin ("NativeCompassAI") is implemented on both native
 * platforms: Apple Foundation Models on iOS
 * (ios/App/App/NativeCompassAIPlugin.swift) and Gemini Nano through ML Kit
 * on Android (android/app/src/main/java/.../NativeCompassAIPlugin.kt).
 */
export async function getNativeCompassAIStatus(): Promise<NativeCompassAIStatus> {
  const platform = Capacitor.getPlatform();
  if (!Capacitor.isNativePlatform() || (platform !== 'ios' && platform !== 'android')) {
    return { available: false, reason: 'not_native', model: 'authored-fallback' };
  }

  try {
    const status = await NativeCompassAI.availability();
    return {
      available: status.available,
      reason: status.reason,
      model: status.model === 'apple-foundation-models' || status.model === 'gemini-nano'
        ? status.model
        : 'authored-fallback',
    };
  } catch {
    return { available: false, reason: 'native_plugin_unavailable', model: 'authored-fallback' };
  }
}

export async function suggestPrivateCompassNextStep(input: {
  question: string;
  answer: string;
  authoredMeaning: string;
  authoredBridge: string;
}): Promise<string> {
  const response = await NativeCompassAI.suggestNextStep(input);
  const text = response.text.trim();
  if (!text) throw new Error('The on-device suggestion was empty.');
  return text;
}

/**
 * General on-device generation: Apple's Foundation Models (iOS 26+, Apple
 * Intelligence enabled) or Gemini Nano (eligible Android phones). Throws when
 * unavailable or when generation fails; the shared AI runtime then falls back
 * to the server.
 */
export async function generateOnDevice(input: {
  instructions: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const response = await NativeCompassAI.generate(input);
  const text = response.text.trim();
  if (!text) throw new Error('The on-device response was empty.');
  return text;
}
