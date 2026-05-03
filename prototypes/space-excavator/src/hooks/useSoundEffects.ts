import { useCallback } from 'react'

export function useSoundEffects() {
  const playDigSound = useCallback(() => {
    console.log('[SOUND] Dig sound placeholder')
  }, [])

  const playSuccessSound = useCallback(() => {
    console.log('[SOUND] Success sound placeholder')
  }, [])

  const playCompletionSound = useCallback(() => {
    console.log('[SOUND] Completion sound placeholder')
  }, [])

  const playObjectFoundSound = useCallback(() => {
    console.log('[SOUND] Object found sound placeholder')
  }, [])

  const playLevelCompleteSound = useCallback(() => {
    console.log('[SOUND] Level complete sound placeholder')
  }, [])

  const playErrorSound = useCallback(() => {
    console.log('[SOUND] Error sound placeholder')
  }, [])
  
  const playChainWhooshSound = useCallback(() => {
    console.log('[SOUND] Chain whoosh sound placeholder')
  }, [])

  return {
    playDigSound,
    playSuccessSound,
    playCompletionSound,
    playObjectFoundSound,
    playLevelCompleteSound,
    playErrorSound,
    playChainWhooshSound,
  }
}
