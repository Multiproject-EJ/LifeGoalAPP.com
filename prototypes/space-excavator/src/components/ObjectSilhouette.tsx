import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { PlacedObject } from '../types/game'
import { getObjectShape } from '../data/shapes'
import { Sparkle } from '@phosphor-icons/react'
import * as PhosphorIcons from '@phosphor-icons/react'

interface ObjectSilhouetteProps {
  placedObject: PlacedObject
  compact?: boolean
}

const SHAPE_COLORS: Record<string, { 
  base: string
  light: string
  dark: string
  pattern: string
}> = {
  gold: {
    base: 'rgb(234, 179, 8)',
    light: 'rgb(250, 204, 21)',
    dark: 'rgb(161, 98, 7)',
    pattern: 'repeating-linear-gradient(45deg, rgba(250, 204, 21, 0.3) 0px, rgba(250, 204, 21, 0.3) 2px, transparent 2px, transparent 4px)'
  },
  diamond: {
    base: 'rgb(34, 211, 238)',
    light: 'rgb(103, 232, 249)',
    dark: 'rgb(8, 145, 178)',
    pattern: 'repeating-linear-gradient(45deg, rgba(165, 243, 252, 0.3) 0px, rgba(165, 243, 252, 0.3) 2px, transparent 2px, transparent 4px)'
  },
  ruby: {
    base: 'rgb(244, 63, 94)',
    light: 'rgb(251, 113, 133)',
    dark: 'rgb(190, 18, 60)',
    pattern: 'repeating-linear-gradient(45deg, rgba(251, 113, 133, 0.3) 0px, rgba(251, 113, 133, 0.3) 2px, transparent 2px, transparent 4px)'
  },
  silver: {
    base: 'rgb(161, 161, 170)',
    light: 'rgb(212, 212, 216)',
    dark: 'rgb(113, 113, 122)',
    pattern: 'repeating-linear-gradient(45deg, rgba(212, 212, 216, 0.3) 0px, rgba(212, 212, 216, 0.3) 2px, transparent 2px, transparent 4px)'
  },
  bronze: {
    base: 'rgb(251, 146, 60)',
    light: 'rgb(253, 186, 116)',
    dark: 'rgb(194, 65, 12)',
    pattern: 'repeating-linear-gradient(45deg, rgba(253, 186, 116, 0.3) 0px, rgba(253, 186, 116, 0.3) 2px, transparent 2px, transparent 4px)'
  },
}

