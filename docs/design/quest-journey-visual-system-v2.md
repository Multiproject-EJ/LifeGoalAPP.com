# Quest Journey Visual System V2 Plan

_Date: 2026-06-05_

## Purpose

This document defines a documentation-only visual implementation plan for upgrading the HabitGame Quest ecosystem into a premium **Quest Journey** experience. It is intended to be specific enough that a future PR can implement shared CSS tokens, reusable visual classes, and foundational components before redesigning individual screens.

This plan builds on:

- `docs/investigations/quest-system-audit.md`
- `docs/design/quest-experience-v2.md`

## Non-goals

This plan does **not** propose changes to runtime behavior, gameplay, persistence, routes, Supabase, telemetry, rewards, economy, or feature logic. It only defines the visual system, CSS/component foundation, asset strategy, phased rollout, and QA guardrails for future implementation PRs.

## Visual target

Quest Journey V2 should feel like a mature wellness/coaching app with a cozy magical quest layer:

- Calm premium main app.
- Cozy magical quest layer.
- Soft white / ice-blue glass surfaces.
- Deep navy typography.
- Gold compass/star accents.
- Blue/purple progress gradients.
- Rounded cards with soft shadows and subtle glow.
- Emotional hero cards before operational detail.
- One clear primary action per screen.
- Modern wellness/coaching app quality.
- Mature game quest log, not childish fantasy UI.

The visual system should make the Quest ecosystem feel curated and guided instead of assembled from utility panels.

---

## 1. Current visual problems

### 1.1 Too many equal cards

Many Quest-adjacent screens present several cards or panels at the same visual weight. This creates a “choose a tool” feeling instead of a guided journey. Users should see one emotional hero moment, one next best step, and then secondary tools.

Symptoms to avoid:

- Multiple cards with identical backgrounds, borders, and button emphasis.
- No clear primary recommendation.
- Data summaries competing with action prompts.
- Utility controls above the motivating context.

### 1.2 Too much plain white/grey

Current panels often rely on plain white, grey borders, and default utility spacing. This reads as administrative and does not communicate premium coaching, magic, or emotional momentum.

The future visual layer should introduce:

- Ice-blue / soft-white surface depth.
- Subtle gradients and glass treatment.
- Layered shadows and ambient glow.
- Deep navy copy instead of flat neutral grey.

### 1.3 Too much admin/tool language

Quest screens frequently label features as tools: check-ins, goals, habits, routines, score, settings, profile strength. Those labels are functional, but the first layer should be more emotional and interpreted.

Future copy hierarchy should move from:

```text
Open goals
Run check-in
Create routine
Profile strength
```

toward:

```text
Choose your next chapter
See what needs care
Start today's ritual
Deepen your journey map
```

Operational labels can remain in secondary locations and accessibility labels, but hero areas should use journey language.

### 1.4 Inconsistent modal/card treatment

Quest surfaces use a mix of panels, overlays, sheets, popovers, and modals. Some feel like mobile sheets, some feel like utility dialogs, and some are full-screen workspaces. The visual system needs one shared modal/sheet language.

Target consistency:

- Viewport-anchored backdrop.
- Centered or bottom-sheet layout depending on viewport.
- Scrollable internal content.
- Background scroll lock.
- Shared glass surface, radius, close button, and CTA placement.

### 1.5 Weak hierarchy

Several screens show important context, detailed data, and secondary actions without enough hierarchy. The result is cognitive load.

Future hierarchy should be:

1. Emotional title / current chapter.
2. Interpreted signal.
3. One primary action.
4. Supporting metrics.
5. Secondary tool cards.
6. History/details.

### 1.6 Weak premium/companion feel

AI Coach, Profile Strength, Life Wheel insights, and Starter Quest already contain companion-like ideas, but they are visually separated. The shared system should make guidance feel warm and present, not bolted on.

Visual cues for companion feel:

- Soft companion cards with subtle aura/glow.
- Source labels like “Coach noticed” or “Your Life Wheel suggests.”
- Gentle iconography, not warning-heavy alerts.
- Calm empty states that invite a next step.

### 1.7 Too many emoji placeholders

Emoji are useful during prototyping, but overuse can make a premium experience feel inconsistent or childish. Emoji should be replaced selectively with a coherent icon/illustration system.

Keep emoji only when:

- They are part of intentionally playful microcopy.
- They are temporary in developer/debug-only surfaces.
- They do not carry the primary visual identity of a Quest screen.

Replace emoji when:

- They appear in navigation icons for core Quest pillars.
- They anchor hero cards.
- They represent Life Wheel domains, archetypes, coach states, or progression levels.

---

## 2. Visual principles

### 2.1 Hero first

Every major Quest screen should open with an emotional hero area before operational detail.

Hero areas should include:

