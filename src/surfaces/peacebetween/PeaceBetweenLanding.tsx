import './peacebetween.css';

export function PeaceBetweenLanding() {
  return (
    <div className="peacebetween-landing" data-surface="peacebetween">
      <main className="peacebetween-landing__main" role="main">
        <section className="peacebetween-landing__panel" aria-labelledby="peacebetween-landing-title">
          <p className="peacebetween-landing__eyebrow">Peace Between</p>
          <h1 id="peacebetween-landing-title" className="peacebetween-landing__title">
            Better conversations start with a calmer first step.
          </h1>
          <p className="peacebetween-landing__subtitle">
            A private, guided space to slow down conflict, understand each perspective, and agree on what comes next.
          </p>

          <div className="peacebetween-landing__actions">
            <a className="peacebetween-landing__cta-primary" href="/conflict/new">
              Start a new conversation
            </a>
          </div>

          <section className="peacebetween-landing__invite" aria-label="Use an invite link">
            <h2 className="peacebetween-landing__invite-title">Have an invite link?</h2>
            <p className="peacebetween-landing__invite-copy">
              Enter your token to continue where your conversation left off.
            </p>
            <form className="peacebetween-landing__invite-form" action="/conflict/join" method="get">
              <input
                type="text"
                name="token"
                className="peacebetween-landing__invite-input"
                placeholder="Paste invite token"
                autoComplete="off"
              />
              <button type="submit" className="peacebetween-landing__invite-submit">
                Continue with invite
              </button>
            </form>
          </section>
        </section>

        <section className="peacebetween-landing__steps" aria-label="How Peace Between works">
          <h2 className="peacebetween-landing__steps-title">How it works</h2>
          <ol className="peacebetween-landing__steps-list">
            <li className="peacebetween-landing__step">
              <span className="peacebetween-landing__step-number">1</span>
              <div>
                <p className="peacebetween-landing__step-title">Name what matters</p>
                <p className="peacebetween-landing__step-copy">Share your perspective clearly, without escalation.</p>
              </div>
            </li>
            <li className="peacebetween-landing__step">
              <span className="peacebetween-landing__step-number">2</span>
              <div>
                <p className="peacebetween-landing__step-title">Understand each other</p>
                <p className="peacebetween-landing__step-copy">Follow guided prompts designed to surface common ground.</p>
              </div>
            </li>
            <li className="peacebetween-landing__step">
              <span className="peacebetween-landing__step-number">3</span>
              <div>
                <p className="peacebetween-landing__step-title">Agree on next steps</p>
                <p className="peacebetween-landing__step-copy">Leave with one practical action you can both commit to.</p>
              </div>
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}
