/**
 * Returns true when the app is running as an installed PWA (standalone mode).
 * Checks: CSS display-mode media query, iOS navigator.standalone, and optional URL hint.
 */
export function isStandaloneMode(): boolean {
  // Check CSS display-mode: standalone
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // Check iOS standalone (navigator.standalone)
  if ((navigator as any).standalone === true) return true;
  // Check URL hint (some PWA wrappers add this)
  if (new URLSearchParams(window.location.search).get('standalone') === '1') return true;
  return false;
}
