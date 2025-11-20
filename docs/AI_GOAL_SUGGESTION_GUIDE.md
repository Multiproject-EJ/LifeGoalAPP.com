# AI Goal Suggestion Integration Guide

This guide shows how to integrate the AI goal suggestion feature into your React components.

## Prerequisites

1. Supabase Edge Function `suggest-goal` must be deployed
2. User must be authenticated with Supabase
3. `OPENAI_API_KEY` environment variable must be set in Supabase (or users must configure their own API keys)

## Basic Usage

### 1. Import the Service

```typescript
import { suggestGoal } from '@/services/goalSuggestions';
```

### 2. Call the Service

```typescript
const handleSuggestGoal = async () => {
  const result = await suggestGoal({
    description: 'I want to improve my health and fitness',
    timeframe: '3 months',
    category: 'Health & Wellness',
  });

  if (result.error) {
    console.error('Error:', result.error);
    return;
  }

  console.log('Goal:', result.data?.goal);
  console.log('Milestones:', result.data?.milestones);
  console.log('Tasks:', result.data?.tasks);
  console.log('Source:', result.source); // 'supabase' or 'demo'
};
```

## React Component Example

Here's a complete example of a React component that uses the AI goal suggestion feature:

```typescript
import React, { useState } from 'react';
import { suggestGoal, type SuggestGoalResponse } from '@/services/goalSuggestions';

export function GoalSuggestionForm() {
  const [description, setDescription] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestGoalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'demo' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const result = await suggestGoal({
        description,
        timeframe: timeframe || undefined,
        category: category || undefined,
      });

      if (result.error) {
        setError(result.error.message);
      } else if (result.data) {
        setSuggestion(result.data);
        setSource(result.source);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="goal-suggestion-form">
      <h2>Get AI-Powered Goal Suggestions</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="description">
            What do you want to achieve? *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="E.g., I want to learn web development"
            required
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="timeframe">
            Timeframe (optional)
          </label>
          <input
            type="text"
            id="timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            placeholder="E.g., 6 months, 1 year"
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">
            Category (optional)
          </label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="E.g., Career, Health, Learning"
          />
        </div>

        <button type="submit" disabled={loading || !description.trim()}>
          {loading ? 'Generating...' : 'Suggest Goal'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {suggestion && (
        <div className="suggestion-result">
          {source === 'demo' && (
            <div className="demo-notice">
              📝 Demo mode: Connect Supabase for AI-powered suggestions
            </div>
          )}
          
          <div className="goal">
            <h3>Suggested Goal</h3>
            <p>{suggestion.goal}</p>
          </div>

          <div className="milestones">
            <h3>Milestones</h3>
            <ul>
              {suggestion.milestones.map((milestone, index) => (
                <li key={index}>{milestone}</li>
              ))}
            </ul>
          </div>

          <div className="tasks">
            <h3>Action Tasks</h3>
            <ul>
              {suggestion.tasks.map((task, index) => (
                <li key={index}>{task}</li>
              ))}
            </ul>
          </div>

          <div className="actions">
            <button onClick={() => {/* Save goal logic */}}>
              Save as Goal
            </button>
            <button onClick={() => setSuggestion(null)}>
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## TypeScript Types

The service exports the following types:

```typescript
interface SuggestGoalRequest {
  description: string;
  timeframe?: string;
  category?: string;
}

interface SuggestGoalResponse {
  goal: string;
  milestones: string[];
  tasks: string[];
}

interface SuggestGoalResult {
  data: SuggestGoalResponse | null;
  error: Error | null;
  source: 'supabase' | 'demo' | 'unavailable';
}
```

## Demo Mode

When Supabase is not configured or the Edge Function fails, the service automatically falls back to demo mode with context-aware suggestions based on keywords in the description:

- **Fitness/Health**: Suggests fitness routines and health improvements
- **Learning/Study**: Suggests learning plans and skill development
- **Business/Startup**: Suggests business launch and growth strategies
- **Finance/Savings**: Suggests financial planning and savings goals
- **Default**: Provides generic but helpful goal structure

## Error Handling

The service handles errors gracefully:

1. **Missing description**: Returns an error immediately
2. **Supabase unavailable**: Falls back to demo mode
3. **Edge Function error**: Falls back to demo mode
4. **Invalid response**: Falls back to demo mode
5. **Authentication error**: Returns error (user must be logged in for Supabase mode)

## Custom AI Settings

Users can configure their own OpenAI API key and model by updating the `ai_settings` table:

```sql
INSERT INTO ai_settings (user_id, provider, api_key, model)
VALUES (
  auth.uid(),
  'openai',
  'sk-...',  -- User's OpenAI API key
  'gpt-4o'   -- Preferred model
);
```

## Example Integration with Existing Goal Creation

You can integrate this into your existing goal creation workflow:

```typescript
const [goalData, setGoalData] = useState({
  title: '',
  description: '',
  milestones: [] as string[],
  tasks: [] as string[],
});

const handleAiSuggest = async (description: string) => {
  const result = await suggestGoal({ description });
  
  if (result.data) {
    setGoalData({
      title: result.data.goal,
      description: description,
      milestones: result.data.milestones,
      tasks: result.data.tasks,
    });
  }
};

// Then use goalData to create the goal in your database
```

## Styling Example

Here's a basic CSS example for the suggestion result:

```css
.goal-suggestion-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.demo-notice {
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.suggestion-result {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.suggestion-result h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #333;
}

.suggestion-result ul {
  list-style: none;
  padding: 0;
}

.suggestion-result li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.suggestion-result li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #28a745;
  font-weight: bold;
}

.actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
}

.actions button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.actions button:hover {
  opacity: 0.9;
}

.error-message {
  padding: 1rem;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-top: 1rem;
}
```

## Testing

To test the integration:

1. **Without Supabase**: The service will automatically use demo mode
2. **With Supabase (no OpenAI key)**: The Edge Function will return an error, falling back to demo mode
3. **With Supabase + OpenAI key**: The service will use the actual AI to generate suggestions

## Deployment Checklist

Before deploying:

- [ ] Deploy the Edge Function: `supabase functions deploy suggest-goal`
- [ ] Set `OPENAI_API_KEY` in Supabase project settings
- [ ] Test the Edge Function with a real request
- [ ] Verify authentication is working
- [ ] Test demo mode fallback
- [ ] Add error tracking/monitoring

## Troubleshooting

**"Unauthorized" error**:
- Ensure user is logged in with Supabase auth
- Check that the Authorization header is being sent

**Edge Function timeout**:
- OpenAI API calls can take 5-10 seconds
- Consider adding a loading indicator
- Check Supabase function logs for errors

**Demo mode always active**:
- Verify Supabase credentials are configured
- Check that the Edge Function is deployed
- Look for errors in browser console

**Invalid suggestions**:
- Check that `OPENAI_API_KEY` is set correctly
- Verify the OpenAI API key has sufficient credits
- Check Supabase function logs for API errors
