import { motion } from 'framer-motion'
import { Gift, Crown, Sparkle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useTheme } from '../game/ThemeProvider'
import { useState, useEffect, useRef } from 'react'
import { MilestoneCelebration } from './CelebrationEffects'

interface Milestone {
  level: number
  reward: string
  icon: 'treasure' | 'crown' | 'sparkle'
}

interface ProgressionBarProps {
  currentLevel: number
  milestones?: Milestone[]
  maxLevel?: number
  compact?: boolean
}

const defaultMilestones: Milestone[] = [
  { level: 5, reward: '100', icon: 'treasure' },
  { level: 10, reward: '250', icon: 'crown' },
  { level: 15, reward: '500', icon: 'sparkle' },
  { level: 20, reward: '1000', icon: 'sparkle' },
]

const iconMap = {
  treasure: Gift,
  crown: Crown,
  sparkle: Sparkle,
}

export function ProgressionBar({ 
  currentLevel, 
  milestones = defaultMilestones,
  maxLevel = 20,
  compact = false
}: ProgressionBarProps) {
  const theme = useTheme()
  const progress = (currentLevel / maxLevel) * 100
  const [celebratingMilestone, setCelebratingMilestone] = useState<number | null>(null)
  const [celebrationPosition, setCelebrationPosition] = useState({ x: 0, y: 0 })
  const previousLevelRef = useRef(currentLevel)
  const milestoneRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    const hitMilestone = milestones.find(
      m => m.level === currentLevel && currentLevel > previousLevelRef.current
    )
    
    if (hitMilestone) {
      const element = milestoneRefs.current.get(hitMilestone.level)
      if (element) {
        const rect = element.getBoundingClientRect()
        setCelebrationPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        })
        setCelebratingMilestone(hitMilestone.level)
        
        setTimeout(() => {
          setCelebratingMilestone(null)
        }, 1000)
      }
    }
    
    previousLevelRef.current = currentLevel
  }, [currentLevel, milestones])

  if (compact) {
    return (
      <>
        <div className="w-full py-1 px-2 bg-card/50 backdrop-blur rounded-lg border border-border/50">
          <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-display text-muted-foreground">Progress</span>
          <span className="text-[10px] font-display font-bold text-foreground">
            {currentLevel}/{maxLevel}
          </span>
        </div>
        
        <div className="relative pb-4 mt-0.5">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(to right, ${theme.tiles.hidden}, ${theme.accent})` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="absolute inset-0 flex items-center justify-between px-0.5">
            {milestones.map((milestone) => {
              const position = (milestone.level / maxLevel) * 100
              const isPassed = currentLevel >= milestone.level
              const isCurrent = currentLevel === milestone.level
              const IconComponent = iconMap[milestone.icon]

              return (
                <motion.div
                  key={milestone.level}
                  className="absolute"
                  style={{ left: `${position}%` }}
                  initial={{ y: 0 }}
                  animate={isCurrent ? { y: [0, -1.5, 0] } : {}}
                  transition={{ repeat: isCurrent ? Infinity : 0, duration: 1.5 }}
                  ref={(el) => {
                    if (el) milestoneRefs.current.set(milestone.level, el)
                  }}
                >
                  <div className="relative -translate-x-1/2">
                    <motion.div
                      className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center border-2 shadow-md',
                        isPassed
                          ? 'bg-accent border-accent text-accent-foreground'
                          : 'bg-card border-border text-muted-foreground'
                      )}
                      initial={{ scale: 0 }}
                      animate={{ 
                        scale: isPassed ? [1, 1.3, 1] : 1
                      }}
                      transition={{ 
                        type: 'spring', 
                        stiffness: 260, 
                        damping: 20,
                        scale: isPassed ? { duration: 0.6, times: [0, 0.5, 1] } : {}
                      }}
                    >
                      <IconComponent size={9} weight={isPassed ? 'fill' : 'regular'} />
                    </motion.div>

                    <div className={cn(
                      'absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-display',
                      isPassed ? 'text-accent font-bold' : 'text-muted-foreground'
                    )}>
                      {milestone.reward}
                    </div>
                  </div>
                </motion.div>
              )
            })}

            <motion.div
              className="absolute"
              style={{ left: '100%' }}
              initial={{ scale: 0, rotate: -45 }}
              animate={{ 
                scale: currentLevel === maxLevel ? [1, 1.05, 1] : 1,
                rotate: currentLevel === maxLevel ? [0, 10, -10, 0] : 0
              }}
              transition={{ 
                scale: { duration: 1, repeat: currentLevel === maxLevel ? Infinity : 0 },
                rotate: { duration: 2, repeat: currentLevel === maxLevel ? Infinity : 0 }
              }}
            >
              <div className="relative -translate-x-full">
                <div className={cn(
                  'w-4 h-4 rounded-lg flex items-center justify-center border-2 shadow-md',
                  currentLevel === maxLevel
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-500'
                    : 'bg-card border-border'
                )}>
                  <Gift 
                    size={10} 
                    weight={currentLevel === maxLevel ? 'fill' : 'regular'}
                    className={currentLevel === maxLevel ? 'text-white' : 'text-muted-foreground'}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      <MilestoneCelebration 
        show={celebratingMilestone !== null} 
        position={celebrationPosition}
      />
      </>
    )
  }

  return (
    <>
      <div className="w-full py-1.5 px-2 bg-card/50 backdrop-blur rounded-lg border border-border/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-display text-muted-foreground">Progress</span>
          <span className="text-xs font-display font-bold text-foreground">
            {currentLevel} / {maxLevel}
          </span>
        </div>
      
        <div className="relative pb-5">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="absolute inset-0 flex items-center justify-between px-1">
          {milestones.map((milestone) => {
            const position = (milestone.level / maxLevel) * 100
            const isPassed = currentLevel >= milestone.level
            const isCurrent = currentLevel === milestone.level
            const IconComponent = iconMap[milestone.icon]

            return (
              <motion.div
                key={milestone.level}
                className="absolute"
                style={{ left: `${position}%` }}
                initial={{ y: 0 }}
                animate={isCurrent ? { y: [0, -2, 0] } : {}}
                transition={{ repeat: isCurrent ? Infinity : 0, duration: 1.5 }}
              >
                <div className="relative -translate-x-1/2">
                  <motion.div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-md',
                      isPassed
                        ? 'bg-accent border-accent text-accent-foreground'
                        : 'bg-card border-border text-muted-foreground'
                    )}
                    whileHover={{ scale: 1.1 }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <IconComponent size={12} weight={isPassed ? 'fill' : 'regular'} />
                  </motion.div>

                  <div className={cn(
                    'absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-display',
                    isPassed ? 'text-accent font-bold' : 'text-muted-foreground'
                  )}>
                    {milestone.reward.replace(' coins', '')}
                  </div>
                </div>
              </motion.div>
            )
          })}

          <motion.div
            className="absolute"
            style={{ left: '100%' }}
            initial={{ scale: 0, rotate: -45 }}
            animate={{ 
              scale: currentLevel === maxLevel ? [1, 1.05, 1] : 1,
              rotate: currentLevel === maxLevel ? [0, 10, -10, 0] : 0
            }}
            transition={{ 
              scale: { duration: 1, repeat: currentLevel === maxLevel ? Infinity : 0 },
              rotate: { duration: 2, repeat: currentLevel === maxLevel ? Infinity : 0 }
            }}
          >
            <div className="relative -translate-x-full">
              <div className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center border-2 shadow-md',
                currentLevel === maxLevel
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-500'
                  : 'bg-card border-border'
              )}>
                <Gift 
                  size={14} 
                  weight={currentLevel === maxLevel ? 'fill' : 'regular'}
                  className={currentLevel === maxLevel ? 'text-white' : 'text-muted-foreground'}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
      
    <MilestoneCelebration 
      show={celebratingMilestone !== null} 
      position={celebrationPosition}
    />
    </>
  )
}
