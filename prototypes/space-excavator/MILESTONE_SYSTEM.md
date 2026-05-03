# Milestone-Based Visual Evolution System

## Overview
The tile visual evolution system progressively enhances tile appearance as players progress through each level, creating a more dynamic and rewarding visual experience.

## How It Works

### 1. Milestone Stage Calculation
Progress is calculated based on objects collected during the level:
```
progressPercent = (objectsCollected / totalObjects) × 100
```

The system defines three milestone stages:
- **Early (0-30%)**: Soft, clean appearance
- **Mid (30-70%)**: Increased contrast and activity
- **Late (70-100%)**: Energized, premium feel

### 2. Visual Evolution Properties
Each milestone stage adjusts four visual properties:

#### Brightness
- **Early**: 1.0 (baseline)
- **Mid**: 1.05 (slightly brighter)
- **Late**: 1.1 (noticeably brighter)

#### Texture Intensity
- **Early**: 0.3 (subtle texture)
- **Mid**: 0.5 (moderate texture)
- **Late**: 0.7 (prominent texture)

#### Glow Strength
- **Early**: 0 (no glow)
- **Mid**: 0.15 (subtle inner glow)
- **Late**: 0.3 (noticeable inner glow)

#### Edge Highlight
- **Early**: 0.15 (minimal edge lighting)
- **Mid**: 0.25 (moderate edge highlights)
- **Late**: 0.4 (strong edge highlights)

### 3. Application to Tiles
Visual evolution applies ONLY to:
- Hidden tiles (`renderState === 'hidden'`)
- Damaged tiles (`renderState === 'damaged'`)

Revealed tiles maintain their standard appearance to preserve clarity.

### 4. Implementation Details

#### File: `/src/game/milestones.ts`
Defines milestone stages and visual configuration.

#### File: `/src/components/TileCell.tsx`
Applies milestone-based visual effects through:
- `getMilestoneVisualConfig()` - Gets the config for current progress
- `getTileBackgroundStyle()` - Applies brightness filter
- `getMilestoneOverlayStyle()` - Adds diagonal texture pattern
- `getMilestoneGlowStyle()` - Applies inner glow effect
- `getMilestoneEdgeHighlightStyle()` - Adds edge lighting gradient

#### File: `/src/components/TreasureBoard.tsx`
Receives and passes `progressPercent` to each tile.

#### File: `/src/screens/TreasureDigFeature.tsx`
Calculates progress percentage from game state.

## Design Philosophy

### Clarity First
- Only hidden/damaged tiles evolve visually
- Revealed tiles remain unchanged
- Cracked tiles maintain readable crack overlays
- Special tile types (blocker, bomb, etc.) keep their distinct appearance

### Progressive Enhancement
- Changes are subtle at early stages
- Evolution becomes more pronounced as progress increases
- Creates a sense of increasing momentum and excitement
- Rewards player progress with visual feedback

### Performance Optimized
- Uses CSS filters and gradients (GPU-accelerated)
- No additional DOM elements for basic effects
- Minimal JavaScript calculations
- Smooth transitions without affecting game performance

## Example Visual Progression

### Level Start (0% progress - Early stage)
- Tiles: Clean, soft appearance
- Brightness: Normal
- Texture: Barely visible
- Glow: None

### Mid-Level (50% progress - Mid stage)
- Tiles: More defined, increased contrast
- Brightness: 5% brighter
- Texture: Moderate diagonal pattern
- Glow: Subtle inner illumination

### Near Completion (85% progress - Late stage)
- Tiles: Energized, premium feel
- Brightness: 10% brighter
- Texture: Prominent pattern
- Glow: Noticeable inner light
- Edges: Strong highlights

## Future Enhancements
Potential additions (not currently implemented):
- Smooth transitions between milestone stages
- Per-level theme integration
- Particle effects at milestone thresholds
- Sound feedback when crossing milestone boundaries
