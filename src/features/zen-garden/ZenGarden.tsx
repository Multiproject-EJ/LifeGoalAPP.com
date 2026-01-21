import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchGamificationProfile } from '../../services/gamificationPrefs';
import type { ZenTokenTransaction } from '../../types/gamification';
import { fetchZenGardenInventory, fetchZenTokenTransactions, purchaseZenGardenItem } from '../../services/zenGarden';
import './ZenGarden.css';

type ZenGardenProps = {
  session: Session | null;
};

type ZenGardenItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
};

const ZEN_GARDEN_ITEMS: ZenGardenItem[] = [
  {
    id: 'zen_ripple_pool',
    name: 'Ripple Pool',
    description: 'A calm water feature for post-meditation flow.',
    cost: 12,
    emoji: '💧',
  },
  {
    id: 'zen_bamboo',
    name: 'Bamboo Grove',
    description: 'Symbolic growth that rewards daily breathwork.',
    cost: 18,
    emoji: '🎋',
  },
  {
    id: 'zen_lotus_lamp',
    name: 'Lotus Lamp',
    description: 'Soft light to honor streaky meditation weeks.',
    cost: 24,
    emoji: '🪷',
  },
  {
    id: 'zen_stone_path',
    name: 'Stone Path',
    description: 'A grounded route to your next mindful moment.',
    cost: 30,
    emoji: '🪨',
  },
  {
    id: 'zen_wind_chime',
    name: 'Wind Chime',
    description: 'Gentle reminders to return to center.',
    cost: 36,
    emoji: '🎐',
  },
  {
    id: 'zen_sakura',
    name: 'Sakura Bloom',
    description: 'Seasonal joy for long-form meditation sessions.',
    cost: 42,
    emoji: '🌸',
  },
];

export function ZenGarden({ session }: ZenGardenProps) {
  const [balance, setBalance] = useState(0);
  const [inventory, setInventory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<ZenTokenTransaction[]>([]);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const userId = session?.user?.id ?? 'demo_user';

  const ownedItems = useMemo(
    () => new Set(inventory),
    [inventory]
  );

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }),
    []
  );

  const loadBalance = async () => {
    const { data: profile, error } = await fetchGamificationProfile(userId);
    if (error || !profile) {
      throw error ?? new Error('Missing profile');
    }
    setBalance(profile.zen_tokens ?? 0);
  };

  const loadInventory = async () => {
    const { data, error } = await fetchZenGardenInventory(userId);
    if (error) {
      throw error;
    }
    setInventory(data);
  };

  const loadTransactions = async () => {
    const { data, error } = await fetchZenTokenTransactions(userId, 4);
    if (error) {
      setTransactionsError(error.message);
      setTransactions([]);
      return;
    }
    setTransactionsError(null);
    setTransactions(data);
  };

  const refresh = async () => {
    setLoading(true);
    setPurchaseError(null);
    setTransactionsError(null);
    try {
      await Promise.all([loadBalance(), loadInventory()]);
      await loadTransactions();
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : 'Failed to load Zen Garden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [userId]);

  const handlePurchase = async (item: ZenGardenItem) => {
    setPurchaseSuccess(null);
    setPurchaseError(null);
    setPurchasingId(item.id);

    const { data, error } = await purchaseZenGardenItem(userId, item.id, item.name, item.cost);
    if (error || !data) {
      setPurchaseError(error?.message ?? 'Purchase failed.');
      setPurchasingId(null);
      return;
    }

    setBalance(data.balance);
    setInventory(data.inventory);
    await loadTransactions();
    setPurchaseSuccess(`${item.name} added to your Zen Garden.`);
    setPurchasingId(null);
  };

  return (
    <section className="zen-garden">
      <header className="zen-garden__header">
        <div>
          <p className="zen-garden__eyebrow">Zen Garden</p>
          <h2 className="zen-garden__title">Meditation-only rewards</h2>
          <p className="zen-garden__subtitle">
            Spend Zen Tokens earned from meditation to grow a peaceful garden.
          </p>
        </div>
        <div className="zen-garden__balance">
          <span className="zen-garden__balance-label">Zen Tokens</span>
          <span className="zen-garden__balance-value">🪷 {balance}</span>
        </div>
      </header>

      {loading && (
        <div className="zen-garden__status">Loading Zen Garden...</div>
      )}

      {!loading && (
        <>
          {purchaseError && <div className="zen-garden__message zen-garden__message--error">{purchaseError}</div>}
          {purchaseSuccess && (
            <div className="zen-garden__message zen-garden__message--success">{purchaseSuccess}</div>
          )}

          <div className="zen-garden__grid four-by-three-grid">
            {ZEN_GARDEN_ITEMS.map((item) => {
              const owned = ownedItems.has(item.id);
              const canAfford = balance >= item.cost;
              const isPurchasing = purchasingId === item.id;

              return (
                <article
                  key={item.id}
                  className={`zen-garden__card${owned ? ' zen-garden__card--owned' : ''}`}
                >
                  <div className="zen-garden__card-icon">{item.emoji}</div>
                  <h3 className="zen-garden__card-title">{item.name}</h3>
                  <p className="zen-garden__card-description">{item.description}</p>
                  <div className="zen-garden__card-footer">
                    <span className="zen-garden__card-cost">🪷 {item.cost}</span>
                    <button
                      type="button"
                      className="zen-garden__card-button"
                      disabled={owned || !canAfford || isPurchasing}
                      onClick={() => handlePurchase(item)}
                    >
                      {owned ? 'Unlocked' : isPurchasing ? 'Purchasing...' : 'Unlock'}
                    </button>
                  </div>
                  {!owned && !canAfford && (
                    <span className="zen-garden__card-lock">Earn more Zen Tokens</span>
                  )}
                </article>
              );
            })}
          </div>
          <section className="zen-garden__ledger">
            <div className="zen-garden__ledger-header">
              <div>
                <p className="zen-garden__eyebrow">Zen Token activity</p>
                <h3 className="zen-garden__ledger-title">Recent Zen Token activity</h3>
              </div>
              <span className="zen-garden__ledger-pill">Ledger</span>
            </div>

            {transactionsError && (
              <p className="zen-garden__ledger-status">{transactionsError}</p>
            )}

            {!transactionsError && transactions.length === 0 && (
              <p className="zen-garden__ledger-status">
                Unlock your first Zen reward to start building your meditation ledger.
              </p>
            )}

            {!transactionsError && transactions.length > 0 && (
              <div className="zen-garden__ledger-list">
                {transactions.map((transaction) => {
                  const isSpend = transaction.action === 'spend';
                  const fallbackLabel = isSpend ? 'Zen Garden unlock' : 'Meditation reward';
                  const amountLabel = `${isSpend ? '-' : '+'}${transaction.token_amount} 🪷`;

                  return (
                    <div key={transaction.id} className="zen-garden__ledger-row">
                      <div>
                        <p className="zen-garden__ledger-row-title">
                          {transaction.description ?? fallbackLabel}
                        </p>
                        <p className="zen-garden__ledger-row-meta">
                          {dateFormatter.format(new Date(transaction.created_at))}
                        </p>
                      </div>
                      <span
                        className={`zen-garden__ledger-row-value ${
                          isSpend
                            ? 'zen-garden__ledger-row-value--spend'
                            : 'zen-garden__ledger-row-value--earn'
                        }`}
                      >
                        {amountLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
