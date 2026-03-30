import './peacebetween.css';

export function PeaceBetweenLanding() {
  return (
    <div className="peacebetween-landing" data-surface="peacebetween">
      <main className="peacebetween-landing__main" role="main">
        <section className="peacebetween-landing__panel" aria-labelledby="peacebetween-landing-title">
          <p className="peacebetween-landing__eyebrow">Peace Between</p>
          <h1 id="peacebetween-landing-title" className="peacebetween-landing__title">
            A calmer way to work through conflict
          </h1>
          <p className="peacebetween-landing__subtitle">
            Slow things down, understand each perspective, and choose a practical next step you can both follow.
          </p>

          <div className="peacebetween-landing__actions">
            <a className="btn btn--primary peacebetween-landing__cta" href="/conflict/new">
              Start a new conversation
            </a>
          </div>

          <section className="peacebetween-landing__invite" aria-label="Use an invite link">
            <h2 className="peacebetween-landing__invite-title">Use an invite link</h2>
            <p className="peacebetween-landing__invite-copy">
              Paste your invite token below to continue into a shared conversation.
            </p>
            <form className="peacebetween-landing__invite-form" action="/conflict/join" method="get">
              <input
                type="text"
                name="token"
                className="peacebetween-landing__invite-input"
                placeholder="Paste invite token"
                autoComplete="off"
              />
              <button type="submit" className="btn peacebetween-landing__invite-submit">
                Continue with invite
              </button>
            </form>
          </section>
        </section>
      </main>
    </div>
  );
}
