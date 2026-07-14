import React from 'react';
import './world.css';

export type TrustPageSlug = 'privacy' | 'terms' | 'support';

interface TrustPageProps {
  page: TrustPageSlug;
}

const LAST_UPDATED = '13 July 2026';
const CONTACT_EMAIL = 'hello@lifegoalapp.com';

function PrivacyContent() {
  return (
    <>
      <p className="trust-page__updated">Last updated: {LAST_UPDATED}</p>
      <p>
        HabitGame is built to help you level up your life. Here is how we handle your data,
        plainly explained.
      </p>

      <h2 className="trust-page__section-heading">What we collect</h2>
      <ul className="trust-page__list">
        <li>
          <strong>Account data</strong> — email address and password hash, managed securely by
          Supabase Auth. We never see your raw password.
        </li>
        <li>
          <strong>App data</strong> — habits, goals, routines, streaks, XP, journal entries,
          reflections, check-ins, game progress, and preferences you create inside the app.
          Account-linked data is stored in Supabase so it can sync across your devices.
        </li>
        <li>
          <strong>Device data</strong> — the app stores preferences, cached content, and pending
          offline changes on your device. Account-linked changes may be sent to Supabase when a
          connection is available.
        </li>
        <li>
          <strong>Images you choose to upload</strong> — vision board and related images may be
          stored in Supabase Storage.
        </li>
        <li>
          <strong>Service and usage data</strong> — limited product-interaction events and error
          information may be recorded to operate, secure, and improve HabitGame.
        </li>
      </ul>

      <h2 className="trust-page__section-heading">What we do not collect</h2>
      <ul className="trust-page__list">
        <li>No third-party tracking pixels or ad networks.</li>
        <li>No selling of your data to any party.</li>
        <li>No use of your data for third-party advertising.</li>
      </ul>

      <h2 className="trust-page__section-heading">How we use and share data</h2>
      <p>
        We use your data to provide authentication, synchronization, offline recovery, reminders,
        support, safety, and the features you choose to use. Supabase processes authentication,
        database, file-storage, and server-function data for HabitGame. Optional AI features may
        send the text or context needed for your request to an AI service provider. We do not sell
        your personal data.
      </p>

      <h2 className="trust-page__section-heading">Your choices and deletion</h2>
      <p>
        You can delete your account from <strong>My Account → Danger zone → Delete account</strong>.
        This permanently removes your HabitGame login and user-owned cloud data. You can also
        contact us for help with access or deletion. Data may be retained where required for
        security, fraud prevention, legal compliance, or payment records.
      </p>

      <h2 className="trust-page__section-heading">Contact</h2>
      <p>
        Privacy questions? Email us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="trust-page__link">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <p className="trust-page__updated">Last updated: {LAST_UPDATED}</p>
      <p>
        By using HabitGame you agree to these terms. They are intentionally short and
        human-readable.
      </p>

      <h2 className="trust-page__section-heading">Use of the app</h2>
      <ul className="trust-page__list">
        <li>You must be at least 13 years old to create an account.</li>
        <li>You are responsible for maintaining the security of your account credentials.</li>
        <li>You agree not to use the app for any unlawful purpose.</li>
      </ul>

      <h2 className="trust-page__section-heading">Your content</h2>
      <p>
        Content you create in the app (journal entries, habit names, goals) remains yours. You
        grant us a limited licence to store and display it to you within the app. We do not claim
        ownership of your content.
      </p>

      <h2 className="trust-page__section-heading">Intellectual property</h2>
      <p>
        The HabitGame name, logo, visual design, and source code are the intellectual property of
        the HabitGame team. You may not copy, redistribute, or create derivative works without
        written permission.
      </p>

      <h2 className="trust-page__section-heading">Limitation of liability</h2>
      <p>
        HabitGame is provided &ldquo;as is&rdquo; without warranty of any kind. To the maximum
        extent permitted by law, we are not liable for any indirect, incidental, or consequential
        damages arising from your use of the app.
      </p>

      <h2 className="trust-page__section-heading">Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Material changes will be communicated via
        the app or email. Continued use after changes constitutes acceptance.
      </p>

      <h2 className="trust-page__section-heading">Contact</h2>
      <p>
        Questions about these terms? Email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="trust-page__link">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </>
  );
}

