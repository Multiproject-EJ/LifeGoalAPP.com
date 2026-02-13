import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  AVATAR_ITEM_CATALOG,
  CATEGORY_INFO,
  type AvatarItem,
  type AvatarItemCategory,
} from './avatarItemCatalog';
import {
  ARCHETYPE_DECK,
  SUIT_COLORS,
  SUIT_LABELS,
  type ArchetypeCard,
  type SuitKey,
} from '../identity/archetypes/archetypeDeck';
import type { ArchetypeHand, HandCard } from '../identity/archetypes/archetypeHandBuilder';
import type { PersonalityScores } from '../identity/personalityScoring';
import '../../styles/player-avatar.css';

type PlayerAvatarPanelProps = {
  session: Session;
  personalityScores?: PersonalityScores | null;
  archetypeHand?: ArchetypeHand | null;
  personalitySummary?: string | null;
};

export function PlayerAvatarPanel({
  session,
  personalityScores,
  archetypeHand,
  personalitySummary,
}: PlayerAvatarPanelProps) {
  // Determine if user has personality data
  const hasPersonalityData = Boolean(personalityScores && archetypeHand);

  // Default to dominant archetype or first archetype
  const defaultArchetype = archetypeHand?.dominant.card.id ?? ARCHETYPE_DECK[0].id;
  const [selectedAvatar, setSelectedAvatar] = useState<string>(defaultArchetype);
  const [activeCategory, setActiveCategory] = useState<AvatarItemCategory>('tools');
  const [suitFilter, setSuitFilter] = useState<SuitKey | 'all'>('all');
  const [equippedItems, setEquippedItems] = useState<Set<string>>(new Set());

  // Get player's archetype hand cards
  const handCards = useMemo<HandCard[]>(() => {
    if (!archetypeHand) return [];
    return [
      archetypeHand.dominant,
      archetypeHand.secondary,
      ...archetypeHand.supports,
      archetypeHand.shadow,
    ];
  }, [archetypeHand]);

  // Get player's top archetype IDs for unlock logic
  const topArchetypeIds = useMemo<string[]>(() => {
    return handCards.map((card) => card.card.id);
  }, [handCards]);

  // Get player's dominant suit
  const dominantSuit = archetypeHand?.dominant.card.suit;

  // Filter archetypes by suit
  const filteredArchetypes = useMemo<ArchetypeCard[]>(() => {
    if (suitFilter === 'all') return ARCHETYPE_DECK;
    return ARCHETYPE_DECK.filter((card) => card.suit === suitFilter);
  }, [suitFilter]);

  // Determine if an item is unlocked
  const isItemUnlocked = (item: AvatarItem): boolean => {
    if (!hasPersonalityData) return false;

    // Free items are always unlocked
    if (item.unlockCondition === 'free') return true;

    // Personality-based items
    if (item.unlockCondition === 'personality') {
      // Items with suit affinity matching player's dominant suit are unlocked
      if (item.suitAffinity && item.suitAffinity === dominantSuit) return true;

      // Items with archetype affinity containing player's top archetypes are unlocked
      if (item.archetypeAffinity) {
        return item.archetypeAffinity.some((archId) => topArchetypeIds.includes(archId));
      }

      // Items with trait requirements
      if (item.traitRequirement && personalityScores) {
        const traitValue = personalityScores.traits[item.traitRequirement.trait];
        return traitValue >= item.traitRequirement.minScore;
      }
    }

    return false;
  };

  // Get "For You" recommended items (6-8 items based on player's archetype)
  const forYouItems = useMemo<AvatarItem[]>(() => {
    if (!hasPersonalityData || !dominantSuit) return [];
    const recommended = AVATAR_ITEM_CATALOG.filter((item) => {
      return (
        item.suitAffinity === dominantSuit &&
        item.archetypeAffinity &&
        item.archetypeAffinity.includes(archetypeHand.dominant.card.id)
      );
    });
    return recommended.slice(0, 8);
  }, [hasPersonalityData, dominantSuit, archetypeHand]);

  // Filter items by category and suit
  const categoryItems = useMemo<AvatarItem[]>(() => {
    let items = AVATAR_ITEM_CATALOG.filter((item) => item.category === activeCategory);
    if (suitFilter !== 'all') {
      items = items.filter((item) => item.suitAffinity === suitFilter || !item.suitAffinity);
    }
    return items;
  }, [activeCategory, suitFilter]);

  // Count items per category
  const categoryItemCounts = useMemo(() => {
    const counts: Record<AvatarItemCategory, number> = {
      tools: 0,
      charms: 0,
      garments: 0,
      auras: 0,
      badges: 0,
      companions: 0,
    };
    AVATAR_ITEM_CATALOG.forEach((item) => {
      counts[item.category]++;
    });
    return counts;
  }, []);

  const toggleEquipItem = (itemId: string, item: AvatarItem) => {
    if (!isItemUnlocked(item)) return;
    setEquippedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectedAvatarCard = ARCHETYPE_DECK.find((a) => a.id === selectedAvatar);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Common':
        return '#94a3b8';
      case 'Rare':
        return '#3b82f6';
      case 'Epic':
        return '#a855f7';
      case 'Legendary':
        return '#eab308';
      default:
        return '#94a3b8';
    }
  };

  const getSuitColorWithAlpha = (suit: SuitKey, alpha: number = 0.1) => {
    const color = SUIT_COLORS[suit];
    // Convert hex to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // If no personality data, show CTA
  if (!hasPersonalityData) {
    return (
      <div className="player-avatar-panel">
        <div className="player-avatar-panel__header">
          <h1 className="player-avatar-panel__title">Player Avatar</h1>
          <p className="player-avatar-panel__subtitle">Unlock your personalized avatar</p>
        </div>

        <section className="player-avatar-panel__cta">
          <div className="player-avatar-panel__cta-card">
            <span className="player-avatar-panel__cta-emoji">🎭</span>
            <h2 className="player-avatar-panel__cta-title">Take Your Personality Test</h2>
            <p className="player-avatar-panel__cta-text">
              Discover your unique archetype and unlock a personalized avatar and equipment tailored to
              your personality!
            </p>
            <p className="player-avatar-panel__cta-hint">
              Navigate to <strong>Identity</strong> to take the test and unlock your custom playstyle.
            </p>
          </div>
        </section>

        {/* Show generic starter avatars */}
        <section className="player-avatar-panel__section">
          <h2 className="player-avatar-panel__section-title">Preview: Starter Avatars</h2>
          <div className="player-avatar-panel__avatar-grid">
            {ARCHETYPE_DECK.slice(0, 8).map((archetype) => (
              <div
                key={archetype.id}
                className="player-avatar-panel__avatar-card player-avatar-panel__avatar-card--locked"
              >
                <span className="player-avatar-panel__avatar-emoji" role="img" aria-label={archetype.name}>
                  {archetype.icon}
                </span>
                <span className="player-avatar-panel__avatar-name">{archetype.name}</span>
                <span className="player-avatar-panel__avatar-lock">🔒</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="player-avatar-panel">
      <div className="player-avatar-panel__header">
        <h1 className="player-avatar-panel__title">Player Avatar</h1>
        <p className="player-avatar-panel__subtitle">
          {personalitySummary || 'Customize your character'}
        </p>
      </div>

      {/* Personality Banner */}
      {archetypeHand && (
        <section className="player-avatar-panel__personality-banner">
          <div
            className="player-avatar-panel__hand-summary"
            style={{ '--suit-color': SUIT_COLORS[archetypeHand.dominant.card.suit] } as React.CSSProperties}
          >
            <div className="player-avatar-panel__hand-dominant">
              <span className="player-avatar-panel__hand-icon">{archetypeHand.dominant.card.icon}</span>
              <div className="player-avatar-panel__hand-info">
                <h3 className="player-avatar-panel__hand-title">Your Playstyle</h3>
                <p className="player-avatar-panel__hand-name">
                  {archetypeHand.dominant.card.name} ({SUIT_LABELS[archetypeHand.dominant.card.suit]})
                </p>
              </div>
            </div>
            <div className="player-avatar-panel__hand-cards">
              {[
                archetypeHand.secondary,
                ...archetypeHand.supports,
              ].map((card) => (
                <div
                  key={card.card.id}
                  className="player-avatar-panel__hand-card"
                  title={card.card.name}
                >
                  <span>{card.card.icon}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Avatar Preview Section */}
      <section className="player-avatar-panel__preview">
        <div className="player-avatar-panel__preview-card">
          <div className="player-avatar-panel__preview-avatar">
            {selectedAvatarCard && (
              <>
                <span
                  className="player-avatar-panel__preview-emoji"
                  role="img"
                  aria-label={selectedAvatarCard.name}
                >
                  {selectedAvatarCard.icon}
                </span>
                <p className="player-avatar-panel__preview-name">{selectedAvatarCard.name}</p>
                <p className="player-avatar-panel__preview-drive">{selectedAvatarCard.drive}</p>
              </>
            )}
          </div>
          <div className="player-avatar-panel__preview-equipped">
            <p className="player-avatar-panel__preview-label">Equipped Items: {equippedItems.size}</p>
          </div>
        </div>
      </section>

      {/* Avatar Selection */}
      <section className="player-avatar-panel__section">
        <h2 className="player-avatar-panel__section-title">Choose Your Avatar</h2>

        {/* Suggested Avatars (5-card hand) */}
        <div className="player-avatar-panel__suggested">
          <h3 className="player-avatar-panel__suggested-title">⭐ Suggested For You</h3>
          <div className="player-avatar-panel__avatar-grid player-avatar-panel__avatar-grid--suggested">
            {handCards.slice(0, 4).map((handCard) => {
              const card = handCard.card;
              const isSelected = selectedAvatar === card.id;
              const isDominant = handCard.role === 'dominant';
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`player-avatar-panel__avatar-card ${
                    isSelected ? 'player-avatar-panel__avatar-card--selected' : ''
                  } ${isDominant ? 'player-avatar-panel__avatar-card--dominant' : ''}`}
                  style={{ '--suit-color': SUIT_COLORS[card.suit] } as React.CSSProperties}
                  onClick={() => setSelectedAvatar(card.id)}
                  aria-label={`Select ${card.name} avatar`}
                >
                  <span className="player-avatar-panel__avatar-emoji" role="img" aria-label={card.name}>
                    {card.icon}
                  </span>
                  <span className="player-avatar-panel__avatar-name">{card.name}</span>
                  {isDominant && <span className="player-avatar-panel__avatar-badge">Recommended</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Suit Filter Tabs */}
        <div className="player-avatar-panel__suit-filters">
          <button
            type="button"
            className={`player-avatar-panel__suit-filter ${
              suitFilter === 'all' ? 'player-avatar-panel__suit-filter--active' : ''
            }`}
            onClick={() => setSuitFilter('all')}
          >
            All
          </button>
          {(['power', 'heart', 'mind', 'spirit'] as SuitKey[]).map((suit) => (
            <button
              key={suit}
              type="button"
              className={`player-avatar-panel__suit-filter ${
                suitFilter === suit ? 'player-avatar-panel__suit-filter--active' : ''
              }`}
              style={{ '--suit-color': SUIT_COLORS[suit] } as React.CSSProperties}
              onClick={() => setSuitFilter(suit)}
            >
              {SUIT_LABELS[suit]}
            </button>
          ))}
        </div>

        {/* All Archetypes Grid */}
        <div className="player-avatar-panel__avatar-grid">
          {filteredArchetypes.map((archetype) => {
            const isSelected = selectedAvatar === archetype.id;
            const isInHand = topArchetypeIds.includes(archetype.id);
            const isDominant = archetype.id === archetypeHand.dominant.card.id;
            return (
              <button
                key={archetype.id}
                type="button"
                className={`player-avatar-panel__avatar-card ${
                  isSelected ? 'player-avatar-panel__avatar-card--selected' : ''
                } ${isInHand ? 'player-avatar-panel__avatar-card--in-hand' : ''}`}
                style={{ '--suit-color': SUIT_COLORS[archetype.suit] } as React.CSSProperties}
                onClick={() => setSelectedAvatar(archetype.id)}
                aria-label={`Select ${archetype.name} avatar`}
              >
                <span className="player-avatar-panel__avatar-emoji" role="img" aria-label={archetype.name}>
                  {archetype.icon}
                </span>
                <span className="player-avatar-panel__avatar-name">{archetype.name}</span>
                <span
                  className="player-avatar-panel__avatar-suit"
                  style={{ color: SUIT_COLORS[archetype.suit] }}
                >
                  {archetype.suit}
                </span>
                {isDominant && <span className="player-avatar-panel__avatar-badge">⭐</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Equipment Section */}
      <section className="player-avatar-panel__section">
        <h2 className="player-avatar-panel__section-title">Equipment & Customization</h2>

        {/* For You Section */}
        {forYouItems.length > 0 && (
          <div className="player-avatar-panel__for-you">
            <h3 className="player-avatar-panel__for-you-title">✨ For You</h3>
            <div className="player-avatar-panel__equipment-grid player-avatar-panel__equipment-grid--for-you">
              {forYouItems.map((item) => {
                const isEquipped = equippedItems.has(item.id);
                const unlocked = isItemUnlocked(item);
                return (
                  <div
                    key={item.id}
                    className={`player-avatar-panel__equipment-card ${
                      !unlocked ? 'player-avatar-panel__equipment-card--locked' : ''
                    }`}
                    style={{ '--rarity-color': getRarityColor(item.rarity) } as React.CSSProperties}
                  >
                    <div className="player-avatar-panel__equipment-header">
                      <span className="player-avatar-panel__equipment-emoji" role="img" aria-label={item.name}>
                        {item.emoji}
                      </span>
                      <span
                        className="player-avatar-panel__equipment-rarity"
                        style={{ color: getRarityColor(item.rarity) }}
                      >
                        {item.rarity}
                      </span>
                    </div>
                    <span className="player-avatar-panel__equipment-badge player-avatar-panel__equipment-badge--new">
                      NEW
                    </span>
                    <h3 className="player-avatar-panel__equipment-name">{item.name}</h3>
                    <p className="player-avatar-panel__equipment-description">{item.description}</p>
                    <button
                      type="button"
                      className={`player-avatar-panel__equipment-button ${
                        isEquipped ? 'player-avatar-panel__equipment-button--equipped' : ''
                      } ${!unlocked ? 'player-avatar-panel__equipment-button--locked' : ''}`}
                      onClick={() => toggleEquipItem(item.id, item)}
                      disabled={!unlocked}
                    >
                      {unlocked ? (isEquipped ? 'Equipped ✓' : 'Equip') : `🪙 ${item.price ?? 1000}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="player-avatar-panel__tabs" role="tablist">
          {(Object.keys(CATEGORY_INFO) as AvatarItemCategory[]).map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={activeCategory === category}
              className={`player-avatar-panel__tab ${
                activeCategory === category ? 'player-avatar-panel__tab--active' : ''
              }`}
              onClick={() => setActiveCategory(category)}
            >
              <span role="img" aria-hidden="true">
                {CATEGORY_INFO[category].emoji}
              </span>
              <span>{CATEGORY_INFO[category].label}</span>
              <span className="player-avatar-panel__tab-count">{categoryItemCounts[category]}</span>
            </button>
          ))}
        </div>

        {/* Equipment Grid */}
        <div className="player-avatar-panel__equipment-grid" role="tabpanel">
          {categoryItems.map((item) => {
            const isEquipped = equippedItems.has(item.id);
            const unlocked = isItemUnlocked(item);
            const isYourSuit = item.suitAffinity === dominantSuit;
            return (
              <div
                key={item.id}
                className={`player-avatar-panel__equipment-card ${
                  !unlocked ? 'player-avatar-panel__equipment-card--locked' : ''
                }`}
                style={{ '--rarity-color': getRarityColor(item.rarity) } as React.CSSProperties}
              >
                <div className="player-avatar-panel__equipment-header">
                  <span className="player-avatar-panel__equipment-emoji" role="img" aria-label={item.name}>
                    {item.emoji}
                  </span>
                  <span
                    className="player-avatar-panel__equipment-rarity"
                    style={{ color: getRarityColor(item.rarity) }}
                  >
                    {item.rarity}
                  </span>
                </div>
                {isYourSuit && unlocked && (
                  <span className="player-avatar-panel__equipment-badge player-avatar-panel__equipment-badge--suit">
                    Your Suit
                  </span>
                )}
                {!unlocked && <span className="player-avatar-panel__equipment-lock">🔒</span>}
                <h3 className="player-avatar-panel__equipment-name">{item.name}</h3>
                <p className="player-avatar-panel__equipment-description">{item.description}</p>
                <button
                  type="button"
                  className={`player-avatar-panel__equipment-button ${
                    isEquipped ? 'player-avatar-panel__equipment-button--equipped' : ''
                  } ${!unlocked ? 'player-avatar-panel__equipment-button--locked' : ''}`}
                  onClick={() => toggleEquipItem(item.id, item)}
                  disabled={!unlocked}
                >
                  {unlocked ? (isEquipped ? 'Equipped ✓' : 'Equip') : `🪙 ${item.price ?? 1000}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
