import { motion, AnimatePresence } from 'framer-motion'
import type { Tile } from '../types/game'
import { cn } from '@/lib/utils'
import { GAME_CONFIG } from '../game/config'
import { Sparkle, Lightning, Eye, Gift, Pulse, ArrowsHorizontal } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import { RevealEffect, BonusEffect } from '../treasure-dig/effects/SpecialTileEffects'
import { useTheme } from '../game/ThemeProvider'
import { getMilestoneVisualConfig } from '../game/milestones'

interface TileCellProps {
  tile: Tile
  onClick: () => void
  disabled: boolean
  progressPercent?: number
  adjacentTreasureTiles?: {
    top?: boolean
    right?: boolean
    bottom?: boolean
    left?: boolean
  }
}

const SPRITE_COLORS: Record<string, { 
  base: string
  light: string
  dark: string
  glow: string
  pattern: string
}> = {
  gold: {
    base: 'rgb(234, 179, 8)',
    light: 'rgb(250, 204, 21)',
    dark: 'rgb(161, 98, 7)',
    glow: 'rgba(234, 179, 8, 0.4)',
    pattern: 'repeating-linear-gradient(45deg, rgba(250, 204, 21, 0.3) 0px, rgba(250, 204, 21, 0.3) 2px, transparent 2px, transparent 4px)'
  },
  diamond: {
    base: 'rgb(34, 211, 238)',
    light: 'rgb(103, 232, 249)',
    dark: 'rgb(8, 145, 178)',
    glow: 'rgba(34, 211, 238, 0.4)',
    pattern: 'repeating-linear-gradient(45deg, rgba(165, 243, 252, 0.3) 0px, rgba(165, 243, 252, 0.3) 2px, transparent 2px, transparent 4px)'
  },
  ruby: {
    base: 'rgb(244, 63, 94)',
    light: 'rgb(251, 113, 133)',
    dark: 'rgb(190, 18, 60)',
    glow: 'rgba(244, 63, 94, 0.4)',
    pattern: 'repeating-linear-gradient(45deg, rgba(251, 113, 133, 0.3) 0px, rgba(251, 113, 133, 0.3) 2px, transparent 2px, transparent 4px)'
  },
  silver: {
    base: 'rgb(161, 161, 170)',
    light: 'rgb(212, 212, 216)',
    dark: 'rgb(113, 113, 122)',
    glow: 'rgba(161, 161, 170, 0.4)',
    pattern: 'repeating-linear-gradient(45deg, rgba(212, 212, 216, 0.3) 0px, rgba(212, 212, 216, 0.3) 2px, transparent 2px, transparent 4px)'
  },
  bronze: {
    base: 'rgb(251, 146, 60)',
    light: 'rgb(253, 186, 116)',
    dark: 'rgb(194, 65, 12)',
    glow: 'rgba(251, 146, 60, 0.4)',
    pattern: 'repeating-linear-gradient(45deg, rgba(253, 186, 116, 0.3) 0px, rgba(253, 186, 116, 0.3) 2px, transparent 2px, transparent 4px)'
  },
}

function getSpriteVisual(spritePosition: { row: number; col: number }, color: string) {
  const colorInfo = SPRITE_COLORS[color] || SPRITE_COLORS.gold
  
  const offsetX = spritePosition.col * 25
  const offsetY = spritePosition.row * 25
  
  const uniqueRotation = (spritePosition.row * 7 + spritePosition.col * 13) % 360
  const uniqueVariation = (spritePosition.row * 11 + spritePosition.col * 17) % 100
  
  return (
    <div className="w-full h-full relative overflow-hidden rounded-md">
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${135 + uniqueRotation * 0.3}deg, ${colorInfo.light} 0%, ${colorInfo.base} ${40 + uniqueVariation * 0.2}%, ${colorInfo.dark} 100%)`
        }}
      />
      
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: colorInfo.pattern,
          opacity: 0.5,
          transform: `rotate(${uniqueRotation * 0.15}deg)`
        }}
      />
      
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at ${45 + offsetX}% ${45 + offsetY}%, rgba(255,255,255,0.8) 0%, transparent 55%)`
        }}
      />
      
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${65 - offsetX * 0.4}% ${35 - offsetY * 0.4}%, rgba(255,255,255,0.5) 0%, transparent 40%)`
        }}
      />
      
      <div 
        className="absolute inset-0 border-2 rounded-md"
        style={{
          borderColor: colorInfo.dark,
          opacity: 0.6
        }}
      />
      
      <div 
        className="absolute inset-[2px] border rounded-sm"
        style={{
          borderColor: colorInfo.light,
          opacity: 0.4
        }}
      />
      
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/2"
        style={{
          background: `linear-gradient(to top, ${colorInfo.dark}60, transparent)`
        }}
      />
      
      <div 
        className="absolute top-0 left-0 right-0 h-1/3"
        style={{
          background: `linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)`
        }}
      />
      
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${45 + uniqueVariation * 2}deg, transparent 30%, ${colorInfo.light}20 50%, transparent 70%)`
        }}
      />
    </div>
  )
}

