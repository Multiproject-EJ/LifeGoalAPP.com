# Island Run Board Tile Theme Brainstorm Questions

Status: Draft questionnaire for external brainstorming  
Date: 2026-06-03  
Scope: Visual/theme planning only — no gameplay-authority changes

## Purpose

Use this document to brainstorm a future Island Run board-tile theming system with another AI agent, designer, or product collaborator.

The goal is to make board tiles feel more unique per island while keeping every tile type easy to recognize, readable at small sizes, accessible beyond color alone, and aligned with the existing Island Run board aesthetic.

## Non-negotiable constraints

- This is a presentation/theming idea first; it should not change gameplay rewards, dice movement, stop progression, or runtime-state authority.
- Tile identity must remain recognizable across islands. A player should not need to relearn what a hazard, reward, landmark door, encounter, or traffic-light tile means.
- Do not rely on color alone. Use icon, pattern, border, glow, and motion cues as redundant recognition layers.
- Landmark/stops remain external structures. Landmark-door tiles can visually route to landmark affordances, but visuals must not imply that the token lands on landmark structures themselves.
- The design should work with variable board topology, even though production currently uses the 40-tile ring.
- The system should be safe to implement incrementally as visual tokens/CSS variables before considering any island-specific manifest overrides.

## Current working hypothesis

A strong first direction is a **10-theme repeating tile skin system**:

1. Each island maps to one reusable board tile theme.
2. Tile types keep stable semantic identity.
3. Theme palettes adjust materials, gradients, rims, glows, and subtle patterns.
4. Special/signature islands may later add manifest-level palette overrides.

The most important product decision is whether the board should feel:

- mostly consistent, with light island tinting;
- strongly island-specific, with each island heavily reskinned;
- or a hybrid, where semantic tile identity stays stable but visual material/color accents change per theme.

## Questions to answer before implementation

### 1. Player recognition and readability

1. Which tile types must be recognized instantly from peripheral vision?
2. Which tile types can be subtler or discovered through hover/tap/legend?
3. What is the minimum readable tile size on mobile after perspective scaling?
4. Should every tile show an icon all the time, or only special tiles?
5. Should tile numbers remain visible by default, debug-only, or hidden behind a setting?
6. Are there tile types that currently look too similar?
7. What should the player understand within 1 second of looking at the board?
8. What should the player learn only after tapping a tile guide?

### 2. Semantic identity per tile type

For each tile type, decide the permanent recognition cues.

| Tile type | Core meaning | Stable cues to preserve | Theme-adjustable cues |
| --- | --- | --- | --- |
| Currency | Essence/reward gain | Gold/reward feel, coin/essence icon | Gold hue, rim material, shine |
| Chest | Prize/reward bundle feel | Chest/gift silhouette | Material, trim, highlight color |
| Micro | Small action/reward-bar feed | Sparkle/magic icon | Magic color, sparkle density |
| Hazard | Danger/loss | Warning shape, red/orange/dark contrast | Hazard material: lava, thorn, poison, storm |
| Encounter | Rare/minigame/event-like landing | Lightning/active energy | Flame/electric/cosmic treatment |
| Landmark door | Landmark access/portal | Door/portal silhouette | Portal color, frame material |
| Boss door | Boss access when doors reroute | Crown/boss energy, premium danger | Gold/dark boss palette |
| Traffic light | Bonus charge/progress | Literal red/yellow/green lamps | Housing/rim style only |

Questions:

1. Is this table correct, or should any tile type have a different core meaning?
2. Are there any tile types where the current icon is misleading?
3. Should `currency` visually represent Essence specifically rather than generic money?
4. Should `micro` look like a mini-game, a reward-bar feed, or general magic?
5. Should hazard look scary, playful, or cautionary?
6. Should landmark doors look magical, architectural, or like signposts?

### 3. Color and palette strategy

1. Should each tile type keep a fixed color family across all islands?
2. If a color family can shift, what are the boundaries?
   - Example: hazard can shift from red to lava-orange to poison-magenta, but not calm blue.
3. Should every theme define full tile gradients, or should it define only a few palette variables that are mixed with semantic defaults?
4. How many colors should each tile gradient use: 2, 3, or 4?
5. Should borders and glows be theme-colored or semantic-colored?
6. Should special tiles have stronger saturation than reward tiles?
7. Should rare/seasonal islands use more dramatic palettes than normal islands?
8. What are the accessibility contrast requirements for mobile?
9. How do we avoid a board that looks too busy when all 40 tiles have unique colors?

