import { useState } from 'react';
import {
  EGG_PACK_DEFINITIONS,
  createEggPackCheckoutSession,
  type EggPackSkuId,
} from '../../../../services/eggPackPurchases';
import { getEggStageArtSrc } from '../services/eggService';
import './EggPackShop.css';

export function EggPackShop() {
  const [loadingSkuId, setLoadingSkuId] = useState<EggPackSkuId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(skuId: EggPackSkuId) {
    setLoadingSkuId(skuId);
    setError(null);
    const { url, error: checkoutError } = await createEggPackCheckoutSession(skuId);
    setLoadingSkuId(null);
    if (checkoutError || !url) {
      setError(checkoutError?.message ?? 'Something went wrong. Please try again.');
      return;
    }
    window.location.href = url;
  }

  return (
    <div className="egg-pack-shop">
      <h2 className="egg-pack-shop__title">Egg Shop</h2>
      <p className="egg-pack-shop__subtitle">Hatch creatures, earn rewards</p>

      <div className="egg-pack-shop__cards">
        {EGG_PACK_DEFINITIONS.map((pack) => {
          const isFeatured = pack.skuId === 'egg_pack_large';
          const isLoading = loadingSkuId === pack.skuId;

          return (
            <button
              key={pack.skuId}
              type="button"
              className={[
                'egg-pack-card',
                isFeatured ? 'egg-pack-card--featured' : '',
                isLoading ? 'egg-pack-card--loading' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleBuy(pack.skuId)}
              disabled={loadingSkuId !== null}
            >
              <EggPackArt pack={pack} />

              <div className="egg-pack-card__info">
                <div className="egg-pack-card__name">{pack.label}</div>
                <div className="egg-pack-card__count">{pack.eggCount} eggs</div>
                <div className="egg-pack-card__desc">{pack.description}</div>
                <div className="egg-pack-card__tier-pills">
                  <span className="egg-pack-card__tier-pill egg-pack-card__tier-pill--common">
                    {pack.tiers.common} Common
                  </span>
                  {pack.tiers.rare > 0 && (
                    <span className="egg-pack-card__tier-pill egg-pack-card__tier-pill--rare">
                      {pack.tiers.rare} Rare
                    </span>
                  )}
                </div>
              </div>

              <div className="egg-pack-card__buy">
                <div className="egg-pack-card__price">{pack.priceLabel}</div>
                <div className="egg-pack-card__cta">
                  {isLoading ? '...' : 'Buy now'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && <div className="egg-pack-shop__error">{error}</div>}
    </div>
  );
}

function EggPackArt({ pack }: { pack: (typeof EGG_PACK_DEFINITIONS)[number] }) {
  const commonSrc = getEggStageArtSrc('common', 2);
  const rareSrc = getEggStageArtSrc('rare', 2);

  if (pack.skuId === 'egg_pack_small') {
    return (
      <div className="egg-pack-card__eggs">
        <img src={commonSrc} alt="egg" className="egg-pack-card__egg-img egg-pack-card__egg-img--trio-0" />
        <img src={commonSrc} alt="egg" className="egg-pack-card__egg-img egg-pack-card__egg-img--trio-1" />
        <img src={commonSrc} alt="egg" className="egg-pack-card__egg-img egg-pack-card__egg-img--trio-2" />
      </div>
    );
  }

  if (pack.skuId === 'egg_pack_medium') {
    return (
      <div className="egg-pack-card__eggs">
        <img src={commonSrc} alt="egg" className="egg-pack-card__egg-img egg-pack-card__egg-img--stack-0" />
        <img src={commonSrc} alt="egg" className="egg-pack-card__egg-img egg-pack-card__egg-img--stack-1" />
        <img src={commonSrc} alt="egg" className="egg-pack-card__egg-img egg-pack-card__egg-img--stack-2" />
        <img src={rareSrc}   alt="rare egg" className="egg-pack-card__egg-img egg-pack-card__egg-img--stack-rare" />
      </div>
    );
  }

  // large
  return (
    <div className="egg-pack-card__eggs">
      <img src={commonSrc} alt="egg" className="egg-pack-card__egg-img egg-pack-card__egg-img--stack-0" />
      <img src={rareSrc}   alt="rare egg" className="egg-pack-card__egg-img egg-pack-card__egg-img--stack-1" />
      <img src={commonSrc} alt="egg" className="egg-pack-card__egg-img egg-pack-card__egg-img--stack-2" />
      <img src={rareSrc}   alt="rare egg" className="egg-pack-card__egg-img egg-pack-card__egg-img--stack-rare" />
    </div>
  );
}
