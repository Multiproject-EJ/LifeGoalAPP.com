import { Hammer, ArrowClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ToolbarProps } from '../types/game'
import { GAME_CONFIG } from '../game/config'

export function ToolBar({ toolsRemaining, onRestart, compactMode = false }: ToolbarProps) {
  const isLowTools = toolsRemaining <= GAME_CONFIG.UI.LOW_TOOLS_THRESHOLD && toolsRemaining > 0

  if (compactMode) {
    return (
      <Card className="p-1 mx-1.5 mb-1 bg-card/80 backdrop-blur shadow">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 font-display text-xs">
            <Hammer weight="fill" size={12} className="text-primary" />
            <AnimatePresence mode="wait">
              <motion.span
                key={toolsRemaining}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn('font-bold', isLowTools && 'text-destructive')}
              >
                {toolsRemaining}
              </motion.span>
            </AnimatePresence>
          </div>
          {onRestart && (
            <Button variant="ghost" size="sm" onClick={onRestart} className="h-5 px-1.5 text-[10px]">
              <ArrowClockwise size={10} className="mr-0.5" />
              Restart
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-1.5 mx-2 mb-1.5 bg-card/80 backdrop-blur shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={isLowTools ? { rotate: [0, -10, 10, 0] } : {}}
            transition={{ duration: 0.5, repeat: isLowTools ? Infinity : 0, repeatDelay: 0.5 }}
          >
            <Hammer weight="fill" size={18} className={cn('text-primary', isLowTools && 'text-destructive')} />
          </motion.div>
          <div>
            <div className="text-[10px] text-muted-foreground">Tools</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={toolsRemaining}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={cn('font-display font-bold text-base', isLowTools && 'text-destructive')}
              >
                {toolsRemaining}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        {onRestart && (
          <Button variant="secondary" size="sm" onClick={onRestart} className="h-7 text-xs">
            <ArrowClockwise size={14} className="mr-1" />
            Restart
          </Button>
        )}
      </div>
    </Card>
  )
}
