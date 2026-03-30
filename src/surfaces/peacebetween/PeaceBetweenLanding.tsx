import './peacebetween.css';

export function PeaceBetweenLanding() {
  return (
    <div className="peacebetween-landing" data-surface="peacebetween">
      <main className="peacebetween-landing__main" role="main">
        <section className="peacebetween-landing__panel" aria-labelledby="peacebetween-landing-title">
          <p className="peacebetween-landing__eyebrow">Peace Between</p>
          <h1 id="peacebetween-landing-title" className="peacebetween-landing__title">
            A calmer way to begin a hard conversation.
          </h1>
          <p className="peacebetween-landing__subtitle">
            Guided prompts help both people feel heard, reduce escalation, and choose one clear next step together.
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
          <h2 className="peacebetween-landing__steps-title">What to expect</h2>
          <ol className="peacebetween-landing__steps-list">
            <li className="peacebetween-landing__step">
              <span className="peacebetween-landing__step-number">1</span>
              <div>
                <p className="peacebetween-landing__step-title">Share your perspective</p>
                <p className="peacebetween-landing__step-copy">Start with what feels important to you, in plain language.</p>
              </div>
            </li>
            <li className="peacebetween-landing__step">
              <span className="peacebetween-landing__step-number">2</span>
              <div>
                <p className="peacebetween-landing__step-title">Understand each other</p>
                <p className="peacebetween-landing__step-copy">Follow a neutral structure that keeps the conversation steady.</p>
              </div>
            </li>
            <li className="peacebetween-landing__step">
              <span className="peacebetween-landing__step-number">3</span>
              <div>
                <p className="peacebetween-landing__step-title">Leave with one next step</p>
                <p className="peacebetween-landing__step-copy">End with a practical action both people can commit to.</p>
              </div>
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}
