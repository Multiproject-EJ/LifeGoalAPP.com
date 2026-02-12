import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchGamificationProfile } from '../../services/gamificationPrefs';
import { getImpactTreeLedger } from '../../services/impactTrees';
import type { ZenTokenTransaction } from '../../types/gamification';
import { fetchZenGardenInventory, fetchZenTokenTransactions, purchaseZenGardenItem } from '../../services/zenGarden';
import { useTheme } from '../../contexts/ThemeContext';
import zenShopBg from '../../assets/zenshopmain.webp';
import toZenGardenImg from '../../assets/tozengarden.webp';
import zenGardenPlotLight from '../../assets/zengardenplotlight.webp';
import zenGardenPlotDark from '../../assets/zengardenplotdark.webp';
import './ZenGarden.css';

type ZenGardenProps = {
  session: Session | null;
  onBack?: () => void;
};

type ZenGardenItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
};

type TreeMilestone = {
  minScore: number;
  label: string;
  emoji: string;
  description: string;
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

const TREE_MILESTONES: TreeMilestone[] = [
  {
    minScore: 0,
    label: 'Seedling',
    emoji: '🌱',
    description: 'Your Tree of Life is just sprouting. Level-ups and weekly waterings help it grow.',
  },
  {
    minScore: 4,
    label: 'Sapling',
    emoji: '🌿',
    description: 'Roots are forming. Keep stacking level-ups and weekly closures.',
  },
  {
    minScore: 9,
    label: 'Young Tree',
    emoji: '🌳',
    description: 'Steady rituals are shaping a sturdier path.',
  },
  {
    minScore: 15,
    label: 'Flourishing',
    emoji: '🌲',
    description: 'Your Tree of Life is thriving with consistent wins.',
  },
  {
    minScore: 22,
    label: 'Ancient',
    emoji: '🌲✨',
    description: 'A legacy of steady growth and mindful waterings.',
  },
];

export function ZenGarden({ session, onBack }: ZenGardenProps) {
  const [balance, setBalance] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [inventory, setInventory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<ZenTokenTransaction[]>([]);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [impactTotal, setImpactTotal] = useState(0);
  const [showGardenPlot, setShowGardenPlot] = useState(false);

  const userId = session?.user?.id ?? 'demo_user';
  const { effectiveCategory } = useTheme();
  const gardenPlotImage = effectiveCategory === 'dark' ? zenGardenPlotDark : zenGardenPlotLight;

  // Handle escape key to close overlay
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showGardenPlot) {
        setShowGardenPlot(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showGardenPlot]);

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
    setCurrentLevel(profile.current_level ?? 1);
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

  const loadImpactLedger = () => {
    const { total } = getImpactTreeLedger(userId);
    setImpactTotal(total);
  };

  const refresh = async () => {
    setLoading(true);
    setPurchaseError(null);
    setTransactionsError(null);
    try {
      await Promise.all([loadBalance(), loadInventory()]);
      await loadTransactions();
      loadImpactLedger();
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

  const treeScore = currentLevel + impactTotal;
  const treeStage = useMemo(() => {
    return [...TREE_MILESTONES]
      .sort((a, b) => a.minScore - b.minScore)
      .reduce((current, milestone) => (treeScore >= milestone.minScore ? milestone : current));
  }, [treeScore]);
  const nextMilestone = useMemo(() => {
    return TREE_MILESTONES.find((milestone) => milestone.minScore > treeScore) ?? null;
  }, [treeScore]);
  const treeProgress = useMemo(() => {
    if (!nextMilestone) return 100;
    const span = nextMilestone.minScore - treeStage.minScore;
    if (span <= 0) return 100;
    return Math.min(100, Math.round(((treeScore - treeStage.minScore) / span) * 100));
  }, [nextMilestone, treeScore, treeStage.minScore]);

  return (
    <>
      <section 
        className="zen-garden" 
        style={{ 
          backgroundImage: `url(${zenShopBg})`,
          backgroundSize: '100% auto',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {onBack && (
          <button
            type="button"
            className="zen-garden__back-button"
            onClick={onBack}
            aria-label="Back to Score Tab"
          >
            ← Back
          </button>
        )}
        <header className="zen-garden__header">
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

          <section className="zen-garden__tree">
            <div className="zen-garden__tree-card">
              <div className="zen-garden__tree-header">
                <div>
                  <p className="zen-garden__eyebrow">Tree of Life</p>
                  <h3 className="zen-garden__tree-title">{treeStage.label}</h3>
                </div>
                <span className="zen-garden__tree-emoji" aria-hidden="true">
                  {treeStage.emoji}
                </span>
              </div>
              <p className="zen-garden__tree-description">{treeStage.description}</p>
              <div className="zen-garden__tree-progress">
                <div className="zen-garden__tree-progress-bar">
                  <span
                    className="zen-garden__tree-progress-fill"
                    style={{ width: `${treeProgress}%` }}
                  />
                </div>
                <div className="zen-garden__tree-meta">
                  <span>Level {currentLevel}</span>
                  <span>{impactTotal} waterings</span>
                  <span>{treeScore} growth points</span>
                </div>
              </div>
              {nextMilestone ? (
                <p className="zen-garden__tree-next">
                  {nextMilestone.minScore - treeScore} growth points to reach{' '}
                  {nextMilestone.label.toLowerCase()}.
                </p>
              ) : (
                <p className="zen-garden__tree-next">Your Tree of Life is fully grown.</p>
              )}
            </div>
          </section>
        </>
      )}

      {/* To The Garden Button */}
      <button
        type="button"
        className="zen-garden__to-garden-btn"
        onClick={() => setShowGardenPlot(true)}
        aria-label="Open garden plot view"
      >
        <img src={toZenGardenImg} alt="To the garden" />
      </button>
    </section>

    {/* Garden Plot Overlay */}
    {showGardenPlot && (
      <div 
        className="zen-garden__plot-overlay" 
        role="dialog" 
        aria-modal="true"
        aria-label="Garden plot view"
      >
        <div 
          className="zen-garden__plot-overlay-backdrop" 
          onClick={() => setShowGardenPlot(false)}
        />
        <div className="zen-garden__plot-overlay-content">
          <button
            type="button"
            className="zen-garden__plot-close"
            onClick={() => setShowGardenPlot(false)}
            aria-label="Close garden plot"
          >
            ✕
          </button>
          <img 
            src={gardenPlotImage} 
            alt="Garden plot view" 
            className="zen-garden__plot-image"
          />
        </div>
      </div>
    )}
  </>
  );
}
