import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { PowerUp, UserPowerUp, ActiveBoost } from '../../types/gamification';
import { fetchPowerUpsCatalog, purchasePowerUp, fetchUserPowerUps, getActivePowerUps } from '../../services/powerUps';
import { fetchGamificationProfile } from '../../services/gamificationPrefs';
import { PowerUpCard } from './PowerUpCard';
import { PowerUpPurchaseModal } from './PowerUpPurchaseModal';
import { ActivePowerUps } from './ActivePowerUps';
import './PowerUpsStore.css';

interface PowerUpsStoreProps {
  session: Session | null;
}

export function PowerUpsStore({ session }: PowerUpsStoreProps) {
  const [catalog, setCatalog] = useState<PowerUp[]>([]);
  const [userPowerUps, setUserPowerUps] = useState<UserPowerUp[]>([]);
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>([]);
  const [currentGold, setCurrentGold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPowerUp, setSelectedPowerUp] = useState<PowerUp | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userId = session?.user?.id || 'demo_user';

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Load catalog
      const { data: catalogData, error: catalogError } = await fetchPowerUpsCatalog();
      if (catalogError) {
        console.error('Error loading power-ups catalog:', catalogError);
        setErrorMessage('Failed to load power-ups catalog. Please ensure migration 0127_power_ups_store.sql has been run.');
        setCatalog([]);
      } else {
        setCatalog(catalogData || []);
      }

      // Load user's profile for gold balance
      const { data: profile, error: profileError } = await fetchGamificationProfile(userId);
      if (profileError) throw profileError;
      setCurrentGold(profile?.total_points || 0);

      // Load user's power-ups
      const { data: userPowerUpsData, error: userPowerUpsError } = await fetchUserPowerUps(userId);
      if (userPowerUpsError) throw userPowerUpsError;
      setUserPowerUps(userPowerUpsData || []);

      // Load active boosts
      const { data: activeBoostsData, error: activeBoostsError } = await getActivePowerUps(userId);
      if (activeBoostsError) throw activeBoostsError;
      setActiveBoosts(activeBoostsData || []);
    } catch (error) {
      console.error('Failed to load power-ups store:', error);
      setErrorMessage('Failed to load store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handlePurchase = (powerUp: PowerUp) => {
    setSelectedPowerUp(powerUp);
  };

  const confirmPurchase = async () => {
    if (!selectedPowerUp) return;

    setIsPurchasing(true);
    setErrorMessage(null);

    try {
      const { data, error } = await purchasePowerUp(userId, selectedPowerUp.id);
      
      if (error) {
        throw error;
      }

      if (data?.success) {
        setCurrentGold(data.newGoldBalance);
        setSuccessMessage(
          data.effectApplied 
            ? `${selectedPowerUp.name} purchased! ${data.effectApplied}`
            : `${selectedPowerUp.name} purchased successfully!`
        );
        setSelectedPowerUp(null);
        
        // Reload data to reflect purchase
        await loadData();

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      setErrorMessage(error.message || 'Purchase failed. Please try again.');
      setSelectedPowerUp(null);
    } finally {
      setIsPurchasing(false);
    }
  };

  const categorizedPowerUps = {
    boosts: catalog.filter(p => p.category === 'boosts'),
    protection: catalog.filter(p => p.category === 'protection'),
    upgrades: catalog.filter(p => p.category === 'upgrades'),
  };

  if (loading) {
    return (
      <div className="power-ups-store">
        <div className="power-ups-store__loading">Loading store...</div>
      </div>
    );
  }

  if (errorMessage && catalog.length === 0) {
    return (
      <div className="power-ups-store">
        <div className="power-ups-store__error">
          <h2>⚠️ Unable to Load Store</h2>
          <p>{errorMessage}</p>
          <details>
            <summary>Troubleshooting</summary>
            <ul>
              <li>Ensure migration <code>0127_power_ups_store.sql</code> has been run successfully</li>
              <li>Check browser console for detailed errors</li>
              <li>Verify Supabase connection</li>
            </ul>
          </details>
          <button onClick={loadData}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="power-ups-store">
      <div className="power-ups-store__header">
        <h1 className="power-ups-store__title">🪙 Power-ups Store</h1>
        <div className="power-ups-store__balance">
          <span className="power-ups-store__balance-label">Your Gold:</span>
          <span className="power-ups-store__balance-value">🪙 {currentGold}</span>
        </div>
      </div>

      {successMessage && (
        <div className="power-ups-store__message power-ups-store__message--success">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="power-ups-store__message power-ups-store__message--error">
          {errorMessage}
        </div>
      )}

      {activeBoosts.length > 0 && (
        <div className="power-ups-store__active-section">
          <ActivePowerUps activeBoosts={activeBoosts} onUpdate={loadData} />
        </div>
      )}

      <div className="power-ups-store__content">
        {/* XP Boosts */}
        {categorizedPowerUps.boosts.length > 0 && (
          <section className="power-ups-store__category">
            <h2 className="power-ups-store__category-title">⚡ XP Boosts</h2>
            <p className="power-ups-store__category-description">
              Multiply your XP gains for a limited time
            </p>
            <div className="power-ups-store__grid four-by-three-grid">
              {categorizedPowerUps.boosts.map((powerUp) => (
                <PowerUpCard
                  key={powerUp.id}
                  powerUp={powerUp}
                  currentGold={currentGold}
                  onPurchase={handlePurchase}
                />
              ))}
            </div>
          </section>
        )}

        {/* Protection Items */}
        {categorizedPowerUps.protection.length > 0 && (
          <section className="power-ups-store__category">
            <h2 className="power-ups-store__category-title">🛡️ Protection</h2>
            <p className="power-ups-store__category-description">
              Guard your progress with protective items
            </p>
            <div className="power-ups-store__grid four-by-three-grid">
              {categorizedPowerUps.protection.map((powerUp) => (
                <PowerUpCard
                  key={powerUp.id}
                  powerUp={powerUp}
                  currentGold={currentGold}
                  onPurchase={handlePurchase}
                />
              ))}
            </div>
          </section>
        )}

        {/* Permanent Upgrades */}
        {categorizedPowerUps.upgrades.length > 0 && (
          <section className="power-ups-store__category">
            <h2 className="power-ups-store__category-title">🪙 Permanent Upgrades</h2>
            <p className="power-ups-store__category-description">
              Unlock lasting improvements to your account
            </p>
            <div className="power-ups-store__grid four-by-three-grid">
              {categorizedPowerUps.upgrades.map((powerUp) => (
                <PowerUpCard
                  key={powerUp.id}
                  powerUp={powerUp}
                  currentGold={currentGold}
                  onPurchase={handlePurchase}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {selectedPowerUp && (
        <PowerUpPurchaseModal
          powerUp={selectedPowerUp}
          currentGold={currentGold}
          onConfirm={confirmPurchase}
          onCancel={() => setSelectedPowerUp(null)}
          isProcessing={isPurchasing}
        />
      )}
    </div>
  );
}
