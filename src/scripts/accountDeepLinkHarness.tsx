/**
 * Dev-only harness for the account panel's `initialFolder` deep-link, which the
 * app can only reach behind a signed-in session. Served via
 * account-deeplink-preview.html on the dev server only.
 *
 * `?folder=personalization` mounts the panel as the launcher's Personalisation
 * tile opens it; `?folder=appearance` targets the Appearance / Theme folder.
 * `?late=1` mounts with no folder and sets it a second later, exercising the
 * "deep-link arrives while already mounted" path separately from mount time.
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MyAccountPanel } from '../features/account/MyAccountPanel';
import { createDemoSession } from '../services/demoSession';
import { ThemeProvider } from '../contexts/ThemeContext';
import '../index.css';

const params = new URLSearchParams(window.location.search);

function Harness() {
  const raw = params.get('folder');
  const initial = raw === 'personalization' || raw === 'appearance' ? raw : null;
  const late = params.get('late') === '1';
  const [folder, setFolder] = useState<'personalization' | 'appearance' | null>(
    late ? null : initial,
  );
  const [openedCount, setOpenedCount] = useState(0);

  useEffect(() => {
    if (!late) return;
    const id = window.setTimeout(() => setFolder('personalization'), 1000);
    return () => window.clearTimeout(id);
  }, [late]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div
        data-testid="probe"
        data-folder={String(folder)}
        data-opened-count={openedCount}
        style={{ position: 'fixed', bottom: 0, left: 0, zIndex: 99999, fontSize: 10, background: '#fff' }}
      >
        folder={String(folder)} consumed={openedCount}
      </div>
      <MyAccountPanel
        initialFolder={folder}
        onInitialFolderOpened={() => {
          setOpenedCount((n) => n + 1);
          setFolder(null);
        }}
        session={createDemoSession()}
        isDemoExperience
        isAuthenticated
        onSignOut={() => {}}
        onEditProfile={() => {}}
        profile={null}
        stats={null}
        profileLoading={false}
        soundEffectsEnabled
        soundPreferenceSaving={false}
        soundPreferenceError={null}
        onSoundEffectsEnabledChange={() => {}}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <Harness />
  </ThemeProvider>,
);
