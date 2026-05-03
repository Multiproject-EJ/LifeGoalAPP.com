import { Hammer, X } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface HUDProps {
  levelNumber: number
  levelName: string
  toolsRemaining: number
  objectsCollected: number
  totalObjects: number
  score: number
  onExit?: () => void
  compactMode?: boolean
}

export function HUD({
  levelNumber,
  levelName,
  toolsRemaining,
  objectsCollected,
  totalObjects,
  score,
  onExit,
  compactMode = false
}: HUDProps) {
  const isLowTools = toolsRemaining <= 2 && toolsRemaining > 0

  if (compactMode) {
    return (
      <Card className="p-2 mx-2 mt-2 bg-card/80 backdrop-blur shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="font-display text-xs px-2 py-0.5">
            Lv {levelNumber}
          </Badge>
          <div className="flex items-center gap-3 text-sm">
            <div className="font-display font-bold text-accent">
              {objectsCollected}/{totalObjects}
            </div>
            <motion.div 
              className={cn(
                'font-display font-bold flex items-center gap-1',
                isLowTools ? 'text-destructive' : 'text-primary'
              )}
              animate={isLowTools ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: isLowTools ? Infinity : 0, duration: 0.5 }}
            >
              <Hammer weight="fill" size={16} />
              {toolsRemaining}
            </motion.div>
          </div>
          {onExit && (
            <Button variant="ghost" size="sm" onClick={onExit} className="h-6 w-6 p-0">
              <X size={14} />
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 mx-4 mt-4 bg-card/80 backdrop-blur shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-display text-base px-3 py-1">
            Level {levelNumber}
          </Badge>
          <h2 className="font-display font-medium text-lg text-foreground">
            {levelName}
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Treasures</div>
            <div className="font-display font-bold text-lg text-accent">
              {objectsCollected}/{totalObjects}
            </div>
          </div>
          
          <motion.div 
            className="text-right"
            animate={isLowTools ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: isLowTools ? Infinity : 0, duration: 0.5 }}
          >
            <div className="text-xs text-muted-foreground">Tools</div>
            <div className={cn(
              'font-display font-bold text-lg flex items-center gap-1',
              isLowTools ? 'text-destructive' : 'text-primary'
            )}>
              <Hammer weight="fill" size={20} />
              {toolsRemaining}
            </div>
          </motion.div>

          {onExit && (
            <Button variant="ghost" size="sm" onClick={onExit}>
              <X className="mr-1" size={18} />
              Exit
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