- A concise journey title.
- One interpreted insight.
- One primary CTA.
- A supporting visual motif: compass, star, glass orb, map line, character-card frame, or soft gradient.

### 2.2 One next best step

Each screen should expose one obvious primary action. Secondary actions should be visually available but quieter.

Primary action examples:

- MyQuestHub: “Start today’s quest step.”
- Starter Quest: “Begin this starter ritual.”
- Life Wheel: “Run your check-in.”
- Goals: “Choose your active quest line.”
- AI Coach: “Ask your companion.”
- Profile Strength: “Deepen this area.”

### 2.3 Tool cards are secondary

Tool cards should help users navigate deeper, not compete with the primary journey action. Tool cards should use lower emphasis, smaller headings, and less saturated visuals than hero/companion cards.

### 2.4 Pillars get distinct but compatible visual roles

The five Quest Journey pillars should share a base visual system while having recognizable accents.

| Pillar | Visual role | Accent direction | Motif |
| --- | --- | --- | --- |
| Identity | Personal character sheet | Lavender, moonlit violet | Trait cards, constellation, mirror |
| Direction | Compass/map | Gold, sky blue | Compass, path line, horizon |
| Execution | Calm momentum | Blue, mint, electric cyan | Ritual stack, check path, spark |
| Companion | Warm guidance | Soft violet, pearl, gold | Aura card, speech star, guide light |
| Progression | Evidence of growth | Blue-purple gradient, gold highlights | Rings, timeline, stars, level glow |

### 2.5 Data should feel interpreted, not dumped

Quest data should be translated into meaning before being displayed as numbers.

Use this hierarchy:

1. Interpretation: “Body & Energy needs care this week.”
2. Reason: “It is your lowest Life Wheel area at 4/10.”
3. Action: “Try one 5-minute morning ritual.”
4. Detail: history, score, supporting metrics.

### 2.6 Premium should be quiet

Avoid loud fantasy frames, saturated neon, excessive particles, and heavy illustration overload. The Quest layer should feel magical through restraint: soft glow, refined gradients, high-quality spacing, and coherent iconography.

---

## 3. Design tokens

The following proposed tokens should be introduced as CSS variables in a shared Quest visual system layer. Exact file placement can be decided during implementation, but the first implementation PR should prefer a shared stylesheet rather than screen-specific duplicated values.

### 3.1 Background tokens

```css
:root {
  --quest-bg-page: #eef7ff;
  --quest-bg-page-rgb: 238, 247, 255;
  --quest-bg-radial-top: rgba(180, 218, 255, 0.58);
  --quest-bg-radial-bottom: rgba(238, 231, 255, 0.48);
  --quest-bg-space: #07162f;
  --quest-bg-space-soft: #102443;
  --quest-bg-frost: rgba(248, 252, 255, 0.78);
  --quest-bg-frost-strong: rgba(255, 255, 255, 0.92);
  --quest-bg-frost-muted: rgba(231, 242, 255, 0.68);
}
```

Usage guidance:

- `--quest-bg-page` for Quest Journey page backgrounds.
- `--quest-bg-space` only when a game/space backdrop is active.
- Frost tokens for glass panels over both light and dark backgrounds.

### 3.2 Card surface tokens

```css
:root {
  --quest-surface-hero: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(229,244,255,0.86));
  --quest-surface-card: rgba(255, 255, 255, 0.82);
  --quest-surface-card-strong: rgba(255, 255, 255, 0.94);
  --quest-surface-card-subtle: rgba(239, 247, 255, 0.72);
  --quest-surface-companion: linear-gradient(135deg, rgba(245,240,255,0.94), rgba(230,243,255,0.9));
  --quest-surface-progress: linear-gradient(135deg, rgba(232,243,255,0.94), rgba(241,235,255,0.9));
  --quest-surface-dark-glass: rgba(10, 24, 48, 0.72);
}
```

### 3.3 Border tokens

```css
:root {
  --quest-border-subtle: rgba(42, 76, 124, 0.1);
  --quest-border-glass: rgba(255, 255, 255, 0.62);
  --quest-border-strong: rgba(28, 55, 96, 0.18);
  --quest-border-gold: rgba(218, 165, 64, 0.42);
  --quest-border-companion: rgba(143, 112, 255, 0.24);
}
```

### 3.4 Shadow tokens

```css
:root {
  --quest-shadow-xs: 0 4px 12px rgba(15, 35, 70, 0.08);
  --quest-shadow-sm: 0 10px 28px rgba(15, 35, 70, 0.1);
  --quest-shadow-md: 0 18px 48px rgba(15, 35, 70, 0.14);
  --quest-shadow-lg: 0 28px 80px rgba(8, 22, 48, 0.18);
  --quest-shadow-inner-glass: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}
```

### 3.5 Glow tokens