### 4. Ten-theme cycle candidates

Use this table as a starting point. Replace, rename, or reorder themes as needed.

| # | Candidate theme | Mood | Primary palette | Notes |
| ---: | --- | --- | --- | --- |
| 1 | Tropical Lagoon | friendly, starter, sunny | aqua, sand, palm, gold | Good default for Island 1 |
| 2 | Sunset Harbor | warm, cozy, celebratory | coral, amber, rose, navy | Current sunset direction can fit here |
| 3 | Moon Tide | calm, magical, night | indigo, silver, violet | Current moon direction can fit here |
| 4 | Jungle Ruins | exploratory, ancient | emerald, moss, stone, gold | Good for landmark-door frame variation |
| 5 | Crystal Cavern | premium, shiny, rare | cyan, amethyst, white | Strong for chest/micro sparkle |
| 6 | Volcano Reef | high energy, risky | obsidian, lava, ember, brass | Hazard must remain readable but not overpower all tiles |
| 7 | Snow Pearl | clean, frosted, gentle | ice blue, pearl, soft gold | Needs special care for hazard contrast |
| 8 | Sakura Springs | soft, aspirational | pink, jade, cream, gold | Avoid making hazard too cute/low-contrast |
| 9 | Storm Coast | dramatic, active | navy, electric blue, brass | Good encounter/lightning treatment |
| 10 | Celestial Island | epic, cosmic | deep blue, gold, magenta | Good for late-cycle/high-prestige feel |

Questions:

1. Are 10 themes enough, too many, or too few?
2. Should the themes repeat every 10 islands exactly, or should rare/seasonal islands break the cycle?
3. Should Island 1 always use the safest/readiest palette?
4. Which themes feel most aligned with the app's current aesthetic?
5. Which themes are too noisy, juvenile, or off-brand?
6. Should theme names be user-facing or internal only?
7. Should special islands have unique named themes outside the 10-theme cycle?

### 5. Special tiles and attention hierarchy

1. Which tile should be most eye-catching when the board is idle?
2. Should the current token tile or upcoming tiles have stronger visual priority than special tiles?
3. Should traffic-light progress be visible from the board overview at all times?
4. Should landmark doors glow only when relevant, or always look special?
5. Should dormant/wrong landmark doors look less active than currently enterable doors?
6. Should boss-rerouted landmark doors get a very obvious boss-state visual change?
7. How should completed encounters appear: dimmed, checked, transformed, or removed visually?
8. Should hazards animate, or is a static warning shape better?
9. How much animation is acceptable before the board feels noisy?

### 6. Pattern, shape, and material cues

For each tile type, choose at least two non-color cues.

| Tile type | Pattern ideas | Border/material ideas | Motion ideas |
| --- | --- | --- | --- |
| Currency | coin rings, radial shine, essence swirl | gold rim, shell-gold rim | soft glint |
| Chest | horizontal latch band, box seams | wood/metal frame | tiny bounce/glow on reward-ready state |
| Micro | star dots, sparkle burst | soft magical rim | gentle sparkle pulse |
| Hazard | diagonal stripes, caution triangle | dark inner stroke, sharp rim | slow warning pulse only |
| Encounter | lightning split, ember trail | electric edge | rare flicker |
| Landmark door | arch/portal seam | stone/wood/crystal frame | portal shimmer |
| Boss door | crown mark, dark aura | premium gold/dark rim | controlled boss pulse |
| Traffic light | lamp pips | sign housing | lamp charge state |

Questions:

1. Which patterns feel sleek rather than noisy?
2. Should patterns be SVG, CSS gradients, or image assets?
3. Should each island theme change material style, such as shell, stone, crystal, wood, or metal?
4. Should materials be visible on all tiles or only on special tiles?
5. Should we reserve strong patterns only for hazard, landmark door, encounter, and traffic light?

### 7. User education: how players see which tiles are which

