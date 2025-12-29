import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SupabaseConnectionTest } from './SupabaseConnectionTest';
import { ThemeSelector } from '../../components/ThemeSelector';
import { NotificationSettingsSection, PushNotificationTestPanel, DailyReminderPreferences, PerHabitReminderPrefs, ReminderActionDebugPanel, ReminderAnalyticsDashboard } from '../notifications';
import { AiSettingsSection } from './AiSettingsSection';
import { YesterdayRecapSettings } from './YesterdayRecapSettings';
import { GamificationSettings } from '../gamification/GamificationSettings';
import { SettingsFolderButton } from '../../components/SettingsFolderButton';
import { SettingsFolderPopup } from '../../components/SettingsFolderPopup';
import type { WorkspaceProfileRow } from '../../services/workspaceProfile';
import type { WorkspaceStats } from '../../services/workspaceStats';
import { upsertWorkspaceProfile } from '../../services/workspaceProfile';
import { generateInitials } from '../../utils/initials';

type MyAccountPanelProps = {
  session: Session;
  isDemoExperience: boolean;
  isAuthenticated: boolean;
  onSignOut: () => void | Promise<void>;
  onEditProfile: () => void;
  profile: WorkspaceProfileRow | null;
  stats: WorkspaceStats | null;
  profileLoading: boolean;
  onProfileUpdate?: (profile: WorkspaceProfileRow) => void;
};

function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return 'Not available';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, options).format(timestamp);
}