```css
:root {
  --quest-glow-gold: 0 0 28px rgba(246, 197, 92, 0.28);
  --quest-glow-blue: 0 0 34px rgba(80, 154, 255, 0.24);
  --quest-glow-violet: 0 0 34px rgba(151, 103, 255, 0.22);
  --quest-glow-success: 0 0 26px rgba(58, 199, 139, 0.22);
}
```

### 3.6 Typography color tokens

```css
:root {
  --quest-text-primary: #10213f;
  --quest-text-secondary: #31486a;
  --quest-text-muted: #647894;
  --quest-text-soft: #8294ad;
  --quest-text-inverse: #f6fbff;
  --quest-text-link: #245ee8;
  --quest-text-gold: #9b6a10;
}
```

### 3.7 Gold accent tokens

```css
:root {
  --quest-gold-50: #fff8e7;
  --quest-gold-100: #ffedbd;
  --quest-gold-300: #ffd36e;
  --quest-gold-500: #d99a22;
  --quest-gold-700: #8f5d0b;
  --quest-gradient-gold: linear-gradient(135deg, #ffe6a3, #d99a22);
}
```

### 3.8 Blue/purple progress accent tokens

```css
:root {
  --quest-blue-100: #dbeeff;
  --quest-blue-300: #91c9ff;
  --quest-blue-500: #3c82f6;
  --quest-violet-100: #efe7ff;
  --quest-violet-300: #b89cff;
  --quest-violet-500: #7c55f2;
  --quest-gradient-progress: linear-gradient(90deg, #4ea4ff, #7c55f2);
  --quest-gradient-progress-soft: linear-gradient(90deg, rgba(78,164,255,0.18), rgba(124,85,242,0.18));
}
```

### 3.9 State tokens

```css
:root {
  --quest-success-bg: rgba(227, 250, 239, 0.92);
  --quest-success-text: #13714b;
  --quest-success-border: rgba(38, 166, 107, 0.32);

  --quest-warning-bg: rgba(255, 247, 224, 0.94);
  --quest-warning-text: #8a5a00;
  --quest-warning-border: rgba(230, 168, 45, 0.35);

  --quest-error-bg: rgba(255, 235, 238, 0.94);
  --quest-error-text: #9b1c31;
  --quest-error-border: rgba(220, 64, 90, 0.32);

  --quest-info-bg: rgba(228, 242, 255, 0.94);
  --quest-info-text: #1d5ea8;
  --quest-info-border: rgba(74, 144, 226, 0.3);
}
```

### 3.10 Spacing tokens

```css
:root {
  --quest-space-1: 0.25rem;
  --quest-space-2: 0.5rem;
  --quest-space-3: 0.75rem;
  --quest-space-4: 1rem;
  --quest-space-5: 1.25rem;
  --quest-space-6: 1.5rem;
  --quest-space-8: 2rem;
  --quest-space-10: 2.5rem;
  --quest-space-12: 3rem;
  --quest-section-gap: clamp(1rem, 2vw, 1.75rem);
  --quest-page-padding: clamp(1rem, 3vw, 2rem);
}
```

### 3.11 Border radius tokens

```css
:root {
  --quest-radius-sm: 0.75rem;
  --quest-radius-md: 1rem;
  --quest-radius-lg: 1.35rem;
  --quest-radius-xl: 1.75rem;
  --quest-radius-2xl: 2.25rem;
  --quest-radius-pill: 999px;
}
```

### 3.12 Motion tokens

```css
:root {
  --quest-transition-fast: 140ms ease;
  --quest-transition-base: 220ms ease;
  --quest-transition-slow: 360ms ease;
  --quest-hover-lift: translateY(-2px);
}
```

Motion should respect reduced-motion preferences.

---

## 4. Component/class inventory

The first implementation PR should establish reusable visual building blocks. These can be implemented as React components, CSS utility classes, or a hybrid, but they should avoid feature-specific service calls or behavior.

### 4.1 `QuestJourneyShell`

**Purpose:** Shared page wrapper for Quest Journey surfaces.

**Visual responsibilities:**

- Page background gradient/radial atmosphere.
- Safe max-width and responsive padding.
- Optional dark/space contrast mode.
- Standard vertical section rhythm.

**Suggested class names:**

```text
quest-journey-shell
quest-journey-shell--compact
quest-journey-shell--space
quest-journey-shell__content
quest-journey-shell__section
```

### 4.2 `QuestHeroCard`

**Purpose:** Emotional first card for a Quest screen.

**Visual responsibilities:**

- Premium glass/gradient hero surface.
- Eyebrow, title, interpreted insight, primary action.
- Optional illustration/compass/star asset.
- Optional metric/progress slot.

**Suggested class names:**

```text
quest-hero-card
quest-hero-card--identity
quest-hero-card--direction
quest-hero-card--execution
quest-hero-card--companion
quest-hero-card--progression
quest-hero-card__eyebrow
quest-hero-card__title
quest-hero-card__summary
quest-hero-card__visual
quest-hero-card__actions
```

