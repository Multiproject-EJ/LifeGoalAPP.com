import type { ReactNode } from 'react';

type DeveloperIdeasPageProps = {
  onClose: () => void;
  children?: ReactNode;
};

export function DeveloperIdeasPage({ onClose, children }: DeveloperIdeasPageProps) {
  return (
    <div className="ideas-page" role="dialog" aria-modal="true" aria-label="Developer ideas page">
      <div className="ideas-page__content">
        <header className="ideas-page__header">
          <div>
            <p className="ideas-page__eyebrow">Developer Ideas</p>
            <h2>Focus fuels compounding progress</h2>
            <p>
              Let’s start with a question: Why do some people get so much further ahead than others? For Warren Buffett,
              the answer comes down to ruthless focus. His famous 5/25 Rule is all about this idea.
            </p>
            <p>
              Here’s how it works: Write down the 25 goals or interests you have. Then circle the top 5. Now — and this is
              the hard part — avoid the other 20 at all costs. Because according to Buffett, your biggest threat isn’t
              failure. It’s distraction.
            </p>
          </div>
          <button type="button" className="ideas-page__close" onClick={onClose}>
            Close
          </button>
        </header>

        {children ? <div className="ideas-page__body">{children}</div> : null}
      </div>
    </div>
  );
}
