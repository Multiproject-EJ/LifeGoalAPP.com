import React, { useState, useEffect, useCallback } from 'react'
import type { TreasureDigGameProps } from '../types/game.types'
import { useGameEngine } from '../hooks/useGameEngine'
import { HUD } from './game/HUD'
import { Board } from './game/Board'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowRight, ArrowClockwise, Sparkle, X } from '@phosphor-icons/react'
import { calculateReward } from '../utils/rewards'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function TreasureDigGame(props?: TreasureDigGameProps) {
  const {
    callbacks,
    initialLevel,
    customLevels,
    wrapperProps,
    layoutConfig,
    customHUD,
    customToolbar,
  } = props || {}

  const {
    compactMode = false,
    showDefaultHUD = true,
    showDefaultToolbar = true,
    maxWidth = '100%',
    maxHeight = '100vh',
  } = layoutConfig || {}

  const effectiveInitialLevel = wrapperProps?.currentLevel || initialLevel || 1
  const effectiveToolCount = wrapperProps?.playerToolCount

  const {
    levelState,
    currentLevel,
    breakTile,
    restartLevel,
    nextLevel,
    getLevelResult,
  } = useGameEngine(customLevels as any, effectiveInitialLevel)

  const [showLevelComplete, setShowLevelComplete] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)

  const toolsRemaining = effectiveToolCount !== undefined ? effectiveToolCount : levelState.toolsRemaining

  useEffect(() => {
    if (levelState.isComplete) {
      const result = getLevelResult()
      const reward = calculateReward(currentLevel.id, levelState.toolsRemaining, levelState.objectsCollected)
      
      callbacks?.onLevelComplete?.(result)
      callbacks?.onRewardEarned?.(reward)
      callbacks?.onFinishLevel?.(currentLevel.id, true)
      setShowLevelComplete(true)
    }
  }, [levelState.isComplete, getLevelResult, currentLevel.id, levelState.toolsRemaining, levelState.objectsCollected, callbacks])

  useEffect(() => {
    if (levelState.isGameOver) {
      callbacks?.onFinishLevel?.(currentLevel.id, false)
      setShowGameOver(true)
    }
  }, [levelState.isGameOver, currentLevel.id, callbacks])

  const handleTileClick = useCallback((position: { row: number, col: number }) => {
    callbacks?.onSpendTool?.(toolsRemaining - 1)
    breakTile(position)
  }, [breakTile, callbacks, toolsRemaining])

  const handleNextLevel = () => {
    setShowLevelComplete(false)
    nextLevel()
  }

  const handleRestart = () => {
    setShowGameOver(false)
    restartLevel()
  }

  const handleExit = () => {
    callbacks?.onExitFeature?.()
    callbacks?.onGameExit?.()
  }

  const containerClass = cn(
    'flex flex-col bg-gradient-to-br from-background via-secondary to-muted',
    compactMode ? 'h-full' : 'min-h-screen'
  )

  return (
    <div 
      className={containerClass}
      style={{ maxWidth, maxHeight, overflow: 'hidden' }}
    >
      {showDefaultHUD && !customHUD && (
        <HUD
          levelNumber={currentLevel.id}
          levelName={currentLevel.name}
          toolsRemaining={toolsRemaining}
          objectsCollected={levelState.objectsCollected}
          totalObjects={levelState.totalObjects}
          score={levelState.score}
          onExit={callbacks?.onExitFeature || callbacks?.onGameExit}
          compactMode={compactMode}
        />
      )}
      {customHUD}

      <div className={cn(
        'flex items-center justify-center',
        compactMode ? 'flex-1 py-2' : 'flex-1'
      )}>
        <Board
          board={levelState.board}
          onTileClick={handleTileClick}
          disabled={levelState.isComplete || levelState.isGameOver}
          compactMode={compactMode}
        />
      </div>

      {showDefaultToolbar && !customToolbar && (
        <div className={cn(
          'p-4 bg-card/50 backdrop-blur border-t border-border flex items-center justify-between',
          compactMode && 'p-2'
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              'font-display font-bold text-primary',
              compactMode ? 'text-lg' : 'text-2xl'
            )}>
              🔨 {toolsRemaining}
            </div>
            <span className={cn(
              'text-muted-foreground',
              compactMode ? 'text-xs' : 'text-sm'
            )}>
              {compactMode ? 'Tools' : 'Tools Left'}
            </span>
          </div>
          {callbacks?.onExitFeature && (
            <Button
              variant="ghost"
              size={compactMode ? 'sm' : 'default'}
              onClick={handleExit}
            >
              <X className="mr-1" size={compactMode ? 16 : 20} />
              {!compactMode && 'Exit'}
            </Button>
          )}
        </div>
      )}
      {customToolbar}

      <Dialog open={showLevelComplete} onOpenChange={setShowLevelComplete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="flex items-center justify-center gap-2"
              >
                <Sparkle weight="fill" className="text-accent" size={32} />
                Level Complete!
                <Sparkle weight="fill" className="text-accent" size={32} />
              </motion.div>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-6">
            <div>
              <p className="text-4xl font-display font-bold text-primary">{levelState.score}</p>
              <p className="text-sm text-muted-foreground">Points</p>
            </div>
            <div className="flex justify-center gap-6">
              <div>
                <p className="text-2xl font-display font-bold text-accent">{levelState.objectsCollected}</p>
                <p className="text-xs text-muted-foreground">Treasures Found</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-primary">{toolsRemaining}</p>
                <p className="text-xs text-muted-foreground">Tools Left</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button onClick={handleNextLevel} className="w-full font-display" size="lg">
              Next Level <ArrowRight weight="bold" className="ml-2" />
            </Button>
            {callbacks?.onExitFeature && (
              <Button onClick={handleExit} variant="outline" className="w-full">
                Exit Game
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGameOver} onOpenChange={setShowGameOver}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-center text-destructive">
              Out of Tools!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-6">
            <p className="text-muted-foreground">
              You need more tools to complete this level
            </p>
            <div>
              <p className="text-2xl font-display font-bold text-accent">{levelState.objectsCollected}/{levelState.totalObjects}</p>
              <p className="text-xs text-muted-foreground">Treasures Found</p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button onClick={handleRestart} className="w-full font-display" size="lg">
              <ArrowClockwise weight="bold" className="mr-2" />
              Restart Level
            </Button>
            {callbacks?.onExitFeature && (
              <Button onClick={handleExit} variant="outline" className="w-full">
                Exit Game
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