### 4.3 `QuestGlassCard`

**Purpose:** Reusable secondary content container.

**Visual responsibilities:**

- Frosted surface.
- Subtle border.
- Soft shadow.
- Optional hover lift for clickable cards.

**Suggested class names:**

```text
quest-glass-card
quest-glass-card--interactive
quest-glass-card--subtle
quest-glass-card--strong
quest-glass-card__title
quest-glass-card__body
quest-glass-card__footer
```

### 4.4 `QuestSectionHeader`

**Purpose:** Consistent section titles for groups below the hero.

**Visual responsibilities:**

- Eyebrow/label.
- Heading.
- One-sentence interpretation.
- Optional right-side secondary action.

**Suggested class names:**

```text
quest-section-header
quest-section-header__eyebrow
quest-section-header__title
quest-section-header__summary
quest-section-header__action
```

### 4.5 `QuestPrimaryAction`

**Purpose:** Main CTA for the current screen.

**Visual responsibilities:**

- Gold or blue-purple emphasis depending on context.
- Large hit target.
- Clear label.
- Optional leading icon.

**Suggested class names:**

```text
quest-primary-action
quest-primary-action--gold
quest-primary-action--progress
quest-primary-action--full
quest-primary-action__icon
quest-primary-action__label
```

### 4.6 `QuestSecondaryAction`

**Purpose:** Lower-emphasis action button/link.

**Visual responsibilities:**

- Ghost or glass button treatment.
- Compatible with hero and card surfaces.

**Suggested class names:**

```text
quest-secondary-action
quest-secondary-action--ghost
quest-secondary-action--glass
quest-secondary-action--quiet
```

### 4.7 `QuestToolCard`

**Purpose:** Secondary navigation card for tools and deeper paths.

**Visual responsibilities:**

- Smaller visual weight than hero.
- Icon/label/summary/status.
- Optional “recommended” badge.

**Suggested class names:**

```text
quest-tool-card
quest-tool-card--recommended
quest-tool-card--locked
quest-tool-card__icon
quest-tool-card__title
quest-tool-card__summary
quest-tool-card__status
```

### 4.8 `QuestMetricRing`

**Purpose:** Compact circular visual for balance, profile depth, adherence, or chapter progress.

**Visual responsibilities:**

- SVG or CSS conic gradient ring.
- Center label/value.
- Optional mini caption.

**Suggested class names:**

```text
quest-metric-ring
quest-metric-ring--gold
quest-metric-ring--progress
quest-metric-ring--success
quest-metric-ring__value
quest-metric-ring__label
```

### 4.9 `QuestProgressBar`

**Purpose:** Shared progress indicator for profile strength, Life Wheel trends, routine progress, or quest chapter progress.

**Visual responsibilities:**

- Soft track.
- Blue-purple fill.
- Optional gold marker.
- Accessible label/value.

**Suggested class names:**

```text
quest-progress-bar
quest-progress-bar__track
quest-progress-bar__fill
quest-progress-bar__marker
quest-progress-bar__label
```

### 4.10 `QuestCompanionCard`

**Purpose:** AI/coach-style insight card.

**Visual responsibilities:**

- Companion surface gradient.
- Source label.
- Short insight.
- One recommended action.
- Data-source transparency note.

**Suggested class names:**

```text
quest-companion-card
quest-companion-card__source
quest-companion-card__title
quest-companion-card__insight
quest-companion-card__reason
quest-companion-card__action
```

### 4.11 `QuestLifeAreaChip`

**Purpose:** Shared Life Wheel domain chip.

**Visual responsibilities:**

- Domain label.
- Optional domain icon.
- Selected/active/needs-care states.
- Compatible with filters and summaries.

**Suggested class names:**

```text
quest-life-area-chip
quest-life-area-chip--active
quest-life-area-chip--needs-care
quest-life-area-chip--strong
quest-life-area-chip__icon
quest-life-area-chip__label
```

### 4.12 `QuestTraitCard`

**Purpose:** Shared identity/archetype card treatment.

**Visual responsibilities:**

- Card-frame styling for archetypes/traits.
- Role badge: dominant, support, growth edge, shadow.
- Soft illustration/icon slot.

**Suggested class names:**

```text
quest-trait-card
quest-trait-card--dominant
quest-trait-card--support
quest-trait-card--growth-edge
quest-trait-card__role
quest-trait-card__icon
quest-trait-card__title
quest-trait-card__summary
```

### 4.13 `QuestModalSheet`

**Purpose:** Shared modal/sheet shell for Quest dialogs and mobile overlays.

**Visual responsibilities:**

- Viewport-fixed backdrop.
- Centered desktop modal or mobile bottom sheet.
- Internal scroll area.
- Background scroll lock.
- Safe-area padding.
- Shared close affordance and action footer.

