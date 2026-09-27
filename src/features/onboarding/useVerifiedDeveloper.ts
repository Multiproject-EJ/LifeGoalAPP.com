import { useCallback, useEffect, useState } from 'react';
import { fetchAdminUser } from '../../services/adminRoles';

export type DeveloperCheck = { owner: string | null; status: 'checking' | 'ready' | 'error'; verified: boolean };
const verifyDeveloper = async (owner: string) => {
  const result = await fetchAdminUser(owner);
  if (result.error) throw result.error;
  return result.data?.user_id === owner && result.data.active === true;
};

/** Never trust a local developer toggle, user_metadata, or the previous owner. */
export function useVerifiedDeveloper(owner: string | null, verify = verifyDeveloper) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<DeveloperCheck>({ owner: null, status: 'checking', verified: false });
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!owner) return;
    let current = true;
    const timer = window.setTimeout(() => {
      if (current) setResult({ owner, status: 'error', verified: false });
    }, 10000);
    verify(owner).then(verified => {
      if (current) setResult({ owner, status: 'ready', verified });
    }).catch(() => {
      if (current) setResult({ owner, status: 'error', verified: false });
    }).finally(() => window.clearTimeout(timer));
    const refresh = () => { if (document.visibilityState !== 'hidden') retry(); };
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      current = false; window.clearTimeout(timer);
      window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh);
    };
  }, [owner, verify, attempt, retry]);
  const check: DeveloperCheck = !owner ? { owner: null, status: 'ready', verified: false }
    : result.owner === owner ? result : { owner, status: 'checking', verified: false };
  return { ...check, retry };
}
