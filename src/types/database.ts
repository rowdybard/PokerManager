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
      bankroll_accounts: {
        Row: {
          account_type: string
          created_at: string
          currency: string
          id: string
          is_archived: boolean
          name: string
          opening_balance_minor: number
          owner_id: string
          updated_at: string
        }
        Insert: {
          account_type: string
          created_at?: string
          currency?: string
          id?: string
          is_archived?: boolean
          name: string
          opening_balance_minor?: number
          owner_id: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          created_at?: string
          currency?: string
          id?: string
          is_archived?: boolean
          name?: string
          opening_balance_minor?: number
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bankroll_ledger_entries: {
        Row: {
          account_id: string
          amount_minor: number
          created_at: string
          currency: string
          description: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          external_reference: string | null
          id: string
          idempotency_key: string
          occurred_at: string
          owner_id: string
          reversal_of_id: string | null
          session_id: string | null
          settlement_id: string | null
        }
        Insert: {
          account_id: string
          amount_minor: number
          created_at?: string
          currency: string
          description: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          external_reference?: string | null
          id?: string
          idempotency_key: string
          occurred_at: string
          owner_id: string
          reversal_of_id?: string | null
          session_id?: string | null
          settlement_id?: string | null
        }
        Update: {
          account_id?: string
          amount_minor?: number
          created_at?: string
          currency?: string
          description?: string
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          external_reference?: string | null
          id?: string
          idempotency_key?: string
          occurred_at?: string
          owner_id?: string
          reversal_of_id?: string | null
          session_id?: string | null
          settlement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bankroll_ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bankroll_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bankroll_ledger_entries_reversal_of_id_fkey"
            columns: ["reversal_of_id"]
            isOneToOne: true
            referencedRelation: "bankroll_ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bankroll_ledger_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "career_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bankroll_ledger_entries_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      career_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          id: string
          owner_id: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          id?: string
          owner_id: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          id?: string
          owner_id?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: []
      }
      career_expenses: {
        Row: {
          amount_minor: number
          category: string
          created_at: string
          currency: string
          deductible: boolean
          id: string
          incurred_on: string
          merchant: string | null
          notes: string | null
          owner_id: string
          receipt_path: string | null
          session_id: string | null
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          amount_minor: number
          category: string
          created_at?: string
          currency: string
          deductible?: boolean
          id?: string
          incurred_on: string
          merchant?: string | null
          notes?: string | null
          owner_id: string
          receipt_path?: string | null
          session_id?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          category?: string
          created_at?: string
          currency?: string
          deductible?: boolean
          id?: string
          incurred_on?: string
          merchant?: string | null
          notes?: string | null
          owner_id?: string
          receipt_path?: string | null
          session_id?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_expenses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "career_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "poker_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      career_goals: {
        Row: {
          created_at: string
          current_value: number | null
          due_on: string | null
          id: string
          metric: string | null
          notes: string | null
          owner_id: string
          starts_on: string
          status: Database["public"]["Enums"]["goal_status"]
          target_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          due_on?: string | null
          id?: string
          metric?: string | null
          notes?: string | null
          owner_id: string
          starts_on: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          due_on?: string | null
          id?: string
          metric?: string | null
          notes?: string | null
          owner_id?: string
          starts_on?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      career_sessions: {
        Row: {
          buy_in_minor: number
          created_at: string
          currency: string
          data_quality: Database["public"]["Enums"]["data_quality"]
          duration_minutes: number | null
          ended_at: string | null
          entries: number
          fees_minor: number
          game_variant: string
          hands_played: number | null
          home_game_id: string | null
          id: string
          medium: Database["public"]["Enums"]["poker_medium"]
          notes: string | null
          owner_id: string
          payout_minor: number
          played_at: string
          profit_minor: number | null
          session_kind: Database["public"]["Enums"]["career_session_kind"]
          stakes: string | null
          tags: string[]
          timezone: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          buy_in_minor?: number
          created_at?: string
          currency?: string
          data_quality?: Database["public"]["Enums"]["data_quality"]
          duration_minutes?: number | null
          ended_at?: string | null
          entries?: number
          fees_minor?: number
          game_variant: string
          hands_played?: number | null
          home_game_id?: string | null
          id?: string
          medium: Database["public"]["Enums"]["poker_medium"]
          notes?: string | null
          owner_id: string
          payout_minor?: number
          played_at: string
          profit_minor?: number | null
          session_kind: Database["public"]["Enums"]["career_session_kind"]
          stakes?: string | null
          tags?: string[]
          timezone?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          buy_in_minor?: number
          created_at?: string
          currency?: string
          data_quality?: Database["public"]["Enums"]["data_quality"]
          duration_minutes?: number | null
          ended_at?: string | null
          entries?: number
          fees_minor?: number
          game_variant?: string
          hands_played?: number | null
          home_game_id?: string | null
          id?: string
          medium?: Database["public"]["Enums"]["poker_medium"]
          notes?: string | null
          owner_id?: string
          payout_minor?: number
          played_at?: string
          profit_minor?: number | null
          session_kind?: Database["public"]["Enums"]["career_session_kind"]
          stakes?: string | null
          tags?: string[]
          timezone?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_sessions_home_game_id_fkey"
            columns: ["home_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_group_members: {
        Row: {
          added_at: string
          contact_id: string
          group_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          group_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          created_at: string
          id: string
          league_id: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_groups_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived_at: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          merged_into_id: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          preferred_currency: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          merged_into_id?: string | null
          notes?: string | null
          owner_id: string
          phone?: string | null
          preferred_currency?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          merged_into_id?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          preferred_currency?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempt_count: number
          created_at: string
          delivery_status: string | null
          from_email: string
          game_id: string | null
          html_body: string
          id: string
          idempotency_key: string
          invite_id: string | null
          last_error: string | null
          league_id: string | null
          next_attempt_at: string
          owner_id: string
          processed_at: string | null
          provider_message_id: string | null
          settlement_id: string | null
          status: Database["public"]["Enums"]["email_queue_status"]
          subject: string
          text_body: string | null
          to_email: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivery_status?: string | null
          from_email: string
          game_id?: string | null
          html_body: string
          id?: string
          idempotency_key: string
          invite_id?: string | null
          last_error?: string | null
          league_id?: string | null
          next_attempt_at?: string
          owner_id: string
          processed_at?: string | null
          provider_message_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["email_queue_status"]
          subject: string
          text_body?: string | null
          to_email: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivery_status?: string | null
          from_email?: string
          game_id?: string | null
          html_body?: string
          id?: string
          idempotency_key?: string
          invite_id?: string | null
          last_error?: string | null
          league_id?: string | null
          next_attempt_at?: string
          owner_id?: string
          processed_at?: string | null
          provider_message_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["email_queue_status"]
          subject?: string
          text_body?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "game_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          enabled: boolean
          from_address: string | null
          owner_id: string
          provider: string
          reminder_schedule: Json
          reply_to: string | null
          sender_domain: string | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          from_address?: string | null
          owner_id: string
          provider?: string
          reminder_schedule?: Json
          reply_to?: string | null
          sender_domain?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          from_address?: string | null
          owner_id?: string
          provider?: string
          reminder_schedule?: Json
          reply_to?: string | null
          sender_domain?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_webhook_events: {
        Row: {
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          provider_event_id: string
          queue_id: string | null
          received_at: string
        }
        Insert: {
          event_type: string
          id?: string
          occurred_at: string
          payload: Json
          provider_event_id: string
          queue_id?: string | null
          received_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          provider_event_id?: string
          queue_id?: string | null
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_webhook_events_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "email_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      game_eliminations: {
        Row: {
          bounty_minor: number
          eliminated_by_participant_id: string | null
          game_id: string
          id: string
          note: string | null
          occurred_at: string
          participant_id: string
        }
        Insert: {
          bounty_minor?: number
          eliminated_by_participant_id?: string | null
          game_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          participant_id: string
        }
        Update: {
          bounty_minor?: number
          eliminated_by_participant_id?: string | null
          game_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_eliminations_eliminated_by_participant_id_fkey"
            columns: ["eliminated_by_participant_id"]
            isOneToOne: false
            referencedRelation: "game_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_eliminations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_eliminations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "game_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      game_invites: {
        Row: {
          contact_id: string | null
          created_at: string
          email_status: string | null
          game_id: string
          guest_count: number
          id: string
          invited_by: string | null
          last_sent_at: string | null
          player_id: string | null
          responded_at: string | null
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          token_expires_at: string | null
          token_hash: string | null
          token_revoked_at: string | null
          updated_at: string
          waitlist_position: number | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          email_status?: string | null
          game_id: string
          guest_count?: number
          id?: string
          invited_by?: string | null
          last_sent_at?: string | null
          player_id?: string | null
          responded_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          token_expires_at?: string | null
          token_hash?: string | null
          token_revoked_at?: string | null
          updated_at?: string
          waitlist_position?: number | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          email_status?: string | null
          game_id?: string
          guest_count?: number
          id?: string
          invited_by?: string | null
          last_sent_at?: string | null
          player_id?: string | null
          responded_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          token_expires_at?: string | null
          token_hash?: string | null
          token_revoked_at?: string | null
          updated_at?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_invites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_invites_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_invites_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_participants: {
        Row: {
          checked_in_at: string | null
          contact_id: string | null
          created_at: string
          display_name: string
          eliminated_at: string | null
          finish_position: number | null
          game_id: string
          guest_count: number
          id: string
          invite_id: string | null
          notes: string | null
          player_id: string | null
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          updated_at: string
        }
        Insert: {
          checked_in_at?: string | null
          contact_id?: string | null
          created_at?: string
          display_name: string
          eliminated_at?: string | null
          finish_position?: number | null
          game_id: string
          guest_count?: number
          id?: string
          invite_id?: string | null
          notes?: string | null
          player_id?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
        }
        Update: {
          checked_in_at?: string | null
          contact_id?: string | null
          created_at?: string
          display_name?: string
          eliminated_at?: string | null
          finish_position?: number | null
          game_id?: string
          guest_count?: number
          id?: string
          invite_id?: string | null
          notes?: string | null
          player_id?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_participants_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_participants_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_participants_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: true
            referencedRelation: "game_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_reconciliations: {
        Row: {
          calculated_at: string
          currency: string
          finalized_by: string | null
          game_id: string
          inflow_minor: number
          outflow_minor: number
          status: string
          variance_minor: number
        }
        Insert: {
          calculated_at?: string
          currency: string
          finalized_by?: string | null
          game_id: string
          inflow_minor?: number
          outflow_minor?: number
          status?: string
          variance_minor?: number
        }
        Update: {
          calculated_at?: string
          currency?: string
          finalized_by?: string | null
          game_id?: string
          inflow_minor?: number
          outflow_minor?: number
          status?: string
          variance_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_reconciliations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_results: {
        Row: {
          buy_in_amount: number
          created_at: string
          data_quality: Database["public"]["Enums"]["data_quality"]
          finalized_at: string | null
          finish_position: number
          game_id: string
          id: string
          payout: number
          payout_minor: number
          player_id: string
          points_earned: number
          rebuys: number
          total_buy_in_minor: number
        }
        Insert: {
          buy_in_amount?: number
          created_at?: string
          data_quality?: Database["public"]["Enums"]["data_quality"]
          finalized_at?: string | null
          finish_position: number
          game_id: string
          id?: string
          payout?: number
          payout_minor?: number
          player_id: string
          points_earned?: number
          rebuys?: number
          total_buy_in_minor?: number
        }
        Update: {
          buy_in_amount?: number
          created_at?: string
          data_quality?: Database["public"]["Enums"]["data_quality"]
          finalized_at?: string | null
          finish_position?: number
          game_id?: string
          id?: string
          payout?: number
          payout_minor?: number
          player_id?: string
          points_earned?: number
          rebuys?: number
          total_buy_in_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_results_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_result_versions: {
        Row: {
          add_on_count: number
          add_on_total_minor: number
          bounty_minor: number
          correction_of_id: string | null
          created_at: string
          created_by: string
          currency: string
          entry_minor: number
          finish_position: number
          game_id: string
          id: string
          idempotency_key: string
          is_post_finalization: boolean
          payout_minor: number
          player_id: string
          reentry_count: number
          reentry_total_minor: number
          total_buy_in_minor: number
          transaction_ids: string[]
          version: number
        }
        Insert: {
          add_on_count?: number
          add_on_total_minor?: number
          bounty_minor?: number
          correction_of_id?: string | null
          created_at?: string
          created_by: string
          currency: string
          entry_minor: number
          finish_position: number
          game_id: string
          id?: string
          idempotency_key: string
          is_post_finalization?: boolean
          payout_minor?: number
          player_id: string
          reentry_count?: number
          reentry_total_minor?: number
          total_buy_in_minor?: number
          transaction_ids?: string[]
          version: number
        }
        Update: {
          add_on_count?: number
          add_on_total_minor?: number
          bounty_minor?: number
          correction_of_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          entry_minor?: number
          finish_position?: number
          game_id?: string
          id?: string
          idempotency_key?: string
          is_post_finalization?: boolean
          payout_minor?: number
          player_id?: string
          reentry_count?: number
          reentry_total_minor?: number
          total_buy_in_minor?: number
          transaction_ids?: string[]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_result_versions_correction_of_id_fkey"
            columns: ["correction_of_id"]
            isOneToOne: true
            referencedRelation: "game_result_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_result_versions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_result_versions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_seats: {
        Row: {
          active: boolean
          game_id: string
          id: string
          left_at: string | null
          participant_id: string
          seat_number: number
          seated_at: string
          table_number: number
        }
        Insert: {
          active?: boolean
          game_id: string
          id?: string
          left_at?: string | null
          participant_id: string
          seat_number: number
          seated_at?: string
          table_number: number
        }
        Update: {
          active?: boolean
          game_id?: string
          id?: string
          left_at?: string | null
          participant_id?: string
          seat_number?: number
          seated_at?: string
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_seats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_seats_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "game_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      game_tables: {
        Row: {
          capacity: number | null
          created_at: string
          game_id: string
          id: string
          is_active: boolean
          name: string | null
          table_number: number
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          game_id: string
          id?: string
          is_active?: boolean
          name?: string | null
          table_number: number
        }
        Update: {
          capacity?: number | null
          created_at?: string
          game_id?: string
          id?: string
          is_active?: boolean
          name?: string | null
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_tables_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_template_invitees: {
        Row: {
          contact_id: string | null
          created_at: string
          group_id: string | null
          id: string
          template_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          template_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_template_invitees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_template_invitees_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_template_invitees_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "game_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      game_templates: {
        Row: {
          big_blind_minor: number | null
          bounty_minor: number
          buy_in_minor: number
          capacity: number | null
          created_at: string
          currency: string
          entry_fee_minor: number
          id: string
          is_archived: boolean
          kind: Database["public"]["Enums"]["game_kind"]
          league_id: string
          location: string | null
          max_buy_in_minor: number | null
          min_buy_in_minor: number | null
          name: string
          owner_id: string
          payout_rules: Json
          rake_minor: number
          recurrence_rule: string | null
          reminder_schedule: Json
          small_blind_minor: number | null
          structure_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          big_blind_minor?: number | null
          bounty_minor?: number
          buy_in_minor?: number
          capacity?: number | null
          created_at?: string
          currency?: string
          entry_fee_minor?: number
          id?: string
          is_archived?: boolean
          kind: Database["public"]["Enums"]["game_kind"]
          league_id: string
          location?: string | null
          max_buy_in_minor?: number | null
          min_buy_in_minor?: number | null
          name: string
          owner_id: string
          payout_rules?: Json
          rake_minor?: number
          recurrence_rule?: string | null
          reminder_schedule?: Json
          small_blind_minor?: number | null
          structure_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          big_blind_minor?: number | null
          bounty_minor?: number
          buy_in_minor?: number
          capacity?: number | null
          created_at?: string
          currency?: string
          entry_fee_minor?: number
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["game_kind"]
          league_id?: string
          location?: string | null
          max_buy_in_minor?: number | null
          min_buy_in_minor?: number | null
          name?: string
          owner_id?: string
          payout_rules?: Json
          rake_minor?: number
          recurrence_rule?: string | null
          reminder_schedule?: Json
          small_blind_minor?: number | null
          structure_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_templates_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_templates_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "tournament_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      game_transactions: {
        Row: {
          amount_minor: number
          created_at: string
          created_by: string
          currency: string
          effect_multiplier: number
          game_id: string
          id: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["game_transaction_type"]
          note: string | null
          participant_id: string | null
          player_id: string | null
          reversal_of_id: string | null
          reversed_at: string | null
        }
        Insert: {
          amount_minor: number
          created_at?: string
          created_by: string
          currency: string
          effect_multiplier?: number
          game_id: string
          id?: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["game_transaction_type"]
          note?: string | null
          participant_id?: string | null
          player_id?: string | null
          reversal_of_id?: string | null
          reversed_at?: string | null
        }
        Update: {
          amount_minor?: number
          created_at?: string
          created_by?: string
          currency?: string
          effect_multiplier?: number
          game_id?: string
          id?: string
          idempotency_key?: string
          kind?: Database["public"]["Enums"]["game_transaction_type"]
          note?: string | null
          participant_id?: string | null
          player_id?: string | null
          reversal_of_id?: string | null
          reversed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_transactions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_transactions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "game_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_transactions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_transactions_reversal_of_id_fkey"
            columns: ["reversal_of_id"]
            isOneToOne: true
            referencedRelation: "game_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          big_blind: number | null
          big_blind_minor: number | null
          bounty_minor: number | null
          buy_in: number
          buy_in_minor: number
          capacity: number | null
          created_at: string
          created_by: string | null
          creation_idempotency_key: string | null
          currency: string
          entry_fee: number | null
          entry_fee_minor: number
          finalization_idempotency_key: string | null
          finalized_at: string | null
          id: string
          invite_token_expires_at: string | null
          kind: Database["public"]["Enums"]["game_kind"]
          league_id: string
          location: string | null
          max_buy_in: number | null
          max_buy_in_minor: number | null
          min_buy_in: number | null
          min_buy_in_minor: number | null
          notes: string | null
          phase: Database["public"]["Enums"]["game_phase"]
          rake: number | null
          rake_minor: number | null
          scheduled_date: string
          scoring_rule_id: string | null
          season_id: string | null
          small_blind: number | null
          small_blind_minor: number | null
          started_at: string | null
          status: string
          template_id: string | null
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          big_blind?: number | null
          big_blind_minor?: number | null
          bounty_minor?: number | null
          buy_in?: number
          buy_in_minor?: number
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          creation_idempotency_key?: string | null
          currency?: string
          entry_fee?: number | null
          entry_fee_minor?: number
          finalization_idempotency_key?: string | null
          finalized_at?: string | null
          id?: string
          invite_token_expires_at?: string | null
          kind?: Database["public"]["Enums"]["game_kind"]
          league_id: string
          location?: string | null
          max_buy_in?: number | null
          max_buy_in_minor?: number | null
          min_buy_in?: number | null
          min_buy_in_minor?: number | null
          notes?: string | null
          phase?: Database["public"]["Enums"]["game_phase"]
          rake?: number | null
          rake_minor?: number | null
          scheduled_date: string
          scoring_rule_id?: string | null
          season_id?: string | null
          small_blind?: number | null
          small_blind_minor?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          timezone?: string
          title?: string
          updated_at?: string
        }
        Update: {
          big_blind?: number | null
          big_blind_minor?: number | null
          bounty_minor?: number | null
          buy_in?: number
          buy_in_minor?: number
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          creation_idempotency_key?: string | null
          currency?: string
          entry_fee?: number | null
          entry_fee_minor?: number
          finalization_idempotency_key?: string | null
          finalized_at?: string | null
          id?: string
          invite_token_expires_at?: string | null
          kind?: Database["public"]["Enums"]["game_kind"]
          league_id?: string
          location?: string | null
          max_buy_in?: number | null
          max_buy_in_minor?: number | null
          min_buy_in?: number | null
          min_buy_in_minor?: number | null
          notes?: string | null
          phase?: Database["public"]["Enums"]["game_phase"]
          rake?: number | null
          rake_minor?: number | null
          scheduled_date?: string
          scoring_rule_id?: string | null
          season_id?: string | null
          small_blind?: number | null
          small_blind_minor?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_scoring_rule_id_fkey"
            columns: ["scoring_rule_id"]
            isOneToOne: false
            referencedRelation: "league_scoring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "game_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      hand_opponents: {
        Row: {
          hand_id: string
          notes: string | null
          opponent_id: string
          owner_id: string
          seat_number: number | null
        }
        Insert: {
          hand_id: string
          notes?: string | null
          opponent_id: string
          owner_id: string
          seat_number?: number | null
        }
        Update: {
          hand_id?: string
          notes?: string | null
          opponent_id?: string
          owner_id?: string
          seat_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hand_opponents_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "poker_hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hand_opponents_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "poker_opponents"
            referencedColumns: ["id"]
          },
        ]
      }
      league_contacts: {
        Row: {
          added_at: string
          contact_id: string
          league_id: string
          player_id: string | null
        }
        Insert: {
          added_at?: string
          contact_id: string
          league_id: string
          player_id?: string | null
        }
        Update: {
          added_at?: string
          contact_id?: string
          league_id?: string
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_contacts_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_contacts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          joined_at: string
          league_id: string
          role: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          league_id: string
          role?: string
          user_id: string
        }
        Update: {
          joined_at?: string
          league_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_scoring_rules: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          id: string
          league_id: string
          name: string
          retired_at: string | null
          version: number
        }
        Insert: {
          config: Json
          created_at?: string
          created_by?: string | null
          id?: string
          league_id: string
          name?: string
          retired_at?: string | null
          version: number
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          league_id?: string
          name?: string
          retired_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_scoring_rules_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          creation_idempotency_key: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          points_system: Json
        }
        Insert: {
          created_at?: string
          creation_idempotency_key?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id?: string
          points_system?: Json
        }
        Update: {
          created_at?: string
          creation_idempotency_key?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          points_system?: Json
        }
        Relationships: []
      }
      plaid_connections: {
        Row: {
          access_token_ciphertext: string | null
          created_at: string
          cursor: string | null
          id: string
          institution_name: string | null
          item_id: string
          last_error: string | null
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          access_token_ciphertext?: string | null
          created_at?: string
          cursor?: string | null
          id?: string
          institution_name?: string | null
          item_id: string
          last_error?: string | null
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_token_ciphertext?: string | null
          created_at?: string
          cursor?: string | null
          id?: string
          institution_name?: string | null
          item_id?: string
          last_error?: string | null
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      plaid_reconciliation_candidates: {
        Row: {
          account_id: string
          amount_minor: number
          connection_id: string
          created_at: string
          currency: string
          date: string
          id: string
          match_status: Database["public"]["Enums"]["plaid_match_status"]
          matched_ledger_entry_id: string | null
          name: string
          owner_id: string
          pending: boolean
          plaid_transaction_id: string
          raw_payload: Json
          removed_at: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount_minor: number
          connection_id: string
          created_at?: string
          currency: string
          date: string
          id?: string
          match_status?: Database["public"]["Enums"]["plaid_match_status"]
          matched_ledger_entry_id?: string | null
          name: string
          owner_id: string
          pending?: boolean
          plaid_transaction_id: string
          raw_payload?: Json
          removed_at?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount_minor?: number
          connection_id?: string
          created_at?: string
          currency?: string
          date?: string
          id?: string
          match_status?: Database["public"]["Enums"]["plaid_match_status"]
          matched_ledger_entry_id?: string | null
          name?: string
          owner_id?: string
          pending?: boolean
          plaid_transaction_id?: string
          raw_payload?: Json
          removed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaid_reconciliation_candidates_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "plaid_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plaid_reconciliation_candidates_matched_ledger_entry_id_fkey"
            columns: ["matched_ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "bankroll_ledger_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_webhook_events: {
        Row: {
          event_type: string
          id: string
          item_id: string | null
          payload: Json
          processed_at: string | null
          provider_event_id: string
          received_at: string
        }
        Insert: {
          event_type: string
          id?: string
          item_id?: string | null
          payload: Json
          processed_at?: string | null
          provider_event_id: string
          received_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          item_id?: string | null
          payload?: Json
          processed_at?: string | null
          provider_event_id?: string
          received_at?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          avatar_url: string | null
          contact_id: string | null
          created_at: string
          display_name: string
          id: string
          league_id: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          contact_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          league_id: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          contact_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          league_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_hands: {
        Row: {
          board: string | null
          created_at: string
          currency: string
          game_variant: string
          hand_history: string
          hero_cards: string | null
          id: string
          notes: string | null
          opponent_aliases: string[]
          owner_id: string
          played_at: string
          position: string | null
          pot_minor: number | null
          result_minor: number | null
          review_status: Database["public"]["Enums"]["review_status"]
          session_id: string | null
          source: string
          source_hand_id: string | null
          stakes: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          board?: string | null
          created_at?: string
          currency?: string
          game_variant: string
          hand_history: string
          hero_cards?: string | null
          id?: string
          notes?: string | null
          opponent_aliases?: string[]
          owner_id: string
          played_at: string
          position?: string | null
          pot_minor?: number | null
          result_minor?: number | null
          review_status?: Database["public"]["Enums"]["review_status"]
          session_id?: string | null
          source: string
          source_hand_id?: string | null
          stakes?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          board?: string | null
          created_at?: string
          currency?: string
          game_variant?: string
          hand_history?: string
          hero_cards?: string | null
          id?: string
          notes?: string | null
          opponent_aliases?: string[]
          owner_id?: string
          played_at?: string
          position?: string | null
          pot_minor?: number | null
          result_minor?: number | null
          review_status?: Database["public"]["Enums"]["review_status"]
          session_id?: string | null
          source?: string
          source_hand_id?: string | null
          stakes?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poker_hands_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "career_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_opponents: {
        Row: {
          alias: string
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      poker_trips: {
        Row: {
          budget_minor: number | null
          created_at: string
          currency: string
          destination: string | null
          ends_on: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          starts_on: string
          updated_at: string
        }
        Insert: {
          budget_minor?: number | null
          created_at?: string
          currency?: string
          destination?: string | null
          ends_on?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          starts_on: string
          updated_at?: string
        }
        Update: {
          budget_minor?: number | null
          created_at?: string
          currency?: string
          destination?: string | null
          ends_on?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          starts_on?: string
          updated_at?: string
        }
        Relationships: []
      }
      professional_calendar_events: {
        Row: {
          created_at: string
          currency: string
          ends_at: string | null
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          exposure_minor: number | null
          id: string
          location: string | null
          notes: string | null
          owner_id: string
          session_id: string | null
          starts_at: string
          timezone: string
          title: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          ends_at?: string | null
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          exposure_minor?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          owner_id: string
          session_id?: string | null
          starts_at: string
          timezone?: string
          title: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          exposure_minor?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          owner_id?: string
          session_id?: string | null
          starts_at?: string
          timezone?: string
          title?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_calendar_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "career_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_calendar_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "poker_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          league_id: string
          name: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          league_id: string
          name: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          league_id?: string
          name?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount_minor: number
          confirmation_path: string | null
          counterparty: string
          created_at: string
          currency: string
          direction: string
          due_date: string | null
          external_handle: string | null
          external_method: string | null
          game_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          owner_id: string
          paid_at: string | null
          payer_contact_id: string | null
          provider_url: string | null
          reason: string
          recipient_contact_id: string | null
          revision: number
          session_id: string | null
          status: Database["public"]["Enums"]["settlement_status"]
          updated_at: string
        }
        Insert: {
          amount_minor: number
          confirmation_path?: string | null
          counterparty: string
          created_at?: string
          currency: string
          direction: string
          due_date?: string | null
          external_handle?: string | null
          external_method?: string | null
          game_id?: string | null
          id?: string
          idempotency_key: string
          memo?: string | null
          owner_id: string
          paid_at?: string | null
          payer_contact_id?: string | null
          provider_url?: string | null
          reason: string
          recipient_contact_id?: string | null
          revision?: number
          session_id?: string | null
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          confirmation_path?: string | null
          counterparty?: string
          created_at?: string
          currency?: string
          direction?: string
          due_date?: string | null
          external_handle?: string | null
          external_method?: string | null
          game_id?: string | null
          id?: string
          idempotency_key?: string
          memo?: string | null
          owner_id?: string
          paid_at?: string | null
          payer_contact_id?: string | null
          provider_url?: string | null
          reason?: string
          recipient_contact_id?: string | null
          revision?: number
          session_id?: string | null
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_payer_contact_id_fkey"
            columns: ["payer_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_recipient_contact_id_fkey"
            columns: ["recipient_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "career_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      staking_allocations: {
        Row: {
          allocated_buy_in_minor: number
          backer_result_minor: number
          created_at: string
          deal_id: string
          id: string
          notes: string | null
          owner_id: string
          player_result_minor: number
          session_id: string
          settled_at: string | null
        }
        Insert: {
          allocated_buy_in_minor: number
          backer_result_minor?: number
          created_at?: string
          deal_id: string
          id?: string
          notes?: string | null
          owner_id: string
          player_result_minor?: number
          session_id: string
          settled_at?: string | null
        }
        Update: {
          allocated_buy_in_minor?: number
          backer_result_minor?: number
          created_at?: string
          deal_id?: string
          id?: string
          notes?: string | null
          owner_id?: string
          player_result_minor?: number
          session_id?: string
          settled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staking_allocations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "staking_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staking_allocations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "career_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      staking_deals: {
        Row: {
          backer_name: string
          backer_share_bps: number
          created_at: string
          currency: string
          ends_on: string | null
          id: string
          makeup_minor: number
          markup_bps: number
          name: string
          notes: string | null
          owner_id: string
          player_share_bps: number
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          backer_name: string
          backer_share_bps: number
          created_at?: string
          currency: string
          ends_on?: string | null
          id?: string
          makeup_minor?: number
          markup_bps?: number
          name: string
          notes?: string | null
          owner_id: string
          player_share_bps: number
          starts_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          backer_name?: string
          backer_share_bps?: number
          created_at?: string
          currency?: string
          ends_on?: string | null
          id?: string
          makeup_minor?: number
          markup_bps?: number
          name?: string
          notes?: string | null
          owner_id?: string
          player_share_bps?: number
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_session_hands: {
        Row: {
          hand_id: string
          owner_id: string
          study_session_id: string
        }
        Insert: {
          hand_id: string
          owner_id: string
          study_session_id: string
        }
        Update: {
          hand_id?: string
          owner_id?: string
          study_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_session_hands_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "poker_hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_session_hands_study_session_id_fkey"
            columns: ["study_session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          owner_id: string
          resource: string | null
          studied_at: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          notes?: string | null
          owner_id: string
          resource?: string | null
          studied_at: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          owner_id?: string
          resource?: string | null
          studied_at?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournament_clocks: {
        Row: {
          current_level: number
          game_id: string
          is_running: boolean
          paused_at: string | null
          remaining_seconds: number
          revision: number
          started_at: string | null
          updated_at: string
        }
        Insert: {
          current_level?: number
          game_id: string
          is_running?: boolean
          paused_at?: string | null
          remaining_seconds?: number
          revision?: number
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          current_level?: number
          game_id?: string
          is_running?: boolean
          paused_at?: string | null
          remaining_seconds?: number
          revision?: number
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_clocks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_levels: {
        Row: {
          ante: number
          big_blind: number
          duration_seconds: number
          game_id: string
          id: string
          is_break: boolean
          label: string | null
          level_number: number
          small_blind: number
        }
        Insert: {
          ante?: number
          big_blind?: number
          duration_seconds?: number
          game_id: string
          id?: string
          is_break?: boolean
          label?: string | null
          level_number: number
          small_blind?: number
        }
        Update: {
          ante?: number
          big_blind?: number
          duration_seconds?: number
          game_id?: string
          id?: string
          is_break?: boolean
          label?: string | null
          level_number?: number
          small_blind?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_levels_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_structure_levels: {
        Row: {
          ante: number
          big_blind: number
          duration_seconds: number
          id: string
          is_break: boolean
          label: string | null
          level_number: number
          small_blind: number
          structure_id: string
        }
        Insert: {
          ante?: number
          big_blind?: number
          duration_seconds?: number
          id?: string
          is_break?: boolean
          label?: string | null
          level_number: number
          small_blind?: number
          structure_id: string
        }
        Update: {
          ante?: number
          big_blind?: number
          duration_seconds?: number
          id?: string
          is_break?: boolean
          label?: string | null
          level_number?: number
          small_blind?: number
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_structure_levels_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "tournament_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_structures: {
        Row: {
          created_at: string
          id: string
          late_registration_level: number | null
          league_id: string | null
          name: string
          notes: string | null
          owner_id: string
          starting_stack: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          late_registration_level?: number | null
          league_id?: string | null
          name: string
          notes?: string | null
          owner_id: string
          starting_stack?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          late_registration_level?: number | null
          league_id?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          starting_stack?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_structures_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_game_payouts: {
        Args: {
          p_game_id: string
          p_rules: Json
        }
        Returns: {
          amount_minor: number
          finish_position: number
        }[]
      }
      attach_settlement_confirmation: {
        Args: {
          p_confirmation_path: string
          p_expected_revision: number
          p_idempotency_key: string
          p_settlement_id: string
        }
        Returns: Database["public"]["Tables"]["settlements"]["Row"]
      }
      claim_email_queue: {
        Args: { p_limit: number }
        Returns: {
          attempt_count: number
          created_at: string
          delivery_status: string | null
          from_email: string
          game_id: string | null
          html_body: string
          id: string
          idempotency_key: string
          invite_id: string | null
          last_error: string | null
          league_id: string | null
          next_attempt_at: string
          owner_id: string
          processed_at: string | null
          provider_message_id: string | null
          settlement_id: string | null
          status: Database["public"]["Enums"]["email_queue_status"]
          subject: string
          text_body: string | null
          to_email: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      command_tournament_clock: {
        Args: {
          p_command: string
          p_expected_revision: number
          p_game_id: string
          p_idempotency_key: string
        }
        Returns: Database["public"]["Tables"]["tournament_clocks"]["Row"]
      }
      create_game_from_template: {
        Args: {
          p_idempotency_key: string
          p_scheduled_at: string
          p_template_id: string
          p_title: string
        }
        Returns: {
          big_blind: number | null
          big_blind_minor: number | null
          bounty_minor: number | null
          buy_in: number
          buy_in_minor: number
          capacity: number | null
          created_at: string
          created_by: string | null
          creation_idempotency_key: string | null
          currency: string
          entry_fee: number | null
          entry_fee_minor: number
          finalization_idempotency_key: string | null
          finalized_at: string | null
          id: string
          invite_token_expires_at: string | null
          kind: Database["public"]["Enums"]["game_kind"]
          league_id: string
          location: string | null
          max_buy_in: number | null
          max_buy_in_minor: number | null
          min_buy_in: number | null
          min_buy_in_minor: number | null
          notes: string | null
          phase: Database["public"]["Enums"]["game_phase"]
          rake: number | null
          rake_minor: number | null
          scheduled_date: string
          scoring_rule_id: string | null
          season_id: string | null
          small_blind: number | null
          small_blind_minor: number | null
          started_at: string | null
          status: string
          template_id: string | null
          timezone: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_league: {
        Args: {
          p_description: string
          p_idempotency_key: string
          p_name: string
          p_points_system: Json
        }
        Returns: {
          created_at: string
          creation_idempotency_key: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          points_system: Json
        }
        SetofOptions: {
          from: "*"
          to: "leagues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_settlement: {
        Args: {
          p_amount_minor: number
          p_counterparty: string
          p_currency: string
          p_direction: string
          p_due_date: string
          p_external_handle: string
          p_external_method: string
          p_idempotency_key: string
          p_memo: string
          p_owner_id: string
          p_reason: string
          p_session_id: string
        }
        Returns: {
          amount_minor: number
          confirmation_path: string | null
          counterparty: string
          created_at: string
          currency: string
          direction: string
          due_date: string | null
          external_handle: string | null
          external_method: string | null
          game_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          owner_id: string
          paid_at: string | null
          payer_contact_id: string | null
          provider_url: string | null
          reason: string
          recipient_contact_id: string | null
          revision: number
          session_id: string | null
          status: Database["public"]["Enums"]["settlement_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "settlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_league: {
        Args: {
          p_confirmation_name: string
          p_idempotency_key: string
          p_league_id: string
        }
        Returns: Json
      }
      finalize_game: {
        Args: { p_game_id: string; p_idempotency_key: string }
        Returns: {
          big_blind: number | null
          big_blind_minor: number | null
          bounty_minor: number | null
          buy_in: number
          buy_in_minor: number
          capacity: number | null
          created_at: string
          created_by: string | null
          creation_idempotency_key: string | null
          currency: string
          entry_fee: number | null
          entry_fee_minor: number
          finalization_idempotency_key: string | null
          finalized_at: string | null
          id: string
          invite_token_expires_at: string | null
          kind: Database["public"]["Enums"]["game_kind"]
          league_id: string
          location: string | null
          max_buy_in: number | null
          max_buy_in_minor: number | null
          min_buy_in: number | null
          min_buy_in_minor: number | null
          notes: string | null
          phase: Database["public"]["Enums"]["game_phase"]
          rake: number | null
          rake_minor: number | null
          scheduled_date: string
          scoring_rule_id: string | null
          season_id: string | null
          small_blind: number | null
          small_blind_minor: number | null
          started_at: string | null
          status: string
          template_id: string | null
          timezone: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_guest_invitation: { Args: { p_token_hash: string }; Returns: Json }
      issue_guest_invite: {
        Args: {
          p_actor_id: string
          p_expires_at: string
          p_game_id: string
          p_token_hash: string
        }
        Returns: Json
      }
      post_ledger_entry: {
        Args: {
          p_account_id: string
          p_amount_minor: number
          p_currency: string
          p_description: string
          p_entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          p_external_reference: string
          p_idempotency_key: string
          p_occurred_at: string
          p_owner_id: string
          p_session_id: string
        }
        Returns: {
          account_id: string
          amount_minor: number
          created_at: string
          currency: string
          description: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          external_reference: string | null
          id: string
          idempotency_key: string
          occurred_at: string
          owner_id: string
          reversal_of_id: string | null
          session_id: string | null
          settlement_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bankroll_ledger_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_email_webhook_event: {
        Args: {
          p_event_type: string
          p_occurred_at: string
          p_payload: Json
          p_provider_event_id: string
          p_provider_message_id: string
        }
        Returns: boolean
      }
      record_game_transaction: {
        Args: {
          p_amount_minor: number
          p_currency: string
          p_game_id: string
          p_idempotency_key: string
          p_kind: Database["public"]["Enums"]["game_transaction_type"]
          p_note: string
          p_participant_id: string
          p_player_id: string
        }
        Returns: {
          amount_minor: number
          created_at: string
          created_by: string
          currency: string
          effect_multiplier: number
          game_id: string
          id: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["game_transaction_type"]
          note: string | null
          participant_id: string | null
          player_id: string | null
          reversal_of_id: string | null
          reversed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "game_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_game_result: {
        Args: {
          p_add_on_count: number
          p_add_on_total_minor: number
          p_bounty_minor: number
          p_corrects_version_id: string
          p_currency: string
          p_entry_minor: number
          p_finish_position: number
          p_game_id: string
          p_idempotency_key: string
          p_payout_minor: number
          p_player_id: string
          p_reentry_count: number
          p_reentry_total_minor: number
        }
        Returns: Database["public"]["Tables"]["game_result_versions"]["Row"]
      }
      record_staking_allocation: {
        Args: {
          p_allocated_buy_in_minor: number
          p_deal_id: string
          p_expected_makeup_minor: number
          p_idempotency_key: string
          p_notes: string
          p_owner_id: string
          p_session_id: string
          p_total_result_minor: number
        }
        Returns: Json
      }
      respond_to_guest_invitation: {
        Args: {
          p_guest_count: number
          p_idempotency_key: string
          p_status: Database["public"]["Enums"]["rsvp_status"]
          p_token_hash: string
        }
        Returns: Json
      }
      reverse_ledger_entry: {
        Args: {
          p_entry_id: string
          p_idempotency_key: string
          p_owner_id: string
          p_reason: string
        }
        Returns: {
          account_id: string
          amount_minor: number
          created_at: string
          currency: string
          description: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          external_reference: string | null
          id: string
          idempotency_key: string
          occurred_at: string
          owner_id: string
          reversal_of_id: string | null
          session_id: string | null
          settlement_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bankroll_ledger_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reverse_game_transaction: {
        Args: {
          p_game_id: string
          p_idempotency_key: string
          p_note: string
          p_transaction_id: string
        }
        Returns: Database["public"]["Tables"]["game_transactions"]["Row"]
      }
      set_active_season: {
        Args: { p_league_id: string; p_season_id: string }
        Returns: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          league_id: string
          name: string
          start_date: string | null
        }
        SetofOptions: {
          from: "*"
          to: "seasons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_game_check_in: {
        Args: {
          p_checked_in: boolean
          p_game_id: string
          p_idempotency_key: string
          p_participant_id: string
        }
        Returns: {
          checked_in_at: string | null
          contact_id: string | null
          created_at: string
          display_name: string
          eliminated_at: string | null
          finish_position: number | null
          game_id: string
          guest_count: number
          id: string
          invite_id: string | null
          notes: string | null
          player_id: string | null
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "game_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_settlement: {
        Args: {
          p_expected_revision: number
          p_idempotency_key: string
          p_new_status: Database["public"]["Enums"]["settlement_status"]
          p_settlement_id: string
        }
        Returns: Database["public"]["Tables"]["settlements"]["Row"]
      }
    }
    Enums: {
      calendar_event_type:
        | "session"
        | "tournament"
        | "series"
        | "registration"
        | "travel"
        | "study"
        | "other"
      career_session_kind: "cash" | "tournament"
      data_quality: "trusted" | "legacy_incomplete"
      email_queue_status:
        | "queued"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
      game_kind: "cash" | "tournament"
      game_phase:
        | "draft"
        | "inviting"
        | "registration"
        | "in_progress"
        | "closing"
        | "finalized"
        | "cancelled"
      game_transaction_type:
        | "buy_in"
        | "reload"
        | "cash_out"
        | "entry"
        | "re_entry"
        | "add_on"
        | "bounty"
        | "tip"
        | "fee"
        | "payout"
        | "adjustment"
      goal_status: "active" | "completed" | "paused" | "cancelled"
      ledger_entry_type:
        | "opening_balance"
        | "deposit"
        | "withdrawal"
        | "buy_in"
        | "cash_out"
        | "expense"
        | "winnings"
        | "transfer"
        | "adjustment"
        | "reversal"
      plaid_match_status: "unreviewed" | "matched" | "ignored"
      poker_medium: "live" | "online"
      review_status:
        | "unreviewed"
        | "queued"
        | "reviewing"
        | "reviewed"
        | "archived"
      rsvp_status: "pending" | "yes" | "maybe" | "no" | "waitlisted"
      settlement_status: "pending" | "paid" | "disputed" | "void"
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
      calendar_event_type: [
        "session",
        "tournament",
        "series",
        "registration",
        "travel",
        "study",
        "other",
      ],
      career_session_kind: ["cash", "tournament"],
      data_quality: ["trusted", "legacy_incomplete"],
      email_queue_status: [
        "queued",
        "processing",
        "sent",
        "failed",
        "cancelled",
      ],
      game_kind: ["cash", "tournament"],
      game_phase: [
        "draft",
        "inviting",
        "registration",
        "in_progress",
        "closing",
        "finalized",
        "cancelled",
      ],
      game_transaction_type: [
        "buy_in",
        "reload",
        "cash_out",
        "entry",
        "re_entry",
        "add_on",
        "bounty",
        "tip",
        "fee",
        "payout",
        "adjustment",
      ],
      goal_status: ["active", "completed", "paused", "cancelled"],
      ledger_entry_type: [
        "opening_balance",
        "deposit",
        "withdrawal",
        "buy_in",
        "cash_out",
        "expense",
        "winnings",
        "transfer",
        "adjustment",
        "reversal",
      ],
      plaid_match_status: ["unreviewed", "matched", "ignored"],
      poker_medium: ["live", "online"],
      review_status: [
        "unreviewed",
        "queued",
        "reviewing",
        "reviewed",
        "archived",
      ],
      rsvp_status: ["pending", "yes", "maybe", "no", "waitlisted"],
      settlement_status: ["pending", "paid", "disputed", "void"],
    },
  },
} as const