**Suggested class names:**

```text
quest-modal-sheet
quest-modal-sheet__backdrop
quest-modal-sheet__panel
quest-modal-sheet__header
quest-modal-sheet__body
quest-modal-sheet__footer
quest-modal-sheet__close
```

---

## 5. Screen-by-screen redesign mapping

Each mapping below is visual-only. Functionality, data loading, persistence, navigation handlers, gameplay, rewards, and service calls should remain unchanged during visual implementation phases.

### 5.1 `MyQuestHub`

**Current purpose:**

- Summarizes Life Wheel snapshot, current focus, active goal, supporting habits, and next actions.

**Visual problem:**

- Feels like a stack of equal utility cards.
- The current focus and next action are not emotionally dominant.
- Starter Quest, Check-in, and Goals compete as peer buttons.

**Target visual role:**

- Primary Quest Journey Home preview.
- Should feel like a guided chapter card with one next best step.

**Components/classes to use:**

- `QuestJourneyShell`
- `QuestHeroCard--direction`
- `QuestPrimaryAction--gold`
- `QuestCompanionCard`
- `QuestMetricRing`
- `QuestToolCard`
- `QuestLifeAreaChip`

**Functionally unchanged:**

- Keep existing fetches for check-ins, goals, and habits.
- Keep existing derived focus logic until a future product model is defined.
- Keep existing navigation callbacks to Starter Quest, Check-ins, and Goals.
- Do not create a new Quest data store.

### 5.2 Quest menu

**Current purpose:**

- Mobile/menu entry point to Quest-related screens, Profile Strength, Ikigai paths, AI Coach, and game surfaces.

**Visual problem:**

- Menu items can feel like a dense tool list.
- Emoji/icon treatments vary.
- Quest, game, and profile concepts visually compete.

**Target visual role:**

- Compact Quest Journey map.
- Should show the five pillars as primary destinations, with game/reward surfaces clearly secondary or contextual.

**Components/classes to use:**

- `QuestModalSheet`
- `QuestHeroCard--direction` in compact mode
- `QuestToolCard`
- `QuestMetricRing` for profile depth/progress
- `QuestSecondaryAction`

**Functionally unchanged:**

- Keep current menu routes and handlers.
- Do not remove existing navigation until the replacement is validated.
- Do not change game overlay entry logic.

### 5.3 Starter Quest

**Current purpose:**

- Lets the user pick a Life Wheel area and add one starter habit from a static catalog.

**Visual problem:**

- Reads like a habit picker rather than a beginning journey ritual.
- Catalog cards can feel operational.
- Emoji are the primary visual identity for many starter items.

**Target visual role:**

- Cozy “begin your first ritual” sheet.
- Emphasize why the tiny action matters and the identity promise behind it.

**Components/classes to use:**

- `QuestModalSheet`
- `QuestHeroCard--execution`
- `QuestLifeAreaChip`
- `QuestGlassCard`
- `QuestPrimaryAction--gold`
- `QuestSecondaryAction`

**Functionally unchanged:**

- Keep existing static starter catalog.
- Keep `quickAddDailyHabit` behavior.
- Keep existing close/onCreated callbacks.
- Do not add onboarding persistence or new journey state in this phase.

### 5.4 Life Wheel / Check-ins

**Current purpose:**

- Provides full check-in, area check-in, annual review, radar chart, history, and trend insights.

**Visual problem:**

- Diagnostic data and controls can appear before interpretation.
- Check-in mode chooser can feel like utility cards.
- Radar/history/detail sections may compete visually.

**Target visual role:**

- Direction compass and life-area diagnostic.
- Should first explain what the wheel suggests, then offer the check-in action.

**Components/classes to use:**

- `QuestJourneyShell`
- `QuestHeroCard--direction`
- `QuestMetricRing`
- `QuestProgressBar`
- `QuestLifeAreaChip`
- `QuestToolCard`
- `QuestCompanionCard` for trend interpretation

**Functionally unchanged:**

- Keep check-in table writes through existing services.
- Keep full/area/annual modes.
- Keep XP/challenge behavior unchanged.
- Do not persist new note types until a separate data-model decision exists.

### 5.5 Goals

**Current purpose:**

- Create and manage goals, goal categories, steps/substeps, status, health, reflections, and AI-assisted planning.

**Visual problem:**

- Goal management can feel like an admin workspace.
- Goal health, AI help, and steps may be visually fragmented.
- Goals are not consistently framed as Quest Lines.

**Target visual role:**

- Direction planning and Quest Line workspace.
- Should make the active goal feel like a meaningful chapter rather than a list item.

**Components/classes to use:**

- `QuestJourneyShell`
- `QuestHeroCard--direction`
- `QuestGlassCard`
- `QuestProgressBar`
- `QuestCompanionCard`
- `QuestToolCard`
- `QuestPrimaryAction`

