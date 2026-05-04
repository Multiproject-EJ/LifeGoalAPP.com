import { motion } from 'framer-motion';
import { Trait } from '@/types/trait';
import * as PhosphorIcons from '@phosphor-icons/react';
import { RARITY_COLORS } from '@/types/trait';

interface MiniCardHandProps {
  traits: Trait[];
  onClick: () => void;
}

export function MiniCardHand({ traits, onClick }: MiniCardHandProps) {
  const displayTraits = traits.slice(0, 5);

  const getCardStyle = (index: number, total: number) => {
    const centerIndex = (total - 1) / 2;
    const relativeIndex = index - centerIndex;
    const maxRotation = 15;
    const spacing = 35;

    const rotation = relativeIndex * (maxRotation / centerIndex);
    const xOffset = relativeIndex * spacing;
    const yOffset = Math.abs(relativeIndex) * 8;

    return {
      rotation,
      xOffset,
      yOffset,
      zIndex: total - Math.abs(relativeIndex),
    };
  };

  return (
    <motion.div
      className="relative cursor-pointer"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        width: '300px',
        height: '200px',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {displayTraits.map((trait, index) => {
          const { rotation, xOffset, yOffset, zIndex } = getCardStyle(index, displayTraits.length);
          const rarityColor = RARITY_COLORS[trait.rarity];
          const IconComponent = (PhosphorIcons as any)[trait.icon] || PhosphorIcons.Star;

          return (
            <motion.div
              key={trait.id}
              className="absolute rounded-lg overflow-hidden"
              style={{
                width: '100px',
                height: '150px',
                zIndex,
                boxShadow: `0 0 20px -5px ${rarityColor}, 0 5px 20px -5px rgba(0,0,0,0.5)`,
                border: `1.5px solid ${rarityColor}`,
              }}
              initial={{
                x: xOffset,
                y: yOffset,
                rotate: rotation,
              }}
              animate={{
                x: xOffset,
                y: yOffset,
                rotate: rotation,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
            >
              <div
                className="w-full h-full bg-card relative"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${rarityColor}20, oklch(0.18 0.02 260))`,
                }}
              >
                <motion.div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${rarityColor}, transparent 70%)`,
                  }}
                  animate={{
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: index * 0.2,
                  }}
                />

                <div className="relative h-full flex items-center justify-center">
                  <IconComponent
                    size={40}
                    weight="bold"
                    style={{ color: rarityColor }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-medium text-foreground/60 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Tap to view your traits
      </motion.div>
    </motion.div>
  );
}