export function MyAccountPanel({
  session,
  isDemoExperience,
  isAuthenticated,
  onSignOut,
  onEditProfile,
  profile,
  stats,
  profileLoading,
  onProfileUpdate,
}: MyAccountPanelProps) {
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [folder1Open, setFolder1Open] = useState(false);
  const [folder2Open, setFolder2Open] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  
  const user = session.user;
  const displayName =
    profile?.full_name || (user.user_metadata?.full_name as string | undefined) || user.email || 'Workspace member';
  const email = user.email || 'No email on file';
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || 'U';
  const workspaceName = profile?.workspace_name || 'Personal rituals workspace';
  const userInitials = profile?.initials || generateInitials(profile?.full_name || '');

  const planName =
    (user.user_metadata?.subscription_plan as string | undefined) ||
    (isDemoExperience ? 'Demo preview' : 'LifeGoal workspace');
  const planStatus =
    (user.user_metadata?.subscription_status as string | undefined) ||
    (isDemoExperience ? 'Preview mode' : 'Active');
  const renewsOn = formatDate(
    (user.user_metadata?.subscription_renews_on as string | undefined) ?? null,
    {
      dateStyle: 'medium',
    },
  );

  const onboardingComplete = Boolean(user.user_metadata?.onboarding_complete);
  const memberSince = formatDate(user.created_at, { dateStyle: 'medium' });
  const lastSignIn = formatDate(user.last_sign_in_at, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const workspaceMode = isDemoExperience ? 'Demo (local device only)' : 'Connected to Supabase';
  const showDemoNotice = isDemoExperience;
  const profileCardClassName = `account-panel__card account-panel__profile ${
    profileExpanded ? 'account-panel__profile--expanded' : ''
  }`;

  const handleToggleInitialsInMenu = async (enabled: boolean) => {
    if (!profile || isDemoExperience) return;
    
    setSavingPreference(true);
    try {
      const { data, error } = await upsertWorkspaceProfile({
        ...profile,
        show_initials_in_menu: enabled,
      });
      
      if (error) {
        console.error('Failed to update initials preference:', error);
        return;
      }
      
      if (data && onProfileUpdate) {
        onProfileUpdate(data);
      }
    } catch (error) {
      console.error('Failed to update initials preference:', error);
    } finally {
      setSavingPreference(false);
    }
  };

  return (
    <div className="account-panel">
      {showDemoNotice ? (
        <p className="account-panel__notice">
          You’re exploring demo data. Sign in to sync with your Supabase project.
        </p>
      ) : null}
      <section className="account-panel__card" aria-labelledby="account-theme">
        <p className="account-panel__eyebrow">Appearance</p>
        <ThemeSelector />
      </section>
      <div className="account-panel__summary-grid">
        <section
          className={profileCardClassName}
          aria-labelledby="account-profile"
        >
          <button
            type="button"
            className="account-panel__profile-summary"
            onClick={() => setProfileExpanded((prev) => !prev)}
            aria-expanded={profileExpanded}
            aria-controls="account-profile-details"
          >
            <div className="account-panel__avatar" aria-hidden="true">
              {avatarInitial}
            </div>
            <div className="account-panel__profile-text">
              <p className="account-panel__eyebrow">Profile</p>
              <h2 id="account-profile">My account</h2>
              <p className="account-panel__lead">Review your identity details and workspace access.</p>
            </div>
            <span className="account-panel__chevron" aria-hidden="true" />
          </button>
          <div
            id="account-profile-details"
            className="account-panel__profile-body"
            hidden={!profileExpanded}
          >
            <dl className="account-panel__details">
              <div>
                <dt>Name</dt>
                <dd>{displayName}</dd>
              </div>
              <div>
                <dt>Initials</dt>
                <dd>{userInitials || 'Not set'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{email}</dd>
              </div>
              <div>
                <dt>Workspace name</dt>
                <dd>{workspaceName}</dd>
              </div>
              <div>
                <dt>Workspace mode</dt>
                <dd>{workspaceMode}</dd>
              </div>
              <div>
                <dt>Onboarding</dt>
                <dd>{onboardingComplete ? 'Complete' : 'In progress'}</dd>
              </div>
            </dl>
            <div className="account-panel__actions-row">
              <button type="button" className="btn" onClick={onEditProfile} disabled={profileLoading}>
                {profileLoading ? 'Loading…' : 'Edit account details'}
              </button>
            </div>
          </div>
        </section>

        <section className="account-panel__card" aria-labelledby="account-subscription">
          <p className="account-panel__eyebrow">Subscription</p>
          <h3 id="account-subscription">Plan overview</h3>
          <p className="account-panel__hint">
            Manage billing from your Supabase dashboard. Updates sync instantly to this workspace.
          </p>
          <dl className="account-panel__details">
            <div>
              <dt>Plan</dt>
              <dd>{planName}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{planStatus}</dd>
            </div>
            <div>
              <dt>Renews</dt>
              <dd>{renewsOn}</dd>
            </div>
          </dl>
        </section>

        <section className="account-panel__card" aria-labelledby="account-menu-icon">
          <p className="account-panel__eyebrow">Menu Icon</p>
          <h3 id="account-menu-icon">Display Preferences</h3>
          <p className="account-panel__hint">
            Choose whether to display your initials or the default icon in the main menu when signed in.
          </p>
          <div className="account-panel__toggle-row">
            <label className="account-panel__toggle-label">
              <input
                type="checkbox"
                checked={profile?.show_initials_in_menu ?? false}
                onChange={(e) => handleToggleInitialsInMenu(e.target.checked)}
                disabled={savingPreference || !profile?.full_name || isDemoExperience}
                className="account-panel__toggle-input"
              />
              <span className="account-panel__toggle-text">
                Show my initials ({userInitials || '--'}) in main menu
              </span>
            </label>
            {savingPreference && <span className="account-panel__saving-indicator">Saving...</span>}
          </div>
          {!profile?.full_name && !isDemoExperience && (
            <p className="account-panel__hint" style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
              Set your name in the account details to enable this feature.
            </p>
          )}
        </section>
      </div>

      <AiSettingsSection session={session} />

      <GamificationSettings session={session} />

      <YesterdayRecapSettings session={session} />

      {/* Collapsible Folder 1: Developer & Analytics Tools */}
      <section className="account-panel__card">
        <SettingsFolderButton
          title="Developer & Analytics Tools"
          description="Advanced settings for workspace data, analytics, debugging, and testing"
          icon="🔧"
          itemCount={5}
          onClick={() => setFolder1Open(true)}
        />
      </section>

      {/* Collapsible Folder 2: Notification Settings */}
      <section className="account-panel__card">
        <SettingsFolderButton
          title="Notification Settings"
          description="Configure habit notifications, daily reminders, and per-habit reminder preferences"
          icon="🔔"
          itemCount={3}
          onClick={() => setFolder2Open(true)}
        />
      </section>

      {/* Folder 1 Popup */}
      <SettingsFolderPopup
        isOpen={folder1Open}
        onClose={() => setFolder1Open(false)}
        title="Developer & Analytics Tools"
      >
        <section className="account-panel__card" aria-labelledby="account-data">
          <p className="account-panel__eyebrow">Data &amp; security</p>
          <h3 id="account-data">Workspace data</h3>
          <p className="account-panel__hint">
            View high-level metadata about your profile. Detailed exports are available through Supabase.
          </p>
          <dl className="account-panel__details">
            <div>
              <dt>Member since</dt>
              <dd>{memberSince}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{lastSignIn}</dd>
            </div>
            <div>
              <dt>Account ID</dt>
              <dd className="account-panel__code">{user.id}</dd>
            </div>
          </dl>
        </section>

        <ReminderAnalyticsDashboard session={session} />

        <PushNotificationTestPanel session={session} />

        <ReminderActionDebugPanel session={session} />

        <SupabaseConnectionTest 
          session={session} 
          isDemoExperience={isDemoExperience} 
        />
      </SettingsFolderPopup>

      {/* Folder 2 Popup */}
      <SettingsFolderPopup
        isOpen={folder2Open}
        onClose={() => setFolder2Open(false)}
        title="Notification Settings"
      >
        <NotificationSettingsSection session={session} />

        <DailyReminderPreferences session={session} />

        <PerHabitReminderPrefs session={session} />
      </SettingsFolderPopup>

      <div className="account-panel__actions">
        <div>
          <p className="account-panel__eyebrow">Session</p>
          <p className="account-panel__hint">
            {isAuthenticated
              ? 'Sign out to switch to a different Supabase project.'
              : 'Sign in with Supabase to sync your personal rituals.'}
          </p>
        </div>
        {isAuthenticated ? (
          <button type="button" className="btn btn--primary" onClick={() => onSignOut()}>
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}
