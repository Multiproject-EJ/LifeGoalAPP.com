export const NATIVE_AUTH_CALLBACK_URL = 'com.lifegoalapp.habitgame://auth/callback';

export type NativeOAuthResponse =
  | { type: 'pkce'; code: string }
  | { type: 'implicit'; accessToken: string; refreshToken: string };

/**
 * Keep callback parsing isolated and strict so unrelated deep links can never
 * be treated as authentication callbacks. PKCE is canonical; implicit tokens
 * remain accepted briefly so an already-open pre-upgrade OAuth attempt can
 * still return safely.
 */
export function readNativeOAuthResponse(url: string): NativeOAuthResponse | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (`${parsed.protocol}//${parsed.host}${parsed.pathname}` !== NATIVE_AUTH_CALLBACK_URL) {
    return null;
  }

  const queryParameters = parsed.searchParams;
  const code = queryParameters.get('code');
  if (code) return { type: 'pkce', code };

  const fragment = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  const parameters = new URLSearchParams(fragment);
  const accessToken = parameters.get('access_token');
  const refreshToken = parameters.get('refresh_token');

  if (!accessToken || !refreshToken) return null;
  return { type: 'implicit', accessToken, refreshToken };
}
