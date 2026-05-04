import { motion } from 'framer-motion';
import * as PhosphorIcons from '@phosphor-icons/react';
import { Trait, RARITY_COLORS, RARITY_LABELS } from '@/types/trait';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TraitCardProps {
  trait: Trait;
  isFlipped: boolean;
  onFlip: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function TraitCard({ trait, isFlipped, onFlip, style, className }: TraitCardProps) {
  const rarityColor = RARITY_COLORS[trait.rarity];
  const IconComponent = (PhosphorIcons as any)[trait.icon] || PhosphorIcons.Star;

  return (
    <motion.div
      className={cn('relative w-full h-full cursor-pointer', className)}
      style={{
        perspective: '1000px',
        ...style,
      }}
      onClick={onFlip}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
        }}
        animate={{
          rotateY: isFlipped ? 180 : 0,
        }}
        transition={{
          duration: 0.6,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        <div
          className="absolute inset-0 rounded-xl bg-card overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            boxShadow: `0 0 30px -5px ${rarityColor}, 0 10px 40px -10px rgba(0,0,0,0.6)`,
            border: `2px solid ${rarityColor}`,
          }}
        >
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${rarityColor}, transparent 70%)`,
            }}
            animate={{
              opacity: [0.2, 0.35, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <div className="relative h-full flex flex-col items-center justify-between p-6">
            <Badge
              variant="outline"
              className="text-xs font-medium tracking-wider uppercase"
              style={{
                borderColor: rarityColor,
                color: rarityColor,
                fontFamily: 'var(--font-orbitron)',
              }}
            >
              {RARITY_LABELS[trait.rarity]}
            </Badge>

            <div className="flex-1 flex items-center justify-center">
              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <IconComponent
                  size={80}
                  weight="bold"
                  style={{ color: rarityColor }}
                />
              </motion.div>
            </div>

            <div className="text-center space-y-2">
              <h3
                className="text-xl font-bold tracking-tight"
                style={{
                  fontFamily: 'var(--font-orbitron)',
                  color: rarityColor,
                }}
              >
                {trait.name}
              </h3>
              <div className="flex items-center justify-center gap-1">
                <span
                  className="text-xs font-semibold tracking-widest uppercase"
                  style={{
                    fontFamily: 'var(--font-orbitron)',
                    color: rarityColor,
                  }}
                >
                  LVL {trait.level}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute inset-0 rounded-xl bg-card overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            boxShadow: `0 0 30px -5px ${rarityColor}, 0 10px 40px -10px rgba(0,0,0,0.6)`,
            border: `2px solid ${rarityColor}`,
          }}
        >
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(circle at 50% 100%, ${rarityColor}, transparent 70%)`,
            }}
            animate={{
              opacity: [0.2, 0.35, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <div className="relative h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <Badge
                variant="outline"
                className="text-xs font-medium tracking-wider uppercase"
                style={{
                  borderColor: rarityColor,
                  color: rarityColor,
                  fontFamily: 'var(--font-orbitron)',
                }}
              >
                LVL {trait.level}
              </Badge>
              <IconComponent
                size={32}
                weight="bold"
                style={{ color: rarityColor }}
              />
            </div>

            <h3
              className="text-lg font-bold tracking-tight mb-4"
              style={{
                fontFamily: 'var(--font-orbitron)',
                color: rarityColor,
              }}
            >
              {trait.name}
            </h3>

            <p className="text-sm text-foreground/80 leading-relaxed flex-1">
              {trait.description}
            </p>

            <div
              className="mt-4 pt-4 border-t text-xs uppercase tracking-widest font-semibold text-center"
              style={{
                borderColor: `${rarityColor}40`,
                color: rarityColor,
                fontFamily: 'var(--font-orbitron)',
              }}
            >
              {RARITY_LABELS[trait.rarity]}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
