import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  sendSubscriptionToServer,
} from '../../services/pushNotifications';
import { hasSupabaseCredentials, getSupabaseUrl } from '../../lib/supabaseClient';

const NOTIFICATION_ICON = '/icons/icon-192x192.svg';

type StatusMessage = {
  kind: 'success' | 'error' | 'info';
  message: string;
} | null;

type Props = {
  session: Session;
};

export function PushNotificationTestPanel({ session }: Props) {
  const [status, setStatus] = useState<StatusMessage>(null);
  const [loading, setLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<PushSubscriptionJSON | null>(null);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  
  // New diagnostic state
  const [vapidStatus, setVapidStatus] = useState<{
    configured: boolean;
    message: string;
  } | null>(null);
  
  const [reminderInfo, setReminderInfo] = useState<{
    habitsWithReminders: number;
    nextReminderTime?: string;
  } | null>(null);
  
  const [userPrefs, setUserPrefs] = useState<{
    timezone: string;
    window_start: string;
    window_end: string;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
    skip_weekends: boolean;
  } | null>(null);

  const checkPushSupport = () => {
    const supported = isPushSupported();
    setStatus({
      kind: supported ? 'success' : 'error',
      message: supported
        ? 'Push notifications are supported in this browser.'
        : 'Push notifications are NOT supported in this browser.',
    });
  };

  const checkExistingSubscription = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const subscription = await getExistingSubscription();
      if (subscription) {
        setSubscriptionInfo(subscription.toJSON());
        setStatus({
          kind: 'success',
          message: 'Found existing push subscription.',
        });
      } else {
        setSubscriptionInfo(null);
        setStatus({
          kind: 'info',
          message: 'No existing push subscription found. Subscribe to enable push notifications.',
        });
      }
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to check subscription.',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const subscription = await subscribeToPush();
      setSubscriptionInfo(subscription.toJSON());
      setStatus({
        kind: 'success',
        message: 'Successfully created push subscription. Now register it with the server.',
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to create subscription.',
      });
    } finally {
      setLoading(false);
    }
  };

  const registerWithServer = async () => {
    setLoading(true);
    setStatus(null);
    try {
      if (!hasSupabaseCredentials()) {
        throw new Error('Supabase credentials not configured.');
      }

      const subscription = await getExistingSubscription();
      if (!subscription) {
        throw new Error('No push subscription found. Create one first.');
      }

      const supabaseUrl = getSupabaseUrl();
      const accessToken = session.access_token;

      if (!supabaseUrl || !accessToken) {
        throw new Error('Missing Supabase URL or access token.');
      }

      await sendSubscriptionToServer(subscription, supabaseUrl, accessToken);
      setStatus({
        kind: 'success',
        message: 'Push subscription registered with server successfully!',
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to register with server.',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkHealthEndpoint = async () => {
    setLoading(true);
    setHealthStatus(null);
    setVapidStatus(null);
    try {
      if (!hasSupabaseCredentials()) {
        throw new Error('Supabase credentials not configured.');
      }

      const supabaseUrl = getSupabaseUrl();
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured.');
      }

      // Call health endpoint without authentication (public endpoint)
      const response = await fetch(`${supabaseUrl}/functions/v1/send-reminders/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
          // Note: No Authorization header - this is a public endpoint
        }
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.vapid_configured) {
        setHealthStatus('✓ Edge Function is healthy and VAPID keys are configured');
        setVapidStatus({
          configured: data.vapid_configured || false,
          message: data.message || 'VAPID keys configured'
        });
      } else {
        setHealthStatus(`✗ ${data.message || 'VAPID keys not configured'}`);
        setVapidStatus({
          configured: false,
          message: data.message || 'VAPID keys not configured'
        });
      }
    } catch (error) {
      setHealthStatus(`✗ ${error instanceof Error ? error.message : 'Health check failed'}`);
      setVapidStatus({
        configured: false,
        message: error instanceof Error ? error.message : 'Health check failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setLoading(true);
    setStatus(null);
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service workers not supported.');
      }

      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification('Test Notification', {
        body: 'This is a test notification from LifeGoal App.',
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_ICON,
        tag: 'test-notification',
        data: {
          url: '/#habits',
        },
      });

      setStatus({
        kind: 'success',
        message: 'Test notification sent! Check your notification panel.',
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to send test notification.',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkReminderConfiguration = async () => {
    setLoading(true);
    setReminderInfo(null);
    try {
      if (!hasSupabaseCredentials()) {
        throw new Error('Supabase credentials not configured.');
      }

      const supabaseUrl = getSupabaseUrl();
      const accessToken = session.access_token;

      if (!supabaseUrl || !accessToken) {
        throw new Error('Missing Supabase URL or access token.');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-reminders/habit-prefs`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch habit preferences: ${response.statusText}`);
      }

      const habits = await response.json();
      const enabled = habits.filter((h: { enabled: boolean }) => h.enabled).length;
      
      setReminderInfo({
        habitsWithReminders: enabled,
        nextReminderTime: enabled > 0 ? 'Within reminder window' : undefined
      });

      setStatus({
        kind: 'info',
        message: `Found ${enabled} habit(s) with reminders enabled.`
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to check reminder configuration.'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    setLoading(true);
    setUserPrefs(null);
    try {
      if (!hasSupabaseCredentials()) {
        throw new Error('Supabase credentials not configured.');
      }

      const supabaseUrl = getSupabaseUrl();
      const accessToken = session.access_token;

      if (!supabaseUrl || !accessToken) {
        throw new Error('Missing Supabase URL or access token.');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-reminders/prefs`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user preferences: ${response.statusText}`);
      }

      const prefs = await response.json();
      setUserPrefs(prefs);

      setStatus({
        kind: 'info',
        message: 'User preferences loaded successfully.'
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to load user preferences.'
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerCronManually = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const supabaseUrl = getSupabaseUrl();
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured.');
      }

      // For manual testing, we'll show instructions for CRON endpoint
      // In production, this should be called by a scheduled job with the CRON_SECRET
      setStatus({
        kind: 'info',
        message: 'To test CRON manually, you need to:\n1. Set CRON_SECRET in Supabase Edge Function secrets\n2. Call the /cron endpoint with x-cron-secret header\n3. Or set up automatic CRON scheduling in Supabase\n\nFor security, the CRON endpoint requires a custom x-cron-secret header instead of JWT.'
      });
      
      // Alternatively, if you want to allow manual testing with a known secret:
      // Uncomment the code below and remove the setStatus call above
      
      // const cronSecret = prompt('Enter CRON_SECRET (from Supabase secrets):');
      // if (!cronSecret) {
      //   throw new Error('CRON secret required');
      // }
      //
      // const response = await fetch(
      //   `${supabaseUrl}/functions/v1/send-reminders/cron`,
      //   {
      //     method: 'POST',
      //     headers: {
      //       'x-cron-secret': cronSecret,
      //       'Content-Type': 'application/json'
      //     }
      //   }
      // );
      //
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.error || `Failed to trigger CRON: ${response.statusText}`);
      // }
      //
      // const result = await response.json();
      // setStatus({
      //   kind: 'success',
      //   message: result.message || JSON.stringify(result)
      // });
      
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to trigger CRON'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="account-panel__card" aria-labelledby="push-test-panel">
      <p className="account-panel__eyebrow">Developer tools</p>
      <h3 id="push-test-panel">Push Notification Test Panel</h3>
      <p className="account-panel__hint">
        Test and debug Web Push notifications. Use these tools to verify the push notification pipeline from browser to Edge Function.
      </p>

      <div className="push-test-panel">
        {status && (
          <p
            className={`notification-preferences__message notification-preferences__message--${status.kind}`}
            role={status.kind === 'error' ? 'alert' : 'status'}
          >
            {status.message}
          </p>
        )}

        <div className="push-test-panel__section">
          <h4>⚙️ System Configuration</h4>
          <p className="account-panel__hint">Check VAPID keys and Edge Function configuration.</p>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={checkHealthEndpoint}
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Check Configuration'}
          </button>
          {vapidStatus && (
            <div className={`push-test-panel__status-box ${vapidStatus.configured ? 'push-test-panel__status-box--success' : 'push-test-panel__status-box--error'}`}>
              <p>
                <strong>{vapidStatus.configured ? '✅' : '❌'} VAPID Keys:</strong> {vapidStatus.message}
              </p>
            </div>
          )}
        </div>

        <div className="push-test-panel__section">
          <h4>📱 Push Subscription Status</h4>
          <p className="account-panel__hint">View your browser's push subscription status.</p>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={checkExistingSubscription}
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Check Subscription'}
          </button>
          {subscriptionInfo && (
            <div className="push-test-panel__status-box push-test-panel__status-box--success">
              <p><strong>✅ Subscribed</strong></p>
              <p className="account-panel__hint" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Endpoint: {subscriptionInfo.endpoint?.substring(0, 50)}...
              </p>
            </div>
          )}
        </div>

        <div className="push-test-panel__section">
          <h4>⏰ Reminder Configuration</h4>
          <p className="account-panel__hint">View your habit reminders and preferences.</p>
          <div className="push-test-panel__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={checkReminderConfiguration}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Check Reminders'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={loadUserPreferences}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'View Preferences'}
            </button>
          </div>
          {reminderInfo && (
            <div className="push-test-panel__status-box push-test-panel__status-box--info">
              <p><strong>Habits with reminders:</strong> {reminderInfo.habitsWithReminders}</p>
              {reminderInfo.nextReminderTime && (
                <p><strong>Status:</strong> {reminderInfo.nextReminderTime}</p>
              )}
            </div>
          )}
          {userPrefs && (
            <div className="push-test-panel__prefs-display">
              <dl className="account-panel__details" style={{ marginTop: '1rem' }}>
                <div>
                  <dt>Timezone</dt>
                  <dd>{userPrefs.timezone}</dd>
                </div>
                <div>
                  <dt>Reminder Window</dt>
                  <dd>{userPrefs.window_start} - {userPrefs.window_end}</dd>
                </div>
                {userPrefs.quiet_hours_start && (
                  <div>
                    <dt>Quiet Hours</dt>
                    <dd>{userPrefs.quiet_hours_start} - {userPrefs.quiet_hours_end}</dd>
                  </div>
                )}
                <div>
                  <dt>Skip Weekends</dt>
                  <dd>{userPrefs.skip_weekends ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <div className="push-test-panel__section">
          <h4>🧪 Manual Testing</h4>
          <p className="account-panel__hint">Manually trigger notifications and CRON jobs.</p>
          <div className="push-test-panel__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={sendTestNotification}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Test Notification'}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={triggerCronManually}
              disabled={loading}
            >
              {loading ? 'Triggering...' : 'Trigger CRON Now'}
            </button>
          </div>
        </div>

        <div className="push-test-panel__section">
          <h4>1. Browser Support</h4>
          <p className="account-panel__hint">Check if this browser supports push notifications.</p>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={checkPushSupport}
            disabled={loading}
          >
            Check Push Support
          </button>
        </div>

        <div className="push-test-panel__section">
          <h4>2. Push Subscription</h4>
          <p className="account-panel__hint">Manage the browser's push subscription.</p>
          <div className="push-test-panel__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={checkExistingSubscription}
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Check Existing'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={createSubscription}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Subscription'}
            </button>
          </div>

          {subscriptionInfo && (
            <div className="push-test-panel__subscription-info">
              <h5>Subscription Details</h5>
              <dl className="account-panel__details">
                <div>
                  <dt>Endpoint</dt>
                  <dd className="account-panel__code" style={{ wordBreak: 'break-all' }}>
                    {subscriptionInfo.endpoint?.substring(0, 60)}...
                  </dd>
                </div>
                <div>
                  <dt>p256dh Key</dt>
                  <dd className="account-panel__code">
                    {subscriptionInfo.keys?.p256dh?.substring(0, 20)}...
                  </dd>
                </div>
                <div>
                  <dt>Auth Key</dt>
                  <dd className="account-panel__code">
                    {subscriptionInfo.keys?.auth?.substring(0, 10)}...
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <div className="push-test-panel__section">
          <h4>3. Edge Function</h4>
          <p className="account-panel__hint">Test the send-reminders Edge Function.</p>
          <div className="push-test-panel__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={checkHealthEndpoint}
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Check Health'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={registerWithServer}
              disabled={loading || !subscriptionInfo}
            >
              {loading ? 'Registering...' : 'Register with Server'}
            </button>
          </div>
          {healthStatus && (
            <p className={`push-test-panel__health ${healthStatus.startsWith('✓') ? 'push-test-panel__health--success' : 'push-test-panel__health--error'}`}>
              {healthStatus}
            </p>
          )}
        </div>

        <div className="push-test-panel__section">
          <h4>4. Test Notification</h4>
          <p className="account-panel__hint">Send a local test notification to verify the service worker.</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={sendTestNotification}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Test Notification'}
          </button>
        </div>
      </div>
    </section>
  );
}
