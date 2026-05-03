import { useState } from 'react'
import { TreasureDigFeature } from './treasure-dig'
import type { LevelResult, Reward, GameState } from './treasure-dig/types/game.types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export function IntegrationExample1_Standalone() {
  return (
    <div className="h-screen">
      <TreasureDigFeature />
    </div>
  )
}

export function IntegrationExample2_WithExit() {
  const handleExit = () => {
    console.log('User exited game')
  }

  return (
    <div className="h-screen">
      <TreasureDigFeature
        callbacks={{
          onExitFeature: handleExit
        }}
      />
    </div>
  )
}

export function IntegrationExample3_ParentControlledState() {
  const [userTools, setUserTools] = useState(15)
  const [userLevel, setUserLevel] = useState(1)
  const [userCoins, setUserCoins] = useState(0)

  const handleSpendTool = async (remaining: number) => {
    setUserTools(remaining)
    console.log(`Tool spent. ${remaining} remaining.`)
    
    await fetch('/api/user/resources', {
      method: 'PATCH',
      body: JSON.stringify({ hammers: remaining })
    })
  }

  const handleFinishLevel = async (levelId: number, success: boolean) => {
    console.log(`Level ${levelId} ${success ? 'completed' : 'failed'}`)
    
    if (success) {
      const newLevel = levelId + 1
      setUserLevel(newLevel)
      const coinReward = levelId * 100
      setUserCoins(prev => prev + coinReward)
      
      await fetch('/api/user/progress', {
        method: 'PATCH',
        body: JSON.stringify({ 
          treasureDigLevel: newLevel,
          coins: userCoins + coinReward 
        })
      })
    }
  }

  const handleRewardEarned = (reward: Reward) => {
    console.log('Reward earned:', reward)
    if (reward.type === 'coins' && reward.amount) {
      setUserCoins(prev => prev + reward.amount!)
    }
  }

  return (
    <div className="h-screen">
      <TreasureDigFeature
        wrapperProps={{
          playerToolCount: userTools,
          currentLevel: userLevel,
          rewardTheme: 'coins',
          islandTheme: 'tropical'
        }}
        callbacks={{
          onSpendTool: handleSpendTool,
          onFinishLevel: handleFinishLevel,
          onRewardEarned: handleRewardEarned,
          onExitFeature: () => console.log('Exit')
        }}
      />
    </div>
  )
}

export function IntegrationExample4_CompactMode() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Mini Games</h1>
      
      <Card className="h-[600px] overflow-hidden">
        <TreasureDigFeature
          layoutConfig={{
            compactMode: true,
            maxHeight: '600px'
          }}
          callbacks={{
            onExitFeature: () => console.log('Back to games list')
          }}
        />
      </Card>
    </div>
  )
}

