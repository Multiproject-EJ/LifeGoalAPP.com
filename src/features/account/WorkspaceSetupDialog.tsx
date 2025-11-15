import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import type { WorkspaceProfileRow } from '../../services/workspaceProfile';
import { upsertWorkspaceProfile } from '../../services/workspaceProfile';

type WorkspaceSetupDialogProps = {
  isOpen: boolean;
  session: Session | null;
  profile: WorkspaceProfileRow | null;
  onClose: () => void;
  onSaved: (profile: WorkspaceProfileRow) => void;
};

export function WorkspaceSetupDialog({
  isOpen,
  session,
  profile,
  onClose,
  onSaved,
}: WorkspaceSetupDialogProps) {
  const { client } = useSupabaseAuth();
  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      setFullName('');
      setWorkspaceName('');
      return;
    }
    setFullName(profile.full_name ?? '');
    setWorkspaceName(profile.workspace_name ?? '');
  }, [profile]);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen || !session) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) {
      setErrorMessage('Supabase client is not ready.');
      return;
    }

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setErrorMessage('Add your name to personalize the workspace.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { data, error } = await upsertWorkspaceProfile({
        user_id: session.user.id,
        full_name: trimmedName,
        workspace_name: workspaceName.trim() || null,
      });
      if (error || !data) {
        throw error ?? new Error('Unable to save profile.');
      }

      const { error: authError } = await client.auth.updateUser({
        data: {
          full_name: trimmedName,
        },
      });
      if (authError) throw authError;

      setStatusMessage('Profile updated!');
      onSaved(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-setup" role="dialog" aria-modal="true" aria-label="Workspace setup">
      <div className="workspace-setup__backdrop" onClick={onClose} role="presentation" />
      <div className="workspace-setup__card">
        <button type="button" className="workspace-setup__close" onClick={onClose}>
          <span aria-hidden="true">×</span>
          <span className="sr-only">Close workspace setup</span>
        </button>
        <div className="workspace-setup__header">
          <p className="workspace-setup__eyebrow">Complete your account</p>
          <h2>Save your account details</h2>
          <p>
            Share your name and workspace title so your account looks personalized every time you sign in. We’ll
            sync these details to Supabase.
          </p>
        </div>
        <form className="workspace-setup__form" onSubmit={handleSubmit}>
          <label className="supabase-auth__field">
            <span>Your name</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={session.user.email ?? 'you@example.com'}
              required
            />
          </label>
          <label className="supabase-auth__field">
            <span>Workspace name</span>
            <input
              type="text"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="My rituals HQ"
            />
          </label>
          {statusMessage ? (
            <p className="supabase-auth__status supabase-auth__status--success">{statusMessage}</p>
          ) : null}
          {errorMessage ? (
            <p className="supabase-auth__status supabase-auth__status--error">{errorMessage}</p>
          ) : null}
          <div className="workspace-setup__actions">
            <button type="submit" className="supabase-auth__action auth-card__primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save my account'}
            </button>
            <button type="button" className="supabase-auth__action" onClick={onClose} disabled={saving}>
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
