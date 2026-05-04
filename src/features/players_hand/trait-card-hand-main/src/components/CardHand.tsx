import React, { useState, useCallback, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Trait } from '@/types/trait';
import { TraitCard } from './TraitCard';
import { Button } from './ui/button';
import { Sparkle } from '@phosphor-icons/react';

interface CardHandProps {
  traits: Trait[];
  onOpenArchetype: () => void;
}

export function CardHand({ traits, onOpenArchetype }: CardHandProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const dragProgress = useTransform(dragX, [-100, 0, 100], [1, 0, -1]);

  const toggleFlip = useCallback(
    (id: string) => {
      setFlippedCards((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    },
    []
  );

  const handleCardClick = useCallback(
    (index: number, id: string) => {
      if (isAnimating) return;

      if (index === activeIndex) {
        toggleFlip(id);
      } else {
        setIsAnimating(true);
        setActiveIndex(index);
        setTimeout(() => setIsAnimating(false), 400);
      }
    },
    [activeIndex, isAnimating, toggleFlip]
  );

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      if (isAnimating) return;

      const threshold = 50;
      if (info.offset.x > threshold && activeIndex > 0) {
        setIsAnimating(true);
        setActiveIndex(activeIndex - 1);
        setTimeout(() => setIsAnimating(false), 400);
      } else if (info.offset.x < -threshold && activeIndex < traits.length - 1) {
        setIsAnimating(true);
        setActiveIndex(activeIndex + 1);
        setTimeout(() => setIsAnimating(false), 400);
      }
      dragX.set(0);
    },
    [activeIndex, traits.length, isAnimating, dragX]
  );

  if (!traits || traits.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">🃏</div>
          <h2 className="text-2xl font-bold text-foreground/80" style={{ fontFamily: 'var(--font-orbitron)' }}>
            No Traits Yet
          </h2>
          <p className="text-muted-foreground">Start your journey to collect your first trait card!</p>
        </div>
      </div>
    );
  }

  const getCardStyle = (index: number) => {
    const totalCards = traits.length;
    const centerIndex = activeIndex;
    const relativeIndex = index - centerIndex;
    const maxRotation = 20;
    const cardWidth = 280;
    
    let baseSpacing: number;
    if (totalCards === 1) {
      baseSpacing = 0;
    } else if (totalCards === 2) {
      baseSpacing = 100;
    } else if (totalCards === 3) {
      baseSpacing = 80;
    } else if (totalCards === 4) {
      baseSpacing = 70;
    } else if (totalCards === 5) {
      baseSpacing = 60;
    } else if (totalCards === 6) {
      baseSpacing = 55;
    } else {
      baseSpacing = 50;
    }

    let rotation = 0;
    let xOffset = 0;
    let scale = 1;
    let zIndex = 0;

    if (totalCards === 1) {
      rotation = 0;
      xOffset = 0;
      scale = 1.2;
      zIndex = 10;
    } else {
      const normalizedPosition = relativeIndex / Math.max(1, (totalCards - 1) / 2);
      rotation = normalizedPosition * maxRotation;

      if (relativeIndex === 0) {
        xOffset = 0;
        scale = 1.15;
        zIndex = totalCards;
      } else {
        const direction = relativeIndex > 0 ? 1 : -1;
        const distance = Math.abs(relativeIndex);
        xOffset = direction * (baseSpacing * distance + (cardWidth * 0.25 * (distance - 1)));
        scale = 1 - Math.abs(relativeIndex) * 0.07;
        zIndex = totalCards - Math.abs(relativeIndex);
      }
    }

    return {
      rotation,
      xOffset,
      scale,
      zIndex,
      yOffset: Math.abs(relativeIndex) * 25,
    };
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 overflow-hidden">
      <motion.div
        ref={containerRef}
        className="relative w-full max-w-4xl"
        style={{
          height: '500px',
          x: dragX,
        }}
        drag={traits.length > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {traits.map((trait, index) => {
            const { rotation, xOffset, scale, zIndex, yOffset } = getCardStyle(index);
            const isActive = index === activeIndex;

            return (
              <motion.div
                key={trait.id}
                className="absolute"
                style={{
                  width: '280px',
                  height: '420px',
                  zIndex,
                }}
                animate={{
                  x: xOffset,
                  y: yOffset,
                  rotate: rotation,
                  scale,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                onClick={() => handleCardClick(index, trait.id)}
              >
                <TraitCard
                  trait={trait}
                  isFlipped={flippedCards.has(trait.id)}
                  onFlip={() => {}}
                  className={isActive ? 'cursor-pointer' : 'cursor-pointer'}
                />
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {traits.length > 1 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {traits.map((_, index) => (
            <motion.button
              key={index}
              className="w-2 h-2 rounded-full bg-foreground/30"
              animate={{
                scale: index === activeIndex ? 1.5 : 1,
                backgroundColor: index === activeIndex ? 'oklch(0.65 0.20 300)' : 'oklch(0.98 0 0 / 0.3)',
              }}
              onClick={() => {
                if (!isAnimating) {
                  setIsAnimating(true);
                  setActiveIndex(index);
                  setTimeout(() => setIsAnimating(false), 400);
                }
              }}
              whileHover={{ scale: index === activeIndex ? 1.5 : 1.3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />
          ))}
        </div>
      )}

      <Button
        onClick={onOpenArchetype}
        className="fixed top-8 right-8 gap-2"
        size="lg"
        style={{
          background: 'linear-gradient(135deg, oklch(0.65 0.20 300), oklch(0.55 0.25 320))',
          fontFamily: 'var(--font-orbitron)',
        }}
      >
        <Sparkle weight="fill" size={20} />
        My Archetype
      </Button>
    </div>
  );
}
