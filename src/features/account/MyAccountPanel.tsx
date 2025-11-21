import type { Session } from '@supabase/supabase-js';
import { SupabaseConnectionTest } from './SupabaseConnectionTest';
import { ThemeSelector } from '../../components/ThemeSelector';
import { NotificationSettingsSection } from '../notifications';
import type { WorkspaceProfileRow } from '../../services/workspaceProfile';
import type { WorkspaceStats } from '../../services/workspaceStats';

type MyAccountPanelProps = {
  session: Session;
  isDemoExperience: boolean;
  isAuthenticated: boolean;
  onSignOut: () => void | Promise<void>;
  onEditProfile: () => void;
  profile: WorkspaceProfileRow | null;
  stats: WorkspaceStats | null;
  profileLoading: boolean;
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
}: MyAccountPanelProps) {
  const user = session.user;
  const displayName =
    profile?.full_name || (user.user_metadata?.full_name as string | undefined) || user.email || 'Workspace member';
  const email = user.email || 'No email on file';
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || 'U';
  const workspaceName = profile?.workspace_name || 'Personal rituals workspace';

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

  return (
    <div className="account-panel">
      {showDemoNotice ? (
        <p className="account-panel__notice">
          You’re exploring demo data. Sign in to sync with your Supabase project.
        </p>
      ) : null}
      <section className="account-panel__card account-panel__profile" aria-labelledby="account-profile">
        <div className="account-panel__avatar" aria-hidden="true">
          {avatarInitial}
        </div>
        <div className="account-panel__profile-text">
          <p className="account-panel__eyebrow">Profile</p>
          <h2 id="account-profile">My account</h2>
          <p className="account-panel__lead">Review your identity details and workspace access.</p>
          <dl className="account-panel__details">
            <div>
              <dt>Name</dt>
              <dd>{displayName}</dd>
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

      <section className="account-panel__card" aria-labelledby="account-workspace-overview">
        <p className="account-panel__eyebrow">Workspace snapshot</p>
        <h3 id="account-workspace-overview">Stored rituals & goals</h3>
        <p className="account-panel__hint">
          These counts update automatically each time you create or complete new goals, habits, or wellbeing check-ins.
        </p>
        {stats ? (
          <dl className="account-panel__details account-panel__details--grid">
            <div>
              <dt>Goals saved</dt>
              <dd>{stats.goalCount}</dd>
            </div>
            <div>
              <dt>Habits tracked</dt>
              <dd>{stats.habitCount}</dd>
            </div>
            <div>
              <dt>Check-ins logged</dt>
              <dd>{stats.checkinCount}</dd>
            </div>
          </dl>
        ) : (
          <p className="account-panel__hint">Sign in to Supabase to see your synced ritual stats.</p>
        )}
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

      <section className="account-panel__card" aria-labelledby="account-theme">
        <p className="account-panel__eyebrow">Appearance</p>
        <ThemeSelector />
      </section>

      <NotificationSettingsSection session={session} />

      <SupabaseConnectionTest 
        session={session} 
        isDemoExperience={isDemoExperience} 
      />

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