export function ObjectSilhouette({ placedObject, compact = false }: ObjectSilhouetteProps) {
  const shape = getObjectShape(placedObject.shapeId)
  
  if (!shape) return null

  const isComplete = placedObject.isCollected
  
  const IconComponent = (PhosphorIcons as any)[shape.icon] || PhosphorIcons.Cube
  const colorInfo = SHAPE_COLORS[shape.color] || SHAPE_COLORS.gold
  
  const cellSize = compact ? 'w-5 h-5' : 'w-8 h-8'
  const iconSize = compact ? 14 : 20
  const padding = compact ? 'p-2.5' : 'p-4'
  const gap = compact ? 'gap-1.5' : 'gap-2'

  return (
    <motion.div 
      className={cn(
        'rounded-xl border-[3px] transition-all duration-300 relative',
        padding,
        isComplete 
          ? 'border-accent bg-accent/40 shadow-2xl shadow-accent/50' 
          : 'border-border bg-card/95 backdrop-blur-sm shadow-md'
      )}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: isComplete ? [1, 1.15, 1] : 1,
        opacity: 1
      }}
      transition={isComplete ? {
        scale: { duration: 0.6, times: [0, 0.6, 1], ease: [0.34, 1.56, 0.64, 1] },
        opacity: { duration: 0.2 }
      } : { duration: 0.2 }}
    >
      <div className="flex flex-col items-center gap-2">
        <div className={cn('grid', gap)} style={{ gridTemplateColumns: `repeat(${shape.pattern[0].length}, minmax(0, 1fr))` }}>
          {shape.pattern.map((row, rowIdx) => 
            row.map((cell, colIdx) => {
              const cellKey = `${placedObject.position.row + rowIdx},${placedObject.position.col + colIdx}`
              const isRevealed = placedObject.revealedCells.has(cellKey)
              
              if (cell === 0) {
                return <div key={`${rowIdx}-${colIdx}`} className={cellSize} />
              }
              
              return (
                <motion.div
                  key={`${rowIdx}-${colIdx}`}
                  className={cn(
                    cellSize,
                    'rounded-md transition-all duration-300 relative overflow-hidden',
                    isRevealed 
                      ? 'shadow-xl border-[3px] border-white/60'
                      : 'border-2 border-border/30'
                  )}
                  initial={false}
                  animate={isRevealed ? {
                    scale: [1, 1.3, 1],
                    rotate: [0, 8, -8, 0]
                  } : {}}
                  transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  {isRevealed ? (
                    <>
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(135deg, ${colorInfo.light} 0%, ${colorInfo.base} 40%, ${colorInfo.dark} 100%)`
                        }}
                      />
                      
                      <div 
                        className="absolute inset-0"
                        style={{
                          backgroundImage: colorInfo.pattern,
                          opacity: 0.7
                        }}
                      />
                      
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: `radial-gradient(circle at ${50 + colIdx * 20}% ${50 + rowIdx * 20}%, rgba(255,255,255,0.9) 0%, transparent 60%)`
                        }}
                      />
                      
                      <motion.div 
                        className="absolute inset-0 rounded-md"
                        style={{
                          boxShadow: `inset 0 0 ${compact ? '6px' : '8px'} rgba(255,255,255,0.7), inset 0 2px ${compact ? '3px' : '4px'} rgba(255,255,255,0.4)`
                        }}
                        animate={{
                          opacity: [0.7, 1, 0.7]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      />
                      
                      <div 
                        className="absolute inset-[1px] border-2 rounded-md"
                        style={{
                          borderColor: colorInfo.dark,
                          opacity: 0.6
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-muted/40" />
                      
                      <div 
                        className="absolute inset-0 opacity-10"
                        style={{
                          background: `repeating-linear-gradient(45deg, ${colorInfo.base}20, ${colorInfo.base}20 2px, transparent 2px, transparent 4px)`
                        }}
                      />
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div 
                          className="w-1 h-1 rounded-full"
                          style={{ 
                            backgroundColor: colorInfo.base,
                            opacity: 0.15
                          }}
                        />
                      </div>
                      
                      <div 
                        className="absolute inset-0 border-2 border-dashed rounded-md"
                        style={{
                          borderColor: colorInfo.base,
                          opacity: 0.15
                        }}
                      />
                    </>
                  )}
                </motion.div>
              )
            })
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          {isComplete && (
            <>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
              >
                <Sparkle size={iconSize} weight="fill" className="text-accent drop-shadow-lg" />
              </motion.div>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 500, damping: 12 }}
                className={cn(
                  compact ? 'text-[9px]' : 'text-[10px]',
                  'font-display font-bold text-accent uppercase tracking-wide drop-shadow-md'
                )}
              >
                Found!
              </motion.div>
            </>
          )}
          {!isComplete && (
            <IconComponent 
              size={iconSize} 
              weight="duotone"
              className="text-muted-foreground/60"
            />
          )}
        </div>
      </div>

      {isComplete && (
        <>
          <motion.div
            className="absolute inset-[-3px] rounded-xl border-[4px] border-accent"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 1.4] }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-accent"
              style={{
                left: '50%',
                top: '50%',
              }}
              initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0.5],
                x: Math.cos((i * Math.PI * 2) / 8) * (compact ? 25 : 35),
                y: Math.sin((i * Math.PI * 2) / 8) * (compact ? 25 : 35),
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 0.8,
                delay: 0.1 + i * 0.03,
                ease: 'easeOut'
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  )
}
