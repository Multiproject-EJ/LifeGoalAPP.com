import { useMemo, useState } from 'react';
import { createDemoSession } from '../../services/demoSession';
import { MyAccountPanel } from './MyAccountPanel';

/**
 * Dev-only preview of the Settings panel with the demo user, for design
 * review and screenshots: /dev/settings-preview (Vite dev server only).
 */
export default function SettingsPreview() {
  const session = useMemo(() => createDemoSession(), []);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [gameMenuActive, setGameMenuActive] = useState(true);

  return (
    <div className="workspace-stage workspace-stage--account">
      <div className="workspace-content">
        <MyAccountPanel
          session={session}
          isDemoExperience
          isAuthenticated={false}
          onSignOut={() => console.info('[preview] sign out')}
          onEditProfile={() => console.info('[preview] edit profile')}
          profile={null}
          stats={null}
          profileLoading={false}
          soundEffectsEnabled={soundEffectsEnabled}
          soundPreferenceSaving={false}
          soundPreferenceError={null}
          onSoundEffectsEnabledChange={setSoundEffectsEnabled}
          isMobileMenuImageActive={gameMenuActive}
          onGameModePreferenceChange={setGameMenuActive}
        />
      </div>
    </div>
  );
}
