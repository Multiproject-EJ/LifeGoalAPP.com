import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import '../../styles/player-avatar.css';

type PlayerAvatarPanelProps = {
  session: Session; // Used for future features: saving avatar preferences, unlocking items based on achievements
};

type AvatarOption = {
  id: string;
  emoji: string;
  name: string;
};

type EquipmentItem = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  category: 'tools' | 'charms' | 'garments' | 'auras' | 'badges';
};

const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'warrior', emoji: '🧑‍🦰', name: 'Warrior' },
  { id: 'wizard', emoji: '🧙‍♂️', name: 'Wizard' },
  { id: 'explorer', emoji: '🧑‍🚀', name: 'Explorer' },
  { id: 'scholar', emoji: '👨‍🎓', name: 'Scholar' },
  { id: 'artist', emoji: '👨‍🎨', name: 'Artist' },
  { id: 'athlete', emoji: '🏃‍♀️', name: 'Athlete' },
  { id: 'scientist', emoji: '👨‍🔬', name: 'Scientist' },
  { id: 'musician', emoji: '👨‍🎤', name: 'Musician' },
  { id: 'chef', emoji: '👨‍🍳', name: 'Chef' },
  { id: 'hero', emoji: '🦸‍♂️', name: 'Hero' },
  { id: 'ninja', emoji: '🥷', name: 'Ninja' },
  { id: 'astronaut', emoji: '👨‍🚀', name: 'Astronaut' },
  { id: 'detective', emoji: '🕵️', name: 'Detective' },
  { id: 'gardener', emoji: '🧑‍🌾', name: 'Gardener' },
  { id: 'mechanic', emoji: '🧑‍🔧', name: 'Mechanic' },
  { id: 'pilot', emoji: '🧑‍✈️', name: 'Pilot' },
];

const EQUIPMENT_ITEMS: EquipmentItem[] = [
  // Tools
  { id: 'golden-pen', emoji: '🖊️', name: 'Golden Pen', description: 'Write your destiny with precision', rarity: 'Legendary', category: 'tools' },
  { id: 'crystal-compass', emoji: '🧭', name: 'Crystal Compass', description: 'Never lose your direction', rarity: 'Epic', category: 'tools' },
  { id: 'enchanted-notebook', emoji: '📓', name: 'Enchanted Notebook', description: 'Capture every brilliant idea', rarity: 'Rare', category: 'tools' },
  { id: 'time-hourglass', emoji: '⏳', name: 'Time Hourglass', description: 'Master the flow of time', rarity: 'Epic', category: 'tools' },
  { id: 'wisdom-scroll', emoji: '📜', name: 'Wisdom Scroll', description: 'Ancient knowledge at your fingertips', rarity: 'Legendary', category: 'tools' },
  { id: 'lightning-stylus', emoji: '⚡', name: 'Lightning Bolt Stylus', description: 'Strike with creative power', rarity: 'Rare', category: 'tools' },
  
  // Lucky Charms
  { id: 'four-leaf-clover', emoji: '🍀', name: 'Four-Leaf Clover', description: 'Luck finds you at every turn', rarity: 'Rare', category: 'charms' },
  { id: 'lucky-horseshoe', emoji: '🧲', name: 'Lucky Horseshoe', description: 'Attract fortune and success', rarity: 'Common', category: 'charms' },
  { id: 'wishing-star', emoji: '⭐', name: 'Wishing Star', description: 'Make your dreams come true', rarity: 'Epic', category: 'charms' },
  { id: 'rainbow-gem', emoji: '💎', name: 'Rainbow Gem', description: 'Shine with unlimited potential', rarity: 'Legendary', category: 'charms' },
  { id: 'fortune-cookie', emoji: '🥠', name: 'Fortune Cookie', description: 'Wisdom comes in small packages', rarity: 'Common', category: 'charms' },
  { id: 'magic-8-ball', emoji: '🎱', name: 'Magic 8-Ball', description: 'The answer is always yes', rarity: 'Rare', category: 'charms' },
  
  // Garments
  { id: 'explorer-cape', emoji: '🧥', name: "Explorer's Cape", description: 'Adventure awaits around every corner', rarity: 'Rare', category: 'garments' },
  { id: 'zen-master-robe', emoji: '🥋', name: 'Zen Master Robe', description: 'Find peace in every moment', rarity: 'Epic', category: 'garments' },
  { id: 'champion-armor', emoji: '🛡️', name: "Champion's Armor", description: 'Unbreakable determination', rarity: 'Legendary', category: 'garments' },
  { id: 'wizard-hat', emoji: '🎩', name: 'Wizard Hat', description: 'Channel mystical energies', rarity: 'Epic', category: 'garments' },
  { id: 'runner-headband', emoji: '🎽', name: "Runner's Headband", description: 'Never stop moving forward', rarity: 'Common', category: 'garments' },
  { id: 'scholar-glasses', emoji: '👓', name: "Scholar's Glasses", description: 'See the world with clarity', rarity: 'Rare', category: 'garments' },
  
  // Auras
  { id: 'golden-glow', emoji: '✨', name: 'Golden Glow', description: 'Radiate success and confidence', rarity: 'Legendary', category: 'auras' },
  { id: 'cosmic-nebula', emoji: '🌌', name: 'Cosmic Nebula', description: 'Infinite possibilities surround you', rarity: 'Epic', category: 'auras' },
  { id: 'forest-spirit', emoji: '🌿', name: 'Forest Spirit', description: 'Connected to natural growth', rarity: 'Rare', category: 'auras' },
  { id: 'ocean-wave', emoji: '🌊', name: 'Ocean Wave', description: 'Flow with adaptability', rarity: 'Rare', category: 'auras' },
  { id: 'fire-ring', emoji: '🔥', name: 'Fire Ring', description: 'Burn with passion and intensity', rarity: 'Epic', category: 'auras' },
  { id: 'ice-crystal', emoji: '❄️', name: 'Ice Crystal', description: 'Cool, calm, and collected', rarity: 'Rare', category: 'auras' },
  
  // Badges
  { id: 'early-bird', emoji: '🌅', name: 'Early Bird', description: 'First to seize the day', rarity: 'Rare', category: 'badges' },
  { id: 'night-owl', emoji: '🦉', name: 'Night Owl', description: 'Productive under the moon', rarity: 'Rare', category: 'badges' },
  { id: 'streak-master', emoji: '🔥', name: 'Streak Master', description: 'Consistency is your superpower', rarity: 'Epic', category: 'badges' },
  { id: 'zen-warrior', emoji: '☯️', name: 'Zen Warrior', description: 'Balance in all things', rarity: 'Legendary', category: 'badges' },
  { id: 'goal-crusher', emoji: '🎯', name: 'Goal Crusher', description: 'Targets never stand a chance', rarity: 'Epic', category: 'badges' },
  { id: 'habit-hero', emoji: '💪', name: 'Habit Hero', description: 'Routines forged in steel', rarity: 'Legendary', category: 'badges' },
];

