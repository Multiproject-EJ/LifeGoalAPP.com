import React from 'react';
import './world.css';

export type TrustPageSlug = 'privacy' | 'terms' | 'support';

interface TrustPageProps {
  page: TrustPageSlug;
}

const LAST_UPDATED = 'March 2025';
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
          <strong>App data</strong> — habits, streaks, XP, journal entries, and preferences you
          create inside the app. This is stored in your Supabase account.
        </li>
        <li>
          <strong>Local storage</strong> — preferences such as theme and install-prompt state are
          stored locally on your device and never sent to any server.
        </li>
      </ul>

      <h2 className="trust-page__section-heading">What we do not collect</h2>
      <ul className="trust-page__list">
        <li>No third-party tracking pixels or ad networks.</li>
        <li>No selling of your data to any party.</li>
        <li>No analytics beyond what is needed to keep the app running.</li>
      </ul>

      <h2 className="trust-page__section-heading">Data storage</h2>
      <p>
        Your data is stored using <strong>Supabase</strong>, a hosted Postgres platform. Supabase
        stores data in secure, SOC 2-certified data centres. You can request deletion of your
        account and all associated data at any time by contacting us.
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
            Yes — install HabitGame to your home screen as a PWA and it will continue to work
            without an internet connection. Your data syncs automatically when you are back online.
          </p>
        </details>

        <details className="trust-page__faq-item">
          <summary className="trust-page__faq-question">How do I delete my account?</summary>
          <p className="trust-page__faq-answer">
            Email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="trust-page__link">
              {CONTACT_EMAIL}
            </a>{' '}
            with the subject &ldquo;Delete my account&rdquo; and we will remove your data within 7
            business days.
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
