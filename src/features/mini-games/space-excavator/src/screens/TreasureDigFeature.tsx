import { useState, useEffect, useRef } from 'react'
import { useTreasureDigGame } from '../hooks/useTreasureDigGame'
import { useSoundEffects } from '../hooks/useSoundEffects'
import { TreasureBoard } from '../components/TreasureBoard'
import { TopProgressHud } from '../components/TopProgressHud'
import { ToolBar } from '../components/ToolBar'
import { LevelCompleteScreen } from '../components/LevelCompleteScreen'
import { ObjectFoundCelebration, Confetti } from '../components/CelebrationEffects'
import { cn } from '@/lib/utils'
import type { TreasureDigGameProps } from '../types/game'
import { GAME_CONFIG } from '../game/config'
import { ThemeProvider } from '../game/ThemeProvider'
import { getThemeForLevel } from '../game/themes'
import { canBreakTile } from '../game/engine'

export function TreasureDigFeature(props?: TreasureDigGameProps) {
  const {
    callbacks,
    initialLevel = 1,
    customLevels,
    wrapperProps,
    layoutConfig,
    customHUD: CustomHUD,
    customToolbar: CustomToolbar,
  } = props || {}

  const {
    compactMode = false,
    showDefaultHUD = true,
    showDefaultToolbar = true,
    maxWidth = '100%',
    maxHeight = '100vh',
  } = layoutConfig || {}

  const {
    levelState,
    currentLevel,
    currentLevelConfig,
    breakTile,
    restartLevel,
    nextLevel,
    getLevelResult,
    bombEffect,
    chainRowEffect,
  } = useTreasureDigGame(customLevels, wrapperProps?.currentLevel || initialLevel)

  const theme = getThemeForLevel(currentLevel)
  const sounds = useSoundEffects()

  const [showLevelComplete, setShowLevelComplete] = useState(false)
  const [previousObjectsCollected, setPreviousObjectsCollected] = useState(0)
  const [showObjectFound, setShowObjectFound] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // ✅ CRITICAL: guard to stop infinite loop
  const hasTriggeredCompletion = useRef(false)

  const toolsRemaining = wrapperProps?.playerToolCount ?? levelState.toolsRemaining

  useEffect(() => {
    if (levelState.isComplete && !hasTriggeredCompletion.current) {
      hasTriggeredCompletion.current = true

      const timers: ReturnType<typeof setTimeout>[] = []

      sounds.playLevelCompleteSound()

      const result = getLevelResult()
      callbacks?.onFinishLevel?.(result)
      callbacks?.onRewardEarned?.({ type: 'coins', amount: result.score })

      // 🎉 Confetti starts slightly later (let win land)
timers.push(setTimeout(() => {
  setShowConfetti(true)
}, 400))

// 🎉 Confetti lasts longer (more satisfying)
timers.push(setTimeout(() => {
  setShowConfetti(false)
}, 1900))

// 🟢 Modal appears after confetti starts
timers.push(setTimeout(() => {
  setShowLevelComplete(true)
}, 1000))

// 🚀 Auto advance (give time to read score)
timers.push(setTimeout(() => {
  setShowLevelComplete(false)
  nextLevel()
  hasTriggeredCompletion.current = false
}, 3300))

      return () => timers.forEach(clearTimeout)
    }
  }, [levelState.isComplete])

  useEffect(() => {
    if (levelState.isGameOver) {
      sounds.playErrorSound()

      const timer = setTimeout(() => {
        setShowLevelComplete(true)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [levelState.isGameOver])

  useEffect(() => {
    if (levelState.objectsCollected > previousObjectsCollected) {
      sounds.playObjectFoundSound()
      sounds.playCompletionSound()

      setShowObjectFound(true)

      setTimeout(() => {
        setShowObjectFound(false)
      }, 600) // 🔥 shorter, snappier
    }

    setPreviousObjectsCollected(levelState.objectsCollected)
  }, [levelState.objectsCollected])

  useEffect(() => {
    if (chainRowEffect !== null) {
      sounds.playChainWhooshSound()
    }
  }, [chainRowEffect])

  const handleTileClick = (position: { row: number; col: number }) => {
    const tile = levelState.board.tiles[position.row]?.[position.col]

    if (!canBreakTile(tile, levelState.isComplete, levelState.isGameOver)) return

    sounds.playDigSound()
    breakTile(position)
    callbacks?.onSpendTool?.()

    setTimeout(() => {
      const updatedTile = levelState.board.tiles[position.row]?.[position.col]
      if (updatedTile?.objectId) {
        sounds.playSuccessSound()
      }
    }, GAME_CONFIG.ANIMATION.TILE_REVEAL_DELAY)
  }

  const handleRestartLevel = () => {
    setShowLevelComplete(false)
    restartLevel()
  }

  const levelResult = getLevelResult()
  const rewardCoins = levelResult.score

  const progressPercent =
    levelState.totalObjects > 0
      ? (levelState.objectsCollected / levelState.totalObjects) * 100
      : 0

  return (
    <ThemeProvider theme={theme}>
      <div
        className={cn(
          'flex flex-col h-dvh overflow-hidden',
          compactMode && 'h-full'
        )}
        style={{
          maxWidth,
          maxHeight,
          backgroundColor: theme.background,
        }}
      >
        <div className="flex-shrink-0">
          {showDefaultHUD && !CustomHUD && (
            <TopProgressHud
              levelNumber={currentLevel}
              levelName={currentLevelConfig.name}
              toolsRemaining={toolsRemaining}
              objectsCollected={levelState.objectsCollected}
              totalObjects={levelState.totalObjects}
              score={levelState.score}
              objects={levelState.board.objects}
              onExit={callbacks?.onExitFeature}
              compactMode={true}
            />
          )}

          {CustomHUD && (
            <CustomHUD
              levelNumber={currentLevel}
              levelName={currentLevelConfig.name}
              toolsRemaining={toolsRemaining}
              objectsCollected={levelState.objectsCollected}
              totalObjects={levelState.totalObjects}
              score={levelState.score}
              objects={levelState.board.objects}
              onExit={callbacks?.onExitFeature}
              compactMode={compactMode}
            />
          )}
        </div>

        <div className="flex-1 flex items-center justify-center px-1 min-h-0">
          <TreasureBoard
            board={levelState.board}
            onTileClick={handleTileClick}
            disabled={
              levelState.isComplete ||
              levelState.isGameOver ||
              toolsRemaining === 0
            }
            progressPercent={progressPercent}
            compactMode={true}
            specialEffects={bombEffect}
            chainRowEffect={chainRowEffect}
          />
        </div>

        <div className="flex-shrink-0">
          {showDefaultToolbar && !CustomToolbar && (
            <ToolBar
              toolsRemaining={toolsRemaining}
              onRestart={handleRestartLevel}
              compactMode={true}
            />
          )}

          {CustomToolbar && (
            <CustomToolbar
              toolsRemaining={toolsRemaining}
              onRestart={handleRestartLevel}
              compactMode={compactMode}
            />
          )}
        </div>

        <LevelCompleteScreen
          show={showLevelComplete}
          levelResult={levelResult}
          rewardCoins={rewardCoins}
          onNextLevel={() => {}} // no button needed
          onRestart={handleRestartLevel}
        />

        <Confetti show={showConfetti} particleCount={60} />
        <ObjectFoundCelebration show={showObjectFound} />
      </div>
    </ThemeProvider>
  )
}