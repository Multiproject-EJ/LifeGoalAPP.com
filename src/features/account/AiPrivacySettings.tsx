import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  readAiPreferences,
  setAiPreferences,
  subscribeToAiPreferences,
  type AiPreferences,
} from '../../services/ai/aiPreferences';
import { SettingsGroup, SettingsRow, SettingsSwitch } from './SettingsList';

type OnDeviceStatus = 'checking' | 'available' | 'unavailable' | 'not_native';
type NativePlatform = 'ios' | 'android';

const UNAVAILABLE_REASONS: Record<NativePlatform, Record<string, string>> = {
  ios: {
    device_not_eligible: 'This iPhone does not support Apple Intelligence.',
    apple_intelligence_not_enabled: 'Turn on Apple Intelligence in iPhone Settings to use it here.',
    model_not_ready: 'Apple Intelligence is still downloading on this iPhone.',
    os_not_supported: 'On-device AI needs iOS 26 or later.',
  },
  android: {
    device_not_eligible: 'This phone does not support Gemini Nano, Android\'s on-device AI.',
    model_not_ready: 'Gemini Nano is still downloading on this phone. It can take a few minutes on Wi-Fi.',
    aicore_unavailable: 'Update "Android AICore" from the Play Store to use on-device AI.',
  },
};

const PLATFORM_COPY: Record<NativePlatform, { device: string; model: string }> = {
  ios: { device: 'iPhone', model: 'Apple Intelligence' },
  android: { device: 'phone', model: 'Gemini Nano' },
};

function nativePlatform(): NativePlatform | null {
  if (!Capacitor.isNativePlatform()) return null;
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android' ? platform : null;
}

/**
 * AI & privacy: whether AI suggestions run at all, and whether they may use
 * the cloud when on-device AI (Apple Intelligence on iPhone, Gemini Nano on
 * Android) is unavailable. Read by the shared AI runtime
 * (src/services/ai/aiRuntime.ts).
 */
export function AiPrivacySettings() {
  const [preferences, setPreferences] = useState<AiPreferences>(() => readAiPreferences());
  const [onDeviceStatus, setOnDeviceStatus] = useState<OnDeviceStatus>('checking');
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const platform = nativePlatform();
  const copy = PLATFORM_COPY[platform ?? 'ios'];

  useEffect(() => subscribeToAiPreferences(setPreferences), []);

  useEffect(() => {
    if (!platform) {
      setOnDeviceStatus('not_native');
      return;
    }
    let active = true;
    import('../compass-book/services/nativeCompassAI')
      .then((module) => module.getNativeCompassAIStatus())
      .then((status) => {
        if (!active) return;
        setOnDeviceStatus(status.available ? 'available' : 'unavailable');
        setUnavailableReason(UNAVAILABLE_REASONS[platform][status.reason] ?? null);
      })
      .catch(() => {
        if (active) setOnDeviceStatus('unavailable');
      });
    return () => {
      active = false;
    };
  }, [platform]);

  const update = (patch: Partial<AiPreferences>) => setPreferences(setAiPreferences(patch));

  const hero = onDeviceStatus === 'available'
    ? {
      title: `AI runs on your ${copy.device}`,
      body: `${copy.model} writes habit ideas, tips and explanations on this device. What you type for these stays on your phone.`,
      status: 'On-device AI available',
      ok: true,
    }
    : onDeviceStatus === 'unavailable'
      ? {
        title: 'On-device AI is not available',
        body: unavailableReason ?? `${copy.model} is not available on this ${copy.device} right now.`,
        status: preferences.cloudFallback ? 'Using cloud AI instead' : 'AI suggestions paused',
        ok: false,
      }
      : onDeviceStatus === 'not_native'
        ? preferences.cloudFallback
          ? {
            title: 'AI suggestions use the cloud here',
            body: 'In the iPhone and Android apps, AI runs on the phone where it can (Apple Intelligence or Gemini Nano). In the browser, suggestions come from our server.',
            status: 'Cloud AI allowed',
            ok: true,
          }
          : {
            title: 'AI is paused in this browser',
            body: 'Browsers have no on-device AI, so with cloud AI off you get written suggestions instead. In the iPhone and Android apps, AI can still run on the phone.',
            status: 'Cloud AI off',
            ok: false,
          }
        : null;

  return (
    <div className="settings-list">
      {hero ? (
        <div className="settings-list__hero">
          <h3>{hero.title}</h3>
          <p>{hero.body}</p>
          <span className={`settings-list__status${hero.ok ? ' settings-list__status--ok' : ''}`}>● {hero.status}</span>
        </div>
      ) : null}

      <SettingsGroup title="AI features">
        <SettingsRow
          title="AI suggestions"
          subtitle="Habit ideas, tips and explanations"
          control={(
            <SettingsSwitch
              label="AI suggestions"
              checked={preferences.aiEnabled}
              onChange={(next) => update({ aiEnabled: next })}
            />
          )}
        />
        <SettingsRow
          title="Allow cloud AI"
          subtitle="Coach chats, goal and Compass help, and a backup when on-device AI isn't available"
          control={(
            <SettingsSwitch
              label="Allow cloud AI"
              checked={preferences.cloudFallback}
              disabled={!preferences.aiEnabled}
              onChange={(next) => update({ cloudFallback: next })}
            />
          )}
        />
      </SettingsGroup>
      <p className="settings-list__note">
        With cloud AI off, nothing you type for AI leaves this device. Habit ideas and tips use
        on-device AI or written suggestions; goal suggestions use a simple built-in version; the
        coach chats, Compass help and Vision Star images pause.
      </p>
    </div>
  );
}
