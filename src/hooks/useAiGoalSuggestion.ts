// Hook for calling the Supabase Edge Function to generate AI-powered goal suggestions
// Uses OpenAI to generate structured goal recommendations based on user input

import { useState, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';

interface AiSuggestion {
  goal: string;
  milestones: string[];
  tasks: string[];
}

interface GenerateSuggestionParams {
  description: string;
  timeframe?: string;
  category?: string;
}

export default function useAiGoalSuggestion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);

  const generateSuggestion = useCallback(async (params: GenerateSuggestionParams): Promise<void> => {
    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      // Get the edge function URL from environment variables
      const edgeFunctionUrl = import.meta.env.VITE_AI_GOAL_SUGGEST_URL;
      
      if (!edgeFunctionUrl) {
        throw new Error('AI goal suggest URL is not configured. Please set VITE_AI_GOAL_SUGGEST_URL.');
      }

      // Get Supabase client and session for authentication
      const supabase = getSupabaseClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Failed to get session: ${sessionError.message}`);
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if session exists
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Make POST request to edge function
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          description: params.description,
          timeframe: params.timeframe,
          category: params.category,
        }),
      });

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = 'Failed to generate AI suggestion';
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If we can't parse JSON error, use status text
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      // Parse successful response
      const data = await response.json();

      // Validate response structure
      if (!data.goal || !Array.isArray(data.milestones) || !Array.isArray(data.tasks)) {
        throw new Error('Invalid response format from AI service');
      }

      setSuggestion({
        goal: data.goal,
        milestones: data.milestones,
        tasks: data.tasks,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Error generating AI suggestion:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    suggestion,
    generateSuggestion,
  };
}