**Functionally unchanged:**

- Keep existing goals, steps, substeps, alerts, reflections, and health services.
- Do not rename schema fields or create new goal models.
- Do not change AI goal coach behavior.

### 5.6 Habits

**Current purpose:**

- Create, manage, and track habits with schedules, streaks, adherence, lifecycle, environment design, suggestions, and goal/domain links.

**Visual problem:**

- Rich behavior-design features are buried in operational cards.
- Habit lists can become visually dense.
- Completion controls can compete with coaching insights.

**Target visual role:**

- Execution ritual layer.
- Should show habits as small proof-of-identity actions tied to the active Quest Line.

**Components/classes to use:**

- `QuestJourneyShell`
- `QuestHeroCard--execution`
- `QuestGlassCard`
- `QuestProgressBar`
- `QuestCompanionCard`
- `QuestLifeAreaChip`
- `QuestPrimaryAction`

**Functionally unchanged:**

- Do not duplicate habit tracking or schedule logic.
- Keep existing habit services and lifecycle handlers.
- Keep current rewards, XP, streak, and challenge behavior.
- Do not create a second habit system.

### 5.7 Routines

**Current purpose:**

- Create routine flows, attach ordered habit steps, configure step requirements/fallback/display modes, and return to Today.

**Visual problem:**

- Routines read as configuration forms rather than ritual flows.
- Ordered steps could feel more like a premium ritual stack.

**Target visual role:**

- Execution choreography.
- Should present routines as named rituals that help the user enter a state.

**Components/classes to use:**

- `QuestJourneyShell`
- `QuestHeroCard--execution`
- `QuestGlassCard`
- `QuestProgressBar`
- `QuestToolCard`
- `QuestPrimaryAction`

**Functionally unchanged:**

- Keep existing routine, routine step, and routine log services.
- Do not alter schedule semantics.
- Do not change linked habit behavior.

### 5.8 Ikigai

**Current purpose:**

- Intended identity/direction bridge for purpose, values, and North Star-style reflection.

**Visual problem:**

- The concept is emotionally powerful but appears less visually/systemically integrated than goals, check-ins, and journal.
- It needs a premium canvas treatment rather than another modal/tool panel.

**Target visual role:**

- North Star canvas inside Identity/Direction.
- Should feel calm, personal, and reflective.

**Components/classes to use:**

- `QuestModalSheet` or `QuestJourneyShell`, depending on route/surface.
- `QuestHeroCard--identity`
- `QuestTraitCard`
- `QuestGlassCard`
- `QuestCompanionCard`
- `QuestPrimaryAction--gold`

**Functionally unchanged:**

- Do not add a new Ikigai persistence model in the visual-system phase.
- Keep existing modal/menu behavior.
- Use existing available data and copy only.

### 5.9 AI Coach

**Current purpose:**

- Modal chat companion with starter topics, data-access controls, and proactive interventions.

**Visual problem:**

- Can feel like a separate chatbot rather than the companion for the whole journey.
- Topic cards/interventions may not share visual language with Quest Home.

**Target visual role:**

- Companion layer.
- Should feel warm, trusted, contextual, and premium.

**Components/classes to use:**

- `QuestModalSheet`
- `QuestHeroCard--companion` or compact companion header
- `QuestCompanionCard`
- `QuestToolCard` for starter topics
- `QuestSecondaryAction` for data/trust controls
- `QuestPrimaryAction` for send/ask action where appropriate

**Functionally unchanged:**

- Respect existing AI data access settings.
- Keep journal privacy behavior.
- Keep existing edge-function and simulated/demo behavior.
- Do not change telemetry or AI routing.

### 5.10 Profile Strength

**Current purpose:**

- Aggregates profile completeness/personalization signals across goals, habits, journal, vision board, Life Wheel, and identity.

**Visual problem:**

- “Profile strength” can feel administrative.
- The score should feel like journey depth / map clarity rather than a compliance checklist.

**Target visual role:**

- Progression and personalization depth.
- Should show how the app is becoming more tailored to the user.

**Components/classes to use:**

- `QuestModalSheet`
- `QuestHeroCard--progression`
- `QuestMetricRing`
- `QuestProgressBar`
- `QuestToolCard`
- `QuestPrimaryAction`

**Functionally unchanged:**

- Keep existing scoring services and XP events.
- Keep existing next-task routing.
- Do not duplicate profile-strength calculations.

---

## 6. Image/icon asset strategy

### 6.1 Asset roles

The Quest Journey visual system should use two asset sizes/classes:

1. **Large hero/illustration assets**
   - Used sparingly in hero cards, onboarding-style panels, empty states, and premium journey map moments.
   - Should create atmosphere, not replace content.
