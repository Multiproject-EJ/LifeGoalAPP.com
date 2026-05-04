import { motion, AnimatePresence } from 'framer-motion';
import { Trait } from '@/types/trait';
import { TraitCard } from './TraitCard';

interface NewCardAnimationProps {
  trait: Trait | null;
}

export function NewCardAnimation({ trait }: NewCardAnimationProps) {
  if (!trait) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-[280px] h-[420px]"
          initial={{
            y: '100vh',
            rotateY: 0,
            scale: 0.8,
          }}
          animate={{
            y: 0,
            rotateY: [0, 180, 360],
            scale: [0.8, 1.2, 1],
          }}
          transition={{
            duration: 1.5,
            times: [0, 0.5, 1],
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{
            perspective: '1000px',
          }}
        >
          <TraitCard trait={trait} isFlipped={false} onFlip={() => {}} />
        </motion.div>

        <motion.div
          className="absolute inset-0 bg-background/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
