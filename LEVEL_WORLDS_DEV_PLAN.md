# LEVEL WORLDS DEV PLAN — Campaign Mode for HabitGame

Version: 1.0
Status: Phase 1 — Foundation (In Progress)
Parent System: HabitGame Daily Treats → Level Worlds Campaign

**Related Documentation:**
- [HABITGAME_CORE_GAMES_DEV_PLAN.md](./HABITGAME_CORE_GAMES_DEV_PLAN.md) — Master plan for the 5 core games system
- [HABITGAME_ACCESS_FLOW.md](./HABITGAME_ACCESS_FLOW.md) — User access patterns and navigation hierarchy
- [DEV_PLAN.md](./DEV_PLAN.md) — Master development plan

---

## HOW TO USE THIS DOCUMENT

This is the **master build plan** for the Level Worlds system — a discrete level-based campaign mode that wraps the existing Lucky Roll infinite-loop model.

**Rules:**
- No code is written until this plan is reviewed
- Each slice follows the AI Operating Contract (Scan → Plan → Implement → Verify → Document → Pause)
- One task = 30–90 minutes
- If unsure → STOP & ASK

---

## OVERVIEW

### Core Concept

**Level Worlds** replaces the infinite Lucky Roll loop with **discrete level boards (worlds)**, each a small themed island with 3–6 objectives to complete. Once all objectives on a board are done, the player earns a big completion reward and a game controller token animates from the completed board to the next one.

### Visual Reference

The reference image shows an isometric island world with a "START" sign, a winding path, and ~6 circled points of interest (cabins, glowing chests, crystal fountains, orbs, bridges). Each circled element represents one objective/task on the level board.

### Integration with Existing Systems

- **Lucky Roll** remains the dice-based board game accessed from Daily Treats Card 2
- **Level Worlds** is a NEW view accessible from Lucky Roll — the "campaign mode"
- Mini-games (Task Tower, Pomodoro Sprint, Vision Quest, Wheel of Wins) can be triggered from BOTH Lucky Roll tiles AND Level World nodes
- Hearts, dice, coins, game tokens — all the same currency system
- Completing Level World objectives earns currency that feeds back into Lucky Roll
- Daily Treats daily hearts collection (5❤️/day) fuels both systems

---

## ARCHITECTURE

```
src/
  features/
    gamification/
      level-worlds/                        # NEW feature directory
        LevelWorldsHub.tsx                 # Main entry: shows current board + progress
        components/
          WorldBoard.tsx                   # Renders the isometric world with nodes
          WorldNode.tsx                    # Single objective node (locked/active/completed)
          WorldPath.tsx                    # SVG path connecting nodes
          BoardCompleteOverlay.tsx         # Celebration when all nodes done
          BoardTransition.tsx              # Controller animation between boards
          NodeDetailSheet.tsx              # Bottom sheet showing node objective details
        hooks/
          useLevelWorlds.ts                # CRUD for world state, node completion
          useWorldProgress.ts              # Track which boards are done, current board
          useNodeObjectives.ts             # Map node types to real app data
        services/
          levelWorldsState.ts              # State persistence (localStorage + Supabase)
          levelWorldsGenerator.ts          # Procedural board generation
          levelWorldsRewards.ts            # Reward tables per board level
        types/
          levelWorlds.ts                   # TypeScript types
        LevelWorlds.css                    # Styles
        index.ts                           # Exports
```

---

## TYPES SYSTEM

### WorldTheme
```typescript
'forest' | 'ocean' | 'cosmic' | 'desert' | 'mountain' | 'village'
```

### NodeType
```typescript
'mini_game'      // Play Task Tower, Pomodoro, Vision Quest, Wheel of Wins
'habit'          // Complete habits
'goal'           // Make goal progress
'personality'    // Personality micro-test or reflection
'journal'        // Journal entry or check-in
'boss'           // Final node — harder/combined challenge
```

### NodeStatus
```typescript
'locked' | 'active' | 'completed'
```

### Core Interfaces

**WorldNode**: Represents a single objective node on the board
- `id`: string
- `index`: number (0-based position)
- `type`: NodeType
- `status`: NodeStatus
- `label`: string
- `description`: string
- `emoji`: string
- `position`: { x: number; y: number } (percentage-based)
- `objective`: NodeObjective (variant union)
- `nodeReward`: NodeReward
- `completedAt?`: string

**WorldBoard**: Represents a complete level board
- `id`: string
- `level`: number (1-based)
- `theme`: WorldTheme
- `title`: string (e.g., "Whispering Woods")
- `description`: string
- `nodes`: WorldNode[]
- `completionReward`: BoardCompletionReward
- `status`: 'locked' | 'active' | 'completed'
- `completedAt?`: string
- `createdAt`: string

