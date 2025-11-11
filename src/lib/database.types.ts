export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          created_at: string;
          target_date: string | null;
          progress_notes: string | null;
          status_tag: string | null;
          life_wheel_category: string | null;
          start_date: string | null;
          timing_notes: string | null;
          estimated_duration_days: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          created_at?: string;
          target_date?: string | null;
          progress_notes?: string | null;
          status_tag?: string | null;
          life_wheel_category?: string | null;
          start_date?: string | null;
          timing_notes?: string | null;
          estimated_duration_days?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          created_at?: string;
          target_date?: string | null;
          progress_notes?: string | null;
          status_tag?: string | null;
          life_wheel_category?: string | null;
          start_date?: string | null;
          timing_notes?: string | null;
          estimated_duration_days?: number | null;
        };
        Relationships: [];
      };
      goal_reflections: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          entry_date: string;
          confidence: number | null;
          highlight: string | null;
          challenge: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          user_id: string;
          entry_date: string;
          confidence?: number | null;
          highlight?: string | null;
          challenge?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          user_id?: string;
          entry_date?: string;
          confidence?: number | null;
          highlight?: string | null;
          challenge?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          goal_id: string;
          name: string;
          frequency: string;
          schedule: Json | null;
        };
        Insert: {
          id?: string;
          goal_id: string;
          name: string;
          frequency: string;
          schedule?: Json | null;
        };
        Update: {
          id?: string;
          goal_id?: string;
          name?: string;
          frequency?: string;
          schedule?: Json | null;
        };
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          date: string;
          completed: boolean;
        };
        Insert: {
          id?: string;
          habit_id: string;
          date: string;
          completed?: boolean;
        };
        Update: {
          id?: string;
          habit_id?: string;
          date?: string;
          completed?: boolean;
        };
        Relationships: [];
      };
      vision_images: {
        Row: {
          id: string;
          user_id: string;
          image_path: string;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_path: string;
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          image_path?: string;
          caption?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      checkins: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          scores: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          scores: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          scores?: Json;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          habit_reminders_enabled: boolean;
          habit_reminder_time: string | null;
          checkin_nudges_enabled: boolean;
          timezone: string | null;
          subscription: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          habit_reminders_enabled?: boolean;
          habit_reminder_time?: string | null;
          checkin_nudges_enabled?: boolean;
          timezone?: string | null;
          subscription?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          habit_reminders_enabled?: boolean;
          habit_reminder_time?: string | null;
          checkin_nudges_enabled?: boolean;
          timezone?: string | null;
          subscription?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      life_goal_steps: {
        Row: {
          id: string;
          goal_id: string;
          step_order: number;
          title: string;
          description: string | null;
          completed: boolean;
          completed_at: string | null;
          due_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          step_order?: number;
          title: string;
          description?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          step_order?: number;
          title?: string;
          description?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      life_goal_substeps: {
        Row: {
          id: string;
          step_id: string;
          substep_order: number;
          title: string;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          step_id: string;
          substep_order?: number;
          title: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          step_id?: string;
          substep_order?: number;
          title?: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      life_goal_alerts: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          alert_type: string;
          alert_time: string;
          title: string;
          message: string | null;
          sent: boolean;
          sent_at: string | null;
          repeat_pattern: string | null;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          user_id: string;
          alert_type: string;
          alert_time: string;
          title: string;
          message?: string | null;
          sent?: boolean;
          sent_at?: string | null;
          repeat_pattern?: string | null;
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          user_id?: string;
          alert_type?: string;
          alert_time?: string;
          title?: string;
          message?: string | null;
          sent?: boolean;
          sent_at?: string | null;
          repeat_pattern?: string | null;
          enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
