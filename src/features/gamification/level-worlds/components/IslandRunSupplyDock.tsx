import { useRef, useState } from 'react';
import {
  DICE_COMMERCE_MODE,
  type DicePackSkuId,
} from '../../../../services/dicePackPurchases';
import { DicePackOfferGrid } from './DicePackOfferGrid';
import { ShopItemCostLine } from './ShopItemCostLine';
import './IslandRunSupplyDock.css';

type SupplyDockSection = 'free' | 'collections' | 'supplies' | 'support';

type IslandRunSupplyDockProps = {
  islandNumber: number;
  essence: number;
  dicePool: number;
  hasVisitedWebTreat: boolean;
  loadingDicePackId: DicePackSkuId | null;
  isStartingCreaturePackCheckout: boolean;
  isCreaturePackStripeCheckoutEnabled: boolean;
  creaturePackCheckoutError: string | null;
  marketPurchaseFeedback: string | null;
  marketOwnedDiceBundle: boolean;
  marketDiceBundleCost: number;
  marketDiceBundleReward: number;
  bossCompleted: boolean;
  onVisitWebTreat: () => void;
  onSelectDicePack: (packId: DicePackSkuId) => void;
  onStartCreaturePackCheckout: () => void;
  onBuyEarnedDiceBundle: () => void;
  onClose: () => void;
};

const MARKET_ART_ROOT = '/assets/market/supply-dock';

const SECTIONS: readonly {
  id: SupplyDockSection;
  label: string;
  image: string;
  imageAlt: string;
}[] = [
  {
    id: 'free',
    label: 'Free',
    image: `${MARKET_ART_ROOT}/gift-ready.webp`,
    imageAlt: '',
  },
  {
    id: 'collections',
    label: 'Collections',
    image: `${MARKET_ART_ROOT}/creature-pack-stack.webp`,
    imageAlt: '',
  },
  {
    id: 'supplies',
    label: 'Supplies',
    image: `${MARKET_ART_ROOT}/dice-pouch-icon.webp`,
    imageAlt: '',
  },
  {
    id: 'support',
    label: 'Support',
    image: `${MARKET_ART_ROOT}/dock-compass-icon.webp`,
    imageAlt: '',
  },
] as const;