1. Do we need a permanent mini legend on the board?
2. Would a small `?` Tile Guide modal be enough?
3. Should tapping a tile explain it before/after a roll, or only in non-rolling state?
4. Should new players see a one-time overlay explaining tile types?
5. Should tooltips use game terms like `micro`, or user-facing terms like `Spark tile`?
6. What should each tile's user-facing name be?
7. Should the guide show current island-specific tile art examples?
8. How do we explain that doors open landmarks but do not complete landmarks automatically?

Candidate user-facing names:

| Internal type | Possible user-facing name |
| --- | --- |
| currency | Essence Tile |
| chest | Treasure Tile |
| micro | Spark Tile |
| hazard | Hazard Tile |
| encounter | Encounter Tile |
| landmark_door | Landmark Door |
| traffic_light | Traffic Light Bonus |

### 8. Implementation sequencing questions

1. Should we start with CSS variables while preserving current classes?
2. Should visual tokens live in the existing board theme service or a new tile theme service?
3. Should the theme resolver be purely `islandNumber % 10`, or content-driven from island metadata?
4. Should the island art manifest eventually allow overrides?
5. Should we first prototype one theme or all 10 token maps?
6. What tests would prove no gameplay behavior changed?
7. What screenshot set is needed for visual QA?
8. Which devices/viewports matter most: mobile portrait, desktop, tablet?
9. Should we A/B test visual density or just ship a polished default?

### 9. Open risks

1. The board may become too colorful/noisy if every tile type has strong saturation.
2. Theme palettes may reduce recognition if semantic tile colors shift too far.
3. Hazard and encounter tiles can compete for attention.
4. Door tiles may imply stop progression if they look too much like landmarks.
5. Icons may be too small on mobile after perspective scaling.
6. Accessibility may suffer if color is the primary cue.
7. Per-island overrides may create content-management overhead.
8. CSS-only patterns may look less premium than art-directed assets; asset-based patterns may slow iteration.

## Recommended answer format for external brainstorming

Ask the other AI/designer to answer in this structure:

```md
# Board Tile Theme Brainstorm Response

## 1. Recommended direction
- Pick one: light tinting / strong per-island reskin / hybrid semantic theming.
- Explain why.

## 2. Tile identity decisions
- Currency:
- Chest:
- Micro/Spark:
- Hazard:
- Encounter:
- Landmark door:
- Boss door:
- Traffic light:

## 3. Ten-theme cycle edits
- Themes to keep:
- Themes to rename:
- Themes to remove:
- Themes to add:

## 4. Color rules
- Semantic color rules:
- Accessibility rules:
- Saturation/noise rules:

## 5. Special tile treatment
- Landmark doors:
- Boss doors:
- Traffic light:
- Encounters:
- Hazards:

## 6. Player education
- Legend/tooltips/tutorial recommendation:
- User-facing tile names:

## 7. Implementation recommendation
- First slice:
- Second slice:
- What not to do yet:

## 8. Biggest concern
- The highest-risk part of this idea is:
```

## Suggested prompt to give another AI agent

```text
We are designing a visual tile-theme system for a mobile/desktop board game called Island Run. The board has tile types like Essence/Currency, Treasure Chest, Spark/Micro, Hazard, Encounter, Landmark Door, Boss Door, and Traffic Light Bonus. We want islands to feel unique or at least cycle through around 10 beautiful themes, but tile types must remain instantly recognizable, readable on small mobile tiles, accessible beyond color alone, and sleek rather than noisy.

Please brainstorm a tile visual identity system. Keep gameplay unchanged. Focus on color palette rules, semantic recognition, pattern/icon/border cues, special tile hierarchy, user education/legend design, and a 10-theme cycle. Use the answer format from the questionnaire.
```

## Decision checklist before building

- [ ] Decide whether the system is light tinting, strong reskinning, or hybrid semantic theming.
- [ ] Approve final user-facing tile names.
- [ ] Approve stable recognition cues per tile type.
- [ ] Approve the first 10 theme names and moods.
- [ ] Approve color boundaries for each semantic tile type.
- [ ] Decide whether landmark doors glow always or only when relevant.
- [ ] Decide whether the board needs a Tile Guide modal, one-time tutorial, or both.
- [ ] Decide whether island art manifests can override palettes in a later phase.
- [ ] Define screenshot QA coverage for mobile and desktop.
- [ ] Define a no-gameplay-change test plan for the first implementation PR.
