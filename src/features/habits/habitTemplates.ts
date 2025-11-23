/**
 * Habit Templates Module
 * Loads and provides habit templates from /app/habits/templates.json
 */

/**
 * Schedule configuration matching the templates.json structure
 */
export interface TemplateSchedule {
  mode: 'daily' | 'specific_days' | 'times_per_week' | 'every_n_days';
  days?: number[]; // for specific_days mode: [0-6] where 0=Sunday
  value?: number;  // for times_per_week or every_n_days
}

/**
 * HabitTemplate type matching the structure in /app/habits/templates.json
 */
export interface HabitTemplate {
  title: string;
  emoji: string;
  type: 'boolean' | 'quantity' | 'duration';
  target_num?: number;
  target_unit?: string;
  schedule: TemplateSchedule;
  allow_skip?: boolean;
  reminders?: string[];
}

/**
 * Loads habit templates from /app/habits/templates.json
 * @returns Promise<HabitTemplate[]> - Array of habit templates, or empty array on error
 */
export async function loadHabitTemplates(): Promise<HabitTemplate[]> {
  try {
    const response = await fetch('/app/habits/templates.json');
    
    if (!response.ok) {
      console.error(`Failed to load habit templates: HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    // Validate that we got an array
    if (!Array.isArray(data)) {
      console.error('Habit templates data is not an array');
      return [];
    }
    
    return data as HabitTemplate[];
  } catch (error) {
    console.error('Error loading habit templates:', error);
    return [];
  }
}
