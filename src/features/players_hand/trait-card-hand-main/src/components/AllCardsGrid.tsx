import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';
import { Trait } from '@/types/trait';
import { TraitCard } from '@/components/TraitCard';
import { Button } from '@/components/ui/button';

interface AllCardsGridProps {
  isOpen: boolean;
  onClose: () => void;
  traits: Trait[];
}

export function AllCardsGrid({ isOpen, onClose, traits }: AllCardsGridProps) {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  const toggleFlip = (traitId: string) => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(traitId)) {
        newSet.delete(traitId);
      } else {
        newSet.add(traitId);
      }
      return newSet;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="min-h-screen px-4 py-8 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h2
                  className="text-3xl font-bold tracking-tight"
                  style={{
                    fontFamily: 'var(--font-orbitron)',
                    background: 'linear-gradient(135deg, oklch(0.65 0.20 300), oklch(0.75 0.18 85))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  All Trait Cards
                </h2>
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                >
                  <X size={24} weight="bold" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
                {traits.map((trait, index) => (
                  <motion.div
                    key={trait.id}
                    className="aspect-[2/3]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.05,
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  >
                    <TraitCard
                      trait={trait}
                      isFlipped={flippedCards.has(trait.id)}
                      onFlip={() => toggleFlip(trait.id)}
                    />
                  </motion.div>
                ))}
              </div>

              {traits.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground text-lg">
                    No trait cards yet. Start your journey!
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