2. **Small transparent PNG/SVG icons**
   - Used for navigation, Life Wheel domains, pillar labels, tool cards, and compact status chips.
   - Should replace emoji placeholders in core Quest surfaces.

### 6.2 Large hero/illustration assets

Recommended generated/curated hero assets:

- Quest compass over ice-blue glass.
- Soft magical map path with gold star markers.
- Cozy companion light/orb.
- North Star / Ikigai horizon.
- Ritual stack / morning light illustration.
- Progress constellation / journey timeline.

Usage rules:

- Use no more than one large illustration per hero area.
- Prefer CSS gradients and small icon overlays before heavy image files.
- Avoid full-bleed decorative images on small mobile screens unless they are optimized and non-blocking.
- Large assets should support the emotional role of the screen, not introduce new mechanics or lore.

### 6.3 Small transparent icons

Recommended icon replacements:

| Current placeholder type | Replacement direction |
| --- | --- |
| Quest menu emoji | Pillar icons: compass, mirror, ritual spark, companion star, progress ring. |
| Starter Quest emoji | Life-area or behavior-specific transparent PNG/SVG icons. |
| Life Wheel category emoji/icons | Cohesive Life Area icon set. |
| AI Coach topic emoji | Companion topic icons in one line style. |
| Profile Strength icons | Progression/ring/map-clarity icons. |
| Trait/archetype emoji | Card-suit/archetype icon set. |

### 6.4 Avoiding giant heavy assets

Rules:

- Prefer SVG for simple icons and line art.
- Prefer WebP/AVIF for large illustrations if browser support and build pipeline allow.
- Keep transparent PNG icons small, ideally under 64–128px display size and appropriately compressed.
- Avoid shipping uncompressed multi-megabyte hero images.
- Use `srcset`/responsive sizing only if an implementation PR introduces image-heavy hero layouts.
- Do not use large raster assets as CSS backgrounds for every card.

### 6.5 Suggested naming convention

Use existing asset folders where possible. If a Quest-specific folder is needed, use:

```text
src/assets/quest-journey/
├─ hero/
│  ├─ quest-hero-compass-glass.webp
│  ├─ quest-hero-north-star.webp
│  ├─ quest-hero-companion-orb.webp
│  └─ quest-hero-ritual-stack.webp
├─ icons/
│  ├─ quest-icon-identity.svg
│  ├─ quest-icon-direction.svg
│  ├─ quest-icon-execution.svg
│  ├─ quest-icon-companion.svg
│  ├─ quest-icon-progression.svg
│  └─ life-area-body-energy.svg
└─ manifest.ts
```

Naming rules:

- Prefix Quest Journey assets with `quest-`.
- Prefix Life Wheel domain icons with `life-area-`.
- Use lowercase kebab-case.
- Include role in name: `hero`, `icon`, `badge`, `empty-state`.
- Keep generated source prompts or provenance notes in a nearby README if required by the asset workflow.

### 6.6 Manifest/asset pattern rule

No visual should be hardcoded if an existing manifest/asset pattern is available.

Future implementation should:

- Check existing asset manifest patterns before importing ad hoc images.
- Prefer a Quest Journey asset manifest for screen components.
- Keep component code referencing semantic asset keys where possible.
- Avoid hardcoded remote URLs in Quest UI.
- Avoid scattering asset imports across many feature files if a shared map can provide them.

---

## 7. Implementation phases

Each phase should be small, reversible, and screenshot-reviewable. No phase should change gameplay, persistence, reward/economy logic, telemetry, Supabase schema, or feature behavior.

### Phase 0: Prepare tokens/classes only

Goal: create the shared visual foundation without touching individual feature screens.

Scope:

- Add shared Quest CSS tokens.
- Add base classes for shell, hero card, glass card, actions, progress, chips, companion card, and modal sheet.
- Add story/demo-only examples if the repo already has a safe pattern for visual previews.
- Do not wire into production screens unless needed to verify compilation.

Acceptance criteria:

- No user-facing screen changes except possibly hidden/dev-only preview if already supported.
- CSS variables are documented and easy to find.
- Classes are reusable and not feature-specific.

### Phase 1: Redesign `MyQuestHub` only

Goal: prove the visual language on the smallest central Quest surface.

Scope:

- Wrap My Quest in `QuestJourneyShell`.
- Add `QuestHeroCard` and one primary action.
- Recast existing cards as secondary `QuestToolCard` / `QuestGlassCard` blocks.
- Preserve existing data and navigation behavior.

Acceptance criteria:

- One primary CTA visible.
- Latest check-in/focus/goal/habits still render from existing logic.
- iPhone screenshot shows no footer overlap or cropped content.

### Phase 2: Redesign Quest menu and Starter Quest

Goal: make Quest entry and beginner path feel coherent.

Scope:

