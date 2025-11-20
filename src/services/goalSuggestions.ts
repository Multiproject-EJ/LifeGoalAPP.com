/**
 * Service for AI-powered goal suggestions
 * 
 * This service calls the Supabase Edge Function 'suggest-goal' to generate
 * goal suggestions with milestones and tasks based on user input.
 */

import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';

export interface SuggestGoalRequest {
  description: string;
  timeframe?: string;
  category?: string;
}

export interface SuggestGoalResponse {
  goal: string;
  milestones: string[];
  tasks: string[];
}

export interface SuggestGoalResult {
  data: SuggestGoalResponse | null;
  error: Error | null;
  source: 'supabase' | 'demo' | 'unavailable';
}

/**
 * Generate a goal suggestion using AI
 * 
 * @param request - Goal description and optional metadata
 * @returns Goal suggestion with milestones and tasks
 */
export async function suggestGoal(request: SuggestGoalRequest): Promise<SuggestGoalResult> {
  // Validate input
  if (!request.description || !request.description.trim()) {
    return {
      data: null,
      error: new Error('Description is required'),
      source: 'unavailable',
    };
  }

  // Check if Supabase is configured
  if (!canUseSupabaseData()) {
    return {
      data: generateDemoSuggestion(request),
      error: null,
      source: 'demo',
    };
  }

  try {
    const supabase = getSupabaseClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke<SuggestGoalResponse>('suggest-goal', {
      body: request,
    });

    if (error) {
      console.error('Error calling suggest-goal function:', error);
      
      // Fall back to demo mode on error
      return {
        data: generateDemoSuggestion(request),
        error: null,
        source: 'demo',
      };
    }

    if (!data || !data.goal || !Array.isArray(data.milestones) || !Array.isArray(data.tasks)) {
      console.warn('Invalid response from suggest-goal function:', data);
      
      // Fall back to demo mode
      return {
        data: generateDemoSuggestion(request),
        error: null,
        source: 'demo',
      };
    }

    return {
      data,
      error: null,
      source: 'supabase',
    };
  } catch (error) {
    console.error('Exception calling suggest-goal:', error);
    
    // Fall back to demo mode
    return {
      data: generateDemoSuggestion(request),
      error: null,
      source: 'demo',
    };
  }
}

/**
 * Generate a demo goal suggestion based on the description
 * This is used when Supabase is not configured or when the AI service is unavailable
 */
function generateDemoSuggestion(request: SuggestGoalRequest): SuggestGoalResponse {
  const { description, timeframe, category } = request;
  
  // Extract keywords to make the demo more contextual
  const lowerDesc = description.toLowerCase();
  
  // Default suggestions
  let goal = `Achieve meaningful progress in: ${description}`;
  let milestones: string[] = [
    'Complete initial planning and research',
    'Establish consistent routine and habits',
    'Reach midpoint checkpoint and assess progress',
    'Finalize and achieve the desired outcome',
  ];
  let tasks: string[] = [
    'Define clear success criteria',
    'Break down the goal into weekly targets',
    'Set up tracking and accountability system',
    'Schedule regular review sessions',
    'Identify potential obstacles and mitigation strategies',
  ];

  // Customize based on keywords
  if (lowerDesc.includes('fitness') || lowerDesc.includes('health') || lowerDesc.includes('exercise')) {
    goal = `Establish a sustainable fitness routine and improve overall health${timeframe ? ` within ${timeframe}` : ''}`;
    milestones = [
      'Complete first week of consistent workouts',
      'Achieve 30-day fitness streak',
      'Notice measurable improvements in strength and endurance',
      'Establish long-term fitness habits',
    ];
    tasks = [
      'Choose workout program that fits your schedule',
      'Set up workout schedule (3-5 times per week)',
      'Track workouts and nutrition',
      'Find accountability partner or join fitness community',
      'Prepare workout space and necessary equipment',
    ];
  } else if (lowerDesc.includes('learn') || lowerDesc.includes('study') || lowerDesc.includes('course')) {
    goal = `Master new skills in ${category || 'your chosen field'}${timeframe ? ` within ${timeframe}` : ''}`;
    milestones = [
      'Complete foundational learning materials',
      'Build first practice project',
      'Reach intermediate proficiency level',
      'Demonstrate mastery through real-world application',
    ];
    tasks = [
      'Research and select quality learning resources',
      'Set up dedicated study schedule',
      'Create hands-on practice projects',
      'Join learning community or find study partner',
      'Document progress and key learnings',
    ];
  } else if (lowerDesc.includes('business') || lowerDesc.includes('startup') || lowerDesc.includes('launch')) {
    goal = `Successfully launch and grow ${category || 'your business venture'}${timeframe ? ` within ${timeframe}` : ''}`;
    milestones = [
      'Validate business idea and market demand',
      'Complete MVP and acquire first customers',
      'Achieve product-market fit',
      'Scale to sustainable growth',
    ];
    tasks = [
      'Conduct market research and competitor analysis',
      'Create business plan and financial projections',
      'Build minimum viable product',
      'Develop marketing and customer acquisition strategy',
      'Set up business operations and legal structure',
    ];
  } else if (lowerDesc.includes('save') || lowerDesc.includes('money') || lowerDesc.includes('financial')) {
    goal = `Build financial security and achieve savings goals${timeframe ? ` within ${timeframe}` : ''}`;
    milestones = [
      'Establish budget and track expenses',
      'Build emergency fund ($1000 initial target)',
      'Reach 50% of savings goal',
      'Achieve full savings target',
    ];
    tasks = [
      'Analyze current spending patterns',
      'Create realistic monthly budget',
      'Set up automatic savings transfers',
      'Identify and eliminate unnecessary expenses',
      'Research investment opportunities for growth',
    ];
  }

  // Add timeframe context if provided
  if (timeframe && !goal.includes(timeframe)) {
    goal += ` (${timeframe} timeframe)`;
  }

  return {
    goal,
    milestones,
    tasks,
  };
}
