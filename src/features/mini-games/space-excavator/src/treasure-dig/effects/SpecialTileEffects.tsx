import { motion } from 'framer-motion'
import { Lightning, Eye, Gift, Sparkle } from '@phosphor-icons/react'

interface ChainRowClearEffectProps {
  row: number
  boardSize: number
  onComplete?: () => void
}

export function ChainRowClearEffect({ row, boardSize, onComplete }: ChainRowClearEffectProps) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 1.2 }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="absolute left-0 right-0 h-[calc(100%/var(--board-size))] bg-gradient-to-r from-amber-500/20 via-amber-400/70 to-amber-500/20"
        style={{
          top: `${(row / boardSize) * 100}%`,
          '--board-size': boardSize,
        } as React.CSSProperties}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ 
          scaleX: [0, 1.3, 1.1],
          opacity: [0, 1, 0]
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_25px_rgba(251,191,36,1)]"
        style={{ top: `${((row + 0.5) / boardSize) * 100}%` }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ 
          scaleX: [0, 1, 1],
          opacity: [0, 1, 0.7, 0]
        }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
      
      <motion.div
        className="absolute left-0 right-0 h-[1px] bg-white"
        style={{ top: `${((row + 0.5) / boardSize) * 100}%` }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ 
          scaleX: [0, 1],
          opacity: [0, 1, 0]
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      
      {[...Array(boardSize)].map((_, i) => {
        const delay = i * 0.04
        const xPos = ((i + 0.5) / boardSize) * 100
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${xPos}%`,
              top: `${((row + 0.5) / boardSize) * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <motion.div
              className="w-3 h-3"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.8, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: 0.5,
                delay,
                ease: "easeOut"
              }}
            >
              <Sparkle size={12} weight="fill" className="text-amber-300" />
            </motion.div>
          </motion.div>
        )
      })}
      
      {[...Array(15)].map((_, i) => {
        const delay = i * 0.03
        const xPos = (i / 14) * 100
        const yOffset = Math.random() * 40 - 20
        
        return (
          <motion.div
            key={`trail-${i}`}
            className="absolute w-1 h-1"
            style={{
              left: `${xPos}%`,
              top: `${((row + 0.5) / boardSize) * 100}%`,
            }}
            initial={{ scale: 0, y: 0, x: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 1.2, 0],
              y: yOffset,
              x: (Math.random() - 0.5) * 20,
              opacity: [1, 0.8, 0]
            }}
            transition={{ 
              duration: 0.7,
              delay,
              ease: "easeOut"
            }}
          >
            <div className="w-full h-full bg-amber-400 rounded-full" />
          </motion.div>
        )
      })}
    </motion.div>
  )
}

interface RowClearEffectProps {
  row: number
  boardSize: number
  onComplete?: () => void
}

export function RowClearEffect({ row, boardSize, onComplete }: RowClearEffectProps) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.8 }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="absolute left-0 right-0 h-[calc(100%/var(--board-size))] bg-gradient-to-r from-transparent via-red-400/60 to-transparent"
        style={{
          top: `${(row / boardSize) * 100}%`,
          '--board-size': boardSize,
        } as React.CSSProperties}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: [0, 1.2, 1] }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      
      <motion.div
        className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"
        style={{ top: `${(row / boardSize) * 100}%` }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ 
          scaleX: [0, 1.1, 1],
          opacity: [0, 1, 0]
        }}
        transition={{ duration: 0.5 }}
      />
      
      {[...Array(8)].map((_, i) => {
        const delay = i * 0.05
        const xPos = (i / 7) * 100
        
        return (
          <motion.div
            key={i}
            className="absolute w-2 h-2"
            style={{
              left: `${xPos}%`,
              top: `${(row / boardSize) * 100}%`,
            }}
            initial={{ scale: 0, y: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 1.5, 0],
              y: [0, -30, -50],
              opacity: [1, 1, 0]
            }}
            transition={{ 
              duration: 0.6,
              delay,
              ease: "easeOut"
            }}
          >
            <Lightning size={12} weight="fill" className="text-red-400" />
          </motion.div>
        )
      })}
    </motion.div>
  )
}

interface ColumnClearEffectProps {
  col: number
  boardSize: number
  onComplete?: () => void
}

export function ColumnClearEffect({ col, boardSize, onComplete }: ColumnClearEffectProps) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.8 }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="absolute top-0 bottom-0 w-[calc(100%/var(--board-size))] bg-gradient-to-b from-transparent via-red-400/60 to-transparent"
        style={{
          left: `${(col / boardSize) * 100}%`,
          '--board-size': boardSize,
        } as React.CSSProperties}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: [0, 1.2, 1] }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      
      <motion.div
        className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"
        style={{ left: `${(col / boardSize) * 100}%` }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ 
          scaleY: [0, 1.1, 1],
          opacity: [0, 1, 0]
        }}
        transition={{ duration: 0.5 }}
      />
      
      {[...Array(8)].map((_, i) => {
        const delay = i * 0.05
        const yPos = (i / 7) * 100
        
        return (
          <motion.div
            key={i}
            className="absolute w-2 h-2"
            style={{
              left: `${(col / boardSize) * 100}%`,
              top: `${yPos}%`,
            }}
            initial={{ scale: 0, x: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 1.5, 0],
              x: [0, 30, 50],
              opacity: [1, 1, 0]
            }}
            transition={{ 
              duration: 0.6,
              delay,
              ease: "easeOut"
            }}
          >
            <Lightning size={12} weight="fill" className="text-red-400" />
          </motion.div>
        )
      })}
    </motion.div>
  )
}