- Apply `QuestModalSheet` to Quest menu/Starter Quest surfaces where appropriate.
- Replace core emoji placeholders with small icons where assets exist.
- Keep Starter Quest catalog and `quickAddDailyHabit` unchanged.

Acceptance criteria:

- Menu still opens every existing destination.
- Starter Quest still creates the same habit payload.
- Mobile sheet scrolls correctly with safe areas.

### Phase 3: Redesign Life Wheel / Check-ins and Goals

Goal: improve Direction surfaces.

Scope:

- Apply hero-first structure to Life Wheel and Goals.
- Use `QuestLifeAreaChip`, `QuestMetricRing`, and `QuestProgressBar`.
- Keep check-in save/update behavior and goal services unchanged.

Acceptance criteria:

- Full/area/annual check-in modes remain available.
- Goal create/edit/step behavior remains unchanged.
- Data feels interpreted before detailed controls.

### Phase 4: Redesign Coach, Ikigai, Profile Strength

Goal: align Companion, Identity, and Progression surfaces.

Scope:

- Apply `QuestCompanionCard` and `QuestModalSheet` to AI Coach-related surfaces.
- Give Ikigai a premium Identity/Direction canvas treatment.
- Reframe Profile Strength visually as Journey Depth while preserving calculations.

Acceptance criteria:

- AI data access settings remain intact.
- Profile Strength next-task routing remains intact.
- Ikigai/menu interactions remain intact.

### Phase 5: Polish and remove inconsistent legacy styling

Goal: reduce visual drift after core surfaces are migrated.

Scope:

- Remove redundant one-off Quest card styles where shared classes replace them.
- Normalize modal/card spacing and radius.
- Replace remaining core Quest emoji placeholders with approved icons.
- Optimize heavy assets and remove unused visuals.

Acceptance criteria:

- No accidental behavior changes.
- Visual snapshots across target screens are consistent.
- Bundle/image weight is reviewed if new assets were added.

---

## 8. Screenshot QA checklist

Every implementation PR that changes Quest visuals should include screenshots or explicit notes for the following cases.

### Required viewport checks

- iPhone-sized viewport, e.g. 390px × 844px.
- PWA standalone safe-area behavior.
- Desktop/tablet viewport when the touched screen has a desktop layout.

### Layout and interaction checks

- Bottom footer does not overlap primary content or CTA.
- Modal sheet scroll behavior works on short and long content.
- Background scroll is locked while a modal is open.
- No cropped content in hero cards, sheets, or bottom areas.
- No accidental horizontal overflow.
- One primary CTA is visible without hunting.
- Secondary tool cards do not visually overpower the hero.

### Visual contrast checks

- Dark/space background contrast is readable.
- Soft white/ice-blue glass surfaces remain legible.
- Deep navy typography is readable on glass/gradient backgrounds.
- Gold accents do not reduce contrast for CTA labels.
- Warning/error/success states remain accessible and recognizable.

### Typography checks

- Hero card readable on mobile.
- No text too small in chips, badges, rings, or nav labels.
- Long labels wrap gracefully without breaking card layout.
- Button labels remain clear and action-oriented.

### Asset checks

- No giant uncompressed assets.
- Raster images are optimized and appropriately sized.
- Icons are not blurry at displayed size.
- Decorative assets do not block content or CTA access.
- No hardcoded asset URLs when a manifest/pattern is available.

### Regression checks

- Existing navigation works.
- Existing saves/completions still use current services.
- Existing rewards/XP/gameplay behavior is unchanged.
- Existing modals still close via close button and Escape where supported.

---

## 9. Guardrails

Future implementation must follow these guardrails:

- Do not change database schema.
- Do not change reward, economy, or gameplay logic.
- Do not change Island Run, Game of Life, dice, token, reward, stop progression, or runtime state semantics.
- Do not change Supabase table contracts or persistence behavior.
- Do not change telemetry behavior.
- Do not duplicate services.
- Do not create a second goal, habit, check-in, routine, profile-strength, or AI-coach system.
- Do not add gameplay writes directly inside React UI components.
- Do not remove existing navigation until replacement is validated.
- Do not hardcode generated visuals when an existing manifest/asset pattern is available.
- Keep implementation PRs small and screenshot-reviewable.
- Keep visual-only PRs separate from behavior/data PRs.
- Preserve existing accessibility semantics when wrapping screens in new visual components.
- Respect reduced-motion preferences for glow, hover, and transition effects.

## Future PR readiness checklist

Before starting Phase 0 implementation, confirm:

1. The target shared stylesheet/component location is selected.
2. Token names are reviewed against existing theme tokens to avoid collisions.
3. The first PR does not need new image assets.
4. The first PR can compile without touching feature service logic.
5. Screenshot targets are agreed for mobile and desktop.
6. Any generated assets added later have a manifest/naming plan.
7. Reviewers know the PR is visual foundation only, not a Quest behavior redesign.