export function IntegrationExample5_ModalDialog() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>
        Play Treasure Dig
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-full h-[90vh] p-0">
          <TreasureDigFeature
            layoutConfig={{
              compactMode: true,
              maxHeight: '90vh',
              maxWidth: '100%'
            }}
            callbacks={{
              onExitFeature: () => setIsOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function IntegrationExample6_CustomHUDAndToolbar() {
  const [tools, setTools] = useState(12)
  const [coins, setCoins] = useState(500)

  const CustomHUD = (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
      <div className="flex justify-between items-center max-w-4xl mx-auto">
        <div className="font-bold text-xl">My Game</div>
        <div className="flex gap-4">
          <div>💰 {coins}</div>
          <div>🔨 {tools}</div>
        </div>
      </div>
    </div>
  )

  const CustomToolbar = (
    <div className="bg-gray-900 p-4 text-white">
      <div className="flex justify-around max-w-4xl mx-auto">
        <button className="flex flex-col items-center">
          <span className="text-2xl">🏠</span>
          <span className="text-xs">Home</span>
        </button>
        <button className="flex flex-col items-center">
          <span className="text-2xl">🎮</span>
          <span className="text-xs">Games</span>
        </button>
        <button className="flex flex-col items-center">
          <span className="text-2xl">👤</span>
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen">
      <TreasureDigFeature
        wrapperProps={{
          playerToolCount: tools
        }}
        layoutConfig={{
          showDefaultHUD: false,
          showDefaultToolbar: false
        }}
        customHUD={CustomHUD}
        customToolbar={CustomToolbar}
        callbacks={{
          onSpendTool: (remaining) => setTools(remaining),
          onRewardEarned: (reward) => {
            if (reward.type === 'coins' && reward.amount) {
              setCoins(prev => prev + reward.amount!)
            }
          }
        }}
      />
    </div>
  )
}

export function IntegrationExample7_SupabaseBackend() {
  const [tools, setTools] = useState(10)
  const [level, setLevel] = useState(1)

  const handleSpendTool = async (remaining: number) => {
    setTools(remaining)
    
    const { error } = await (window as any).supabase
      .from('user_resources')
      .update({ hammer_count: remaining })
      .eq('user_id', 'current-user-id')
    
    if (error) {
      console.error('Failed to sync tool count:', error)
    }
  }

  const handleFinishLevel = async (levelId: number, success: boolean) => {
    if (success) {
      const newLevel = levelId + 1
      setLevel(newLevel)
      
      const { error } = await (window as any).supabase
        .from('user_progress')
        .upsert({
          user_id: 'current-user-id',
          treasure_dig_level: newLevel,
          last_played: new Date().toISOString()
        })
      
      if (error) {
        console.error('Failed to sync progress:', error)
      }
    }
  }

  const handleProgressSync = async (state: GameState) => {
    const { error } = await (window as any).supabase
      .from('game_state')
      .upsert({
        user_id: 'current-user-id',
        game: 'treasure_dig',
        state: JSON.stringify(state),
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Failed to sync game state:', error)
    }
  }

  return (
    <TreasureDigFeature
      wrapperProps={{
        playerToolCount: tools,
        currentLevel: level
      }}
      callbacks={{
        onSpendTool: handleSpendTool,
        onFinishLevel: handleFinishLevel,
        onProgressSync: handleProgressSync
      }}
    />
  )
}

export function IntegrationExample8_TabIntegration() {
  const [activeTab, setActiveTab] = useState('home')
  const [tools, setTools] = useState(15)

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="w-full">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="game">Treasure Dig</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="h-full">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-4">Home</h2>
              <Button onClick={() => setActiveTab('game')}>
                Play Treasure Dig
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="game" className="h-full overflow-hidden">
            <TreasureDigFeature
              wrapperProps={{
                playerToolCount: tools
              }}
              layoutConfig={{
                compactMode: true,
                showDefaultToolbar: false
              }}
              callbacks={{
                onSpendTool: setTools,
                onExitFeature: () => setActiveTab('home')
              }}
            />
          </TabsContent>

          <TabsContent value="profile" className="h-full">
            <div className="p-8">
              <h2 className="text-2xl font-bold">Profile</h2>
              <p>Tools: {tools}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export function IntegrationExample9_ResponsiveLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto h-screen">
        <TreasureDigFeature
          layoutConfig={{
            compactMode: true,
            maxWidth: '448px',
            maxHeight: '100vh'
          }}
        />
      </div>
    </div>
  )
}

export function IntegrationExample10_TestingWrapper() {
  const [tools, setTools] = useState(15)
  const [level, setLevel] = useState(1)
  const [eventLog, setEventLog] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setEventLog(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20))
  }

  const handleSpendTool = (remaining: number) => {
    setTools(remaining)
    addLog(`Tool spent. ${remaining} remaining.`)
  }

  const handleFinishLevel = (levelId: number, success: boolean) => {
    addLog(`Level ${levelId} ${success ? 'COMPLETED ✓' : 'FAILED ✗'}`)
    if (success) {
      setLevel(levelId + 1)
    }
  }

  const handleLevelComplete = (result: LevelResult) => {
    addLog(`Score: ${result.score}, Objects: ${result.objectsFound}/${result.totalObjects}`)
  }

  const handleRewardEarned = (reward: Reward) => {
    addLog(`Reward: ${reward.type} - ${reward.message}`)
  }

  return (
    <div className="grid grid-cols-2 gap-4 h-screen p-4">
      <div className="overflow-hidden rounded-lg border">
        <TreasureDigFeature
          wrapperProps={{
            playerToolCount: tools,
            currentLevel: level
          }}
          layoutConfig={{
            compactMode: true,
            maxHeight: '100%'
          }}
          callbacks={{
            onSpendTool: handleSpendTool,
            onFinishLevel: handleFinishLevel,
            onLevelComplete: handleLevelComplete,
            onRewardEarned: handleRewardEarned,
            onExitFeature: () => addLog('EXIT clicked')
          }}
        />
      </div>

      <Card className="p-4 flex flex-col">
        <h3 className="font-bold text-lg mb-4">Test Console</h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="font-medium">Tools:</span>
            <span className="font-bold text-primary">{tools}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="font-medium">Level:</span>
            <span className="font-bold text-accent">{level}</span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <Button 
            onClick={() => setTools(15)} 
            className="w-full"
            size="sm"
          >
            Reset Tools to 15
          </Button>
          <Button 
            onClick={() => setLevel(1)} 
            variant="outline"
            className="w-full"
            size="sm"
          >
            Reset to Level 1
          </Button>
          <Button 
            onClick={() => setEventLog([])} 
            variant="secondary"
            className="w-full"
            size="sm"
          >
            Clear Log
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <h4 className="font-semibold text-sm mb-2">Event Log</h4>
          <div className="h-full overflow-auto bg-black text-green-400 p-3 rounded font-mono text-xs space-y-1">
            {eventLog.length === 0 && (
              <div className="text-gray-500">No events yet...</div>
            )}
            {eventLog.map((entry, i) => (
              <div key={i}>{entry}</div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
