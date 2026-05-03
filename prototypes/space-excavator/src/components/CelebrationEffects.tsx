import { motion, AnimatePresence } from 'framer-motion'
import { Sparkle } from '@phosphor-icons/react'

interface MilestoneCelebrationProps {
  show: boolean
  position: { x: number; y: number }
}

export function MilestoneCelebration({ show, position }: MilestoneCelebrationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute pointer-events-none z-50"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          <motion.div
            className="relative"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-accent/30"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [0.8, 2.5, 3],
                opacity: [0, 0.8, 0]
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            <motion.div
              className="relative flex items-center justify-center w-12 h-12 rounded-full bg-accent border-4 border-white shadow-2xl"
              style={{
                boxShadow: '0 0 30px rgba(var(--accent), 0.8)'
              }}
            >
              <Sparkle size={24} weight="fill" className="text-accent-foreground" />
            </motion.div>

            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-accent"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i * Math.PI * 2) / 6) * 40,
                  y: Math.sin((i * Math.PI * 2) / 6) * 40,
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.1,
                  ease: 'easeOut'
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface ObjectFoundCelebrationProps {
  show: boolean
  onComplete?: () => void
}

export function ObjectFoundCelebration({ show, onComplete }: ObjectFoundCelebrationProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="relative"
            initial={{ scale: 0, y: 20 }}
            animate={{ 
              scale: [0, 1.2, 1],
              y: [20, 0, 0]
            }}
            exit={{ 
              scale: 0.8,
              y: -20,
              opacity: 0
            }}
            transition={{ 
              duration: 0.5,
              ease: [0.34, 1.56, 0.64, 1]
            }}
          >
            <motion.div
              className="px-6 py-3 bg-accent rounded-2xl shadow-2xl border-4 border-white"
              style={{
                boxShadow: '0 0 40px rgba(var(--accent), 0.6)'
              }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 0.4,
                    repeat: 2
                  }}
                >
                  <Sparkle size={28} weight="fill" className="text-accent-foreground" />
                </motion.div>
                <span className="font-display font-bold text-2xl text-accent-foreground uppercase tracking-wide">
                  FOUND!
                </span>
              </div>
            </motion.div>

            <motion.div
              className="absolute inset-0 rounded-2xl border-4 border-accent"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ 
                scale: [1, 1.3, 1.5],
                opacity: [0, 0.6, 0]
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface ConfettiParticle {
  id: number
  x: number
  y: number
  color: string
  rotation: number
  delay: number
}

interface ConfettiProps {
  show: boolean
  particleCount?: number
}

export function Confetti({ show, particleCount = 50 }: ConfettiProps) {
  const particles: ConfettiParticle[] = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: -20,
    color: [
      'rgb(234, 179, 8)',
      'rgb(34, 211, 238)',
      'rgb(244, 63, 94)',
      'rgb(251, 146, 60)',
      'rgb(168, 85, 247)',
    ][Math.floor(Math.random() * 5)],
    rotation: Math.random() * 360,
    delay: Math.random() * 0.3,
  }))

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-2 h-3 rounded-sm"
              style={{
                backgroundColor: particle.color,
                left: `calc(50% + ${particle.x}vw)`,
                boxShadow: `0 0 4px ${particle.color}`,
              }}
              initial={{
                y: particle.y,
                opacity: 0,
                rotate: particle.rotation,
              }}
              animate={{
                y: '120vh',
                opacity: [0, 1, 1, 0],
                rotate: particle.rotation + 720,
                x: [0, particle.x * 0.5, particle.x * 0.3],
              }}
              transition={{
                duration: 2.5,
                delay: particle.delay,
                ease: 'easeIn',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