function DustParticles({ show }: { show: boolean }) {
  if (!show) return null
  
  const particleCount = 12
  const angles = Array.from({ length: particleCount }, (_, i) => (i * 360) / particleCount)
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
      {angles.map((angle, i) => {
        const distance = 40 + Math.random() * 30
        const radians = (angle * Math.PI) / 180
        const endX = Math.cos(radians) * distance
        const endY = Math.sin(radians) * distance
        
        return (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-primary/60 rounded-full"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: '-3px',
              marginTop: '-3px',
            }}
            initial={{ 
              x: 0, 
              y: 0,
              opacity: 1,
              scale: 1
            }}
            animate={{ 
              x: endX,
              y: endY,
              opacity: 0,
              scale: 0.3
            }}
            transition={{ 
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1]
            }}
          />
        )
      })}
    </div>
  )
}

function CrackOverlay({ show, intensity = 'light' }: { show: boolean; intensity?: 'light' | 'medium' | 'heavy' }) {
  if (!show) return null
  
  const crackPaths = {
    light: [
      { d: "M 30 10 L 38 35 L 42 55 L 25 90", width: "2.5", opacity: "0.4" },
      { d: "M 70 5 L 65 40 L 62 60 L 78 85", width: "2.5", opacity: "0.4" },
      { d: "M 10 40 L 40 42 L 60 45 L 90 48", width: "2", opacity: "0.3" },
    ],
    medium: [
      { d: "M 30 10 L 38 35 L 42 55 L 25 90", width: "3", opacity: "0.5" },
      { d: "M 70 5 L 65 40 L 62 60 L 78 85", width: "3", opacity: "0.5" },
      { d: "M 10 40 L 40 42 L 60 45 L 90 48", width: "2.5", opacity: "0.4" },
      { d: "M 50 20 L 48 50 L 52 80", width: "2", opacity: "0.35" },
      { d: "M 15 60 L 35 58 L 55 62 L 75 59", width: "2", opacity: "0.3" },
    ],
    heavy: [
      { d: "M 30 10 L 38 35 L 42 55 L 25 90", width: "3.5", opacity: "0.6" },
      { d: "M 70 5 L 65 40 L 62 60 L 78 85", width: "3.5", opacity: "0.6" },
      { d: "M 10 40 L 40 42 L 60 45 L 90 48", width: "3", opacity: "0.5" },
      { d: "M 50 20 L 48 50 L 52 80", width: "2.5", opacity: "0.45" },
      { d: "M 15 60 L 35 58 L 55 62 L 75 59", width: "2.5", opacity: "0.4" },
      { d: "M 5 20 L 25 30 L 35 25", width: "2", opacity: "0.35" },
      { d: "M 65 75 L 80 70 L 95 80", width: "2", opacity: "0.35" },
      { d: "M 85 15 L 70 25 L 60 18", width: "1.5", opacity: "0.3" },
    ],
  }
  
  const cracks = crackPaths[intensity]
  
  return (
    <motion.div 
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {cracks.map((crack, i) => (
          <motion.path
            key={i}
            d={crack.d}
            stroke="currentColor"
            strokeWidth={crack.width}
            fill="none"
            className="text-foreground"
            style={{ opacity: crack.opacity }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: crack.opacity }}
            transition={{ duration: 0.12, ease: "easeOut", delay: i * 0.02 }}
          />
        ))}
      </svg>
    </motion.div>
  )
}

function SparkleParticles({ show }: { show: boolean }) {
  if (!show) return null
  
  const sparklePositions = [
    { x: 10, y: 10, delay: 0, size: 8 },
    { x: 80, y: 15, delay: 0.03, size: 6 },
    { x: 15, y: 75, delay: 0.06, size: 7 },
    { x: 75, y: 80, delay: 0.05, size: 9 },
    { x: 50, y: 5, delay: 0.02, size: 5 },
    { x: 90, y: 50, delay: 0.07, size: 6 },
  ]
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {sparklePositions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
          }}
          initial={{ scale: 0, opacity: 0, rotate: 0 }}
          animate={{ 
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 0.35,
            delay: pos.delay,
            ease: "easeOut"
          }}
        >
          <Sparkle size={pos.size} weight="fill" className="text-accent" />
        </motion.div>
      ))}
    </div>
  )
}

