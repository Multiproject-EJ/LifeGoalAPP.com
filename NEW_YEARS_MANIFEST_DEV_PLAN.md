# New Year's Manifest & Check-in Feature - Development Plan

## Overview
A guided workflow that helps users close the chapter on the previous year with data visualization ("Year in Review") and intentionally design their next year by connecting high-level Life Wheel goals to daily habits.

## Phase 1: Database Schema & Backend (Supabase)
- [x] **Create `annual_reviews` table**
  - `id` (uuid, PK)
  - `user_id` (uuid, FK)
  - `year` (int)
  - `created_at` (timestamp)
  - `reflection_text` (text)
  - `overall_rating` (int 1-10)

- [x] **Create `annual_goals` table**
  - `id` (uuid, PK)
  - `review_id` (uuid, FK)
  - `category` (text) - Linked to Life Wheel segments
  - `goal_statement` (text)
  - `vision_image_url` (text)

- [x] **Backend Functions (RPC)**
  - `get_year_in_review_stats(year_input int)`: Returns aggregated stats:
    - Total habits completed
    - Longest streak
    - Most active category

## Phase 2: Frontend Components (React)
- [ ] **`ReviewWizard` Container**
  - Multi-step state manager.
  - Progress bar.

- [ ] **Step 1: The Retrospective (Stats)**
  - `StatsCard` component for displaying aggregated data.
  - "Spotify Wrapped" style layout with animations.

- [ ] **Step 2: Life Wheel Audit**
  - Interactive wheel or list to rate satisfaction (1-10) for each category.
  - Text input for "What went well?" / "What needs focus?".

- [ ] **Step 3: Manifestation (Vision Board)**
  - Image uploader for specific goals.
  - Canvas integration for generating a summary image.

- [ ] **Step 4: Habit Planning**
  - Interface to "Migrate", "Archive", or "Create New" habits based on the new goals.

## Phase 3: Integration & Logic
- [ ] Connect `ReviewWizard` to Supabase `annual_reviews`.
- [ ] Implement image upload logic to Supabase Storage.
- [ ] Build the "Habit Generator" logic (ensure every Goal has at least 1 linked Habit).

## Phase 4: Polish & Engagement
- [ ] Add `canvas-confetti` on completion.
- [ ] Create a "202X Focus" Widget for the Dashboard.
- [ ] Generate a shareable social media image of the "Year in Review".