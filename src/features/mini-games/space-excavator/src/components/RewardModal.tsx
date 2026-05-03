import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkle, ArrowRight } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { LevelResult } from '../types/game'

interface RewardModalProps {
  open: boolean
  onClose: () => void
  onNextLevel: () => void
  levelResult: LevelResult | null
}

export function RewardModal({ open, onClose, onNextLevel, levelResult }: RewardModalProps) {
  if (!levelResult) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="flex justify-center mb-4"
          >
            <Sparkle size={64} weight="fill" className="text-accent" />
          </motion.div>
          <DialogTitle className="text-center font-display text-2xl">
            {levelResult.completed ? 'Level Complete!' : 'Game Over'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex justify-between p-3 bg-muted rounded-lg">
            <span className="text-muted-foreground">Treasures Found</span>
            <span className="font-display font-bold">{levelResult.objectsFound}/{levelResult.totalObjects}</span>
          </div>
          
          <div className="flex justify-between p-3 bg-muted rounded-lg">
            <span className="text-muted-foreground">Tools Left</span>
            <span className="font-display font-bold">{levelResult.toolsLeft}</span>
          </div>
          
          <div className="flex justify-between p-3 bg-accent/10 rounded-lg">
            <span className="text-muted-foreground">Score</span>
            <span className="font-display font-bold text-accent">{levelResult.score}</span>
          </div>
        </div>

        <DialogFooter>
          {levelResult.completed ? (
            <Button onClick={onNextLevel} className="w-full">
              Next Level
              <ArrowRight size={18} className="ml-2" />
            </Button>
          ) : (
            <Button onClick={onClose} className="w-full">
              Try Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
