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
};

const NativeCompassAI = registerPlugin<NativeCompassAIPlugin>('NativeCompassAI');

export type NativeCompassAIStatus = {
  available: boolean;
  reason: string;
  model: 'apple-foundation-models' | 'authored-fallback';
};

export async function getNativeCompassAIStatus(): Promise<NativeCompassAIStatus> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    return { available: false, reason: 'not_native_ios', model: 'authored-fallback' };
  }

  try {
    const status = await NativeCompassAI.availability();
    return {
      available: status.available,
      reason: status.reason,
      model: status.model === 'apple-foundation-models'
        ? 'apple-foundation-models'
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
