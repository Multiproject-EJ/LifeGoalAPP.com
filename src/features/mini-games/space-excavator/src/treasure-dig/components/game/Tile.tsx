import { motion } from 'framer-motion'
import type { Tile as TileType } from '../../types/game.types'
import { TILE_COLORS } from '../../data/constants'
import { cn } from '@/lib/utils'

interface TileProps {
  tile: TileType
  onClick: () => void
  disabled: boolean
}

export function Tile({ tile, onClick, disabled }: TileProps) {
  const isHidden = tile.status === 'hidden'
  const canClick = isHidden && !disabled

  return (
    <motion.button
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      className={cn(
        'aspect-square rounded-md shadow-md transition-all duration-200 relative overflow-hidden',
        TILE_COLORS[tile.status],
        canClick && 'hover:scale-105 active:scale-95 cursor-pointer',
        !canClick && 'cursor-not-allowed'
      )}
      initial={false}
      animate={{
        scale: tile.status === 'breaking' ? [1, 0.9, 1.05, 1] : 1,
        rotate: tile.status === 'breaking' ? [0, -2, 2, 0] : 0,
      }}
      transition={{ duration: 0.2 }}
    >
      {tile.status === 'revealed-object' && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-8 h-8 bg-accent rounded-full shadow-lg" />
        </motion.div>
      )}
      
      {tile.status === 'revealed-blocker' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-6 h-6 bg-destructive rounded" />
        </motion.div>
      )}
    </motion.button>
  )
}
