export type PhoneClientHints = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  userAgentDataMobile?: boolean;
};

/**
 * Entry access is intentionally phone-only. Viewport width is not used here:
 * the desktop presentation includes a narrow phone frame, and resizing a
 * desktop browser must not turn it into a playable phone client.
 */
export function isPhoneClient({
  userAgent,
  platform = '',
  maxTouchPoints = 0,
  userAgentDataMobile,
}: PhoneClientHints): boolean {
  const isIpad = /iPad/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  if (isIpad) return false;

  if (typeof userAgentDataMobile === 'boolean') {
    return userAgentDataMobile;
  }

  return /iPhone|iPod|Android.+Mobile|Windows Phone|IEMobile|Opera Mini|Mobi/i.test(userAgent);
}

export function isCurrentClientPhone(): boolean {
  if (typeof navigator === 'undefined') return false;

  const navigatorWithUaData = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };

  return isPhoneClient({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    userAgentDataMobile: navigatorWithUaData.userAgentData?.mobile,
  });
}