interface AreaBlastEffectProps {
  row: number
  col: number
  boardSize: number
  radius: number
  onComplete?: () => void
}

export function AreaBlastEffect({ row, col, boardSize, radius, onComplete }: AreaBlastEffectProps) {
  const centerX = ((col + 0.5) / boardSize) * 100
  const centerY = ((row + 0.5) / boardSize) * 100
  
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.8 }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="absolute rounded-full bg-gradient-radial from-orange-400/70 via-orange-500/40 to-transparent"
        style={{
          left: `${centerX}%`,
          top: `${centerY}%`,
          width: `${(radius * 2 / boardSize) * 100}%`,
          height: `${(radius * 2 / boardSize) * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 1.3, 1],
          opacity: [0, 0.8, 0]
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      
      <motion.div
        className="absolute rounded-full border-4 border-orange-500"
        style={{
          left: `${centerX}%`,
          top: `${centerY}%`,
          width: `${(radius * 2 / boardSize) * 100}%`,
          height: `${(radius * 2 / boardSize) * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 1.5, 2],
          opacity: [0, 1, 0]
        }}
        transition={{ duration: 0.6 }}
      />
      
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * 2 * Math.PI
        const distance = 40
        const xOffset = Math.cos(angle) * distance
        const yOffset = Math.sin(angle) * distance
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${centerX}%`,
              top: `${centerY}%`,
            }}
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 1.2, 0],
              x: xOffset,
              y: yOffset,
              opacity: [1, 1, 0]
            }}
            transition={{ 
              duration: 0.6,
              delay: i * 0.03,
              ease: "easeOut"
            }}
          >
            <div className="w-3 h-3 bg-orange-400 rounded-full shadow-lg" />
          </motion.div>
        )
      })}
    </motion.div>
  )
}

interface RevealEffectProps {
  onComplete?: () => void
}

export function RevealEffect({ onComplete }: RevealEffectProps) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.6 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * 2 * Math.PI
        const distance = 25
        const xOffset = Math.cos(angle) * distance
        const yOffset = Math.sin(angle) * distance
        
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2"
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 1, 0.8],
              x: xOffset,
              y: yOffset,
              opacity: [1, 1, 0]
            }}
            transition={{ 
              duration: 0.5,
              delay: i * 0.05,
              ease: "easeOut"
            }}
          >
            <Eye size={14} weight="fill" className="text-cyan-400" />
          </motion.div>
        )
      })}
      
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-cyan-400"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 2, 3],
          opacity: [0, 0.6, 0]
        }}
        transition={{ duration: 0.6 }}
      />
    </motion.div>
  )
}

interface BonusEffectProps {
  onComplete?: () => void
}

export function BonusEffect({ onComplete }: BonusEffectProps) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.8 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * 2 * Math.PI
        const distance = 30
        const xOffset = Math.cos(angle) * distance
        const yOffset = Math.sin(angle) * distance
        
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2"
            initial={{ scale: 0, x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ 
              scale: [0, 1.3, 0],
              x: xOffset,
              y: yOffset,
              opacity: [1, 1, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 0.7,
              delay: i * 0.04,
              ease: "easeOut"
            }}
          >
            <Gift size={16} weight="fill" className="text-green-400" />
          </motion.div>
        )
      })}
      
      <motion.div
        className="absolute inset-0 rounded-lg bg-green-400/20"
        initial={{ scale: 1, opacity: 0 }}
        animate={{ 
          scale: [1, 1.4, 1.6],
          opacity: [0, 0.6, 0]
        }}
        transition={{ duration: 0.7 }}
      />
      
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-green-400 font-bold text-lg"
        initial={{ scale: 0, y: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 1.5, 1],
          y: [0, -20, -30],
          opacity: [0, 1, 0]
        }}
        transition={{ duration: 0.8 }}
      >
        +3
      </motion.div>
    </motion.div>
  )
}

interface ObjectCompletionGlowProps {
  cells: ReadonlyArray<{ row: number; col: number }>
  boardSize: number
  color: string
  onComplete?: () => void
}

export function ObjectCompletionGlow({ cells, boardSize, color, onComplete }: ObjectCompletionGlowProps) {
  const getCellPosition = (row: number, col: number) => {
    const cellWidth = 100 / boardSize
    const cellHeight = 100 / boardSize
    return {
      left: `${col * cellWidth}%`,
      top: `${row * cellHeight}%`,
      width: `${cellWidth}%`,
      height: `${cellHeight}%`,
    }
  }

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 1.2 }}
      onAnimationComplete={onComplete}
    >
      {cells.map((cell, i) => {
        const pos = getCellPosition(cell.row, cell.col)
        
        return (
          <motion.div
            key={`${cell.row}-${cell.col}`}
            className="absolute"
            style={pos}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ 
              duration: 0.8,
              delay: i * 0.05,
              ease: "easeInOut"
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{
                backgroundColor: `${color}40`,
                boxShadow: `0 0 20px ${color}80, 0 0 40px ${color}40`,
              }}
              animate={{
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 0.6,
                delay: i * 0.05,
                ease: "easeInOut"
              }}
            />
            
            <motion.div
              className="absolute inset-0 rounded-lg border-2"
              style={{
                borderColor: color,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0.8, 1.2, 1.4]
              }}
              transition={{ 
                duration: 0.8,
                delay: i * 0.05
              }}
            />
          </motion.div>
        )
      })}
      
      <motion.div
        className="absolute inset-0 rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0, 0.3, 0]
        }}
        transition={{ duration: 1.2 }}
        style={{
          background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  )
}

