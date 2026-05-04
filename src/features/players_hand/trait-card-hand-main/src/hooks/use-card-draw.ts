import React, { useState, useCallback } from 'react';
import { Trait } from '@/types/trait';

export function useCardDraw(
  traits: Trait[],
  onTraitsChange: (traits: Trait[]) => void
) {
  const [drawingCard, setDrawingCard] = useState<Trait | null>(null);

  const drawNewCard = useCallback(
    (newTrait: Trait) => {
      setDrawingCard(newTrait);

      setTimeout(() => {
        onTraitsChange([...traits, newTrait]);
        setTimeout(() => {
          setDrawingCard(null);
        }, 800);
      }, 1500);
    },
    [traits, onTraitsChange]
  );

  return {
    drawNewCard,
    drawingCard,
  };
}
