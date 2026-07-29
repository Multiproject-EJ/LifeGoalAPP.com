import '../features/habits/HabitsModule.css';

export function TodaysOfferPreview() {
  return (
    <main style={{ minHeight: '100dvh', background: '#020817' }}>
      <div className="habit-day-nav__vision-modal-backdrop" role="dialog" aria-modal="true" aria-label="Today's offer preview">
        <div className="habit-day-nav__vision-modal habit-day-nav__todays-offer-modal habit-day-nav__todays-offer-modal--scrollable habit-day-nav__todays-offer-modal--gold">
          <button type="button" className="habit-day-nav__vision-modal-close habit-day-nav__todays-offer-close" aria-label="Close today's offer">
            ×
          </button>
          <div className="habit-day-nav__todays-offer-body">
            <div className="habit-day-nav__todays-offer-sparkles" aria-hidden="true">
              <span>✦</span><span>✧</span><span>✦</span><span>·</span>
            </div>
            <p className="habit-day-nav__todays-offer-kicker">Fresh weekly showcase</p>
            <div className="habit-day-nav__todays-offer-art-wrap">
              <span className="habit-day-nav__todays-offer-light-sweep" aria-hidden="true" />
              <img
                className="habit-day-nav__todays-offer-art"
                src="/assets/today'soffer/TodaysOffer1.webp"
                alt="Five-star deal: 500 dice rolls in a glowing prize cabinet"
              />
            </div>
            <div className="habit-day-nav__todays-offer-actions" aria-label="Today's offer actions">
              <button type="button" className="habit-day-nav__todays-offer-action habit-day-nav__todays-offer-action--spin">
                <span aria-hidden="true">🎡</span><strong>Spin Wheel</strong><small>Use today’s spin</small>
              </button>
              <button type="button" className="habit-day-nav__todays-offer-action habit-day-nav__todays-offer-action--deal">
                <span aria-hidden="true">⭐</span><strong>Get Deal</strong><small>500 dice rolls</small>
              </button>
              <button type="button" className="habit-day-nav__todays-offer-action habit-day-nav__todays-offer-action--island">
                <span aria-hidden="true">🏝️</span><strong>Island Run</strong><small>Keep playing</small>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default TodaysOfferPreview;
