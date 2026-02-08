import { useState, useMemo, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { DICE_PACK_DEFINITIONS } from '../../../constants/economy';
import { purchaseDicePack, loadCurrencyBalance } from '../../../services/gameRewards';
import './luckyRollBoard.css';

interface LuckyRollDiceShopProps {
  session: Session;
  onClose: () => void;
  onBack: () => void;
}

export function LuckyRollDiceShop({ session, onBack }: LuckyRollDiceShopProps) {
  const userId = session.user.id;
  const [currencyBalance, setCurrencyBalance] = useState(() => loadCurrencyBalance(userId));
  const [purchasingPack, setPurchasingPack] = useState<string | null>(null);
  const [mysteryReveal, setMysteryReveal] = useState<{ dice: number; tokens: number; tier: string } | null>(null);
  
  const handlePurchase = useCallback(async (packId: 'starter' | 'value' | 'power' | 'mystery') => {
    if (purchasingPack) return;
    
    setPurchasingPack(packId);
    
    // Brief animation delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = purchaseDicePack(userId, packId);
    
    if (result.success) {
      // Update currency balance
      const newBalance = loadCurrencyBalance(userId);
      setCurrencyBalance(newBalance);
      
      // If mystery box, show reveal animation
      if (packId === 'mystery' && result.tier) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setMysteryReveal({
          dice: result.diceAwarded,
          tokens: result.tokensAwarded,
          tier: result.tier
        });
        
        // Hide reveal after delay
        setTimeout(() => {
          setMysteryReveal(null);
        }, 3000);
      }
    }
    
    setPurchasingPack(null);
  }, [userId, purchasingPack]);
  
  const packs = useMemo(() => {
    return DICE_PACK_DEFINITIONS.map(pack => {
      const canAfford = currencyBalance.hearts >= pack.heartCost;
      const needed = pack.heartCost - currencyBalance.hearts;
      
      return {
        ...pack,
        canAfford,
        needed: needed > 0 ? needed : 0
      };
    });
  }, [currencyBalance.hearts]);
  
  return (
    <div className="lucky-roll-dice-shop" role="dialog" aria-modal="true" aria-label="Dice Shop">
      <div className="lucky-roll-dice-shop__backdrop" onClick={onBack} role="presentation" />
      
      <div className="lucky-roll-dice-shop__container">
        {/* Header */}
        <div className="lucky-roll-dice-shop__header">
          <h2 className="lucky-roll-dice-shop__title">🛒 Dice Shop</h2>
          <div className="lucky-roll-dice-shop__hearts">
            ❤️ {currencyBalance.hearts}
          </div>
          <button
            type="button"
            className="lucky-roll-dice-shop__close"
            onClick={onBack}
            aria-label="Close Dice Shop"
          >
            ×
          </button>
        </div>
        
        {/* Pack cards */}
        <div className="lucky-roll-dice-shop__packs">
          {packs.map(pack => (
            <div 
              key={pack.id}
              className={`lucky-roll-pack-card ${pack.id === 'power' ? 'lucky-roll-pack-card--best-value' : ''} ${pack.id === 'mystery' ? 'lucky-roll-pack-card--mystery' : ''}`}
            >
              <h3 className="lucky-roll-pack-card__title">
                {pack.id === 'mystery' ? '❓' : '🎲'} {pack.label}
              </h3>
              
              <div className="lucky-roll-pack-card__contents">
                {pack.diceCount > 0 ? (
                  <div className="lucky-roll-pack-card__item">
                    {pack.diceCount} dice
                  </div>
                ) : (
                  <div className="lucky-roll-pack-card__item lucky-roll-pack-card__item--mystery">
                    5–750 dice
                  </div>
                )}
                {pack.tokenCount > 0 ? (
                  <div className="lucky-roll-pack-card__item">
                    {pack.tokenCount} tokens
                  </div>
                ) : (
                  <div className="lucky-roll-pack-card__item lucky-roll-pack-card__item--mystery">
                    ? tokens
                  </div>
                )}
              </div>
              
              <div className="lucky-roll-pack-card__cost">
                {pack.heartCost} ❤️
              </div>
              
              <button
                type="button"
                className="lucky-roll-pack-card__button"
                onClick={() => handlePurchase(pack.id)}
                disabled={!pack.canAfford || purchasingPack !== null}
              >
                {purchasingPack === pack.id ? 'Purchasing...' : pack.canAfford ? (pack.id === 'mystery' ? 'OPEN' : 'BUY') : `Need ${pack.needed} more ❤️`}
              </button>
              
              {pack.id === 'power' && (
                <div className="lucky-roll-pack-card__badge">Best Value</div>
              )}
            </div>
          ))}
        </div>
        
        {/* Mystery reveal overlay */}
        {mysteryReveal && (
          <div className="lucky-roll-mystery-reveal">
            <div className="lucky-roll-mystery-reveal__content">
              <h3 className="lucky-roll-mystery-reveal__title">
                {mysteryReveal.tier === 'Jackpot' ? '🎊' : '🎉'} {mysteryReveal.tier}!
              </h3>
              <div className="lucky-roll-mystery-reveal__prizes">
                <div className="lucky-roll-mystery-reveal__prize">
                  🎲 {mysteryReveal.dice}
                </div>
                <div className="lucky-roll-mystery-reveal__prize">
                  🎟️ {mysteryReveal.tokens}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Back button */}
        <div className="lucky-roll-dice-shop__actions">
          <button
            type="button"
            className="lucky-roll-dice-shop__back-button"
            onClick={onBack}
          >
            Back to Board
          </button>
        </div>
      </div>
    </div>
  );
}
