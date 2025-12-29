export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type JournalEntryType = 
  | 'quick' 
  | 'deep' 
  | 'brain_dump' 
  | 'life_wheel' 
  | 'secret' 
  | 'goal' 
  | 'time_capsule' 
  | 'standard'
  | 'problem';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          created_at: string | null;
          display_name: string | null;
          tz: string | null;
        };
        Insert: {
          user_id: string;
          created_at?: string | null;
          display_name?: string | null;
          tz?: string | null;
        };
        Update: {
          user_id?: string;
          created_at?: string | null;
          display_name?: string | null;
          tz?: string | null;
        };
        Relationships: [];
      };
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
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          entry_date: string;
          title: string | null;
          content: string;
          mood: string | null;
          tags: string[] | null;
          is_private: boolean;
          attachments: Json | null;
          linked_goal_ids: string[] | null;
          linked_habit_ids: string[] | null;
          type: JournalEntryType;
          mood_score: number | null;
          category: string | null;
          unlock_date: string | null;
          goal_id: string | null;
          irrational_fears: string | null;
          training_solutions: string | null;
          concrete_steps: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
          entry_date?: string;
          title?: string | null;
          content: string;
          mood?: string | null;
          tags?: string[] | null;
          is_private?: boolean;
          attachments?: Json | null;
          linked_goal_ids?: string[] | null;
          linked_habit_ids?: string[] | null;
          type?: JournalEntryType;
          mood_score?: number | null;
          category?: string | null;
          unlock_date?: string | null;
          goal_id?: string | null;
          irrational_fears?: string | null;
          training_solutions?: string | null;
          concrete_steps?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          entry_date?: string;
          title?: string | null;
          content?: string;
          mood?: string | null;
          tags?: string[] | null;
          is_private?: boolean;
          attachments?: Json | null;
          linked_goal_ids?: string[] | null;
          linked_habit_ids?: string[] | null;
          type?: JournalEntryType;
          mood_score?: number | null;
          category?: string | null;
          unlock_date?: string | null;
          goal_id?: string | null;
          irrational_fears?: string | null;
          training_solutions?: string | null;
          concrete_steps?: string | null;
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
      habit_alerts: {
        Row: {
          id: string;
          habit_id: string;
          alert_time: string;
          days_of_week: number[] | null;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          alert_time: string;
          days_of_week?: number[] | null;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          habit_id?: string;
          alert_time?: string;
          days_of_week?: number[] | null;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      habits_v2: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          emoji: string | null;
          type: Database['public']['Enums']['habit_type'];
          target_num: number | null;
          target_unit: string | null;
          schedule: Json;
          allow_skip: boolean | null;
          start_date: string | null;
          archived: boolean | null;
          created_at: string | null;
          autoprog: Json | null;
          domain_key: string | null;
          goal_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          emoji?: string | null;
          type?: Database['public']['Enums']['habit_type'];
          target_num?: number | null;
          target_unit?: string | null;
          schedule: Json;
          allow_skip?: boolean | null;
          start_date?: string | null;
          archived?: boolean | null;
          created_at?: string | null;
          autoprog?: Json | null;
          domain_key?: string | null;
          goal_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          emoji?: string | null;
          type?: Database['public']['Enums']['habit_type'];
          target_num?: number | null;
          target_unit?: string | null;
          schedule?: Json;
          allow_skip?: boolean | null;
          start_date?: string | null;
          archived?: boolean | null;
          created_at?: string | null;
          autoprog?: Json | null;
          domain_key?: string | null;
          goal_id?: string | null;
        };
        Relationships: [];
      };
      habit_logs_v2: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          ts: string;
          date: string;
          value: number | null;
          done: boolean;
          note: string | null;
          mood: number | null;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          ts?: string;
          date?: string;
          value?: number | null;
          done?: boolean;
          note?: string | null;
          mood?: number | null;
        };
        Update: {
          id?: string;
          habit_id?: string;
          user_id?: string;
          ts?: string;
          date?: string;
          value?: number | null;
          done?: boolean;
          note?: string | null;
          mood?: number | null;
        };
        Relationships: [];
      };
      habit_reminders: {
        Row: {
          id: string;
          habit_id: string;
          local_time: string;
          days: number[] | null;
          geo: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          habit_id: string;
          local_time: string;
          days?: number[] | null;
          geo?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          habit_id?: string;
          local_time?: string;
          days?: number[] | null;
          geo?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      habit_challenges: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          start_date: string;
          end_date: string;
          scoring: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          scoring?: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          scoring?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      habit_challenge_members: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          habit_id: string | null;
          joined_at: string | null;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id: string;
          habit_id?: string | null;
          joined_at?: string | null;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          user_id?: string;
          habit_id?: string | null;
          joined_at?: string | null;
        };
        Relationships: [];
      };
      vision_board_daily_items: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          title: string | null;
          description: string | null;
          suggested_area: string | null;
          final_area: string | null;
          order_index: number | null;
          status: string;
          image_storage_path: string | null;
          legacy_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          title?: string | null;
          description?: string | null;
          suggested_area?: string | null;
          final_area?: string | null;
          order_index?: number | null;
          status?: string;
          image_storage_path?: string | null;
          legacy_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          title?: string | null;
          description?: string | null;
          suggested_area?: string | null;
          final_area?: string | null;
          order_index?: number | null;
          status?: string;
          image_storage_path?: string | null;
          legacy_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vision_board_daily_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_date: string;
          status: string;
          total_points: number | null;
          balance_score: number | null;
          insight_area: string | null;
          insight_text: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_date?: string;
          status?: string;
          total_points?: number | null;
          balance_score?: number | null;
          insight_area?: string | null;
          insight_text?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_date?: string;
          status?: string;
          total_points?: number | null;
          balance_score?: number | null;
          insight_area?: string | null;
          insight_text?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vision_images: {
        Row: {
          id: string;
          user_id: string;
          image_path: string | null;
          image_url: string | null;
          image_source: string;
          caption: string | null;
          created_at: string;
          file_path: string | null;
          file_format: string | null;
          vision_type: string | null;
          review_interval_days: number | null;
          last_reviewed_at: string | null;
          linked_goal_ids: string[] | null;
          linked_habit_ids: string[] | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_path?: string | null;
          image_url?: string | null;
          image_source?: string;
          caption?: string | null;
          created_at?: string;
          file_path?: string | null;
          file_format?: string | null;
          vision_type?: string | null;
          review_interval_days?: number | null;
          last_reviewed_at?: string | null;
          linked_goal_ids?: string[] | null;
          linked_habit_ids?: string[] | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          image_path?: string | null;
          image_url?: string | null;
          image_source?: string;
          caption?: string | null;
          created_at?: string;
          file_path?: string | null;
          file_format?: string | null;
          vision_type?: string | null;
          review_interval_days?: number | null;
          last_reviewed_at?: string | null;
          linked_goal_ids?: string[] | null;
          linked_habit_ids?: string[] | null;
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
      workspace_profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          full_name: string | null;
          workspace_name: string | null;
          initials: string | null;
          show_initials_in_menu: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name?: string | null;
          full_name?: string | null;
          workspace_name?: string | null;
          initials?: string | null;
          show_initials_in_menu?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string | null;
          full_name?: string | null;
          workspace_name?: string | null;
          initials?: string | null;
          show_initials_in_menu?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      gamification_profiles: {
        Row: {
          user_id: string;
          total_xp: number;
          current_level: number;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          lives: number;
          max_lives: number;
          last_life_refill: string | null;
          streak_freezes: number;
          total_points: number;
          gamification_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_xp?: number;
          current_level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          lives?: number;
          max_lives?: number;
          last_life_refill?: string | null;
          streak_freezes?: number;
          total_points?: number;
          gamification_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          total_xp?: number;
          current_level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          lives?: number;
          max_lives?: number;
          last_life_refill?: string | null;
          streak_freezes?: number;
          total_points?: number;
          gamification_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string;
          achievement_key: string;
          name: string;
          description: string;
          icon: string;
          tier: 'bronze' | 'silver' | 'gold' | 'diamond';
          category: 'streak' | 'habit' | 'goal' | 'journal' | 'general';
          xp_reward: number;
          requirement_type: string;
          requirement_value: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          achievement_key: string;
          name: string;
          description: string;
          icon: string;
          tier: 'bronze' | 'silver' | 'gold' | 'diamond';
          category: 'streak' | 'habit' | 'goal' | 'journal' | 'general';
          xp_reward?: number;
          requirement_type: string;
          requirement_value: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          achievement_key?: string;
          name?: string;
          description?: string;
          icon?: string;
          tier?: 'bronze' | 'silver' | 'gold' | 'diamond';
          category?: 'streak' | 'habit' | 'goal' | 'journal' | 'general';
          xp_reward?: number;
          requirement_type?: string;
          requirement_value?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          progress: number;
          unlocked: boolean;
          unlocked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          progress?: number;
          unlocked?: boolean;
          unlocked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          progress?: number;
          unlocked?: boolean;
          unlocked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      xp_transactions: {
        Row: {
          id: string;
          user_id: string;
          xp_amount: number;
          source_type: string;
          source_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          xp_amount: number;
          source_type: string;
          source_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          xp_amount?: number;
          source_type?: string;
          source_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      gamification_notifications: {
        Row: {
          id: string;
          user_id: string;
          notification_type: 'level_up' | 'achievement_unlock' | 'streak_milestone' | 'life_refill';
          title: string;
          message: string;
          icon: string | null;
          xp_reward: number | null;
          achievement_id: string | null;
          is_read: boolean;
          is_dismissed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          notification_type: 'level_up' | 'achievement_unlock' | 'streak_milestone' | 'life_refill';
          title: string;
          message: string;
          icon?: string | null;
          xp_reward?: number | null;
          achievement_id?: string | null;
          is_read?: boolean;
          is_dismissed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          notification_type?: 'level_up' | 'achievement_unlock' | 'streak_milestone' | 'life_refill';
          title?: string;
          message?: string;
          icon?: string | null;
          xp_reward?: number | null;
          achievement_id?: string | null;
          is_read?: boolean;
          is_dismissed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      vb_boards: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          board_type: Database['public']['Enums']['vb_board_type'];
          theme: Json | null;
          cover_card_id: string | null;
          archived: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          board_type?: Database['public']['Enums']['vb_board_type'];
          theme?: Json | null;
          cover_card_id?: string | null;
          archived?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          board_type?: Database['public']['Enums']['vb_board_type'];
          theme?: Json | null;
          cover_card_id?: string | null;
          archived?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      vb_sections: {
        Row: {
          id: string;
          board_id: string;
          title: string;
          sort_index: number | null;
        };
        Insert: {
          id?: string;
          board_id: string;
          title: string;
          sort_index?: number | null;
        };
        Update: {
          id?: string;
          board_id?: string;
          title?: string;
          sort_index?: number | null;
        };
        Relationships: [];
      };
      vb_cards: {
        Row: {
          id: string;
          board_id: string;
          section_id: string | null;
          user_id: string;
          kind: string;
          title: string | null;
          affirm: string | null;
          color: string | null;
          tags: string[] | null;
          size: Database['public']['Enums']['vb_card_size'];
          favorite: boolean | null;
          visible_in_share: boolean | null;
          link_type: string | null;
          link_id: string | null;
          img_path: string | null;
          img_w: number | null;
          img_h: number | null;
          sort_index: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          board_id: string;
          section_id?: string | null;
          user_id: string;
          kind?: string;
          title?: string | null;
          affirm?: string | null;
          color?: string | null;
          tags?: string[] | null;
          size?: Database['public']['Enums']['vb_card_size'];
          favorite?: boolean | null;
          visible_in_share?: boolean | null;
          link_type?: string | null;
          link_id?: string | null;
          img_path?: string | null;
          img_w?: number | null;
          img_h?: number | null;
          sort_index?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          board_id?: string;
          section_id?: string | null;
          user_id?: string;
          kind?: string;
          title?: string | null;
          affirm?: string | null;
          color?: string | null;
          tags?: string[] | null;
          size?: Database['public']['Enums']['vb_card_size'];
          favorite?: boolean | null;
          visible_in_share?: boolean | null;
          link_type?: string | null;
          link_id?: string | null;
          img_path?: string | null;
          img_w?: number | null;
          img_h?: number | null;
          sort_index?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      vb_shares: {
        Row: {
          id: string;
          board_id: string;
          owner_id: string;
          slug: string;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          board_id: string;
          owner_id: string;
          slug: string;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          board_id?: string;
          owner_id?: string;
          slug?: string;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      vb_checkins: {
        Row: {
          id: string;
          user_id: string;
          board_id: string | null;
          the_date: string;
          mood: number | null;
          gratitude: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          board_id?: string | null;
          the_date?: string;
          mood?: number | null;
          gratitude?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          board_id?: string | null;
          the_date?: string;
          mood?: number | null;
          gratitude?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string | null;
        };
        Insert: {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string | null;
        };
        Update: {
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string | null;
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
      ai_settings: {
        Row: {
          user_id: string;
          provider: string;
          api_key: string | null;
          model: string | null;
        };
        Insert: {
          user_id: string;
          provider: string;
          api_key?: string | null;
          model?: string | null;
        };
        Update: {
          user_id?: string;
          provider?: string;
          api_key?: string | null;
          model?: string | null;
        };
        Relationships: [];
      };
      habit_completions: {
        Row: {
          id: string;
          user_id: string;
          habit_id: string;
          completed_date: string;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          habit_id: string;
          completed_date: string;
          completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          habit_id?: string;
          completed_date?: string;
          completed?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habit_completions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "habit_completions_habit_id_fkey";
            columns: ["habit_id"];
            referencedRelation: "habits_v2";
            referencedColumns: ["id"];
          }
        ];
      };
      user_reminder_prefs: {
        Row: {
          user_id: string;
          timezone: string;
          window_start: string;
          window_end: string;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          skip_weekends: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          timezone?: string;
          window_start?: string;
          window_end?: string;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          skip_weekends?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          timezone?: string;
          window_start?: string;
          window_end?: string;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          skip_weekends?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      habit_reminder_state: {
        Row: {
          habit_id: string;
          last_reminder_sent_at: string | null;
          snooze_until: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          habit_id: string;
          last_reminder_sent_at?: string | null;
          snooze_until?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          habit_id?: string;
          last_reminder_sent_at?: string | null;
          snooze_until?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "habit_reminder_state_habit_id_fkey";
            columns: ["habit_id"];
            referencedRelation: "habits_v2";
            referencedColumns: ["id"];
          }
        ];
      };
      habit_reminder_prefs: {
        Row: {
          habit_id: string;
          enabled: boolean;
          preferred_time: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          habit_id: string;
          enabled?: boolean;
          preferred_time?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          habit_id?: string;
          enabled?: boolean;
          preferred_time?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "habit_reminder_prefs_habit_id_fkey";
            columns: ["habit_id"];
            referencedRelation: "habits_v2";
            referencedColumns: ["id"];
          }
        ];
      };
      reminder_action_logs: {
        Row: {
          id: string;
          user_id: string;
          habit_id: string;
          action: 'done' | 'snooze' | 'dismiss';
          payload: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          habit_id: string;
          action: 'done' | 'snooze' | 'dismiss';
          payload?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          habit_id?: string;
          action?: 'done' | 'snooze' | 'dismiss';
          payload?: Json | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reminder_action_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminder_action_logs_habit_id_fkey";
            columns: ["habit_id"];
            referencedRelation: "habits_v2";
            referencedColumns: ["id"];
          }
        ];
      };
      reminder_delivery_failures: {
        Row: {
          id: string;
          user_id: string;
          habit_id: string;
          endpoint: string;
          error: string;
          retry_count: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          habit_id: string;
          endpoint: string;
          error: string;
          retry_count?: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          habit_id?: string;
          endpoint?: string;
          error?: string;
          retry_count?: number;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reminder_delivery_failures_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminder_delivery_failures_habit_id_fkey";
            columns: ["habit_id"];
            referencedRelation: "habits_v2";
            referencedColumns: ["id"];
          }
        ];
      };
      meditation_sessions: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          session_date: string;
          session_type: string;
          duration_seconds: number;
          completed: boolean;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          session_date?: string;
          session_type?: string;
          duration_seconds: number;
          completed?: boolean;
          notes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          session_date?: string;
          session_type?: string;
          duration_seconds?: number;
          completed?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
      meditation_reminders: {
        Row: {
          id: string;
          user_id: string;
          enabled: boolean;
          time_of_day: string;
          timezone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          enabled?: boolean;
          time_of_day?: string;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          enabled?: boolean;
          time_of_day?: string;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_habit_streaks: {
        Row: {
          habit_id: string;
          current_streak: number;
          best_streak: number;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "v_habit_streaks_habit_id_fkey";
            columns: ["habit_id"];
            isOneToOne: false;
            referencedRelation: "habits_v2";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      habit_type: 'boolean' | 'quantity' | 'duration';
      vb_board_type: 'vision' | 'focus';
      vb_card_size: 'S' | 'M' | 'L' | 'XL';
    };
    CompositeTypes: Record<string, never>;
  };
}