**LevelWorldsState**: User's overall progress
- `userId`: string
- `currentBoardLevel`: number
- `boards`: WorldBoard[]
- `totalBoardsCompleted`: number
- `lastPlayedAt?`: string

---

## BOARD GENERATION RULES

### Progression Tiers

| Level Range | Nodes | Complexity | Node Types |
|-------------|-------|------------|------------|
| 1-3 (Tutorial) | 3 | Simple | 1 habit, 1 mini-game, 1 journal |
| 4-7 (Early) | 4 | Mixed | Introduces goal and personality nodes |
| 8-15 (Mid) | 5 | Harder | 3+ habits, longer pomodoros, specific goals |
| 16+ (Late) | 5-6 | Complex | Boss nodes, combined challenges |

### Theme Rotation
`forest → ocean → cosmic → desert → mountain → village → repeat`

### Procedural Generation
- Different node positions for each board (percentage-based layout)
- Different path layouts (winding, branching)
- Uses user's actual habits, goals, and personality data for relevant objectives
- Each board feels unique while maintaining consistent difficulty curve

---

## REWARD SCALING

### Per-Level Rewards

| Level Range | Board Reward | Per-Node Reward |
|-------------|-------------|-----------------|
| 1-3 | 3❤️ + 10🎲 + 50🪙 | 1❤️ + 3🎲 + 15🪙 |
| 4-7 | 5❤️ + 20🎲 + 100🪙 | 1❤️ + 5🎲 + 25🪙 |
| 8-15 | 8❤️ + 30🎲 + 200🪙 | 2❤️ + 7🎲 + 40🪙 |
| 16+ | 10❤️ + 50🎲 + 300🪙 + cosmetic | 2❤️ + 10🎲 + 50🪙 |

### Reward Philosophy
- Node completion gives immediate gratification
- Board completion gives significant milestone reward
- Cosmetics unlock at higher levels for long-term engagement
- All rewards feed back into the existing currency system

---

## UI/UX FLOW

### Entry Points
1. **From Lucky Roll Board**: "🗺️ Campaign" button opens Level Worlds
2. **Future**: Direct access from Daily Treats Card 2

### User Journey
1. User opens Level Worlds Hub → sees current board with themed island
2. Nodes displayed as interactive points (locked/active/completed states)
3. Next active node glows with attention cue
4. Tap active node → bottom sheet with objective details
5. Complete objective → node marked ✅, next node unlocks
6. Complete all nodes → Board Complete overlay + rewards + controller animation
7. Next board loads with new theme and objectives
8. "World Map" overview shows completed boards as thumbnails

### Visual Design
- **Nodes**: Positioned circles with emoji icons
- **Path**: SVG winding line connecting nodes sequentially
- **Locked nodes**: Grayed out with lock icon
- **Active node**: Glowing animation
- **Completed nodes**: Checkmark overlay
- **Board background**: Themed gradient or pattern (not images)
- **Color palette**: Warm wood/amber/gold (matching Lucky Roll aesthetic)

---

## STATE MANAGEMENT

### Persistence Strategy
- **Phase 1**: localStorage (same pattern as Lucky Roll)
- **Phase 2**: Supabase sync (scaffolded, not implemented)

### State Structure
```typescript
localStorage key: `levelWorlds_${userId}`
```

### State Operations
- `loadState(userId)`: Load from localStorage, initialize if empty
- `saveState(userId, state)`: Persist to localStorage
- `initializeFirstBoard(userId)`: Create level 1 board
- `completeNode(boardId, nodeId)`: Mark node complete, unlock next
- `completeBoard(boardId)`: Award completion reward, generate next board
- `getCurrentBoard(state)`: Get active board

---

## PHASE 1 — FOUNDATION (THIS PR)

### Deliverables

1. **Documentation**
   - ✅ LEVEL_WORLDS_DEV_PLAN.md
   - [ ] Update DEV_PLAN.md with reference link
   - [ ] Update HABITGAME_CORE_GAMES_DEV_PLAN.md Section I

2. **Type System**
   - [ ] types/levelWorlds.ts with all interfaces

3. **Services**
   - [ ] services/levelWorldsState.ts (localStorage persistence)
   - [ ] services/levelWorldsGenerator.ts (procedural board generation)
   - [ ] services/levelWorldsRewards.ts (reward tables and awarding)

