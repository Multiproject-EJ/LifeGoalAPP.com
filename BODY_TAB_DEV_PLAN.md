# Body Tab - Development Plan & Architecture

> **Status**: Draft / Alive
> **Focus**: Physical Health (Vitality), Fitness, Nutrition, and Image Progress.
> **Design Principle**: Phone UI First. Immediate status check ("How am I doing?").

## 1. UI Structure & Hierarchy (Vertical Flow)

### 1.1 "At-A-Glance" Header (Top Screen)
*   **Body Battery / Energy Score**: Aggregate metric (0-100) based on sleep + previous day's activity.
*   **Daily Rings/Bars**:
    *   **Movement**: Steps / Active Calories.
    *   **Fuel**: Calories / Macros vs Target.
    *   **Rest**: Sleep duration / Quality.
*   **Hydration**: Quick-tap water tracker.

### 1.2 Active Body Goals
*   **Horizontal Scroll Cards**:
    *   Progress Bars (e.g., "Weight: 80kg -> 75kg").
    *   Consistency Streaks (e.g., "Run 5k: 3/5 completed this week").

### 1.3 Body-Specific Habits
*   **Daily Checklist**:
    *   Linked specifically to the "Vitality" axis.
    *   Examples: "Creatine", "Stretch", "Cold Plunge", "No Sugar".
    *   *Interaction*: Simple toggle/checkbox.

### 1.4 Activity & Workout Feed
*   **Today**: "Planned: Leg Day" or "Rest Day".
*   **Recent**: Condensed list of last 3 logs.

### 1.5 Nutrition & Recovery Inputs
*   **Macro Split**: Mini pie chart.
*   **Fasting Timer**: Countdown to next eating window.
*   **Symptom/Mood Logger**: "Sore", "Energized", "Bloated".

### 1.6 The Body Gallery (Image Archive)
*   **Private & Secure**: Explicit permissions required.
*   **Categories**:
    *   *Physique*: Front/Back/Side progress photos.
    *   *Health*: Lab results, injury recovery tracking.
*   **Features**: "Compare" mode (Overlay or Side-by-Side).

---

## 2. Data Strategy

### 2.1 Supabase Schema Extensions
*   **`body_metrics` table**:
    *   `date`: Date
    *   `weight`: Numeric
    *   `body_fat`: Numeric
    *   `sleep_hours`: Numeric
    *   `hydration_oz`: Integer
    *   `energy_score`: Integer (Calculated)
*   **`body_gallery` table**:
    *   `image_url`: String (Storage bucket path)
    *   `category`: Enum (Physique, Health, Injury)
    *   `date`: Date
    *   `notes`: Text

### 2.2 Integration Points
*   **Habits System**: Reuse existing `habits` table but filter by `category = 'body'` or `axis = 'vitality'`.
*   **Goals System**: Reuse `goals` table, linking progress updates to `body_metrics`.

---

## 3. Implementation Roadmap

### Phase 1: UI Skeleton (Phone First)
- [ ] Create `BodyTab` component.
- [ ] Implement mobile-responsive layout container.
- [ ] Build "At-A-Glance" mock widget (static data).
- [ ] Add Floating Action Button (FAB) for quick logging.

### Phase 2: Metrics & Data Hooks
- [ ] Create `useBodyMetrics` hook.
- [ ] Connect "Hydration" to local state/Supabase.
- [ ] Implement "Body Battery" calculation logic (Mock initially).

### Phase 3: Habits & Goals Integration
- [ ] Fetch "Vitality" habits from the main Habits store.
- [ ] Display relevant Goals in the horizontal scroll section.

### Phase 4: The Body Gallery
- [ ] Set up Supabase Storage bucket for private images.
- [ ] Build Photo Upload UI.
- [ ] Implement "Compare View" (Before/After).

### Phase 5: Advanced & AI
- [ ] Connect "Symptom Log" to AI Coach for insights (e.g., "You feel bloated when you eat X").
- [ ] AI analysis of progress trends.

---

## 4. Current Questions
*   Should "Body Battery" sync with wearables (Apple Health/Google Fit) eventually?
*   How do we handle "Rest Days" in the streak logic?
