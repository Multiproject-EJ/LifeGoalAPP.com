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
    try {
      if (!hasSupabaseCredentials()) {
        throw new Error('Supabase credentials not configured.');
      }

      const supabaseUrl = getSupabaseUrl();
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured.');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-reminders/health`);
      const data = await response.json();

      if (data.ok) {
        setHealthStatus('✓ Edge Function is healthy');
      } else {
        setHealthStatus('✗ Edge Function responded but not healthy');
      }
    } catch (error) {
      setHealthStatus(`✗ ${error instanceof Error ? error.message : 'Health check failed'}`);
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
          <p className="account-panel__hint">Manage the browser&apos;s push subscription.</p>
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
