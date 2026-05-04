import { motion } from 'framer-motion';
import { Brain } from '@phosphor-icons/react';

interface FloatingTestButtonProps {
  onClick: () => void;
}

export function FloatingTestButton({ onClick }: FloatingTestButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl z-40 flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, oklch(0.65 0.20 300), oklch(0.55 0.25 320))',
        boxShadow: '0 0 30px oklch(0.65 0.20 300 / 0.5), 0 10px 25px rgba(0,0,0,0.4)',
      }}
    >
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Brain size={28} weight="bold" color="white" />
      </motion.div>

      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(135deg, oklch(0.65 0.20 300), oklch(0.55 0.25 320))',
          opacity: 0.5,
        }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.button>
  );
}
