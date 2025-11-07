import { supabase } from './supaClient.js';

const modal = document.getElementById('authModal');
const btnOpen = document.getElementById('btnSignIn') || document.querySelector('[data-auth-open]');
const btnClose = document.getElementById('authClose');
const btnGoogle = document.getElementById('googleSignIn');
const formEmail = document.getElementById('emailForm');
const emailInput = document.getElementById('authEmail');
const msg = document.getElementById('authMsg');
const redirectTo = 'https://www.lifegoalapp.com/auth/callback';
const accountControls = document.getElementById('accountControls');
const accountName = document.getElementById('accountName');
const btnSignOut = document.getElementById('btnSignOut');
const btnMyAccount = document.getElementById('btnMyAccount');

let previouslyFocusedElement = null;
let focusableElements = [];
let firstFocusable = null;
let lastFocusable = null;

const focusableSelectors = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function updateFocusableElements() {
  if (!modal) return;
  focusableElements = Array.from(modal.querySelectorAll(focusableSelectors)).filter(
    (element) => element.offsetParent !== null,
  );
  firstFocusable = focusableElements[0] ?? null;
  lastFocusable = focusableElements[focusableElements.length - 1] ?? null;
}

function trapFocus(event) {
  if (!modal?.classList.contains('open')) return;
  if (event.key === 'Escape') {
    closeModal();
    return;
  }
  if (event.key !== 'Tab') return;
  if (!focusableElements.length) {
    event.preventDefault();
    return;
  }
  if (event.shiftKey) {
    if (document.activeElement === firstFocusable || document.activeElement === modal) {
      event.preventDefault();
      (lastFocusable ?? firstFocusable)?.focus();
    }
  } else if (document.activeElement === lastFocusable) {
    event.preventDefault();
    (firstFocusable ?? lastFocusable)?.focus();
  }
}

function openModal() {
  if (!modal) return;
  previouslyFocusedElement = document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  updateFocusableElements();
  document.addEventListener('keydown', trapFocus, true);
  (firstFocusable ?? modal).focus({ preventScroll: false });
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', trapFocus, true);
  if (previouslyFocusedElement instanceof HTMLElement) {
    previouslyFocusedElement.focus();
  }
}

btnOpen && btnOpen.addEventListener('click', (event) => {
  event.preventDefault();
  openModal();
});

btnClose && btnClose.addEventListener('click', (event) => {
  event.preventDefault();
  closeModal();
});

modal && modal.addEventListener('click', (event) => {
  if ((event.target instanceof HTMLElement) && event.target.classList.contains('auth-backdrop')) {
    closeModal();
  }
});

// Google OAuth
btnGoogle?.addEventListener('click', async () => {
  if (msg) msg.textContent = 'Opening Google…';
  await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
});

// Magic link
formEmail?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = emailInput?.value.trim();
  if (!email) return;
  if (msg) msg.textContent = 'Sending link…';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (msg) {
    msg.textContent = error ? `Error: ${error.message}` : 'Check your email for a sign-in link.';
  }
});

function updateAuthUI(session) {
  if (session) {
    btnOpen?.setAttribute('hidden', '');
    accountControls?.removeAttribute('hidden');
    if (accountName) {
      const displayName = session.user.user_metadata?.full_name || session.user.email;
      accountName.textContent = displayName ?? 'My account';
    }
  } else {
    btnOpen?.removeAttribute('hidden');
    accountControls?.setAttribute('hidden', '');
    if (accountName) accountName.textContent = 'My account';
  }
}

btnSignOut?.addEventListener('click', async (event) => {
  event.preventDefault();
  await signOut();
});

btnMyAccount?.addEventListener('click', (event) => {
  if (btnMyAccount.tagName === 'A') return;
  event.preventDefault();
  window.location.href = '/dashboard';
});

// If already signed in, redirect-ready event and update UI
(async () => {
  const { data } = await supabase.auth.getSession();
  updateAuthUI(data?.session ?? null);
  if (data?.session) {
    window.dispatchEvent(new CustomEvent('auth:ready', { detail: data.session }));
  }
})();

const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session ?? null);
  if (session) {
    window.dispatchEvent(new CustomEvent('auth:ready', { detail: session }));
  }
});

// Cleanup when the page unloads
window.addEventListener('beforeunload', () => {
  authListener?.subscription?.unsubscribe?.();
});

export async function signOut() {
  await supabase.auth.signOut();
  window.location.reload();
}
