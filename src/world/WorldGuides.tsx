const CARETAKER_SRC = '/assets/island_caretakers/001/IMG_caretaker_3d_blue.webp';
const ORB_SRC = '/assets/island_caretakers/001/first-light-caretaker.webp';
const BUILDER_ROBOTS_SRC = '/landing-page-assets/characters/builder-robot-family-preview-v1.jpg';
const CARD_BACK_SRC = '/assets/creatures/Creature_card.webp';

export function WorldGuides() {
  return (
    <section
      id="world-home-guides"
      className="world-home__guides"
      aria-labelledby="world-home-guides-title"
      data-awaken
    >
      <header className="world-home__guides-heading">
        <p>MEET YOUR GUIDES</p>
        <h2 id="world-home-guides-title">A world that smiles back.</h2>
        <span>
          Your progress is not just counted. It is welcomed, celebrated, and carried into the next
          part of your adventure.
        </span>
      </header>

      <div className="world-home__guides-grid">
        <article className="world-home__guide-card world-home__guide-card--caretaker">
          <div className="world-home__guide-art world-home__guide-art--caretaker">
            <span className="world-home__guide-glow" aria-hidden="true" />
            <img
              src={CARETAKER_SRC}
              alt="A small blue-and-gold hooded caretaker welcoming the player"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="world-home__guide-copy">
            <small>THE CARETAKER</small>
            <h3>A quiet welcome.</h3>
            <p>A friendly guide is waiting whenever you return—no perfect streak required.</p>
          </div>
        </article>

        <article className="world-home__guide-card world-home__guide-card--orb">
          <div className="world-home__guide-art world-home__guide-art--orb">
            <span className="world-home__orb-route" aria-hidden="true" />
            <img
              src={ORB_SRC}
              alt="A luminous blue-and-gold compass orb"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="world-home__guide-copy">
            <small>THE COMPASS LIGHT</small>
            <h3>Follow the mystery.</h3>
            <p>Let the light draw you toward the next path without revealing everything at once.</p>
          </div>
        </article>

        <article className="world-home__guide-card world-home__guide-card--builders">
          <div className="world-home__guide-art world-home__guide-art--builders">
            <img
              src={BUILDER_ROBOTS_SRC}
              alt="Visual development preview of three smiling HabitGame builder robots"
              loading="lazy"
              decoding="async"
            />
            <span>Visual development · appearance may change</span>
          </div>
          <div className="world-home__guide-copy">
            <small>THE BUILDERS · IN DEVELOPMENT</small>
            <h3>Progress deserves a smile.</h3>
            <p>The builder family is being shaped to make every finished landmark feel shared.</p>
          </div>
        </article>
      </div>

      <div id="world-home-mystery" className="world-home__mystery" aria-labelledby="world-home-mystery-title">
        <div className="world-home__card-fan" aria-hidden="true">
          <img src={CARD_BACK_SRC} alt="" loading="lazy" decoding="async" />
          <img src={CARD_BACK_SRC} alt="" loading="lazy" decoding="async" />
          <img src={CARD_BACK_SRC} alt="" loading="lazy" decoding="async" />
          <span />
        </div>
        <div className="world-home__mystery-copy">
          <p>ONE GLIMPSE. NO SPOILERS.</p>
          <h3 id="world-home-mystery-title">Some parts of you are still waiting to be discovered.</h3>
          <span>
            The backs are all you see here. Their faces—and what they mean for your journey—stay
            beyond the first light.
          </span>
          <small>Discovery preview · no card powers or rules revealed</small>
        </div>
      </div>
    </section>
  );
}