4. **Hooks**
   - [ ] hooks/useLevelWorlds.ts (main state hook)
   - [ ] hooks/useWorldProgress.ts (progress tracking)
   - [ ] hooks/useNodeObjectives.ts (map objectives to real data)

5. **Components**
   - [ ] LevelWorldsHub.tsx (main view)
   - [ ] components/WorldBoard.tsx (themed world with nodes)
   - [ ] components/WorldNode.tsx (individual node)
   - [ ] components/WorldPath.tsx (SVG path)
   - [ ] components/BoardCompleteOverlay.tsx (celebration)
   - [ ] components/NodeDetailSheet.tsx (objective details)

6. **Styles**
   - [ ] LevelWorlds.css (mobile-first responsive)

7. **Integration**
   - [ ] Wire "🗺️ Campaign" button into LuckyRollBoard.tsx
   - [ ] Export all from index.ts

8. **Quality**
   - [ ] Code review
   - [ ] Security scan (CodeQL)
   - [ ] Manual testing

---

## TECHNICAL NOTES

### Node Positioning
- Nodes use percentage-based positioning (x: 0-100%, y: 0-100%)
- Responsive layout maintains relative positions
- Generator creates natural winding paths

### Sequential Unlocking
- Only one node is active at a time
- Completing node N unlocks node N+1
- Final node (boss) only accessible after all others

### Controller Animation
- Simple CSS animation (transform: translateX)
- Game controller emoji/icon moves from old board to new
- Duration: ~2 seconds

### Theme Implementation
- CSS custom properties for colors
- Gradient backgrounds
- No external images (SVG/CSS only)

### Mini-Game Integration
- Import existing mini-game components
- Launch with same props/session
- Return rewards to Level Worlds state on completion
- Mini-games remain standalone (can be played from Lucky Roll too)

### Real Data Integration
- Habit nodes: Check actual habit completion status
- Goal nodes: Read actual goal progress
- Journal nodes: Verify journal entry existence
- Personality nodes: Trigger existing personality flows

---

## FUTURE PHASES (Not in Phase 1)

### Phase 2 — Supabase Sync
- Sync state to Supabase `level_worlds` table
- Multi-device support
- Backup/restore

### Phase 3 — Advanced Features
- Custom board editor
- Branching paths (choose your path)
- Seasonal themes
- Multiplayer challenges
- Board leaderboards

### Phase 4 — Polish
- Particle effects
- Sound design
- Advanced animations
- Achievement system integration

---

## SUCCESS METRICS

### Phase 1 Completion Criteria
- [ ] User can open Level Worlds from Lucky Roll
- [ ] First board (Level 1) generates correctly with 3 nodes
- [ ] User can tap active node and see objective details
- [ ] Completing an objective unlocks the next node
- [ ] Completing all nodes triggers board completion
- [ ] Board completion awards correct rewards
- [ ] Level 2 board generates with new theme
- [ ] State persists across sessions
- [ ] All mini-games launch correctly from nodes
- [ ] Mobile UI is responsive and usable

### Quality Gates
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] No security vulnerabilities (CodeQL pass)
- [ ] Code review feedback addressed
- [ ] All exports properly configured

---

## DECISION REGISTER

| Date | Decision | Reason |
|------|----------|--------|
| 2026-02-14 | Level Worlds as separate feature from Lucky Roll | Keeps Lucky Roll focused, allows parallel play |
| 2026-02-14 | Sequential node unlocking | Maintains progression clarity, prevents confusion |
| 2026-02-14 | CSS/SVG for visuals, not images | Performance, responsiveness, maintainability |
| 2026-02-14 | localStorage first, Supabase later | Faster Phase 1 delivery, proven pattern |
| 2026-02-14 | Reuse existing mini-games | No duplication, consistent experience |
| 2026-02-14 | Same currency system | Unified economy, simpler mental model |
| 2026-02-14 | Theme rotation | Variety without complexity |
| 2026-02-14 | 3-6 nodes per board | Short enough for one session, long enough for satisfaction |

---

## CHANGE LOG

### 2026-02-14
- V1.0 plan created
- Phase 1 Foundation scope defined
- Architecture and types documented
- Next: Begin implementation

---

## APPENDIX — INTEGRATION CHECKLIST

Before release:
- [ ] Level Worlds accessible from Lucky Roll
- [ ] Mini-games return to correct location after play
- [ ] Currency awards sync with game rewards service
- [ ] Node objectives validate against real user data
- [ ] State persistence tested across sessions
- [ ] Mobile responsive layouts verified
- [ ] No conflicts with existing Lucky Roll functionality
- [ ] All TypeScript types properly exported
- [ ] CSS namespace prevents style conflicts