function GlowPulse({ show }: { show: boolean }) {
  if (!show) return null
  
  return (
    <motion.div
      className="absolute inset-0 rounded-lg bg-accent/30"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: [0, 0.6, 0],
        scale: [0.8, 1.1, 1.2]
      }}
      transition={{ 
        duration: 0.35,
        ease: "easeOut"
      }}
    />
  )
}

function ChainTriggerGlow({ show }: { show: boolean }) {
  if (!show) return null
  
  return (
    <>
      <motion.div
        className="absolute inset-0 rounded-lg bg-amber-400/40"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: [0, 0.9, 0.5, 0],
          scale: [0.9, 1.15, 1.25, 1.35]
        }}
        transition={{ 
          duration: 0.7,
          ease: "easeOut"
        }}
      />
      <motion.div
        className="absolute inset-[-4px] rounded-lg border-2 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.9)]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: [0, 1, 0.6, 0],
          scale: [0.95, 1.08, 1.15, 1.2]
        }}
        transition={{ 
          duration: 0.7,
          ease: "easeOut"
        }}
      />
    </>
  )
}

export function TileCell({ tile, onClick, disabled, progressPercent = 0, adjacentTreasureTiles = {} }: TileCellProps) {
  const theme = useTheme()
  const milestoneConfig = getMilestoneVisualConfig(progressPercent)
  
  const isHidden = tile.renderState === 'hidden'
  const isDamaged = tile.renderState === 'damaged'
  const canClick = (isHidden || isDamaged) && !disabled
  const isRevealed = tile.renderState.startsWith('revealed')
  const isBreaking = tile.status === 'breaking'
  const isTreasure = tile.renderState === 'revealedTreasure'
  const isEmpty = tile.renderState === 'revealedEmpty'
  const hasHP = tile.hp !== undefined && tile.maxHp !== undefined
  const hasAdjacentTreasure = Object.values(adjacentTreasureTiles).some(v => v)
  
  const [showDust, setShowDust] = useState(false)
  const [showSparkles, setShowSparkles] = useState(false)
  const [showGlow, setShowGlow] = useState(false)
  const [showChainGlow, setShowChainGlow] = useState(false)
  const [isTapping, setIsTapping] = useState(false)
  
  useEffect(() => {
    if (isBreaking) {
      setShowDust(true)
      const timeout = setTimeout(() => setShowDust(false), 500)
      return () => clearTimeout(timeout)
    }
  }, [isBreaking])
  
  useEffect(() => {
    if (isTreasure) {
      setShowSparkles(true)
      setShowGlow(true)
      const sparkleTimeout = setTimeout(() => setShowSparkles(false), 450)
      const glowTimeout = setTimeout(() => setShowGlow(false), 350)
      return () => {
        clearTimeout(sparkleTimeout)
        clearTimeout(glowTimeout)
      }
    }
  }, [isTreasure])
  
  const handleTap = () => {
    if (!canClick) return
    setIsTapping(true)
    setTimeout(() => {
      setIsTapping(false)
      onClick()
    }, 80)
  }

  const [showRevealEffect, setShowRevealEffect] = useState(false)
  const [showBonusEffect, setShowBonusEffect] = useState(false)
  
  useEffect(() => {
    if (isTreasure && tile.type === 'reveal') {
      setShowRevealEffect(true)
      const timeout = setTimeout(() => setShowRevealEffect(false), 600)
      return () => clearTimeout(timeout)
    }
  }, [isTreasure, tile.type])
  
  useEffect(() => {
    if (isTreasure && tile.type === 'bonus') {
      setShowBonusEffect(true)
      const timeout = setTimeout(() => setShowBonusEffect(false), 800)
      return () => clearTimeout(timeout)
    }
  }, [isTreasure, tile.type])
  
  useEffect(() => {
    if (tile.status === 'breaking' && tile.type === 'chain-row') {
      setShowChainGlow(true)
      const timeout = setTimeout(() => setShowChainGlow(false), 700)
      return () => clearTimeout(timeout)
    }
  }, [tile.status, tile.type])
  
  const getTileTypeIcon = () => {
    if (tile.type === 'bomb-row') {
      return (
        <motion.div
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatDelay: 1
          }}
        >
          <Lightning size={18} weight="fill" className="text-red-500 drop-shadow-lg" />
        </motion.div>
      )
    }
    if (tile.type === 'bomb-col') {
      return (
        <motion.div
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatDelay: 1
          }}
        >
          <Lightning size={18} weight="fill" className="text-red-500 drop-shadow-lg" />
        </motion.div>
      )
    }
    if (tile.type === 'chain-row') {
      return (
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [-1, 1, -1]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <ArrowsHorizontal size={20} weight="bold" className="text-amber-400 drop-shadow-lg" />
        </motion.div>
      )
    }
    if (tile.type === 'reveal') {
      return (
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Eye size={18} weight="fill" className="text-cyan-500 drop-shadow-lg" />
        </motion.div>
      )
    }
    if (tile.type === 'bonus') {
      return (
        <motion.div
          animate={{
            y: [0, -2, 0],
            rotate: [0, 10, -10, 0]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Gift size={18} weight="fill" className="text-green-500 drop-shadow-lg" />
        </motion.div>
      )
    }
    return null
  }
  
  const getCrackIntensity = (): 'light' | 'medium' | 'heavy' => {
    if (!hasHP || !tile.maxHp || !tile.hp) return 'light'
    const damagePercent = (tile.maxHp - tile.hp) / tile.maxHp
    if (damagePercent === 0) return 'light'
    if (tile.hp === 1) return 'heavy'
    return 'medium'
  }

  const isNeonTheme = theme.id === 'neon_transition' || theme.id === 'neon_peak'

  const getTileBackgroundStyle = () => {
    const baseStyle: React.CSSProperties = {}
    
    if (isHidden) {
      baseStyle.backgroundColor = theme.tiles.hidden
    } else if (isDamaged) {
      baseStyle.backgroundColor = theme.tiles.damaged
    } else if (isTreasure) {
      baseStyle.backgroundColor = `${theme.accent}20`
    } else if (tile.renderState === 'revealedBlocker') {
      baseStyle.backgroundColor = 'oklch(0.62 0.16 15 / 0.3)'
    } else {
      baseStyle.backgroundColor = theme.tiles.revealed
    }
    
    if (isHidden || isDamaged) {
      baseStyle.filter = `brightness(${milestoneConfig.brightness})`
      
      if (isNeonTheme) {
        baseStyle.boxShadow = `inset 0 2px 6px rgba(0, 0, 0, 0.2), inset 0 -1px 3px rgba(255, 255, 255, 0.1), 0 1px 2px ${theme.accent}30`
      } else {
        baseStyle.boxShadow = `inset 0 2px 6px rgba(0, 0, 0, 0.15), inset 0 -1px 3px rgba(255, 255, 255, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)`
      }
    }
    
    return baseStyle
  }
  
  const getMilestoneOverlayStyle = () => {
    if (!isHidden && !isDamaged) return {}
    
    const baseGradient = `repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(255, 255, 255, ${milestoneConfig.textureIntensity * 0.08}) 10px,
      rgba(255, 255, 255, ${milestoneConfig.textureIntensity * 0.08}) 11px
    )`
    
    const depthGradient = `linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, transparent 45%, rgba(0, 0, 0, 0.1) 100%)`
    
    return {
      backgroundImage: `${depthGradient}, ${baseGradient}`,
    }
  }
  
  const getMilestoneGlowStyle = () => {
    if (!isHidden && !isDamaged) return {}
    if (milestoneConfig.glowStrength === 0) return {}
    
    return {
      boxShadow: `inset 0 0 ${12 + milestoneConfig.glowStrength * 8}px rgba(255, 255, 255, ${milestoneConfig.glowStrength * 0.4})`,
    }
  }
  
  const getMilestoneEdgeHighlightStyle = () => {
    if (!isHidden && !isDamaged) return {}
    
    return {
      background: `linear-gradient(135deg, rgba(255, 255, 255, ${milestoneConfig.edgeHighlight * 0.5}) 0%, transparent 50%, rgba(0, 0, 0, ${milestoneConfig.edgeHighlight * 0.2}) 100%)`,
    }
  }

  return (
    <motion.button
      onPointerDown={canClick ? handleTap : undefined}
      disabled={!canClick}
      className={cn(
        'aspect-square rounded-lg transition-colors duration-200 relative overflow-hidden shadow-lg',
        isHidden && tile.type === 'hard' && 'ring-4 ring-orange-600/70 ring-inset shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]',
        isHidden && tile.type === 'blocker' && 'ring-2 ring-destructive/60',
        isHidden && tile.type === 'bomb-row' && 'ring-2 ring-red-500/80 shadow-lg shadow-red-500/30',
        isHidden && tile.type === 'bomb-col' && 'ring-2 ring-red-500/80 shadow-lg shadow-red-500/30',
        isHidden && tile.type === 'chain-row' && 'ring-2 ring-amber-400/80 shadow-lg shadow-amber-400/40',
        isHidden && tile.type === 'reveal' && 'ring-2 ring-cyan-500/80 shadow-lg shadow-cyan-500/30',
        isHidden && tile.type === 'bonus' && 'ring-2 ring-green-500/80 shadow-lg shadow-green-500/30',
        tile.renderState === 'revealedBlocker' && 'border-2 border-destructive/40',
        isEmpty && 'border border-border',
        canClick && 'cursor-pointer',
        !canClick && 'cursor-not-allowed'
      )}
      style={getTileBackgroundStyle()}
      initial={false}
      animate={{
        scale: isTapping ? 0.88 : (tile.status === 'breaking' ? 0.95 : 1),
        rotate: tile.status === 'breaking' ? GAME_CONFIG.ANIMATION.SHAKE_FRAMES : 0,
      }}
      transition={{ 
        scale: { 
          duration: isTapping ? 0.1 : 0.15,
          ease: "easeOut"
        },
        rotate: {
          duration: GAME_CONFIG.ANIMATION.TILE_BREAK_DURATION / 1000
        }
      }}
    >
      <GlowPulse show={showGlow} />
      <ChainTriggerGlow show={showChainGlow} />
      
      {(isHidden || isDamaged) && (
        <>
          <div 
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={getMilestoneOverlayStyle()}
          />
          <div 
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={getMilestoneGlowStyle()}
          />
          <div 
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={getMilestoneEdgeHighlightStyle()}
          />
        </>
      )}
      
      <CrackOverlay show={isBreaking} intensity="light" />
      {isDamaged && <CrackOverlay show={true} intensity={getCrackIntensity()} />}
      <DustParticles show={showDust} />
      <SparkleParticles show={showSparkles} />
      
      <AnimatePresence mode="wait">
        {tile.renderState === 'revealedTreasure' && tile.spritePosition && tile.objectColor && (
          <motion.div
            key="object"
            initial={{ scale: 0, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={GAME_CONFIG.ANIMATION.TILE_SCALE_SPRING}
            className="absolute inset-0 rounded-lg overflow-hidden"
          >
            <div className={cn(
              "absolute inset-0 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.15)] ring-2 ring-accent/40",
              hasAdjacentTreasure && "ring-accent/60"
            )}>
              {getSpriteVisual(tile.spritePosition, tile.objectColor)}
            </div>
            <div className="absolute inset-0 rounded-lg shadow-[0_0_12px_rgba(var(--accent)/0.4)] pointer-events-none" />
            
            {hasAdjacentTreasure && (
              <>
                {adjacentTreasureTiles.top && (
                  <motion.div
                    className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-b from-accent/60 to-transparent"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  />
                )}
                {adjacentTreasureTiles.right && (
                  <motion.div
                    className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-l from-accent/60 to-transparent"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  />
                )}
                {adjacentTreasureTiles.bottom && (
                  <motion.div
                    className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-gradient-to-t from-accent/60 to-transparent"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  />
                )}
                {adjacentTreasureTiles.left && (
                  <motion.div
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-r from-accent/60 to-transparent"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  />
                )}
              </>
            )}
          </motion.div>
        )}
        
        {tile.status === 'revealed-blocker' && (
          <motion.div
            key="blocker"
            initial={{ scale: 0, rotate: 45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={GAME_CONFIG.ANIMATION.TILE_SCALE_SPRING}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-6 h-6 bg-destructive rounded rotate-45 shadow-lg" />
          </motion.div>
        )}
        
        {isEmpty && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-full h-full bg-gradient-to-br from-muted/10 to-muted/5 rounded-lg" />
          </motion.div>
        )}
        
        {isHidden && (
          <motion.div
            key="hidden"
            className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        
        {isHidden && tile.type === 'hard' && (
          <motion.div
            key="hard-reinforcement"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 via-orange-700/30 to-orange-900/40" />
            <div className="absolute inset-0" 
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.1) 8px, rgba(0,0,0,0.1) 10px)',
              }}
            />
            <div className="absolute inset-[3px] border-2 border-orange-400/20 rounded-md" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isHidden && getTileTypeIcon() && (
        <div className="absolute top-1 right-1 z-10">
          {getTileTypeIcon()}
        </div>
      )}
      
      {showRevealEffect && <RevealEffect />}
      {showBonusEffect && <BonusEffect />}
    </motion.button>
  )
}