export function IslandRunSupplyDock({
  islandNumber,
  essence,
  dicePool,
  hasVisitedWebTreat,
  loadingDicePackId,
  isStartingCreaturePackCheckout,
  isCreaturePackStripeCheckoutEnabled,
  creaturePackCheckoutError,
  marketPurchaseFeedback,
  marketOwnedDiceBundle,
  marketDiceBundleCost,
  marketDiceBundleReward,
  bossCompleted,
  onVisitWebTreat,
  onSelectDicePack,
  onStartCreaturePackCheckout,
  onBuyEarnedDiceBundle,
  onClose,
}: IslandRunSupplyDockProps) {
  const [activeSection, setActiveSection] = useState<SupplyDockSection>('free');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLiveCommerce = DICE_COMMERCE_MODE === 'live';

  const selectSection = (section: SupplyDockSection) => {
    setActiveSection(section);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section
      className="island-run-supply-dock"
      role="dialog"
      aria-modal="true"
      aria-label="Luma Supply Dock"
    >
      <div className="island-run-supply-dock__backdrop" aria-hidden="true" />
      <div ref={scrollRef} className="island-run-supply-dock__scroll">
        <header className="island-run-supply-dock__header">
          <div className="island-run-supply-dock__sign">
            <span>Island {islandNumber} market</span>
            <h3>Luma<br />Supply Dock</h3>
          </div>
          <div className="island-run-supply-dock__wallets" aria-label="Current shop balances">
            <span className="island-run-supply-dock__wallet">
              <span aria-hidden="true">💰</span>
              <strong>{essence.toLocaleString()}</strong>
            </span>
            <span className="island-run-supply-dock__wallet">
              <img src={`${MARKET_ART_ROOT}/dice-pouch-icon.webp`} alt="" />
              <strong>{dicePool.toLocaleString()}</strong>
            </span>
          </div>
          <button
            type="button"
            className="island-run-supply-dock__close"
            onClick={onClose}
            aria-label="Close Luma Supply Dock"
          >
            ×
          </button>
        </header>

        <nav className="island-run-supply-dock__nav" aria-label="Supply Dock departments">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`island-run-supply-dock__nav-item${activeSection === section.id ? ' island-run-supply-dock__nav-item--active' : ''}`}
              onClick={() => selectSection(section.id)}
              aria-pressed={activeSection === section.id}
            >
              <span className="island-run-supply-dock__nav-art">
                <img src={section.image} alt={section.imageAlt} />
              </span>
              <span>{section.label}</span>
            </button>
          ))}
        </nav>

        <main className="island-run-supply-dock__content">
          {activeSection === 'free' ? (
            <>
              <article className="island-run-supply-dock__hero">
                <div className="island-run-supply-dock__hero-copy">
                  <span className="island-run-supply-dock__eyebrow">Daily web treat</span>
                  <h4>Today&apos;s free supplies</h4>
                  <p>A little gift to power your next step on the island.</p>
                  <button type="button" className="island-run-supply-dock__primary-btn" onClick={onVisitWebTreat}>
                    <img src={`${MARKET_ART_ROOT}/dice-pouch-icon.webp`} alt="" />
                    {hasVisitedWebTreat ? 'Visit the free treat again' : 'Visit & claim 50 dice'}
                  </button>
                  <small>No payment or contact details.</small>
                </div>
                <img
                  className="island-run-supply-dock__hero-art"
                  src={`${MARKET_ART_ROOT}/free-supplies.webp`}
                  alt="HabitGame gift box and glowing dice"
                />
              </article>

              <h4 className="island-run-supply-dock__section-title">
                <span>Continue your journey</span>
              </h4>
              <div className="island-run-supply-dock__journey-grid">
                <button
                  type="button"
                  className="island-run-supply-dock__journey-card"
                  onClick={() => selectSection('collections')}
                >
                  <img
                    src={`${MARKET_ART_ROOT}/creature-pack-stack.webp`}
                    alt="The real HabitGame creature cards, egg and Sproutling"
                  />
                  <span>
                    <strong>Creature Pack</strong>
                    <small>Real collection cards and creature art</small>
                  </span>
                  <b>Explore</b>
                </button>
                <button
                  type="button"
                  className="island-run-supply-dock__journey-card"
                  onClick={() => selectSection('supplies')}
                >
                  <img
                    src={`${MARKET_ART_ROOT}/dice-pouch-card.webp`}
                    alt="Luma dice pouch with ivory dice"
                  />
                  <span>
                    <strong>Journey Supplies</strong>
                    <small>Earned bundle first, optional refills below</small>
                  </span>
                  <b>View options</b>
                </button>
              </div>

              <button
                type="button"
                className="island-run-supply-dock__refill-preview"
                onClick={() => selectSection('supplies')}
              >
                <span>
                  <strong>More dice refills</strong>
                  <small>{isLiveCommerce ? 'Optional secure checkout' : 'Optional test-mode packs'}</small>
                </span>
                <span className="island-run-supply-dock__refill-values" aria-hidden="true">
                  {[250, 500, 1_200, 3_000, 7_500].map((value) => (
                    <span key={value}>
                      <img src={`${MARKET_ART_ROOT}/dice-pouch-icon.webp`} alt="" />
                      {value.toLocaleString()}
                    </span>
                  ))}
                </span>
                <b>Browse</b>
              </button>
              <p className="island-run-supply-dock__reassurance">
                ✦ Free regeneration and earned rewards always remain available.
              </p>
            </>
          ) : null}

          {activeSection === 'collections' ? (
            <>
              <article className="island-run-supply-dock__department-hero">
                <div>
                  <span className="island-run-supply-dock__eyebrow">Creatures &amp; collections</span>
                  <h4>Creature Pack — 5 cards</h4>
                  <p>Meet new companions, grow your crew, and add to your island collection.</p>
                </div>
                <img
                  src={`${MARKET_ART_ROOT}/creature-pack-stack.webp`}
                  alt="HabitGame creature pack with three cards, an egg and Sproutling"
                />
              </article>

              <article className="island-run-supply-dock__paper-card">
                <div className="island-run-supply-dock__card-heading">
                  <div>
                    <span className="island-run-supply-dock__pill">5 cards</span>
                    <h4>Discover new companions</h4>
                  </div>
                  <span className="island-run-supply-dock__optional">Optional</span>
                </div>
                <p>
                  Cards only—no dice or essence. At least two new-to-you creatures are included when
                  enough unowned creatures remain.
                </p>
                <details className="island-run-supply-dock__details">
                  <summary>See pack odds &amp; duplicate policy</summary>
                  <ul>
                    <li>Common chance moves from 100% in slot one to 80% in slot five.</li>
                    <li>Rare chance grows from 5% to 20% across slots two through five.</li>
                    <li>Duplicate cards increase that creature&apos;s copy count.</li>
                    <li>No mythic cards are included in this pack version.</li>
                  </ul>
                </details>
                <button
                  type="button"
                  className="island-run-supply-dock__primary-btn"
                  onClick={onStartCreaturePackCheckout}
                  disabled={isStartingCreaturePackCheckout || !isCreaturePackStripeCheckoutEnabled}
                >
                  {isStartingCreaturePackCheckout
                    ? 'Starting checkout…'
                    : isCreaturePackStripeCheckoutEnabled
                      ? 'View Creature Pack price'
                      : 'Creature Pack checkout under review'}
                </button>
                {!isCreaturePackStripeCheckoutEnabled ? (
                  <small>Paid random packs remain gated until odds, refund and purchase-policy review is complete.</small>
                ) : null}
                {creaturePackCheckoutError ? (
                  <p className="island-run-supply-dock__error">{creaturePackCheckoutError}</p>
                ) : null}
              </article>

              <article className="island-run-supply-dock__quiet-card">
                <img src="/assets/Eggs/Egg_common_lv3.webp" alt="HabitGame common egg" />
                <div>
                  <span className="island-run-supply-dock__eyebrow">Creature trade</span>
                  <h4>Collect or sell after hatching</h4>
                  <p>Resolve hatched eggs in the Hatchery, where the real creature reward is revealed.</p>
                </div>
              </article>
            </>
          ) : null}

          {activeSection === 'supplies' ? (
            <>
              <article className="island-run-supply-dock__department-hero island-run-supply-dock__department-hero--supplies">
                <div>
                  <span className="island-run-supply-dock__eyebrow">Journey supplies</span>
                  <h4>Use what you earn first.</h4>
                  <p>Your money bundle is placed before optional paid dice refills.</p>
                </div>
                <img src={`${MARKET_ART_ROOT}/dice-pouch-card.webp`} alt="Luma dice pouch with ivory dice" />
              </article>

              <article className="island-run-supply-dock__paper-card">
                <div className="island-run-supply-dock__card-heading">
                  <div>
                    <span className="island-run-supply-dock__pill island-run-supply-dock__pill--earned">Earned currency</span>
                    <h4>Dice Bundle</h4>
                  </div>
                  <strong>+{marketDiceBundleReward} dice</strong>
                </div>
                <p>Spend Island Run money—no payment required.</p>
                {marketOwnedDiceBundle ? (
                  <button type="button" className="island-run-supply-dock__secondary-btn" disabled>
                    Dice Bundle owned ✓
                  </button>
                ) : (
                  <button
                    type="button"
                    className="island-run-supply-dock__primary-btn"
                    disabled={essence < marketDiceBundleCost}
                    onClick={onBuyEarnedDiceBundle}
                  >
                    Get bundle ·{' '}
                    <ShopItemCostLine
                      cost={marketDiceBundleCost}
                      balance={essence}
                      currencyIcon="💰"
                      currencyName="money"
                    />
                  </button>
                )}
              </article>

              <section className="island-run-supply-dock__paid-refills" aria-labelledby="supply-dock-paid-refills">
                <div className="island-run-supply-dock__subheading">
                  <div>
                    <span className="island-run-supply-dock__eyebrow">Optional</span>
                    <h4 id="supply-dock-paid-refills">Dice refills</h4>
                  </div>
                  <span>{isLiveCommerce ? 'Secure checkout' : 'Test mode'}</span>
                </div>
                <p>Free regeneration and reward routes remain available. Prices appear before confirmation.</p>
                <DicePackOfferGrid
                  loadingPackId={loadingDicePackId}
                  onSelect={onSelectDicePack}
                />
              </section>

              <article className="island-run-supply-dock__quiet-card island-run-supply-dock__quiet-card--locked">
                <span aria-hidden="true">👑</span>
                <div>
                  <span className="island-run-supply-dock__eyebrow">Post-boss supplies</span>
                  <h4>{bossCompleted ? 'Tier two unlocked' : 'Defeat the boss to unlock'}</h4>
                  <p>{bossCompleted ? 'Larger earned bundles are being prepared.' : 'Keep playing—nothing here needs to be purchased.'}</p>
                </div>
              </article>
            </>
          ) : null}

          {activeSection === 'support' ? (
            <>
              <article className="island-run-supply-dock__support-card">
                <img src={`${MARKET_ART_ROOT}/dock-compass.webp`} alt="Luma Supply Dock compass medallion" />
                <span className="island-run-supply-dock__eyebrow">Entirely optional</span>
                <h4>Support HabitGame</h4>
                <p>
                  Support products belong in their own calm space, separate from free rewards and
                  Island Run momentum.
                </p>
                <div className="island-run-supply-dock__support-note">
                  <strong>No pressure, no countdowns.</strong>
                  <span>You can keep playing, regenerating dice and earning rewards without buying anything.</span>
                </div>
              </article>
              <article className="island-run-supply-dock__quiet-card">
                <span aria-hidden="true">🧭</span>
                <div>
                  <span className="island-run-supply-dock__eyebrow">Coming later</span>
                  <h4>Supporter options</h4>
                  <p>Membership and cosmetic products will appear here only when their account experience is ready.</p>
                </div>
              </article>
            </>
          ) : null}

          {marketPurchaseFeedback ? (
            <p className="island-run-supply-dock__feedback" role="status">{marketPurchaseFeedback}</p>
          ) : null}
        </main>

        <footer className="island-run-supply-dock__footer">
          <span>✦ Free rewards refresh every day</span>
          <button type="button" onClick={onClose}>Return to the island</button>
        </footer>
      </div>
    </section>
  );
}
