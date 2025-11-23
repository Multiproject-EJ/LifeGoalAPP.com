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
 * Validates if an object matches the HabitTemplate structure
 */
function isValidTemplate(obj: unknown): obj is HabitTemplate {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const template = obj as Record<string, unknown>;
  
  return (
    typeof template.title === 'string' &&
    typeof template.emoji === 'string' &&
    (template.type === 'boolean' || template.type === 'quantity' || template.type === 'duration') &&
    typeof template.schedule === 'object' &&
    template.schedule !== null
  );
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
    
    // Filter out invalid templates
    const validTemplates = data.filter((item) => {
      const isValid = isValidTemplate(item);
      if (!isValid) {
        console.warn('Skipping invalid template:', item);
      }
      return isValid;
    });
    
    return validTemplates as HabitTemplate[];
  } catch (error) {
    console.error('Error loading habit templates:', error);
    return [];
  }
}
