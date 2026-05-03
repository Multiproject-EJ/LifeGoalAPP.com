import { Tile } from './Tile'
import type { Board as BoardType, Position } from '../../types/game.types'
import { cn } from '@/lib/utils'

interface BoardProps {
  board: BoardType
  onTileClick: (position: Position) => void
  disabled: boolean
  compactMode?: boolean
}

export function Board({ board, onTileClick, disabled, compactMode = false }: BoardProps) {
  const gridSize = board.size
  const gap = gridSize >= 7 ? 'gap-1.5' : 'gap-2'
  const padding = compactMode ? 'p-2' : 'p-4'
  
  return (
    <div className={cn('w-full max-w-2xl mx-auto', padding)}>
      <div 
        className={cn(
          'grid w-full aspect-square',
          gap
        )}
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {board.tiles.map((row, rowIndex) =>
          row.map((tile, colIndex) => (
            <Tile
              key={`${rowIndex}-${colIndex}`}
              tile={tile}
              onClick={() => onTileClick(tile.position)}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  )
}
