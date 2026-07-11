/**
 * Dev-only visual harness for the Journal write-first home layout.
 * Served via journal-preview.html on the dev server only — never linked from
 * the app and excluded from the production build inputs.
 */
import { createRoot } from 'react-dom/client';
import { SupabaseAuthProvider } from '../features/auth/SupabaseAuthProvider';
import { Journal } from '../features/journal';
import { createDemoSession } from '../services/demoSession';
import '../index.css';

const demoSession = createDemoSession();

function Harness() {
  return (
    <div style={{ minHeight: '100vh', maxWidth: 720, margin: '0 auto', padding: '1rem' }}>
      <Journal session={demoSession} />
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <SupabaseAuthProvider>
      <Harness />
    </SupabaseAuthProvider>,
  );
}