type EquipmentCategory = 'tools' | 'charms' | 'garments' | 'auras' | 'badges';

const CATEGORY_INFO: Record<EquipmentCategory, { emoji: string; label: string }> = {
  tools: { emoji: '🛠️', label: 'Tools' },
  charms: { emoji: '🍀', label: 'Lucky Charms' },
  garments: { emoji: '👕', label: 'Garments' },
  auras: { emoji: '✨', label: 'Auras' },
  badges: { emoji: '🏅', label: 'Badges' },
};

export function PlayerAvatarPanel({ session }: PlayerAvatarPanelProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string>('warrior');
  const [activeCategory, setActiveCategory] = useState<EquipmentCategory>('tools');
  const [equippedItems, setEquippedItems] = useState<Set<string>>(new Set(['golden-pen', 'four-leaf-clover']));

  const toggleEquipItem = (itemId: string) => {
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

  const selectedAvatarData = AVATAR_OPTIONS.find((a) => a.id === selectedAvatar);
  const categoryItems = EQUIPMENT_ITEMS.filter((item) => item.category === activeCategory);

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

  return (
    <div className="player-avatar-panel">
      <div className="player-avatar-panel__header">
        <h1 className="player-avatar-panel__title">Player Avatar</h1>
        <p className="player-avatar-panel__subtitle">Customize your character and equipment</p>
      </div>

      {/* Avatar Preview Section */}
      <section className="player-avatar-panel__preview">
        <div className="player-avatar-panel__preview-card">
          <div className="player-avatar-panel__preview-avatar">
            {selectedAvatarData && (
              <>
                <span className="player-avatar-panel__preview-emoji" role="img" aria-label={selectedAvatarData.name}>
                  {selectedAvatarData.emoji}
                </span>
                <p className="player-avatar-panel__preview-name">{selectedAvatarData.name}</p>
              </>
            )}
          </div>
          <div className="player-avatar-panel__preview-equipped">
            <p className="player-avatar-panel__preview-label">Equipped Items: {equippedItems.size}</p>
          </div>
        </div>
      </section>

      {/* Avatar Selection Grid */}
      <section className="player-avatar-panel__section">
        <h2 className="player-avatar-panel__section-title">Choose Your Avatar</h2>
        <div className="player-avatar-panel__avatar-grid">
          {AVATAR_OPTIONS.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              className={`player-avatar-panel__avatar-card ${
                selectedAvatar === avatar.id ? 'player-avatar-panel__avatar-card--selected' : ''
              }`}
              onClick={() => setSelectedAvatar(avatar.id)}
              aria-label={`Select ${avatar.name} avatar`}
            >
              <span className="player-avatar-panel__avatar-emoji" role="img" aria-label={avatar.name}>
                {avatar.emoji}
              </span>
              <span className="player-avatar-panel__avatar-name">{avatar.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Equipment Section */}
      <section className="player-avatar-panel__section">
        <h2 className="player-avatar-panel__section-title">Equipment & Customization</h2>
        
        {/* Category Tabs */}
        <div className="player-avatar-panel__tabs" role="tablist">
          {(Object.keys(CATEGORY_INFO) as EquipmentCategory[]).map((category) => (
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
            </button>
          ))}
        </div>

        {/* Equipment Grid */}
        <div className="player-avatar-panel__equipment-grid" role="tabpanel">
          {categoryItems.map((item) => {
            const isEquipped = equippedItems.has(item.id);
            return (
              <div
                key={item.id}
                className="player-avatar-panel__equipment-card"
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
                <h3 className="player-avatar-panel__equipment-name">{item.name}</h3>
                <p className="player-avatar-panel__equipment-description">{item.description}</p>
                <button
                  type="button"
                  className={`player-avatar-panel__equipment-button ${
                    isEquipped ? 'player-avatar-panel__equipment-button--equipped' : ''
                  }`}
                  onClick={() => toggleEquipItem(item.id)}
                >
                  {isEquipped ? 'Equipped ✓' : 'Equip'}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
