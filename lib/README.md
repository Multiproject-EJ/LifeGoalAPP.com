# AI Client Helper

This directory contains server-side AI integration helpers for the LifeGoalAPP.com project.

## Files

### `aiClient.ts`

A TypeScript module that provides OpenAI integration with user-specific API key support.

#### Environment Variables Required

```bash
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# or
VITE_SUPABASE_URL=https://your-project.supabase.co

# Supabase service key (server-side only)
SUPABASE_SERVICE_KEY=your-service-key

# OpenAI API key (fallback when user doesn't have custom key)
OPENAI_API_KEY=your-openai-api-key
```

#### Database Schema

The helper expects an `ai_settings` table in Supabase:

```sql
CREATE TABLE ai_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  api_key TEXT,
  model TEXT
);
```

#### Usage Examples

**Example 1: Get OpenAI client with user-specific or fallback API key**

```typescript
import { getOpenAIForUser } from './lib/aiClient';

// In an API route or server component
export async function POST(request: Request) {
  const { userId, prompt } = await request.json();
  
  try {
    // Get OpenAI client for this user
    const openai = await getOpenAIForUser(userId);
    
    // Use the client
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });
    
    return Response.json({ result: completion.choices[0].message.content });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

**Example 2: Get user's preferred AI model**

```typescript
import { getOpenAIForUser, getUserAiModel } from './lib/aiClient';

export async function generateCompletion(userId: string, prompt: string) {
  // Get the OpenAI client
  const openai = await getOpenAIForUser(userId);
  
  // Get user's preferred model (or default)
  const model = await getUserAiModel(userId);
  
  // Use both together
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
  });
  
  return completion.choices[0].message.content;
}
```

**Example 3: Fallback to app-level key when user is not logged in**

```typescript
import { getOpenAIForUser } from './lib/aiClient';

export async function generatePublicContent(prompt: string) {
  // No userId provided - will use OPENAI_API_KEY from environment
  const openai = await getOpenAIForUser();
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
  });
  
  return completion.choices[0].message.content;
}
```

## Notes

- This helper is designed for **server-side use only** (API routes, server components, server actions)
- User-specific API keys are stored securely in Supabase and only accessible via the service key
- If a user has a custom OpenAI API key configured, it will be used; otherwise, the app-level key is used
- The helper gracefully handles missing user settings and falls back appropriately
- All errors are clearly reported with actionable messages