function SupportContent() {
  return (
    <>
      <p>
        We want HabitGame to work great for you. Below you will find answers to common questions
        and ways to reach us.
      </p>

      <h2 className="trust-page__section-heading">Frequently asked questions</h2>

      <div className="trust-page__faq">
        <details className="trust-page__faq-item">
          <summary className="trust-page__faq-question">How do I earn XP?</summary>
          <p className="trust-page__faq-answer">
            XP is awarded each time you complete a habit or daily check-in. Longer streaks
            multiply your XP gain, so consistency pays off.
          </p>
        </details>

        <details className="trust-page__faq-item">
          <summary className="trust-page__faq-question">Can I use HabitGame offline?</summary>
          <p className="trust-page__faq-answer">
            Many core actions can be saved on your device while you are offline and queued to sync
            when service returns. Features that require a secure live service—such as account
            changes, AI, uploads, and purchases—remain unavailable offline.
          </p>
        </details>

        <details className="trust-page__faq-item">
          <summary className="trust-page__faq-question">How do I delete my account?</summary>
          <p className="trust-page__faq-answer">
            In the app, open <strong>My Account</strong>, find <strong>Danger zone</strong>, and
            choose <strong>Delete account</strong>. You will be asked to type DELETE before the
            permanent action runs. If you cannot access your account, email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="trust-page__link">{CONTACT_EMAIL}</a>.
          </p>
        </details>

        <details className="trust-page__faq-item">
          <summary className="trust-page__faq-question">
            I found a bug — where do I report it?
          </summary>
          <p className="trust-page__faq-answer">
            Please email us with a short description of what happened and what device/browser you
            were using. Screenshots are always helpful!
          </p>
        </details>
      </div>

      <h2 className="trust-page__section-heading">Contact us</h2>
      <p>
        Email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="trust-page__link">
          {CONTACT_EMAIL}
        </a>{' '}
        — we typically respond within 1–2 business days.
      </p>

      <h2 className="trust-page__section-heading">Community &amp; feedback</h2>
      <p>
        Have a feature idea or want to share your progress? We love hearing from players. Send us
        your thoughts at the email above — your feedback directly shapes the roadmap.
      </p>
    </>
  );
}

const PAGE_META: Record<TrustPageSlug, { title: string; emoji: string }> = {
  privacy: { title: 'Privacy Policy', emoji: '🔒' },
  terms: { title: 'Terms of Service', emoji: '📋' },
  support: { title: 'Support & Help', emoji: '🎮' },
};

const OTHER_PAGES = Object.keys(PAGE_META) as TrustPageSlug[];

export function TrustPage({ page }: TrustPageProps) {
  const { title, emoji } = PAGE_META[page];

  return (
    <div className="trust-page">
      {/* Background layers — matches WorldHero atmosphere */}
      <div className="trust-page__bg" aria-hidden="true" />
      <div className="trust-page__atmosphere" aria-hidden="true" />

      <div className="trust-page__scroll">
        {/* Back navigation */}
        <nav className="trust-page__topnav" aria-label="Back to home">
          <a href="/" className="trust-page__back-link">
            <span aria-hidden="true">←</span> HabitGame
          </a>
        </nav>

        {/* Content card */}
        <main className="trust-page__card" id="main-content">
          <header className="trust-page__header">
            <span className="trust-page__emoji" aria-hidden="true">{emoji}</span>
            <h1 className="trust-page__title">{title}</h1>
          </header>

          <div className="trust-page__body">
            {page === 'privacy' && <PrivacyContent />}
            {page === 'terms' && <TermsContent />}
            {page === 'support' && <SupportContent />}
          </div>
        </main>

        {/* Footer with links to the other trust pages */}
        <footer className="trust-page__footer">
          <p className="trust-page__copyright">
            HabitGame &copy; {new Date().getFullYear()}
          </p>
          <nav className="trust-page__footer-links" aria-label="Legal">
            {OTHER_PAGES.filter((p) => p !== page).map((p) => (
              <a key={p} href={`/${p}`} className="trust-page__footer-link">
                {PAGE_META[p].title}
              </a>
            ))}
            <a href="/" className="trust-page__footer-link">
              Home
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
