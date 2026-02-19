# AI Enablement & Roadmap (Living Spec)

This document is the living source of truth for AI across the PWA: what is live today, how it is wired, and what is next. Keep it updated as AI capabilities ship.

## ✅ AI in production today
- **Create Life Goal → “✨ Generate with AI”**: The goal creation dialog calls the `useAiGoalSuggestion` hook to POST to the Supabase Edge Function (`suggest-goal`) and returns a structured goal, milestones, and tasks. The endpoint is configured via `VITE_AI_GOAL_SUGGEST_URL`.【F:src/hooks/useAiGoalSuggestion.ts†L1-L123】
- **Demo fallback when AI is unavailable**: If Supabase is not configured or the edge function fails, the app generates a local demo suggestion so the UI remains usable in demo mode.【F:src/services/goalSuggestions.ts†L31-L168】
- **AI-assisted reflection prompts (ready for edge function)**: The goal reflection journal already surfaces AI follow-up prompts and can switch to live AI responses once the `generate-reflection-prompts` edge function is connected.【F:src/features/goals/GoalReflectionJournal.tsx†L738-L781】
- **Habit creation AI**: The habit wizard can generate starter habits (title, type, schedule, reminders) using OpenAI when configured and falls back to local suggestions when not. The UI applies the suggestion directly to the draft for quick creation.【F:src/features/habits/HabitWizard.tsx†L41-L233】【F:src/services/habitAiSuggestions.ts†L1-L194】

## 🔧 Setup & configuration (edge functions + env)
1. Add `VITE_AI_GOAL_SUGGEST_URL` to `.env.local` (points to the Supabase Edge Function: `https://<project>.supabase.co/functions/v1/suggest-goal`).【F:.env.example†L7-L8】
2. Ensure Supabase auth is enabled; the AI goal suggestion request includes the active session token when available.【F:src/hooks/useAiGoalSuggestion.ts†L35-L64】
3. Confirm your edge function uses the same response shape: `{ goal, milestones[], tasks[] }`. The client validates the shape before updating UI state.【F:src/hooks/useAiGoalSuggestion.ts†L85-L114】

## 🧭 AI delivery checklist (live)
- [x] **Goal suggestion in Create Life Goal** (`✨ Generate with AI` → `suggest-goal` edge function).【F:src/hooks/useAiGoalSuggestion.ts†L35-L114】
- [ ] **Auto-populate Steps, Timing, and Alerts** using the existing AI suggestion payload (expand UI to fill remaining tabs).
- [x] **Habit creation AI**: generate habit ideas + scheduling defaults inside the Create Habit flow.【F:src/features/habits/HabitWizard.tsx†L41-L233】【F:src/services/habitAiSuggestions.ts†L1-L194】
- [ ] **Today screen habit edit AI**: help rephrase, reschedule, or improve an existing habit directly in the Today list.
- [ ] **AI reflection prompts**: connect `generate-reflection-prompts` edge function to replace demo prompts with live AI output.【F:src/features/goals/GoalReflectionJournal.tsx†L738-L781】
- [ ] **AI Coach upgrade**: connect the strategy assistant UI to a real LLM backend and honor the privacy controls in Account → AI Settings.
- [ ] **Vision Board AI ideas + images**: generate board concepts and create images via the same AI service, using an image-capable model.
- [ ] **Vision Board image storage**: add Supabase migrations to store generated images as WebP and persist the image metadata for each board entry.
- [ ] **AI project breakdown**: replace the simulated breakdown with a real AI task generator.
- [ ] **AI habit rationale enrichment**: wire the habit rationale enhancer to production credentials and store responses in Supabase.
- [ ] **AI check-ins**: prompt suggestions + recommended updates based on recent scores and notes.
- [ ] **AI personality test insights**: expand results with AI-generated narrative guidance (text-only, fits current architecture).
- [ ] **AI journaling companion**: weave AI prompts and summaries into the journal flow.
- [ ] **AI in Body tab**: placeholders for Exercise/Workout guidance and Body Scan reflection with AI support.
- [ ] **AI breathing + meditation**: tailor sessions to boost wisdom, awareness, gratitude, and compassion.
- [ ] **AI lessons archive**: personal, evolving library of AI-curated lessons and reflections.
- [ ] **“Improve with AI” for active goals**: on-demand refinement for goal titles, milestones, and next steps.


- **Goal Coach Chat**: `Chat with AI` can call `goal-coach-chat` (multi-turn) via `VITE_AI_GOAL_COACH_CHAT_URL`, returning `{ assistant_message, draft_goal }` for confirm-to-create-goal flows.
