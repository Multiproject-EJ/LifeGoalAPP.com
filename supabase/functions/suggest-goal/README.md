# Suggest Goal Edge Function

This Supabase Edge Function provides AI-powered goal suggestions with milestones and tasks.

## Endpoint

`POST /functions/v1/suggest-goal`

## Authentication

Requires a valid Supabase JWT token in the Authorization header:

```
Authorization: Bearer <your-supabase-jwt-token>
```

## Request Body

```json
{
  "description": "I want to improve my health and fitness",
  "timeframe": "3 months",
  "category": "Health & Wellness"
}
```

### Fields

- `description` (required): A brief description of what you want to achieve
- `timeframe` (optional): The desired timeframe for achieving the goal
- `category` (optional): The category or area of life this goal belongs to

## Response

### Success (200 OK)

```json
{
  "goal": "Establish a consistent fitness routine and improve overall health within 3 months",
  "milestones": [
    "Complete week 1 of regular exercise",
    "Achieve 30-day fitness streak",
    "Improve cardiovascular endurance by 20%",
    "Reach target body composition metrics"
  ],
  "tasks": [
    "Schedule 3 workout sessions per week",
    "Create a meal plan focused on whole foods",
    "Track daily water intake (8 glasses minimum)",
    "Set up accountability partner or fitness app",
    "Book initial fitness assessment"
  ]
}
```

### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized. Please sign in."
}
```

**400 Bad Request**
```json
{
  "error": "Missing required field: description"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message describing what went wrong"
}
```

## AI Configuration

The function uses OpenAI's GPT models to generate suggestions. The AI model and API key are determined in the following order:

1. **User-specific settings**: If the user has configured their own OpenAI API key and model in the `ai_settings` table
2. **Application default**: Falls back to the `OPENAI_API_KEY` environment variable and uses `gpt-4o-mini` as the default model

### Setting up custom AI settings

Users can configure their own OpenAI API key and preferred model by adding a row to the `ai_settings` table:

```sql
INSERT INTO ai_settings (user_id, provider, api_key, model)
VALUES (
  '<user-uuid>',
  'openai',
  'sk-...',  -- User's OpenAI API key
  'gpt-4o-mini'  -- Preferred model
);
```

## Example Usage

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make sure user is authenticated
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  const { data, error } = await supabase.functions.invoke('suggest-goal', {
    body: {
      description: 'I want to learn web development',
      timeframe: '6 months',
      category: 'Career & Skills'
    }
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Suggested goal:', data.goal);
    console.log('Milestones:', data.milestones);
    console.log('Tasks:', data.tasks);
  }
}
```

### cURL

```bash
curl -X POST https://your-project.supabase.co/functions/v1/suggest-goal \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Learn to play guitar",
    "timeframe": "1 year",
    "category": "Hobbies"
  }'
```

## Environment Variables

The following environment variables must be set in your Supabase project:

- `SUPABASE_URL`: Your Supabase project URL (automatically set)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (automatically set)
- `OPENAI_API_KEY`: Your OpenAI API key (required if users don't have custom keys)

## Development

To test this function locally with the Supabase CLI:

```bash
supabase functions serve suggest-goal
```

Then make requests to `http://localhost:54321/functions/v1/suggest-goal`

## Deployment

This function is automatically deployed when you push changes to the `supabase/functions/suggest-goal` directory.

To manually deploy:

```bash
supabase functions deploy suggest-goal
```
