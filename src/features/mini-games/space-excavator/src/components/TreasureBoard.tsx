import { useState, useEffect } from 'react'
import { TileCell } from './TileCell'
import type { Board as BoardType, Position } from '../types/game'
import { cn } from '@/lib/utils'
import { GAME_CONFIG } from '../game/config'
import { RowClearEffect, ColumnClearEffect, ChainRowClearEffect } from '../treasure-dig/effects/SpecialTileEffects'
import { useTheme } from '../game/ThemeProvider'
import { motion } from 'framer-motion'

interface TreasureBoardProps {
  board: BoardType
  onTileClick: (position: Position) => void
  disabled: boolean
  progressPercent?: number
  compactMode?: boolean
  specialEffects?: {
    type: 'row' | 'col'
    index: number
  } | null
  chainRowEffect?: number | null
}

function getBoardGap(gridSize: number, compactMode: boolean): string {
  if (compactMode) return 'gap-0.5'
  return gridSize >= GAME_CONFIG.UI.TILE_GAP_THRESHOLD ? 'gap-0.5' : 'gap-1'
}

function getBoardPadding(compactMode: boolean): string {
  return compactMode ? 'p-0' : 'p-1'
}

export function TreasureBoard({ board, onTileClick, disabled, progressPercent = 0, compactMode = false, specialEffects = null, chainRowEffect = null }: TreasureBoardProps) {
  const gridSize = board.size
  const gap = getBoardGap(gridSize, compactMode)
  const padding = getBoardPadding(compactMode)
  const theme = useTheme()
  
  const [showEffect, setShowEffect] = useState(false)
  const [screenShake, setScreenShake] = useState(false)
  
  useEffect(() => {
    if (chainRowEffect !== null) {
      setScreenShake(true)
      const timeout = setTimeout(() => setScreenShake(false), 300)
      return () => clearTimeout(timeout)
    }
  }, [chainRowEffect])
  
  if (!board.tiles || board.tiles.length !== gridSize) {
    console.error(`[BOARD] Board tiles length (${board.tiles?.length}) does not match board size (${gridSize})`)
    return null
  }
  
  const getAdjacentTreasureTiles = (rowIndex: number, colIndex: number) => {
    const tile = board.tiles[rowIndex][colIndex]
    
    if (tile.renderState !== 'revealedTreasure' || !tile.objectId) {
      return {}
    }
    
    const checkAdjacent = (r: number, c: number) => {
      const adjacentTile = board.tiles[r]?.[c]
      return adjacentTile?.renderState === 'revealedTreasure' && 
             adjacentTile?.objectId === tile.objectId
    }
    
    return {
      top: checkAdjacent(rowIndex - 1, colIndex),
      right: checkAdjacent(rowIndex, colIndex + 1),
      bottom: checkAdjacent(rowIndex + 1, colIndex),
      left: checkAdjacent(rowIndex, colIndex - 1),
    }
  }
  
  const isNeonTheme = theme.id === 'neon_transition' || theme.id === 'neon_peak'
  
  const boardDepthStyle: React.CSSProperties = {
    boxShadow: isNeonTheme
      ? `0 12px 40px -8px ${theme.accent}25, inset 0 0 60px -10px ${theme.accent}15`
      : `0 12px 40px -8px rgba(0, 0, 0, 0.15), inset 0 0 60px -10px rgba(0, 0, 0, 0.08)`,
  }
  
  const vignetteStyle: React.CSSProperties = {
    background: isNeonTheme
      ? `radial-gradient(ellipse at center, transparent 35%, ${theme.accent}08 100%)`
      : `radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.06) 100%)`,
  }
  
  return (
    <div className={cn('w-full h-full flex items-center justify-center relative', padding)}>
      <div className="relative w-full max-h-full flex items-center justify-center" 
        style={{
          maxWidth: 'min(100%, calc(100vh - 140px))',
        }}
      >
        <motion.div 
          className={cn(
            'grid w-full aspect-square relative rounded-xl',
            gap
          )}
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            ...boardDepthStyle,
          }}
          animate={{
            x: screenShake ? [0, -3, 3, -2, 2, 0] : 0,
            y: screenShake ? [0, -2, 2, -1, 1, 0] : 0,
          }}
          transition={{
            duration: 0.3,
            ease: "easeInOut"
          }}
        >
          {board.tiles.map((row, rowIndex) => {
            if (!row || row.length !== gridSize) {
              console.error(`[BOARD] Row ${rowIndex} length (${row?.length}) does not match board size (${gridSize})`)
              return null
            }
            
            return row.map((tile, colIndex) => {
              if (!tile) {
                console.error(`[BOARD] Tile at (${rowIndex}, ${colIndex}) is undefined`)
                return null
              }
              
              return (
                <TileCell
                  key={`${rowIndex}-${colIndex}`}
                  tile={tile}
                  onClick={() => onTileClick(tile.position)}
                  disabled={disabled}
                  progressPercent={progressPercent}
                  adjacentTreasureTiles={getAdjacentTreasureTiles(rowIndex, colIndex)}
                />
              )
            })
          })}
          
          <div 
            className="absolute inset-0 pointer-events-none rounded-xl"
            style={vignetteStyle}
          />
          
          {specialEffects?.type === 'row' && (
            <RowClearEffect 
              row={specialEffects.index} 
              boardSize={gridSize}
              onComplete={() => setShowEffect(false)}
            />
          )}
          
          {specialEffects?.type === 'col' && (
            <ColumnClearEffect 
              col={specialEffects.index} 
              boardSize={gridSize}
              onComplete={() => setShowEffect(false)}
            />
          )}
          
          {chainRowEffect !== null && (
            <ChainRowClearEffect 
              row={chainRowEffect} 
              boardSize={gridSize}
              onComplete={() => setShowEffect(false)}
            />
          )}
        </motion.div>
      </div>
    </div>
  )
}
