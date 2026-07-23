export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      comeback_email_log: {
        Row: {
          sent_at: string;
          user_id: string;
        };
        Insert: {
          sent_at?: string;
          user_id: string;
        };
        Update: {
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comeback_email_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      competition_rounds: {
        Row: {
          admin_closes_at: string | null;
          competition_id: string;
          created_at: string;
          display_order: number;
          id: string;
          labels: Json;
          opens_at: string;
          provider_metadata: Json;
          provider_review_status: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          round_key: string;
          round_number: number | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          admin_closes_at?: string | null;
          competition_id: string;
          created_at?: string;
          display_order?: number;
          id?: string;
          labels?: Json;
          opens_at: string;
          provider_metadata?: Json;
          provider_review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          round_key: string;
          round_number?: number | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          admin_closes_at?: string | null;
          competition_id?: string;
          created_at?: string;
          display_order?: number;
          id?: string;
          labels?: Json;
          opens_at?: string;
          provider_metadata?: Json;
          provider_review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          round_key?: string;
          round_number?: number | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competition_rounds_competition_id_fkey";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
        ];
      };
      competitions: {
        Row: {
          branding: Json;
          created_at: string;
          finished_at: string | null;
          format_config: Json;
          id: string;
          is_active: boolean;
          is_live: boolean;
          kind: string;
          name: string;
          opening_away: string | null;
          opening_home: string | null;
          opening_venue: string | null;
          providers: Json;
          season: string | null;
          short_name: string;
          slug: string;
          tournament_end_at: string | null;
          tournament_start_at: string;
          updated_at: string;
        };
        Insert: {
          branding?: Json;
          created_at?: string;
          finished_at?: string | null;
          format_config: Json;
          id?: string;
          is_active?: boolean;
          is_live?: boolean;
          kind?: string;
          name: string;
          opening_away?: string | null;
          opening_home?: string | null;
          opening_venue?: string | null;
          providers?: Json;
          season?: string | null;
          short_name: string;
          slug: string;
          tournament_end_at?: string | null;
          tournament_start_at: string;
          updated_at?: string;
        };
        Update: {
          branding?: Json;
          created_at?: string;
          finished_at?: string | null;
          format_config?: Json;
          id?: string;
          is_active?: boolean;
          is_live?: boolean;
          kind?: string;
          name?: string;
          opening_away?: string | null;
          opening_home?: string | null;
          opening_venue?: string | null;
          providers?: Json;
          season?: string | null;
          short_name?: string;
          slug?: string;
          tournament_end_at?: string | null;
          tournament_start_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      group_invite_log: {
        Row: {
          group_id: string;
          inviter_id: string;
          recipient_email: string;
          sent_at: string;
        };
        Insert: {
          group_id: string;
          inviter_id: string;
          recipient_email: string;
          sent_at?: string;
        };
        Update: {
          group_id?: string;
          inviter_id?: string;
          recipient_email?: string;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_invite_log_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_invite_log_inviter_id_fkey";
            columns: ["inviter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          invited_by_user_id: string | null;
          joined_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          invited_by_user_id?: string | null;
          joined_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          invited_by_user_id?: string | null;
          joined_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_invited_by_user_id_fkey";
            columns: ["invited_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      group_referrals: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          invitee_id: string;
          inviter_id: string;
          points: number;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          invitee_id: string;
          inviter_id: string;
          points: number;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          invitee_id?: string;
          inviter_id?: string;
          points?: number;
        };
        Relationships: [
          {
            foreignKeyName: "group_referrals_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_referrals_invitee_id_fkey";
            columns: ["invitee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_referrals_inviter_id_fkey";
            columns: ["inviter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      group_wager_configs: {
        Row: {
          approved_mint: string;
          approved_token_program: string;
          cluster: string;
          created_at: string;
          enabled: boolean;
          group_id: string;
          id: string;
          limits: Json;
          stake_base_units: number;
          updated_at: string;
          verified_decimals: number;
        };
        Insert: {
          approved_mint: string;
          approved_token_program: string;
          cluster?: string;
          created_at?: string;
          enabled?: boolean;
          group_id: string;
          id?: string;
          limits?: Json;
          stake_base_units: number;
          updated_at?: string;
          verified_decimals: number;
        };
        Update: {
          approved_mint?: string;
          approved_token_program?: string;
          cluster?: string;
          created_at?: string;
          enabled?: boolean;
          group_id?: string;
          id?: string;
          limits?: Json;
          stake_base_units?: number;
          updated_at?: string;
          verified_decimals?: number;
        };
        Relationships: [
          {
            foreignKeyName: "group_wager_configs_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: true;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          competition_id: string;
          created_at: string;
          id: string;
          join_code: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          competition_id: string;
          created_at?: string;
          id?: string;
          join_code: string;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          competition_id?: string;
          created_at?: string;
          id?: string;
          join_code?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_competition_id_fkey";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "groups_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_rank_daily: {
        Row: {
          rank: number;
          snapshot_date: string;
          user_id: string;
        };
        Insert: {
          rank: number;
          snapshot_date: string;
          user_id: string;
        };
        Update: {
          rank?: number;
          snapshot_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_rank_daily_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_rank_snapshot: {
        Row: {
          captured_at: string;
          competition_id: string;
          rank: number;
          user_id: string;
        };
        Insert: {
          captured_at?: string;
          competition_id: string;
          rank: number;
          user_id: string;
        };
        Update: {
          captured_at?: string;
          competition_id?: string;
          rank?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_rank_snapshot_competition_id_fkey";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_rank_snapshot_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      match_events: {
        Row: {
          created_at: string;
          detail: string | null;
          extra_minute: number | null;
          id: string;
          match_id: string;
          minute: number | null;
          payload: Json | null;
          player: string | null;
          provider: string;
          provider_event_id: string | null;
          sequence: number;
          team: string | null;
          type: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          detail?: string | null;
          extra_minute?: number | null;
          id?: string;
          match_id: string;
          minute?: number | null;
          payload?: Json | null;
          player?: string | null;
          provider?: string;
          provider_event_id?: string | null;
          sequence?: number;
          team?: string | null;
          type: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          detail?: string | null;
          extra_minute?: number | null;
          id?: string;
          match_id?: string;
          minute?: number | null;
          payload?: Json | null;
          player?: string | null;
          provider?: string;
          provider_event_id?: string | null;
          sequence?: number;
          team?: string | null;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      match_summaries: {
        Row: {
          completion_tokens: number | null;
          content: string;
          created_at: string;
          generated_at: string;
          id: string;
          image_prompt: string | null;
          is_active: boolean;
          locale: string;
          match_id: string;
          model: string | null;
          prompt_tokens: number | null;
          provider: string;
          style_instruction: string | null;
          style_key: string;
          updated_at: string;
        };
        Insert: {
          completion_tokens?: number | null;
          content: string;
          created_at?: string;
          generated_at?: string;
          id?: string;
          image_prompt?: string | null;
          is_active?: boolean;
          locale?: string;
          match_id: string;
          model?: string | null;
          prompt_tokens?: number | null;
          provider?: string;
          style_instruction?: string | null;
          style_key?: string;
          updated_at?: string;
        };
        Update: {
          completion_tokens?: number | null;
          content?: string;
          created_at?: string;
          generated_at?: string;
          id?: string;
          image_prompt?: string | null;
          is_active?: boolean;
          locale?: string;
          match_id?: string;
          model?: string | null;
          prompt_tokens?: number | null;
          provider?: string;
          style_instruction?: string | null;
          style_key?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_summaries_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      match_summary_images: {
        Row: {
          created_at: string;
          error: string | null;
          generation_id: string | null;
          id: string;
          match_id: string;
          model: string | null;
          provider: string;
          status: string;
          storage_path: string | null;
          summary_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          error?: string | null;
          generation_id?: string | null;
          id?: string;
          match_id: string;
          model?: string | null;
          provider?: string;
          status?: string;
          storage_path?: string | null;
          summary_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          generation_id?: string | null;
          id?: string;
          match_id?: string;
          model?: string | null;
          provider?: string;
          status?: string;
          storage_path?: string | null;
          summary_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_summary_images_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_summary_images_summary_id_fkey";
            columns: ["summary_id"];
            isOneToOne: true;
            referencedRelation: "match_summaries";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          away_score: number | null;
          away_team: string;
          competition_id: string;
          created_at: string;
          group_code: string | null;
          home_score: number | null;
          home_team: string;
          id: string;
          kickoff_at: string;
          leg: number | null;
          round_id: string | null;
          stage: string;
          status: string;
          tie_key: string | null;
          updated_at: string;
          venue: string | null;
        };
        Insert: {
          away_score?: number | null;
          away_team: string;
          competition_id: string;
          created_at?: string;
          group_code?: string | null;
          home_score?: number | null;
          home_team: string;
          id?: string;
          kickoff_at: string;
          leg?: number | null;
          round_id?: string | null;
          stage: string;
          status?: string;
          tie_key?: string | null;
          updated_at?: string;
          venue?: string | null;
        };
        Update: {
          away_score?: number | null;
          away_team?: string;
          competition_id?: string;
          created_at?: string;
          group_code?: string | null;
          home_score?: number | null;
          home_team?: string;
          id?: string;
          kickoff_at?: string;
          leg?: number | null;
          round_id?: string | null;
          stage?: string;
          status?: string;
          tie_key?: string | null;
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "matches_competition_id_fkey";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_round_competition_fk";
            columns: ["round_id", "competition_id"];
            isOneToOne: false;
            referencedRelation: "competition_rounds";
            referencedColumns: ["id", "competition_id"];
          },
        ];
      };
      news_articles: {
        Row: {
          created_at: string;
          dedup_key: string;
          external_id: string | null;
          id: string;
          image_url: string | null;
          published_at: string;
          source: string | null;
          source_url: string;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          dedup_key: string;
          external_id?: string | null;
          id?: string;
          image_url?: string | null;
          published_at: string;
          source?: string | null;
          source_url: string;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          dedup_key?: string;
          external_id?: string | null;
          id?: string;
          image_url?: string | null;
          published_at?: string;
          source?: string | null;
          source_url?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      operation_runs: {
        Row: {
          created_at: string;
          duration_ms: number | null;
          error: string | null;
          finished_at: string | null;
          id: string;
          kind: string;
          started_at: string;
          status: string;
          summary: Json;
          trigger: string;
        };
        Insert: {
          created_at?: string;
          duration_ms?: number | null;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          kind: string;
          started_at?: string;
          status: string;
          summary?: Json;
          trigger?: string;
        };
        Update: {
          created_at?: string;
          duration_ms?: number | null;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          kind?: string;
          started_at?: string;
          status?: string;
          summary?: Json;
          trigger?: string;
        };
        Relationships: [];
      };
      operation_settings: {
        Row: {
          enabled: boolean;
          kind: string;
          updated_at: string;
        };
        Insert: {
          enabled?: boolean;
          kind: string;
          updated_at?: string;
        };
        Update: {
          enabled?: boolean;
          kind?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      playoff_score_email_log: {
        Row: {
          digest_date: string;
          sent_at: string;
          user_id: string;
        };
        Insert: {
          digest_date: string;
          sent_at?: string;
          user_id: string;
        };
        Update: {
          digest_date?: string;
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playoff_score_email_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      prediction_reminder_log: {
        Row: {
          reminder_date: string;
          sent_at: string;
          user_id: string;
        };
        Insert: {
          reminder_date: string;
          sent_at?: string;
          user_id: string;
        };
        Update: {
          reminder_date?: string;
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prediction_reminder_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      prediction_reminder_push_log: {
        Row: {
          pushed_at: string;
          reminder_date: string;
          user_id: string;
        };
        Insert: {
          pushed_at?: string;
          reminder_date: string;
          user_id: string;
        };
        Update: {
          pushed_at?: string;
          reminder_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prediction_reminder_push_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      predictions: {
        Row: {
          away_goals: number;
          home_goals: number;
          id: string;
          match_id: string;
          submitted_at: string;
          user_id: string;
        };
        Insert: {
          away_goals: number;
          home_goals: number;
          id?: string;
          match_id: string;
          submitted_at?: string;
          user_id: string;
        };
        Update: {
          away_goals?: number;
          home_goals?: number;
          id?: string;
          match_id?: string;
          submitted_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "predictions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email_prefs: Json;
          id: string;
          is_admin: boolean;
          prediction_reminder_opt_out: boolean;
          quiz_reminder_opt_out: boolean;
          timezone: string | null;
          unsubscribe_token: string;
          updated_at: string;
          welcome_email_sent_at: string | null;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email_prefs?: Json;
          id: string;
          is_admin?: boolean;
          prediction_reminder_opt_out?: boolean;
          quiz_reminder_opt_out?: boolean;
          timezone?: string | null;
          unsubscribe_token?: string;
          updated_at?: string;
          welcome_email_sent_at?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email_prefs?: Json;
          id?: string;
          is_admin?: boolean;
          prediction_reminder_opt_out?: boolean;
          quiz_reminder_opt_out?: boolean;
          timezone?: string | null;
          unsubscribe_token?: string;
          updated_at?: string;
          welcome_email_sent_at?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          failure_count: number;
          id: string;
          last_seen_at: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          failure_count?: number;
          id?: string;
          last_seen_at?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          failure_count?: number;
          id?: string;
          last_seen_at?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_answers: {
        Row: {
          answered_at: string;
          choice_index: number;
          competition_id: string;
          id: string;
          is_correct: boolean;
          question_id: string;
          user_id: string;
        };
        Insert: {
          answered_at?: string;
          choice_index: number;
          competition_id: string;
          id?: string;
          is_correct: boolean;
          question_id: string;
          user_id: string;
        };
        Update: {
          answered_at?: string;
          choice_index?: number;
          competition_id?: string;
          id?: string;
          is_correct?: boolean;
          question_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "v_quiz_questions_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_answers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          active_on: string;
          competition_id: string;
          correct_index: number;
          created_at: string;
          id: string;
          options: string[];
          prompt: string;
          translations: Json;
          updated_at: string;
        };
        Insert: {
          active_on: string;
          competition_id: string;
          correct_index: number;
          created_at?: string;
          id?: string;
          options: string[];
          prompt: string;
          translations?: Json;
          updated_at?: string;
        };
        Update: {
          active_on?: string;
          competition_id?: string;
          correct_index?: number;
          created_at?: string;
          id?: string;
          options?: string[];
          prompt?: string;
          translations?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_competition_fk";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_reminder_log: {
        Row: {
          question_id: string;
          sent_at: string;
          user_id: string;
        };
        Insert: {
          question_id: string;
          sent_at?: string;
          user_id: string;
        };
        Update: {
          question_id?: string;
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_reminder_log_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_reminder_log_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "v_quiz_questions_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_reminder_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recap_digest_email_log: {
        Row: {
          sent_at: string;
          summary_image_id: string;
          user_id: string;
        };
        Insert: {
          sent_at?: string;
          summary_image_id: string;
          user_id: string;
        };
        Update: {
          sent_at?: string;
          summary_image_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recap_digest_email_log_summary_image_id_fkey";
            columns: ["summary_image_id"];
            isOneToOne: false;
            referencedRelation: "match_summary_images";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recap_digest_email_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recap_reactions: {
        Row: {
          created_at: string;
          id: string;
          match_id: string;
          reaction: string;
          summary_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          match_id: string;
          reaction: string;
          summary_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          match_id?: string;
          reaction?: string;
          summary_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recap_reactions_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recap_reactions_summary_id_fkey";
            columns: ["summary_id"];
            isOneToOne: false;
            referencedRelation: "match_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recap_reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      result_email_log: {
        Row: {
          match_id: string;
          sent_at: string;
          user_id: string;
        };
        Insert: {
          match_id: string;
          sent_at?: string;
          user_id: string;
        };
        Update: {
          match_id?: string;
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "result_email_log_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_email_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      result_push_log: {
        Row: {
          match_id: string;
          pushed_at: string;
          user_id: string;
        };
        Insert: {
          match_id: string;
          pushed_at?: string;
          user_id: string;
        };
        Update: {
          match_id?: string;
          pushed_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "result_push_log_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_push_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      results_digest_log: {
        Row: {
          digest_date: string;
          sent_at: string;
          user_id: string;
        };
        Insert: {
          digest_date: string;
          sent_at?: string;
          user_id: string;
        };
        Update: {
          digest_date?: string;
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "results_digest_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      score_rules_email_log: {
        Row: {
          sent_at: string;
          user_id: string;
        };
        Insert: {
          sent_at?: string;
          user_id: string;
        };
        Update: {
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "score_rules_email_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      scores: {
        Row: {
          computed_at: string;
          hit_type: string;
          match_id: string;
          points: number;
          user_id: string;
        };
        Insert: {
          computed_at?: string;
          hit_type: string;
          match_id: string;
          points: number;
          user_id: string;
        };
        Update: {
          computed_at?: string;
          hit_type?: string;
          match_id?: string;
          points?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scores_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scores_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      streak_freezes: {
        Row: {
          amount: number | null;
          consumed_day: string | null;
          created_at: string;
          id: string;
          kind: string;
          row_kind: string;
          user_id: string;
          week_start: string | null;
        };
        Insert: {
          amount?: number | null;
          consumed_day?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          row_kind: string;
          user_id: string;
          week_start?: string | null;
        };
        Update: {
          amount?: number | null;
          consumed_day?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          row_kind?: string;
          user_id?: string;
          week_start?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "streak_freezes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      wager_chain_events: {
        Row: {
          block_slot: number | null;
          block_time: string | null;
          claim_pda: string | null;
          commitment: string | null;
          entry_pda: string | null;
          event_type: string;
          id: string;
          intent_id: string | null;
          observed_at: string;
          parsed_data: Json;
          rpc_node: string | null;
          transaction_signature: string | null;
          wager_round_pda: string | null;
        };
        Insert: {
          block_slot?: number | null;
          block_time?: string | null;
          claim_pda?: string | null;
          commitment?: string | null;
          entry_pda?: string | null;
          event_type: string;
          id?: string;
          intent_id?: string | null;
          observed_at?: string;
          parsed_data?: Json;
          rpc_node?: string | null;
          transaction_signature?: string | null;
          wager_round_pda?: string | null;
        };
        Update: {
          block_slot?: number | null;
          block_time?: string | null;
          claim_pda?: string | null;
          commitment?: string | null;
          entry_pda?: string | null;
          event_type?: string;
          id?: string;
          intent_id?: string | null;
          observed_at?: string;
          parsed_data?: Json;
          rpc_node?: string | null;
          transaction_signature?: string | null;
          wager_round_pda?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wager_chain_events_intent_id_fkey";
            columns: ["intent_id"];
            isOneToOne: false;
            referencedRelation: "wager_intents";
            referencedColumns: ["id"];
          },
        ];
      };
      wager_claims: {
        Row: {
          award_base_units: number;
          claim_pda: string;
          claim_signature: string | null;
          claimed_at: string | null;
          created_at: string;
          entry_id: string;
          id: string;
          settlement_id: string;
          state: string;
          user_id: string;
          wager_round_id: string;
          wallet_address: string;
        };
        Insert: {
          award_base_units: number;
          claim_pda: string;
          claim_signature?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          entry_id: string;
          id?: string;
          settlement_id: string;
          state?: string;
          user_id: string;
          wager_round_id: string;
          wallet_address: string;
        };
        Update: {
          award_base_units?: number;
          claim_pda?: string;
          claim_signature?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          entry_id?: string;
          id?: string;
          settlement_id?: string;
          state?: string;
          user_id?: string;
          wager_round_id?: string;
          wallet_address?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wager_claims_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "wager_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_claims_settlement_id_fkey";
            columns: ["settlement_id"];
            isOneToOne: false;
            referencedRelation: "wager_settlements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_claims_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_claims_wager_round_id_fkey";
            columns: ["wager_round_id"];
            isOneToOne: false;
            referencedRelation: "wager_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      wager_entries: {
        Row: {
          confirmed_at: string;
          created_at: string;
          entry_pda: string;
          group_id: string;
          id: string;
          intent_id: string;
          round_id: string;
          stake_base_units: number;
          state: string;
          transaction_signature: string | null;
          updated_at: string;
          user_id: string;
          wager_round_id: string;
          wallet_address: string;
        };
        Insert: {
          confirmed_at?: string;
          created_at?: string;
          entry_pda: string;
          group_id: string;
          id?: string;
          intent_id: string;
          round_id: string;
          stake_base_units: number;
          state?: string;
          transaction_signature?: string | null;
          updated_at?: string;
          user_id: string;
          wager_round_id: string;
          wallet_address: string;
        };
        Update: {
          confirmed_at?: string;
          created_at?: string;
          entry_pda?: string;
          group_id?: string;
          id?: string;
          intent_id?: string;
          round_id?: string;
          stake_base_units?: number;
          state?: string;
          transaction_signature?: string | null;
          updated_at?: string;
          user_id?: string;
          wager_round_id?: string;
          wallet_address?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wager_entries_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_entries_intent_id_fkey";
            columns: ["intent_id"];
            isOneToOne: false;
            referencedRelation: "wager_intents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_entries_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "competition_rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_entries_wager_round_id_fkey";
            columns: ["wager_round_id"];
            isOneToOne: false;
            referencedRelation: "wager_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      wager_entry_predictions: {
        Row: {
          away_goals: number;
          created_at: string;
          entry_id: string | null;
          home_goals: number;
          id: string;
          intent_id: string;
          match_id: string;
          source_submitted_at: string;
        };
        Insert: {
          away_goals: number;
          created_at?: string;
          entry_id?: string | null;
          home_goals: number;
          id?: string;
          intent_id: string;
          match_id: string;
          source_submitted_at: string;
        };
        Update: {
          away_goals?: number;
          created_at?: string;
          entry_id?: string | null;
          home_goals?: number;
          id?: string;
          intent_id?: string;
          match_id?: string;
          source_submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wager_entry_predictions_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "wager_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_entry_predictions_intent_id_fkey";
            columns: ["intent_id"];
            isOneToOne: false;
            referencedRelation: "wager_intents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_entry_predictions_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      wager_intents: {
        Row: {
          canonicalization_version: number;
          consent_accepted_at: string | null;
          consent_version: string | null;
          created_at: string;
          eligibility_check: Json;
          group_id: string;
          id: string;
          idempotency_key: string;
          pick_commitment: string;
          round_id: string;
          state: string;
          updated_at: string;
          user_id: string;
          wager_round_id: string | null;
          wallet_link_id: string;
        };
        Insert: {
          canonicalization_version?: number;
          consent_accepted_at?: string | null;
          consent_version?: string | null;
          created_at?: string;
          eligibility_check?: Json;
          group_id: string;
          id?: string;
          idempotency_key: string;
          pick_commitment: string;
          round_id: string;
          state?: string;
          updated_at?: string;
          user_id: string;
          wager_round_id?: string | null;
          wallet_link_id: string;
        };
        Update: {
          canonicalization_version?: number;
          consent_accepted_at?: string | null;
          consent_version?: string | null;
          created_at?: string;
          eligibility_check?: Json;
          group_id?: string;
          id?: string;
          idempotency_key?: string;
          pick_commitment?: string;
          round_id?: string;
          state?: string;
          updated_at?: string;
          user_id?: string;
          wager_round_id?: string | null;
          wallet_link_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wager_intents_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_intents_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "competition_rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_intents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_intents_wager_round_id_fkey";
            columns: ["wager_round_id"];
            isOneToOne: false;
            referencedRelation: "wager_rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_intents_wallet_link_id_fkey";
            columns: ["wallet_link_id"];
            isOneToOne: false;
            referencedRelation: "wallet_links";
            referencedColumns: ["id"];
          },
        ];
      };
      wager_rounds: {
        Row: {
          approved_mint: string;
          approved_token_program: string;
          closes_at: string;
          cluster: string;
          created_at: string;
          group_id: string;
          id: string;
          participant_count: number;
          pot_total_base_units: number;
          program_version: number;
          round_id: string;
          settlement_authority: string | null;
          stake_base_units: number;
          state: string;
          updated_at: string;
          verified_decimals: number;
          wager_config_id: string;
        };
        Insert: {
          approved_mint: string;
          approved_token_program: string;
          closes_at: string;
          cluster?: string;
          created_at?: string;
          group_id: string;
          id?: string;
          participant_count?: number;
          pot_total_base_units?: number;
          program_version?: number;
          round_id: string;
          settlement_authority?: string | null;
          stake_base_units: number;
          state?: string;
          updated_at?: string;
          verified_decimals: number;
          wager_config_id: string;
        };
        Update: {
          approved_mint?: string;
          approved_token_program?: string;
          closes_at?: string;
          cluster?: string;
          created_at?: string;
          group_id?: string;
          id?: string;
          participant_count?: number;
          pot_total_base_units?: number;
          program_version?: number;
          round_id?: string;
          settlement_authority?: string | null;
          stake_base_units?: number;
          state?: string;
          updated_at?: string;
          verified_decimals?: number;
          wager_config_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wager_rounds_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_rounds_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "competition_rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wager_rounds_wager_config_id_fkey";
            columns: ["wager_config_id"];
            isOneToOne: false;
            referencedRelation: "group_wager_configs";
            referencedColumns: ["id"];
          },
        ];
      };
      wager_settlements: {
        Row: {
          correction_delay_elapsed_at: string | null;
          created_at: string;
          id: string;
          manifest_canonical_bytes: string | null;
          manifest_hash: string;
          merkle_root: string;
          settled_at: string | null;
          settlement_signature: string | null;
          total_distributable: number;
          wager_round_id: string;
          winner_count: number;
        };
        Insert: {
          correction_delay_elapsed_at?: string | null;
          created_at?: string;
          id?: string;
          manifest_canonical_bytes?: string | null;
          manifest_hash: string;
          merkle_root: string;
          settled_at?: string | null;
          settlement_signature?: string | null;
          total_distributable: number;
          wager_round_id: string;
          winner_count: number;
        };
        Update: {
          correction_delay_elapsed_at?: string | null;
          created_at?: string;
          id?: string;
          manifest_canonical_bytes?: string | null;
          manifest_hash?: string;
          merkle_root?: string;
          settled_at?: string | null;
          settlement_signature?: string | null;
          total_distributable?: number;
          wager_round_id?: string;
          winner_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "wager_settlements_wager_round_id_fkey";
            columns: ["wager_round_id"];
            isOneToOne: true;
            referencedRelation: "wager_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_link_challenges: {
        Row: {
          cluster: string;
          consumed: boolean;
          created_at: string;
          domain: string;
          expires_at: string;
          id: string;
          issued_at: string;
          message_text: string;
          nonce: string;
          user_id: string;
          wallet_address: string;
        };
        Insert: {
          cluster?: string;
          consumed?: boolean;
          created_at?: string;
          domain: string;
          expires_at: string;
          id?: string;
          issued_at?: string;
          message_text: string;
          nonce: string;
          user_id: string;
          wallet_address: string;
        };
        Update: {
          cluster?: string;
          consumed?: boolean;
          created_at?: string;
          domain?: string;
          expires_at?: string;
          id?: string;
          issued_at?: string;
          message_text?: string;
          nonce?: string;
          user_id?: string;
          wallet_address?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_link_challenges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_links: {
        Row: {
          challenge_id: string;
          cluster: string;
          created_at: string;
          id: string;
          is_active: boolean;
          linked_at: string;
          signature_bytes: string;
          unlinked_at: string | null;
          user_id: string;
          wallet_address: string;
        };
        Insert: {
          challenge_id: string;
          cluster?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          linked_at?: string;
          signature_bytes: string;
          unlinked_at?: string | null;
          user_id: string;
          wallet_address: string;
        };
        Update: {
          challenge_id?: string;
          cluster?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          linked_at?: string;
          signature_bytes?: string;
          unlinked_at?: string | null;
          user_id?: string;
          wallet_address?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_links_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "wallet_link_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_links_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      winners_email_log: {
        Row: {
          sent_at: string;
          user_id: string;
        };
        Insert: {
          sent_at?: string;
          user_id: string;
        };
        Update: {
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "winners_email_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_leaderboard_overall: {
        Row: {
          display_name: string | null;
          exact_hits: number | null;
          first_submit: string | null;
          rank: number | null;
          total_points: number | null;
          user_id: string | null;
          winner_gd_hits: number | null;
          winner_hits: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "scores_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_quiz_leaderboard: {
        Row: {
          competition_id: string | null;
          display_name: string | null;
          first_answer: string | null;
          rank: number | null;
          total_answered: number | null;
          total_points: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_answers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_quiz_questions_public: {
        Row: {
          active_on: string | null;
          competition_id: string | null;
          id: string | null;
          options: string[] | null;
          prompt: string | null;
          translations: Json | null;
        };
        Insert: {
          active_on?: string | null;
          competition_id?: string | null;
          id?: string | null;
          options?: string[] | null;
          prompt?: string | null;
          translations?: Json | null;
        };
        Update: {
          active_on?: string | null;
          competition_id?: string | null;
          id?: string | null;
          options?: string[] | null;
          prompt?: string | null;
          translations?: Json | null;
        };
        Relationships: [];
      };
      v_quiz_standing: {
        Row: {
          competition_id: string | null;
          display_name: string | null;
          rank: number | null;
          streak: number | null;
          total_answered: number | null;
          total_points: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_answers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_recap_reaction_counts: {
        Row: {
          count: number | null;
          match_id: string | null;
          reaction: string | null;
          summary_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recap_reactions_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recap_reactions_summary_id_fkey";
            columns: ["summary_id"];
            isOneToOne: false;
            referencedRelation: "match_summaries";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      active_competition_id: { Args: never; Returns: string };
      answer_quiz: {
        Args: { p_choice: number; p_question_id: string };
        Returns: {
          correct_index: number;
          is_correct: boolean;
        }[];
      };
      assign_fixture_to_round: {
        Args: { p_match_id: string; p_round_id: string };
        Returns: undefined;
      };
      check_round_close_shortening: {
        Args: { p_match_id: string };
        Returns: string;
      };
      close_round: { Args: { p_round_id: string }; Returns: undefined };
      compute_match_scores: { Args: { p_match_id: string }; Returns: undefined };
      configure_pool_wager: {
        Args: {
          p_approved_mint: string;
          p_approved_token_program: string;
          p_cluster?: string;
          p_group_id: string;
          p_limits?: Json;
          p_stake_base_units: number;
          p_verified_decimals: number;
        };
        Returns: string;
      };
      consume_streak_freeze: {
        Args: { p_consumed_day: string; p_kind: string };
        Returns: boolean;
      };
      create_competition_round: {
        Args: {
          p_admin_closes_at?: string;
          p_competition_id: string;
          p_display_order?: number;
          p_labels?: Json;
          p_opens_at: string;
          p_provider_metadata?: Json;
          p_round_key: string;
          p_round_number?: number;
          p_status?: string;
        };
        Returns: string;
      };
      create_group:
        | { Args: { p_name: string }; Returns: string }
        | {
            Args: { p_competition_id?: string; p_name: string };
            Returns: string;
          };
      create_wager_intent_and_snapshot: {
        Args: {
          p_canonicalization_version?: number;
          p_consent_version?: string;
          p_eligibility_check?: Json;
          p_group_id: string;
          p_pick_commitment?: string;
          p_round_id: string;
          p_user_id: string;
          p_wallet_link_id: string;
        };
        Returns: string;
      };
      disable_pool_wager: { Args: { p_group_id: string }; Returns: undefined };
      finish_league: { Args: { p_id: string }; Returns: undefined };
      flag_rounds_for_shortening: { Args: never; Returns: string[] };
      generate_join_code: { Args: { p_prefix?: string }; Returns: string };
      grant_streak_freeze: {
        Args: { p_amount: number; p_kind: string };
        Returns: number;
      };
      group_preview: {
        Args: { p_code: string };
        Returns: {
          id: string;
          name: string;
        }[];
      };
      initialize_wager_round: {
        Args: { p_group_id: string; p_round_id: string };
        Returns: string;
      };
      is_admin: { Args: never; Returns: boolean };
      is_group_member: { Args: { p_group_id: string }; Returns: boolean };
      is_group_owner: { Args: { p_group_id: string }; Returns: boolean };
      join_group: {
        Args: { p_code: string; p_invited_by?: string };
        Returns: string;
      };
      leaderboard_for_day: {
        Args: { d: string; tz?: string };
        Returns: {
          display_name: string;
          exact_hits: number;
          first_submit: string;
          rank: number;
          total_points: number;
          user_id: string;
          winner_gd_hits: number;
          winner_hits: number;
        }[];
      };
      leaderboard_for_group: {
        Args: { p_group_id: string };
        Returns: {
          display_name: string;
          exact_hits: number;
          first_submit: string;
          rank: number;
          total_points: number;
          user_id: string;
          winner_gd_hits: number;
          winner_hits: number;
        }[];
      };
      leaderboard_for_stage: {
        Args: { stage_key: string };
        Returns: {
          display_name: string;
          exact_hits: number;
          first_submit: string;
          rank: number;
          total_points: number;
          user_id: string;
          winner_gd_hits: number;
          winner_hits: number;
        }[];
      };
      leaderboard_for_window: {
        Args: { from_ts: string; to_ts: string };
        Returns: {
          display_name: string;
          exact_hits: number;
          first_submit: string;
          rank: number;
          total_points: number;
          user_id: string;
          winner_gd_hits: number;
          winner_hits: number;
        }[];
      };
      league_id_for_slug: { Args: { p_slug: string }; Returns: string };
      leave_group: { Args: { p_group_id: string }; Returns: undefined };
      mark_round_reviewed: {
        Args: { p_provider_review_status?: string; p_round_id: string };
        Returns: undefined;
      };
      remove_group_member: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: undefined;
      };
      resolve_stage_multiplier: {
        Args: { p_competition_id: string; p_stage_key: string };
        Returns: number;
      };
      restart_league: { Args: { p_id: string }; Returns: undefined };
      round_can_accept_wager: { Args: { p_round_id: string }; Returns: boolean };
      round_effective_close: { Args: { p_round_id: string }; Returns: string };
      round_eligible_fixtures: {
        Args: { p_round_id: string };
        Returns: {
          away_team: string;
          group_code: string;
          home_team: string;
          kickoff_at: string;
          match_id: string;
          stage: string;
          status: string;
        }[];
      };
      score_prediction: {
        Args: {
          p_away_pick: number;
          p_away_result: number;
          p_home_pick: number;
          p_home_result: number;
          p_multiplier?: number;
        };
        Returns: {
          hit_type: string;
          points: number;
        }[];
      };
      set_active_competition: { Args: { p_id: string }; Returns: undefined };
      set_league_live: {
        Args: { p_id: string; p_live: boolean };
        Returns: undefined;
      };
      toggle_recap_reaction: {
        Args: { p_on: boolean; p_reaction: string; p_summary_id: string };
        Returns: {
          count: number;
          reaction: string;
        }[];
      };
      unassign_fixture_from_round: {
        Args: { p_match_id: string };
        Returns: undefined;
      };
      update_competition_round: {
        Args: {
          p_admin_closes_at?: string;
          p_display_order?: number;
          p_labels?: Json;
          p_opens_at?: string;
          p_provider_metadata?: Json;
          p_provider_review_status?: string;
          p_round_id: string;
          p_round_key?: string;
          p_round_number?: number;
          p_status?: string;
        };
        Returns: undefined;
      };
      validate_format_config: { Args: { p_config: Json }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
