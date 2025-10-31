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
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          created_at?: string;
          target_date?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          created_at?: string;
          target_date?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
