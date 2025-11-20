# AI Goal Suggestion Setup Guide

This guide explains how to set up and use the AI-powered goal suggestion feature in LifeGoal APP.

## Overview

The AI goal suggestion feature helps users create well-structured goals by:
- Generating goal titles based on user descriptions
- Suggesting relevant milestones
- Providing actionable tasks

## Architecture

The feature consists of three main components:

1. **Supabase Edge Function** (`supabase/functions/suggest-goal/index.ts`)
   - Handles AI requests using OpenAI API
   - Authenticates users via Supabase Auth
   - Returns structured goal suggestions

2. **React Hook** (`src/hooks/useAiGoalSuggestion.ts`)
   - Manages state for loading, errors, and suggestions
   - Calls the edge function with user authentication
   - Handles response parsing and error cases

3. **UI Integration** (`src/components/LifeGoalInputDialog.tsx`)
   - "Generate with AI" button in the Basic Info tab
   - Display of AI suggestions
   - "Use this as goal" button to populate form fields

## Setup Instructions

### 1. Deploy the Edge Function

The edge function `suggest-goal` is already created. Deploy it to Supabase:

```bash
supabase functions deploy suggest-goal
```

### 2. Configure Environment Variables

#### Supabase Edge Function Environment Variables

Set these in your Supabase dashboard (Project Settings → Edge Functions):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `OPENAI_API_KEY` - Your OpenAI API key

#### Frontend Environment Variables

Add to your `.env.local` file (or Vercel environment variables):

```env
VITE_AI_GOAL_SUGGEST_URL=https://your-project.supabase.co/functions/v1/suggest-goal
```

Replace `your-project` with your actual Supabase project reference.

### 3. Verify Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Log in to the app
3. Navigate to Life Goals section
4. Click "Add Goal" or similar to open the goal creation dialog
5. In the "Basic Info" tab, add a description
6. Click "✨ Generate with AI" button
7. Review the AI-generated suggestion
8. Click "✓ Use this as goal" to populate the form

## How It Works

### User Flow

1. User enters a description of what they want to achieve
2. Optionally, user can set a timeframe or category
3. User clicks "Generate with AI"
4. The hook calls the edge function with the user's input
5. The edge function uses OpenAI to generate a structured suggestion
6. The suggestion is displayed with:
   - A refined goal statement
   - 3-5 milestones
   - 3-7 actionable tasks
7. User can review and click "Use this as goal" to auto-populate the form

### Technical Flow

```
User Input → useAiGoalSuggestion Hook → Edge Function → OpenAI API
                                              ↓
User Form ← Parsed Response ← JSON Response ← Edge Function
```

## AI Settings (Optional)

Users can configure their own OpenAI API keys in the `ai_settings` table:

```sql
INSERT INTO ai_settings (user_id, provider, api_key, model)
VALUES (
  'user-uuid',
  'openai',
  'sk-...',
  'gpt-4o-mini'
);
```

If no user-specific key is configured, the app falls back to the global `OPENAI_API_KEY`.

## Troubleshooting

### "AI goal suggest URL is not configured"

**Solution**: Make sure `VITE_AI_GOAL_SUGGEST_URL` is set in your environment variables.

### "Unauthorized" error

**Solution**: Ensure the user is logged in and the Supabase session is active.

### "No OpenAI API key available"

**Solution**: Set the `OPENAI_API_KEY` environment variable in your Supabase Edge Functions settings.

### Edge function returns 500 error

**Solution**: Check the Supabase Function logs for detailed error messages:
```bash
supabase functions logs suggest-goal
```

## Cost Considerations

- Uses OpenAI's `gpt-4o-mini` model by default (cost-effective)
- Each suggestion costs approximately $0.0001-0.0003 USD
- Users can configure their own API keys to use their own quota

## Security

- All requests require Supabase authentication
- User JWTs are validated on the edge function
- API keys are stored encrypted in the database
- CORS headers restrict access to authorized domains
