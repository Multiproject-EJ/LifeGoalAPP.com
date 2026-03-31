export type RoutineStepDisplayMode =
  | 'inside_routine_only'
  | 'also_show_standalone'
  | 'standalone_only';

export interface Routine {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  schedule: Record<string, unknown>;
  anchor_time: string | null;
  domain_key: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineStep {
  id: string;
  routine_id: string;
  habit_id: string;
  step_order: number;
  required: boolean;
  display_mode: RoutineStepDisplayMode;
  fallback_step: boolean;
  created_at: string;
  updated_at: string;
}

export type RoutineLogMode = 'normal' | 'fallback';

export interface RoutineLog {
  id: string;
  routine_id: string;
  user_id: string;
  date: string;
  completed: boolean;
  completed_at: string | null;
  mode: RoutineLogMode;
  created_at: string;
  updated_at: string;
}

export interface CreateRoutineInput {
  title: string;
  description?: string;
  schedule?: Record<string, unknown>;
  anchor_time?: string;
  domain_key?: string;
  is_active?: boolean;
}

export interface UpdateRoutineInput {
  title?: string;
  description?: string | null;
  schedule?: Record<string, unknown>;
  anchor_time?: string | null;
  domain_key?: string | null;
  is_active?: boolean;
}

export interface CreateRoutineStepInput {
  routine_id: string;
  habit_id: string;
  step_order?: number;
  required?: boolean;
  display_mode?: RoutineStepDisplayMode;
  fallback_step?: boolean;
}

export interface UpdateRoutineStepInput {
  step_order?: number;
  required?: boolean;
  display_mode?: RoutineStepDisplayMode;
  fallback_step?: boolean;
}
