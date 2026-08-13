import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

type TodayTodo = Database['public']['Tables']['today_todos']['Row'];
type Habit = Database['public']['Tables']['habits_v2']['Row'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export async function convertHabitToTodayTodo(input: {
  habitId: string;
  todoDate: string;
  orderIndex: number;
}): Promise<ServiceResponse<TodayTodo>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('convert_habit_to_today_todo', {
    p_habit_id: input.habitId,
    p_todo_date: input.todoDate,
    p_order_index: input.orderIndex,
  });

  return { data, error };
}

export async function convertTodayTodoToHabit(todoId: string): Promise<ServiceResponse<Habit>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('convert_today_todo_to_habit', {
    p_todo_id: todoId,
  });

  return { data, error };
}
