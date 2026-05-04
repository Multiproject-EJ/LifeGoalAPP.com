import React, { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Trait } from '@/types/trait';
import { MiniCardHand } from '@/components/MiniCardHand';
import { CardHand } from '@/components/CardHand';
import { AllCardsGrid } from '@/components/AllCardsGrid';
import { PersonalityTest } from '@/components/PersonalityTest';
import { FloatingTestButton } from '@/components/FloatingTestButton';
import { ArchetypeTab } from '@/components/ArchetypeTab';
import { EvolutionTab } from '@/components/EvolutionTab';
import { Button } from '@/components/ui/button';
import { Cards, ArrowLeft } from '@phosphor-icons/react';
import { toast } from 'sonner';

const AVAILABLE_TRAITS: Trait[] = [
  {
    id: 'creativity-1',
    name: 'Creative Spark',
    icon: 'Lightbulb',
    rarity: 'rare',
    level: 3,
    description: 'Your mind bubbles with innovative ideas and unique perspectives that light up any room.',
  },
  {
    id: 'determination-1',
    name: 'Iron Will',
    icon: 'Barbell',
    rarity: 'epic',
    level: 5,
    description: 'When challenges arise, you stand firm and push through with unwavering determination.',
  },
  {
    id: 'empathy-1',
    name: 'Deep Empathy',
    icon: 'Heart',
    rarity: 'legendary',
    level: 7,
    description: 'You connect with others on a profound level, understanding emotions and needs intuitively.',
  },
  {
    id: 'focus-1',
    name: 'Laser Focus',
    icon: 'Target',
    rarity: 'rare',
    level: 4,
    description: 'Distractions fade away as you lock onto your goals with precision and clarity.',
  },
  {
    id: 'adaptability-1',
    name: 'Flow State',
    icon: 'Waves',
    rarity: 'epic',
    level: 6,
    description: 'Change doesn\'t phase you - you adapt and thrive in any environment or situation.',
  },
  {
    id: 'empathy-2',
    name: 'Empathy',
    icon: 'HandHeart',
    rarity: 'epic',
    level: 5,
    description: 'You naturally understand and share the feelings of others, creating meaningful connections.',
  },
  {
    id: 'openness-1',
    name: 'Openness',
    icon: 'Eye',
    rarity: 'rare',
    level: 4,
    description: 'Your curiosity and willingness to embrace new experiences makes you adaptable and creative.',
  },
  {
    id: 'neuroticism-1',
    name: 'Neuroticism',
    icon: 'Lightning',
    rarity: 'common',
    level: 2,
    description: 'Your sensitivity to stress keeps you alert and aware, helping you anticipate challenges.',
  },
];

function App() {
  const [traits, setTraits] = useKV<Trait[]>('user-traits-v2', AVAILABLE_TRAITS);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [isArchetypeOpen, setIsArchetypeOpen] = useState(false);
  const [isEvolutionOpen, setIsEvolutionOpen] = useState(false);

  const handleTestComplete = (selectedTraits: Trait[]) => {
    setTraits((currentTraits) => {
      if (!currentTraits) return selectedTraits;
      
      const newTraitIds = selectedTraits.map(t => t.id);
      const uniqueTraits = [...selectedTraits];
      
      currentTraits.forEach(trait => {
        if (!newTraitIds.includes(trait.id)) {
          uniqueTraits.push(trait);
        }
      });
      
      return uniqueTraits.slice(0, 8);
    });
    
    setIsTestOpen(false);
    toast.success('Your trait cards have been updated!', {
      description: 'Check out your new personality profile.',
    });
  };

  return (
    <div className="relative">
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, oklch(0.25 0.08 280) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, oklch(0.22 0.10 300) 0%, transparent 50%),
            oklch(0.15 0.05 250)
          `,
        }}
      />

      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="entry"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="min-h-screen flex flex-col items-center justify-center gap-8 p-6"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center space-y-2"
            >
              <h1
                className="text-5xl font-bold tracking-tight"
                style={{
                  fontFamily: 'var(--font-orbitron)',
                  background: 'linear-gradient(135deg, oklch(0.65 0.20 300), oklch(0.75 0.15 280))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Your Trait Cards
              </h1>
              <p className="text-foreground/60 text-lg">
                Discover your unique strengths
              </p>
            </motion.div>

            <MiniCardHand
              traits={traits || []}
              onClick={() => setIsExpanded(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <CardHand traits={traits || []} onOpenArchetype={() => setIsArchetypeOpen(true)} />

            <Button
              onClick={() => setIsExpanded(false)}
              className="fixed top-8 left-8 gap-2"
              variant="secondary"
              size="lg"
              style={{
                fontFamily: 'var(--font-orbitron)',
              }}
            >
              <ArrowLeft weight="bold" size={20} />
              Back
            </Button>

            <Button
              onClick={() => setIsGridOpen(true)}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 gap-2"
              size="lg"
              style={{
                background: 'linear-gradient(135deg, oklch(0.65 0.20 300), oklch(0.55 0.25 320))',
                fontFamily: 'var(--font-orbitron)',
              }}
            >
              <Cards weight="bold" size={20} />
              All Trait Cards
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AllCardsGrid 
        isOpen={isGridOpen}
        onClose={() => setIsGridOpen(false)}
        traits={traits || []}
      />

      <PersonalityTest
        isOpen={isTestOpen}
        onClose={() => setIsTestOpen(false)}
        onComplete={handleTestComplete}
        allTraits={AVAILABLE_TRAITS}
      />

      <ArchetypeTab
        isOpen={isArchetypeOpen}
        onClose={() => setIsArchetypeOpen(false)}
        traits={traits || []}
        onOpenEvolution={() => {
          setIsArchetypeOpen(false);
          setIsEvolutionOpen(true);
        }}
      />

      <EvolutionTab
        isOpen={isEvolutionOpen}
        onClose={() => setIsEvolutionOpen(false)}
        traits={traits || []}
        allTraits={AVAILABLE_TRAITS}
        onTraitsUpdate={(newTraits) => {
          setTraits(newTraits);
        }}
      />

      <FloatingTestButton onClick={() => setIsTestOpen(true)} />
    </div>
  );
}

export default App;