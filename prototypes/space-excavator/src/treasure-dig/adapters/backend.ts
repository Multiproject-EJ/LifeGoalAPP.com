import type { GameState, LevelResult } from '../types/game.types'

export interface BackendAdapter {
  syncGameState(state: GameState): Promise<void>
  loadGameState(userId: string): Promise<GameState | null>
  submitLevelResult(result: LevelResult): Promise<void>
  awardReward(userId: string, amount: number, type: string): Promise<void>
}

export class MockBackendAdapter implements BackendAdapter {
  private mockDelay = 100

  private delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.mockDelay))
  }

  async syncGameState(state: GameState): Promise<void> {
    await this.delay()
    console.log('[MockAdapter] Syncing game state:', state)
  }

  async loadGameState(userId: string): Promise<GameState | null> {
    await this.delay()
    console.log('[MockAdapter] Loading game state for user:', userId)
    return null
  }

  async submitLevelResult(result: LevelResult): Promise<void> {
    await this.delay()
    console.log('[MockAdapter] Submitting level result:', result)
  }

  async awardReward(userId: string, amount: number, type: string): Promise<void> {
    await this.delay()
    console.log(`[MockAdapter] Awarding ${amount} ${type} to user:`, userId)
  }
}

export function createMockAdapter(): BackendAdapter {
  return new MockBackendAdapter()
}
