import { Hammer, X } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { HUDProps } from '../types/game'
import type { PlacedObject } from '../types/game'
import { GAME_CONFIG } from '../game/config'
import { ObjectSilhouette } from './ObjectSilhouette'
import { ProgressionBar } from './ProgressionBar'

export function TopProgressHud({
  levelNumber,
  levelName,
  toolsRemaining,
  objectsCollected,
  totalObjects,
  score,
  objects,
  onExit,
  compactMode = false
}: HUDProps) {
  const isLowTools = toolsRemaining <= GAME_CONFIG.UI.LOW_TOOLS_THRESHOLD && toolsRemaining > 0
  
  const objectsList = objects ? Array.from(objects.values()) : []

  return (
    <div className="space-y-0.5 mx-1.5 mt-1">
      <ProgressionBar currentLevel={levelNumber} compact={true} />
      
      <Card className="p-1 bg-card/80 backdrop-blur shadow space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="font-display text-[10px] px-1.5 py-0">
            Lv {levelNumber}
          </Badge>
          <div className="flex items-center gap-2 text-xs">
            <div className="font-display font-bold text-accent">
              {objectsCollected}/{totalObjects}
            </div>
            <motion.div 
              className={cn(
                'font-display font-bold flex items-center gap-0.5',
                isLowTools ? 'text-destructive' : 'text-primary'
              )}
              animate={isLowTools ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: isLowTools ? Infinity : 0, duration: GAME_CONFIG.ANIMATION.PULSE_DURATION }}
            >
              <Hammer weight="fill" size={14} />
              {toolsRemaining}
            </motion.div>
          </div>
          {onExit && (
            <Button variant="ghost" size="sm" onClick={onExit} className="h-5 w-5 p-0">
              <X size={12} />
            </Button>
          )}
        </div>
        
        {objectsList.length > 0 && (
          <div className="flex items-center gap-1 justify-center">
            {objectsList.map((obj) => (
              <ObjectSilhouette key={obj.id} placedObject={obj} compact={true} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
