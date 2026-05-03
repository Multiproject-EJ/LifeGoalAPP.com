import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Sparkle, ArrowClockwise, Coins } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { LevelResult } from '../types/game'

interface LevelCompleteScreenProps {
  show: boolean
  levelResult: LevelResult | null
  rewardCoins?: number
  onNextLevel: () => void
  onRestart: () => void
}

export function LevelCompleteScreen({
  show,
  levelResult,
  rewardCoins = 0,
  onNextLevel,
  onRestart,
}: LevelCompleteScreenProps) {
  if (!levelResult) return null

  const isSuccess = levelResult.completed

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md"
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <div
              className={cn(
                'rounded-2xl border-2 p-6 shadow-2xl space-y-6',
                isSuccess
                  ? 'bg-gradient-to-br from-accent/20 to-primary/20 border-accent'
                  : 'bg-gradient-to-br from-card to-muted border-border'
              )}
            >
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 240, damping: 16 }}
                className="flex justify-center"
              >
                <motion.div
                  className={cn(
                    'w-20 h-20 rounded-full flex items-center justify-center',
                    isSuccess ? 'bg-accent' : 'bg-muted'
                  )}
                  animate={
                    isSuccess
                      ? {
                          boxShadow: [
                            '0 0 0px rgba(0,0,0,0)',
                            '0 0 24px rgba(0,0,0,0.12)',
                            '0 0 10px rgba(0,0,0,0.04)',
                          ],
                          scale: [1, 1.06, 1],
                        }
                      : {}
                  }
                  transition={
                    isSuccess
                      ? {
                          duration: 0.7,
                          ease: 'easeOut',
                        }
                      : {}
                  }
                >
                  <Sparkle
                    size={48}
                    weight="fill"
                    className={isSuccess ? 'text-accent-foreground' : 'text-muted-foreground'}
                  />
                </motion.div>
              </motion.div>

              <div className="text-center space-y-2">
                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="font-display text-3xl font-bold"
                >
                  {isSuccess ? 'Level Complete!' : 'Level Failed'}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-muted-foreground"
                >
                  {isSuccess
                    ? 'Great job! All treasures found!'
                    : 'Out of tools! Try again?'}
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card/50 rounded-lg p-3 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Treasures</div>
                    <div className="font-display font-bold text-lg">
                      {levelResult.objectsFound}/{levelResult.totalObjects}
                    </div>
                  </div>

                  <div className="bg-card/50 rounded-lg p-3 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Tools Left</div>
                    <div className="font-display font-bold text-lg">{levelResult.toolsLeft}</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-accent/20 to-primary/20 rounded-lg p-4 border border-accent/30">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-medium">Score</span>
                    <motion.span
                      className="font-display font-bold text-2xl text-accent"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: [0.9, 1.12, 1], opacity: 1 }}
                      transition={{ delay: 0.55, duration: 0.45 }}
                    >
                      {levelResult.score}
                    </motion.span>
                  </div>
                </div>

                {isSuccess && rewardCoins > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.65, type: 'spring', stiffness: 220, damping: 18 }}
                    className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-lg p-4 border-2 border-yellow-500/50"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 8, -8, 0] }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      >
                        <Coins size={24} weight="fill" className="text-yellow-600" />
                      </motion.div>
                      <span className="font-display font-bold text-lg">
                        +{rewardCoins} Coins
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
                className="flex gap-3"
              >
                {!isSuccess && (
                  <Button variant="outline" onClick={onRestart} className="flex-1">
                    <ArrowClockwise size={18} className="mr-2" />
                    Try Again
                  </Button>
                )}

                {isSuccess && (
                  <div className="w-full text-center text-sm text-muted-foreground">
                    Preparing next level...
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}