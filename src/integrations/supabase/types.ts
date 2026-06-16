export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_log: {
        Row: {
          changed_at: string
          consent_coach_training: boolean
          consent_physio_health: boolean
          id: string
          source: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          consent_coach_training: boolean
          consent_physio_health: boolean
          id?: string
          source?: string
          user_id: string
        }
        Update: {
          changed_at?: string
          consent_coach_training?: boolean
          consent_physio_health?: boolean
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      data_access_log: {
        Row: {
          accessed_at: string
          action: string
          actor_id: string
          context: string | null
          id: string
          resource: string
          subject_id: string
        }
        Insert: {
          accessed_at?: string
          action?: string
          actor_id: string
          context?: string | null
          id?: string
          resource: string
          subject_id: string
        }
        Update: {
          accessed_at?: string
          action?: string
          actor_id?: string
          context?: string | null
          id?: string
          resource?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_log_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_log_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          event_id: string
          id: string
          responded_at: string
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          responded_at?: string
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          responded_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          duration_seconds: number | null
          group_color: string | null
          group_id: string | null
          group_label: string | null
          id: string
          instructions: string | null
          manual_finish: boolean
          name: string
          notes: string | null
          order_index: number
          reps: number
          rest_seconds: number | null
          session_id: string
          sets: number
          weight_kg: number | null
          weight_pct: number | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          group_color?: string | null
          group_id?: string | null
          group_label?: string | null
          id?: string
          instructions?: string | null
          manual_finish?: boolean
          name: string
          notes?: string | null
          order_index?: number
          reps?: number
          rest_seconds?: number | null
          session_id: string
          sets?: number
          weight_kg?: number | null
          weight_pct?: number | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          group_color?: string | null
          group_id?: string | null
          group_label?: string | null
          id?: string
          instructions?: string | null
          manual_finish?: boolean
          name?: string
          notes?: string | null
          order_index?: number
          reps?: number
          rest_seconds?: number | null
          session_id?: string
          sets?: number
          weight_kg?: number | null
          weight_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_minutes: {
        Row: {
          athlete_id: string
          created_at: string
          game_id: string
          id: string
          minutes_played: number
          notes: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          game_id: string
          id?: string
          minutes_played: number
          notes?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          game_id?: string
          id?: string
          minutes_played?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_minutes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rsvps: {
        Row: {
          game_id: string
          id: string
          responded_at: string
          status: string
          user_id: string
        }
        Insert: {
          game_id: string
          id?: string
          responded_at?: string
          status?: string
          user_id: string
        }
        Update: {
          game_id?: string
          id?: string
          responded_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          coach_id: string
          created_at: string
          game_date: string
          game_time: string | null
          id: string
          location: string | null
          notes: string | null
          opponent: string
          team_id: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          game_date: string
          game_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          opponent: string
          team_id: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          game_date?: string
          game_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          opponent?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      injury_checkins: {
        Row: {
          athlete_id: string
          body_regions: string[]
          function_score: number | null
          id: string
          notes: string | null
          pain_level: number
          submitted_at: string
        }
        Insert: {
          athlete_id: string
          body_regions?: string[]
          function_score?: number | null
          id?: string
          notes?: string | null
          pain_level: number
          submitted_at?: string
        }
        Update: {
          athlete_id?: string
          body_regions?: string[]
          function_score?: number | null
          id?: string
          notes?: string | null
          pain_level?: number
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "injury_checkins_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injury_checkins_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      injury_records: {
        Row: {
          actual_rtp_date: string | null
          athlete_id: string
          body_region: string
          created_at: string
          date_of_injury: string
          expected_rtp_date: string | null
          id: string
          injury_type: string
          physio_id: string
          rtp_notes: string | null
          rtp_status: Database["public"]["Enums"]["rtp_status"]
          severity: number
          treatment_notes: string | null
          updated_at: string
        }
        Insert: {
          actual_rtp_date?: string | null
          athlete_id: string
          body_region: string
          created_at?: string
          date_of_injury: string
          expected_rtp_date?: string | null
          id?: string
          injury_type: string
          physio_id: string
          rtp_notes?: string | null
          rtp_status?: Database["public"]["Enums"]["rtp_status"]
          severity: number
          treatment_notes?: string | null
          updated_at?: string
        }
        Update: {
          actual_rtp_date?: string | null
          athlete_id?: string
          body_region?: string
          created_at?: string
          date_of_injury?: string
          expected_rtp_date?: string | null
          id?: string
          injury_type?: string
          physio_id?: string
          rtp_notes?: string | null
          rtp_status?: Database["public"]["Enums"]["rtp_status"]
          severity?: number
          treatment_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "injury_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injury_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injury_records_physio_id_fkey"
            columns: ["physio_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injury_records_physio_id_fkey"
            columns: ["physio_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      nudges: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_path: string | null
          message: string
          recipient_id: string
          sender_id: string | null
          type: Database["public"]["Enums"]["nudge_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_path?: string | null
          message: string
          recipient_id: string
          sender_id?: string | null
          type: Database["public"]["Enums"]["nudge_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_path?: string | null
          message?: string
          recipient_id?: string
          sender_id?: string | null
          type?: Database["public"]["Enums"]["nudge_type"]
        }
        Relationships: [
          {
            foreignKeyName: "nudges_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          athlete_id: string
          exercise_name: string
          id: string
          reps: number
          weight_kg: number
        }
        Insert: {
          achieved_at?: string
          athlete_id: string
          exercise_name: string
          id?: string
          reps: number
          weight_kg: number
        }
        Update: {
          achieved_at?: string
          athlete_id?: string
          exercise_name?: string
          id?: string
          reps?: number
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      physio_case_notes: {
        Row: {
          athlete_id: string
          case_date: string
          created_at: string
          id: string
          injury_record_id: string | null
          note: string
          physio_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          case_date?: string
          created_at?: string
          id?: string
          injury_record_id?: string | null
          note: string
          physio_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          case_date?: string
          created_at?: string
          id?: string
          injury_record_id?: string | null
          note?: string
          physio_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_workout_logs: {
        Row: {
          athlete_id: string
          created_at: string
          fatigue: number
          id: string
          log_date: string
          mood: number
          notes: string | null
          rpe: number
          session_id: string | null
          soreness: number
        }
        Insert: {
          athlete_id: string
          created_at?: string
          fatigue: number
          id?: string
          log_date?: string
          mood: number
          notes?: string | null
          rpe: number
          session_id?: string | null
          soreness: number
        }
        Update: {
          athlete_id?: string
          created_at?: string
          fatigue?: number
          id?: string
          log_date?: string
          mood?: number
          notes?: string | null
          rpe?: number
          session_id?: string | null
          soreness?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          consent_at: string | null
          consent_coach_training: boolean
          consent_physio_health: boolean
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          onboarding_complete: boolean
          position: string | null
          role: Database["public"]["Enums"]["app_role"]
          sport: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          consent_at?: string | null
          consent_coach_training?: boolean
          consent_physio_health?: boolean
          created_at?: string
          email: string
          first_name?: string
          id: string
          last_name?: string
          onboarding_complete?: boolean
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sport?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          consent_at?: string | null
          consent_coach_training?: boolean
          consent_physio_health?: boolean
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          onboarding_complete?: boolean
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sport?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          coach_id: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          sport: string | null
          start_date: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          sport?: string | null
          start_date?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          sport?: string | null
          start_date?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programmes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      session_completions: {
        Row: {
          athlete_id: string
          completed_at: string
          id: string
          rpe: number | null
          session_id: string
        }
        Insert: {
          athlete_id: string
          completed_at?: string
          id?: string
          rpe?: number | null
          session_id: string
        }
        Update: {
          athlete_id?: string
          completed_at?: string
          id?: string
          rpe?: number | null
          session_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          day_index: number
          id: string
          is_rest_day: boolean
          name: string
          notes: string | null
          programme_id: string
          session_date: string
        }
        Insert: {
          created_at?: string
          day_index?: number
          id?: string
          is_rest_day?: boolean
          name: string
          notes?: string | null
          programme_id: string
          session_date: string
        }
        Update: {
          created_at?: string
          day_index?: number
          id?: string
          is_rest_day?: boolean
          name?: string
          notes?: string | null
          programme_id?: string
          session_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      set_completions: {
        Row: {
          athlete_id: string
          completed_at: string
          elapsed_sec: number | null
          exercise_id: string
          id: string
          reps: number
          rpe: number | null
          session_id: string
          set_number: number
          weight_kg: number | null
        }
        Insert: {
          athlete_id: string
          completed_at?: string
          elapsed_sec?: number | null
          exercise_id: string
          id?: string
          reps: number
          rpe?: number | null
          session_id: string
          set_number: number
          weight_kg?: number | null
        }
        Update: {
          athlete_id?: string
          completed_at?: string
          elapsed_sec?: number | null
          exercise_id?: string
          id?: string
          reps?: number
          rpe?: number | null
          session_id?: string
          set_number?: number
          weight_kg?: number | null
        }
        Relationships: []
      }
      team_events: {
        Row: {
          created_at: string
          created_by: string
          description: string
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          location: string | null
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          event_date: string
          event_time?: string | null
          event_type?: string
          id?: string
          location?: string | null
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          location?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          max_uses: number
          note: string | null
          team_id: string
          token: string
          use_count: number
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          max_uses?: number
          note?: string | null
          team_id: string
          token: string
          use_count?: number
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          max_uses?: number
          note?: string | null
          team_id?: string
          token?: string
          use_count?: number
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          join_code: string
          name: string
          sport: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          join_code: string
          name: string
          sport: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          join_code?: string
          name?: string
          sport?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_checkins: {
        Row: {
          athlete_id: string
          checkin_date: string
          created_at: string
          id: string
          notes: string | null
          readiness: number
          sleep_hours: number
          sleep_quality: number
        }
        Insert: {
          athlete_id: string
          checkin_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          readiness: number
          sleep_hours: number
          sleep_quality: number
        }
        Update: {
          athlete_id?: string
          checkin_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          readiness?: number
          sleep_hours?: number
          sleep_quality?: number
        }
        Relationships: []
      }
      wellness_skips: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          skip_date: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          skip_date?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          skip_date?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          actual_reps: number
          actual_weight_kg: number
          athlete_id: string
          exercise_id: string
          id: string
          is_pr: boolean
          logged_at: string
          session_id: string
          set_number: number
        }
        Insert: {
          actual_reps: number
          actual_weight_kg: number
          athlete_id: string
          exercise_id: string
          id?: string
          is_pr?: boolean
          logged_at?: string
          session_id: string
          set_number: number
        }
        Update: {
          actual_reps?: number
          actual_weight_kg?: number
          athlete_id?: string
          exercise_id?: string
          id?: string
          is_pr?: boolean
          logged_at?: string
          session_id?: string
          set_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      injury_summary_for_coach: {
        Row: {
          actual_rtp_date: string | null
          athlete_id: string | null
          body_region: string | null
          date_of_injury: string | null
          expected_rtp_date: string | null
          id: string | null
          injury_type: string | null
          rtp_status: Database["public"]["Enums"]["rtp_status"] | null
          severity: number | null
          updated_at: string | null
        }
        Insert: {
          actual_rtp_date?: string | null
          athlete_id?: string | null
          body_region?: string | null
          date_of_injury?: string | null
          expected_rtp_date?: string | null
          id?: string | null
          injury_type?: string | null
          rtp_status?: Database["public"]["Enums"]["rtp_status"] | null
          severity?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_rtp_date?: string | null
          athlete_id?: string | null
          body_region?: string | null
          date_of_injury?: string | null
          expected_rtp_date?: string | null
          id?: string | null
          injury_type?: string | null
          rtp_status?: Database["public"]["Enums"]["rtp_status"] | null
          severity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injury_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injury_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      rtp_status_view: {
        Row: {
          athlete_id: string | null
          expected_rtp_date: string | null
          rtp_status: Database["public"]["Enums"]["rtp_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injury_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injury_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "team_members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members_safe: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          position: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          sport: string | null
          team_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          sport?: string | null
          team_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          sport?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      consume_team_invite: { Args: { _token: string }; Returns: string }
      find_team_by_code: {
        Args: { _code: string }
        Returns: {
          coach_id: string
          id: string
          name: string
          sport: string
        }[]
      }
      generate_join_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_team_invite: {
        Args: { _token: string }
        Returns: {
          expired: boolean
          expires_at: string
          invite_id: string
          max_uses: number
          seats_remaining: number
          team_id: string
          team_name: string
          team_sport: string
          use_count: number
          used: boolean
        }[]
      }
      my_team_id: { Args: never; Returns: string }
      profile_self_update_safe: {
        Args: {
          _new: Database["public"]["Tables"]["profiles"]["Row"]
          _old: Database["public"]["Tables"]["profiles"]["Row"]
        }
        Returns: boolean
      }
      save_game_minutes_bulk: {
        Args: { _game_id: string; _rows: Json }
        Returns: number
      }
      team_completion_stats: {
        Args: { _from: string; _to: string }
        Returns: {
          athlete_id: string
          athlete_position: string
          completed_sessions: number
          first_name: string
          has_active_injury: boolean
          last_exercise_name: string
          last_logged_at: string
          last_name: string
          scheduled_sessions: number
          sport: string
          total_game_minutes: number
        }[]
      }
      team_rtp_pulse: {
        Args: never
        Returns: {
          athlete_id: string
          expected_rtp_date: string
          rtp_status: Database["public"]["Enums"]["rtp_status"]
        }[]
      }
      user_team_id: { Args: { _user_id: string }; Returns: string }
      validate_invite_code: {
        Args: { _code: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "athlete" | "coach" | "physio" | "admin"
      nudge_type:
        | "new_programme"
        | "pr_achieved"
        | "missed_session"
        | "rtp_status_change"
        | "injury_flagged"
        | "checkin_reminder"
      rtp_status: "unavailable" | "modified" | "cleared"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["athlete", "coach", "physio", "admin"],
      nudge_type: [
        "new_programme",
        "pr_achieved",
        "missed_session",
        "rtp_status_change",
        "injury_flagged",
        "checkin_reminder",
      ],
      rtp_status: ["unavailable", "modified", "cleared"],
    },
  },
} as const
