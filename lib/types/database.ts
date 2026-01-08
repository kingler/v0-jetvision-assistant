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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_executions: {
        Row: {
          agent_id: string
          agent_type: Database["public"]["Enums"]["agent_type"]
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          execution_time_ms: number | null
          id: string
          input_data: Json | null
          metadata: Json | null
          output_data: Json | null
          request_id: string | null
          retry_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["execution_status"]
        }
        Insert: {
          agent_id: string
          agent_type: Database["public"]["Enums"]["agent_type"]
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          metadata?: Json | null
          output_data?: Json | null
          request_id?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_status"]
        }
        Update: {
          agent_id?: string
          agent_type?: Database["public"]["Enums"]["agent_type"]
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          metadata?: Json | null
          output_data?: Json | null
          request_id?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_status"]
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      avinode_webhook_events: {
        Row: {
          avinode_event_id: string
          avinode_quote_id: string | null
          avinode_rfp_id: string | null
          avinode_thread_id: string | null
          avinode_timestamp: string | null
          avinode_trip_id: string | null
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          event_type: Database["public"]["Enums"]["avinode_event_type"]
          headers: Json | null
          id: string
          max_retries: number | null
          message_id: string | null
          next_retry_at: string | null
          operator_profile_id: string | null
          parsed_data: Json | null
          processed_at: string | null
          processing_duration_ms: number | null
          processing_status: Database["public"]["Enums"]["webhook_processing_status"]
          quote_id: string | null
          raw_payload: Json
          received_at: string | null
          request_id: string | null
          retry_count: number | null
          signature_verified: boolean | null
          source_ip: string | null
          user_agent: string | null
          webhook_secret_version: string | null
        }
        Insert: {
          avinode_event_id: string
          avinode_quote_id?: string | null
          avinode_rfp_id?: string | null
          avinode_thread_id?: string | null
          avinode_timestamp?: string | null
          avinode_trip_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          event_type: Database["public"]["Enums"]["avinode_event_type"]
          headers?: Json | null
          id?: string
          max_retries?: number | null
          message_id?: string | null
          next_retry_at?: string | null
          operator_profile_id?: string | null
          parsed_data?: Json | null
          processed_at?: string | null
          processing_duration_ms?: number | null
          processing_status?: Database["public"]["Enums"]["webhook_processing_status"]
          quote_id?: string | null
          raw_payload: Json
          received_at?: string | null
          request_id?: string | null
          retry_count?: number | null
          signature_verified?: boolean | null
          source_ip?: string | null
          user_agent?: string | null
          webhook_secret_version?: string | null
        }
        Update: {
          avinode_event_id?: string
          avinode_quote_id?: string | null
          avinode_rfp_id?: string | null
          avinode_thread_id?: string | null
          avinode_timestamp?: string | null
          avinode_trip_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          event_type?: Database["public"]["Enums"]["avinode_event_type"]
          headers?: Json | null
          id?: string
          max_retries?: number | null
          message_id?: string | null
          next_retry_at?: string | null
          operator_profile_id?: string | null
          parsed_data?: Json | null
          processed_at?: string | null
          processing_duration_ms?: number | null
          processing_status?: Database["public"]["Enums"]["webhook_processing_status"]
          quote_id?: string | null
          raw_payload?: Json
          received_at?: string | null
          request_id?: string | null
          retry_count?: number | null
          signature_verified?: boolean | null
          source_ip?: string | null
          user_agent?: string | null
          webhook_secret_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avinode_webhook_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avinode_webhook_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avinode_webhook_events_operator_profile_id_fkey"
            columns: ["operator_profile_id"]
            isOneToOne: false
            referencedRelation: "operator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avinode_webhook_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avinode_webhook_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          avinode_rfp_id: string | null
          avinode_rfq_id: string | null
          avinode_trip_id: string | null
          conversation_id: string
          conversation_type: string | null
          created_at: string
          current_step: string | null
          id: string
          iso_agent_id: string
          last_activity_at: string
          message_count: number | null
          metadata: Json | null
          operators_contacted_count: number | null
          primary_quote_id: string | null
          proposal_id: string | null
          quotes_expected_count: number | null
          quotes_received_count: number | null
          request_id: string | null
          session_ended_at: string | null
          session_started_at: string
          status: Database["public"]["Enums"]["chat_session_status"]
          updated_at: string
          workflow_state: Json | null
        }
        Insert: {
          avinode_rfp_id?: string | null
          avinode_rfq_id?: string | null
          avinode_trip_id?: string | null
          conversation_id: string
          conversation_type?: string | null
          created_at?: string
          current_step?: string | null
          id?: string
          iso_agent_id: string
          last_activity_at?: string
          message_count?: number | null
          metadata?: Json | null
          operators_contacted_count?: number | null
          primary_quote_id?: string | null
          proposal_id?: string | null
          quotes_expected_count?: number | null
          quotes_received_count?: number | null
          request_id?: string | null
          session_ended_at?: string | null
          session_started_at?: string
          status?: Database["public"]["Enums"]["chat_session_status"]
          updated_at?: string
          workflow_state?: Json | null
        }
        Update: {
          avinode_rfp_id?: string | null
          avinode_rfq_id?: string | null
          avinode_trip_id?: string | null
          conversation_id?: string
          conversation_type?: string | null
          created_at?: string
          current_step?: string | null
          id?: string
          iso_agent_id?: string
          last_activity_at?: string
          message_count?: number | null
          metadata?: Json | null
          operators_contacted_count?: number | null
          primary_quote_id?: string | null
          proposal_id?: string | null
          quotes_expected_count?: number | null
          quotes_received_count?: number | null
          request_id?: string | null
          session_ended_at?: string | null
          session_started_at?: string
          status?: Database["public"]["Enums"]["chat_session_status"]
          updated_at?: string
          workflow_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_iso_agent_id_fkey"
            columns: ["iso_agent_id"]
            isOneToOne: false
            referencedRelation: "iso_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_primary_quote_id_fkey"
            columns: ["primary_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      chatkit_sessions: {
        Row: {
          clerk_user_id: string
          created_at: string
          device_id: string
          expires_at: string
          id: string
          last_activity_at: string
          metadata: Json | null
          session_token: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          workflow_id: string
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          device_id: string
          expires_at: string
          id?: string
          last_activity_at?: string
          metadata?: Json | null
          session_token: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          workflow_id: string
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          device_id?: string
          expires_at?: string
          id?: string
          last_activity_at?: string
          metadata?: Json | null
          session_token?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          workflow_id?: string
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          iso_agent_id: string
          notes: string | null
          phone: string | null
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          iso_agent_id: string
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          iso_agent_id?: string
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_iso_agent_id_fkey"
            columns: ["iso_agent_id"]
            isOneToOne: false
            referencedRelation: "iso_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          can_invite: boolean | null
          can_reply: boolean | null
          conversation_id: string
          id: string
          is_active: boolean | null
          is_typing: boolean | null
          iso_agent_id: string | null
          joined_at: string | null
          last_read_at: string | null
          last_read_message_id: string | null
          left_at: string | null
          metadata: Json | null
          muted_until: string | null
          notifications_enabled: boolean | null
          operator_profile_id: string | null
          role: Database["public"]["Enums"]["participant_role"]
          typing_started_at: string | null
          unread_count: number | null
        }
        Insert: {
          can_invite?: boolean | null
          can_reply?: boolean | null
          conversation_id: string
          id?: string
          is_active?: boolean | null
          is_typing?: boolean | null
          iso_agent_id?: string | null
          joined_at?: string | null
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          metadata?: Json | null
          muted_until?: string | null
          notifications_enabled?: boolean | null
          operator_profile_id?: string | null
          role: Database["public"]["Enums"]["participant_role"]
          typing_started_at?: string | null
          unread_count?: number | null
        }
        Update: {
          can_invite?: boolean | null
          can_reply?: boolean | null
          conversation_id?: string
          id?: string
          is_active?: boolean | null
          is_typing?: boolean | null
          iso_agent_id?: string | null
          joined_at?: string | null
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          metadata?: Json | null
          muted_until?: string | null
          notifications_enabled?: boolean | null
          operator_profile_id?: string | null
          role?: Database["public"]["Enums"]["participant_role"]
          typing_started_at?: string | null
          unread_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_iso_agent_id_fkey"
            columns: ["iso_agent_id"]
            isOneToOne: false
            referencedRelation: "iso_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_operator_profile_id_fkey"
            columns: ["operator_profile_id"]
            isOneToOne: false
            referencedRelation: "operator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_last_read_message"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_state: {
        Row: {
          completed_fields: string[] | null
          conversation_history: Json | null
          created_at: string | null
          current_step: string
          data: Json
          history: string[] | null
          id: string
          metadata: Json | null
          missing_fields: string[] | null
          thread_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_fields?: string[] | null
          conversation_history?: Json | null
          created_at?: string | null
          current_step: string
          data?: Json
          history?: string[] | null
          id?: string
          metadata?: Json | null
          missing_fields?: string[] | null
          thread_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_fields?: string[] | null
          conversation_history?: Json | null
          created_at?: string | null
          current_step?: string
          data?: Json
          history?: string[] | null
          id?: string
          metadata?: Json | null
          missing_fields?: string[] | null
          thread_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          avinode_thread_id: string | null
          chatkit_thread_id: string | null
          created_at: string | null
          id: string
          is_pinned: boolean | null
          is_priority: boolean | null
          last_message_at: string | null
          last_message_by: string | null
          message_count: number | null
          metadata: Json | null
          quote_id: string | null
          request_id: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          unread_count_iso: number | null
          unread_count_operator: number | null
          updated_at: string | null
        }
        Insert: {
          avinode_thread_id?: string | null
          chatkit_thread_id?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_priority?: boolean | null
          last_message_at?: string | null
          last_message_by?: string | null
          message_count?: number | null
          metadata?: Json | null
          quote_id?: string | null
          request_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          unread_count_iso?: number | null
          unread_count_operator?: number | null
          updated_at?: string | null
        }
        Update: {
          avinode_thread_id?: string | null
          chatkit_thread_id?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_priority?: boolean | null
          last_message_at?: string | null
          last_message_by?: string | null
          message_count?: number | null
          metadata?: Json | null
          quote_id?: string | null
          request_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          unread_count_iso?: number | null
          unread_count_operator?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      iso_agents: {
        Row: {
          clerk_user_id: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          margin_type: Database["public"]["Enums"]["margin_type"] | null
          margin_value: number | null
          metadata: Json | null
          notification_preferences: Json | null
          online_status: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          clerk_user_id: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          margin_type?: Database["public"]["Enums"]["margin_type"] | null
          margin_value?: number | null
          metadata?: Json | null
          notification_preferences?: Json | null
          online_status?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          clerk_user_id?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          margin_type?: Database["public"]["Enums"]["margin_type"] | null
          margin_value?: number | null
          metadata?: Json | null
          notification_preferences?: Json | null
          online_status?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      llm_config: {
        Row: {
          api_key_encrypted: string
          available_models: string[] | null
          created_at: string | null
          created_by: string | null
          default_frequency_penalty: number | null
          default_max_tokens: number | null
          default_model: string
          default_presence_penalty: number | null
          default_temperature: number | null
          default_top_p: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          metadata: Json | null
          organization_id: string | null
          provider: string
          provider_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          api_key_encrypted: string
          available_models?: string[] | null
          created_at?: string | null
          created_by?: string | null
          default_frequency_penalty?: number | null
          default_max_tokens?: number | null
          default_model?: string
          default_presence_penalty?: number | null
          default_temperature?: number | null
          default_top_p?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          provider?: string
          provider_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          api_key_encrypted?: string
          available_models?: string[] | null
          created_at?: string | null
          created_by?: string | null
          default_frequency_penalty?: number | null
          default_max_tokens?: number | null
          default_model?: string
          default_presence_penalty?: number | null
          default_temperature?: number | null
          default_top_p?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          provider?: string
          provider_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          avinode_message_id: string | null
          chatkit_message_id: string | null
          content: string | null
          content_type: Database["public"]["Enums"]["message_content_type"]
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          metadata: Json | null
          original_content: string | null
          parent_message_id: string | null
          reactions: Json | null
          read_by: Json | null
          reply_count: number | null
          rich_content: Json | null
          sender_iso_agent_id: string | null
          sender_name: string | null
          sender_operator_id: string | null
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          status: Database["public"]["Enums"]["message_status"]
          thread_root_id: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          avinode_message_id?: string | null
          chatkit_message_id?: string | null
          content?: string | null
          content_type?: Database["public"]["Enums"]["message_content_type"]
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          metadata?: Json | null
          original_content?: string | null
          parent_message_id?: string | null
          reactions?: Json | null
          read_by?: Json | null
          reply_count?: number | null
          rich_content?: Json | null
          sender_iso_agent_id?: string | null
          sender_name?: string | null
          sender_operator_id?: string | null
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          status?: Database["public"]["Enums"]["message_status"]
          thread_root_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          avinode_message_id?: string | null
          chatkit_message_id?: string | null
          content?: string | null
          content_type?: Database["public"]["Enums"]["message_content_type"]
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          metadata?: Json | null
          original_content?: string | null
          parent_message_id?: string | null
          reactions?: Json | null
          read_by?: Json | null
          reply_count?: number | null
          rich_content?: Json | null
          sender_iso_agent_id?: string | null
          sender_name?: string | null
          sender_operator_id?: string | null
          sender_type?: Database["public"]["Enums"]["message_sender_type"]
          status?: Database["public"]["Enums"]["message_status"]
          thread_root_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_iso_agent_id_fkey"
            columns: ["sender_iso_agent_id"]
            isOneToOne: false
            referencedRelation: "iso_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_operator_id_fkey"
            columns: ["sender_operator_id"]
            isOneToOne: false
            referencedRelation: "operator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_root_id_fkey"
            columns: ["thread_root_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_profiles: {
        Row: {
          aircraft_types: string[] | null
          aoc_number: string | null
          avinode_company_id: string | null
          avinode_operator_id: string
          certifications: string[] | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country_code: string | null
          created_at: string | null
          fleet_size: number | null
          id: string
          is_active: boolean | null
          is_preferred_partner: boolean | null
          last_synced_at: string | null
          metadata: Json | null
          notification_preferences: Json | null
          operator_rating: number | null
          preferred_contact_method: string | null
          region: string | null
          updated_at: string | null
        }
        Insert: {
          aircraft_types?: string[] | null
          aoc_number?: string | null
          avinode_company_id?: string | null
          avinode_operator_id: string
          certifications?: string[] | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string | null
          fleet_size?: number | null
          id?: string
          is_active?: boolean | null
          is_preferred_partner?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          notification_preferences?: Json | null
          operator_rating?: number | null
          preferred_contact_method?: string | null
          region?: string | null
          updated_at?: string | null
        }
        Update: {
          aircraft_types?: string[] | null
          aoc_number?: string | null
          avinode_company_id?: string | null
          avinode_operator_id?: string
          certifications?: string[] | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string | null
          fleet_size?: number | null
          id?: string
          is_active?: boolean | null
          is_preferred_partner?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          notification_preferences?: Json | null
          operator_rating?: number | null
          preferred_contact_method?: string | null
          region?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          accepted_at: string | null
          client_profile_id: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          email_body: string | null
          email_message_id: string | null
          email_subject: string | null
          expired_at: string | null
          file_name: string
          file_path: string | null
          file_size_bytes: number | null
          file_url: string
          final_amount: number | null
          generated_at: string | null
          id: string
          iso_agent_id: string
          last_downloaded_at: string | null
          last_viewed_at: string | null
          margin_applied: number | null
          metadata: Json | null
          mime_type: string | null
          proposal_number: string
          quote_id: string | null
          rejected_at: string | null
          request_id: string
          sent_at: string | null
          sent_to_email: string | null
          sent_to_name: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          title: string
          total_amount: number | null
          updated_at: string | null
          view_count: number | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          client_profile_id?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          email_body?: string | null
          email_message_id?: string | null
          email_subject?: string | null
          expired_at?: string | null
          file_name: string
          file_path?: string | null
          file_size_bytes?: number | null
          file_url: string
          final_amount?: number | null
          generated_at?: string | null
          id?: string
          iso_agent_id: string
          last_downloaded_at?: string | null
          last_viewed_at?: string | null
          margin_applied?: number | null
          metadata?: Json | null
          mime_type?: string | null
          proposal_number: string
          quote_id?: string | null
          rejected_at?: string | null
          request_id: string
          sent_at?: string | null
          sent_to_email?: string | null
          sent_to_name?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          title: string
          total_amount?: number | null
          updated_at?: string | null
          view_count?: number | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          client_profile_id?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          email_body?: string | null
          email_message_id?: string | null
          email_subject?: string | null
          expired_at?: string | null
          file_name?: string
          file_path?: string | null
          file_size_bytes?: number | null
          file_url?: string
          final_amount?: number | null
          generated_at?: string | null
          id?: string
          iso_agent_id?: string
          last_downloaded_at?: string | null
          last_viewed_at?: string | null
          margin_applied?: number | null
          metadata?: Json | null
          mime_type?: string | null
          proposal_number?: string
          quote_id?: string | null
          rejected_at?: string | null
          request_id?: string
          sent_at?: string | null
          sent_to_email?: string | null
          sent_to_name?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          title?: string
          total_amount?: number | null
          updated_at?: string | null
          view_count?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_iso_agent_id_fkey"
            columns: ["iso_agent_id"]
            isOneToOne: false
            referencedRelation: "iso_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          aircraft_details: Json | null
          aircraft_tail_number: string | null
          aircraft_type: string
          analysis_notes: string | null
          availability: Json | null
          availability_confirmed: boolean | null
          avinode_quote_id: string | null
          base_price: number
          conversation_id: string | null
          created_at: string | null
          decline_reason: string | null
          expired_at: string | null
          fees: number | null
          fuel_surcharge: number | null
          id: string
          message_content: string | null
          metadata: Json | null
          operator_contact: Json | null
          operator_id: string
          operator_name: string
          operator_profile_id: string | null
          price_locked_until: string | null
          ranking: number | null
          raw_message_details: Json | null
          raw_webhook_payload: Json | null
          received_at: string | null
          request_id: string
          responded_at: string | null
          schedule: Json | null
          score: number | null
          status: Database["public"]["Enums"]["quote_status"]
          taxes: number | null
          total_price: number
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          aircraft_details?: Json | null
          aircraft_tail_number?: string | null
          aircraft_type: string
          analysis_notes?: string | null
          availability?: Json | null
          availability_confirmed?: boolean | null
          avinode_quote_id?: string | null
          base_price: number
          conversation_id?: string | null
          created_at?: string | null
          decline_reason?: string | null
          expired_at?: string | null
          fees?: number | null
          fuel_surcharge?: number | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          operator_contact?: Json | null
          operator_id: string
          operator_name: string
          operator_profile_id?: string | null
          price_locked_until?: string | null
          ranking?: number | null
          raw_message_details?: Json | null
          raw_webhook_payload?: Json | null
          received_at?: string | null
          request_id: string
          responded_at?: string | null
          schedule?: Json | null
          score?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          taxes?: number | null
          total_price: number
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          aircraft_details?: Json | null
          aircraft_tail_number?: string | null
          aircraft_type?: string
          analysis_notes?: string | null
          availability?: Json | null
          availability_confirmed?: boolean | null
          avinode_quote_id?: string | null
          base_price?: number
          conversation_id?: string | null
          created_at?: string | null
          decline_reason?: string | null
          expired_at?: string | null
          fees?: number | null
          fuel_surcharge?: number | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          operator_contact?: Json | null
          operator_id?: string
          operator_name?: string
          operator_profile_id?: string | null
          price_locked_until?: string | null
          ranking?: number | null
          raw_message_details?: Json | null
          raw_webhook_payload?: Json | null
          received_at?: string | null
          request_id?: string
          responded_at?: string | null
          schedule?: Json | null
          score?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          taxes?: number | null
          total_price?: number
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_operator_profile_id_fkey"
            columns: ["operator_profile_id"]
            isOneToOne: false
            referencedRelation: "operator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          aircraft_type: string | null
          arrival_airport: string
          avinode_deep_link: string | null
          avinode_rfp_id: string | null
          avinode_session_ended_at: string | null
          avinode_session_started_at: string | null
          avinode_trip_id: string | null
          budget: number | null
          client_profile_id: string | null
          created_at: string | null
          departure_airport: string
          departure_date: string
          id: string
          iso_agent_id: string
          metadata: Json | null
          operators_contacted: number | null
          passengers: number
          primary_conversation_id: string | null
          quotes_expected: number | null
          quotes_received: number | null
          return_date: string | null
          special_requirements: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string | null
        }
        Insert: {
          aircraft_type?: string | null
          arrival_airport: string
          avinode_deep_link?: string | null
          avinode_rfp_id?: string | null
          avinode_session_ended_at?: string | null
          avinode_session_started_at?: string | null
          avinode_trip_id?: string | null
          budget?: number | null
          client_profile_id?: string | null
          created_at?: string | null
          departure_airport: string
          departure_date: string
          id?: string
          iso_agent_id: string
          metadata?: Json | null
          operators_contacted?: number | null
          passengers: number
          primary_conversation_id?: string | null
          quotes_expected?: number | null
          quotes_received?: number | null
          return_date?: string | null
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string | null
        }
        Update: {
          aircraft_type?: string | null
          arrival_airport?: string
          avinode_deep_link?: string | null
          avinode_rfp_id?: string | null
          avinode_session_ended_at?: string | null
          avinode_session_started_at?: string | null
          avinode_trip_id?: string | null
          budget?: number | null
          client_profile_id?: string | null
          created_at?: string | null
          departure_airport?: string
          departure_date?: string
          id?: string
          iso_agent_id?: string
          metadata?: Json | null
          operators_contacted?: number | null
          passengers?: number
          primary_conversation_id?: string | null
          quotes_expected?: number | null
          quotes_received?: number | null
          return_date?: string | null
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_iso_agent_id_fkey"
            columns: ["iso_agent_id"]
            isOneToOne: false
            referencedRelation: "iso_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_primary_conversation_id_fkey"
            columns: ["primary_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_states: {
        Row: {
          agent_id: string | null
          created_at: string | null
          current_state: Database["public"]["Enums"]["request_status"]
          error_message: string | null
          id: string
          metadata: Json | null
          previous_state: Database["public"]["Enums"]["request_status"] | null
          request_id: string
          retry_count: number | null
          state_duration_ms: number | null
          state_entered_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          current_state: Database["public"]["Enums"]["request_status"]
          error_message?: string | null
          id?: string
          metadata?: Json | null
          previous_state?: Database["public"]["Enums"]["request_status"] | null
          request_id: string
          retry_count?: number | null
          state_duration_ms?: number | null
          state_entered_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          current_state?: Database["public"]["Enums"]["request_status"]
          error_message?: string | null
          id?: string
          metadata?: Json | null
          previous_state?: Database["public"]["Enums"]["request_status"] | null
          request_id?: string
          retry_count?: number | null
          state_duration_ms?: number | null
          state_entered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pending_webhook_events: {
        Row: {
          avinode_event_id: string | null
          avinode_quote_id: string | null
          avinode_rfp_id: string | null
          avinode_thread_id: string | null
          avinode_timestamp: string | null
          avinode_trip_id: string | null
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          event_type: Database["public"]["Enums"]["avinode_event_type"] | null
          headers: Json | null
          id: string | null
          max_retries: number | null
          message_id: string | null
          next_retry_at: string | null
          operator_profile_id: string | null
          parsed_data: Json | null
          processed_at: string | null
          processing_duration_ms: number | null
          processing_status:
            | Database["public"]["Enums"]["webhook_processing_status"]
            | null
          quote_id: string | null
          raw_payload: Json | null
          received_at: string | null
          request_id: string | null
          retry_count: number | null
          signature_verified: boolean | null
          source_ip: string | null
          user_agent: string | null
          webhook_secret_version: string | null
        }
        Insert: {
          avinode_event_id?: string | null
          avinode_quote_id?: string | null
          avinode_rfp_id?: string | null
          avinode_thread_id?: string | null
          avinode_timestamp?: string | null
          avinode_trip_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          event_type?: Database["public"]["Enums"]["avinode_event_type"] | null
          headers?: Json | null
          id?: string | null
          max_retries?: number | null
          message_id?: string | null
          next_retry_at?: string | null
          operator_profile_id?: string | null
          parsed_data?: Json | null
          processed_at?: string | null
          processing_duration_ms?: number | null
          processing_status?:
            | Database["public"]["Enums"]["webhook_processing_status"]
            | null
          quote_id?: string | null
          raw_payload?: Json | null
          received_at?: string | null
          request_id?: string | null
          retry_count?: number | null
          signature_verified?: boolean | null
          source_ip?: string | null
          user_agent?: string | null
          webhook_secret_version?: string | null
        }
        Update: {
          avinode_event_id?: string | null
          avinode_quote_id?: string | null
          avinode_rfp_id?: string | null
          avinode_thread_id?: string | null
          avinode_timestamp?: string | null
          avinode_trip_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          event_type?: Database["public"]["Enums"]["avinode_event_type"] | null
          headers?: Json | null
          id?: string | null
          max_retries?: number | null
          message_id?: string | null
          next_retry_at?: string | null
          operator_profile_id?: string | null
          parsed_data?: Json | null
          processed_at?: string | null
          processing_duration_ms?: number | null
          processing_status?:
            | Database["public"]["Enums"]["webhook_processing_status"]
            | null
          quote_id?: string | null
          raw_payload?: Json | null
          received_at?: string | null
          request_id?: string | null
          retry_count?: number | null
          signature_verified?: boolean | null
          source_ip?: string | null
          user_agent?: string | null
          webhook_secret_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avinode_webhook_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avinode_webhook_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avinode_webhook_events_operator_profile_id_fkey"
            columns: ["operator_profile_id"]
            isOneToOne: false
            referencedRelation: "operator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avinode_webhook_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avinode_webhook_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      archive_old_chat_sessions: { Args: never; Returns: number }
      calculate_webhook_retry_time: {
        Args: { retry_count: number }
        Returns: string
      }
      claim_webhook_event: { Args: { event_id: string }; Returns: boolean }
      cleanup_expired_chatkit_sessions: { Args: never; Returns: number }
      complete_chat_session: {
        Args: { session_id: string }
        Returns: undefined
      }
      complete_webhook_event: {
        Args: {
          event_id: string
          p_conversation_id?: string
          p_message_id?: string
          p_parsed_data?: Json
          p_quote_id?: string
          p_request_id?: string
        }
        Returns: undefined
      }
      fail_webhook_event: {
        Args: {
          event_id: string
          p_error_message: string
          p_error_stack?: string
        }
        Returns: undefined
      }
      generate_proposal_number: { Args: never; Returns: string }
      get_current_iso_agent_id: { Args: never; Returns: string }
      get_or_create_request_conversation: {
        Args: { p_iso_agent_id: string; p_request_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_conversation_participant: {
        Args: { conv_id: string }
        Returns: boolean
      }
      owns_resource: { Args: { resource_agent_id: string }; Returns: boolean }
      update_chat_session_activity: {
        Args: { session_id: string }
        Returns: undefined
      }
    }
    Enums: {
      agent_type:
        | "orchestrator"
        | "client_data"
        | "flight_search"
        | "proposal_analysis"
        | "communication"
        | "error_monitor"
      avinode_event_type:
        | "rfq_received"
        | "rfq_updated"
        | "rfq_cancelled"
        | "quote_received"
        | "quote_updated"
        | "quote_accepted"
        | "quote_rejected"
        | "quote_expired"
        | "message_received"
        | "booking_confirmed"
        | "booking_cancelled"
        | "booking_updated"
        | "trip_created"
        | "trip_updated"
        | "trip_cancelled"
      chat_session_status: "active" | "paused" | "completed" | "archived"
      conversation_status:
        | "active"
        | "awaiting_response"
        | "resolved"
        | "archived"
      conversation_type:
        | "rfp_negotiation"
        | "quote_discussion"
        | "general_inquiry"
        | "booking_confirmation"
        | "support"
      execution_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "timeout"
      margin_type: "percentage" | "fixed"
      message_content_type:
        | "text"
        | "quote_shared"
        | "quote_updated"
        | "quote_accepted"
        | "quote_rejected"
        | "quote_expired"
        | "rfp_created"
        | "rfp_updated"
        | "proposal_shared"
        | "document_attached"
        | "booking_confirmed"
        | "payment_requested"
        | "system_notification"
        | "workflow_update"
        | "typing_indicator"
      message_sender_type: "iso_agent" | "ai_assistant" | "operator" | "system"
      message_status: "sending" | "sent" | "delivered" | "read" | "failed"
      participant_role:
        | "iso_agent"
        | "ai_assistant"
        | "operator"
        | "admin"
        | "observer"
      proposal_status:
        | "draft"
        | "generated"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
      quote_status:
        | "pending"
        | "received"
        | "analyzed"
        | "accepted"
        | "rejected"
        | "expired"
      request_status:
        | "draft"
        | "pending"
        | "analyzing"
        | "fetching_client_data"
        | "searching_flights"
        | "awaiting_quotes"
        | "analyzing_proposals"
        | "generating_email"
        | "sending_proposal"
        | "completed"
        | "failed"
        | "cancelled"
        | "trip_created"
        | "awaiting_user_action"
        | "avinode_session_active"
        | "monitoring_for_quotes"
      session_status: "active" | "expired" | "revoked"
      user_role: "iso_agent" | "sales_rep" | "admin" | "customer" | "operator"
      webhook_processing_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "skipped"
        | "dead_letter"
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
      agent_type: [
        "orchestrator",
        "client_data",
        "flight_search",
        "proposal_analysis",
        "communication",
        "error_monitor",
      ],
      avinode_event_type: [
        "rfq_received",
        "rfq_updated",
        "rfq_cancelled",
        "quote_received",
        "quote_updated",
        "quote_accepted",
        "quote_rejected",
        "quote_expired",
        "message_received",
        "booking_confirmed",
        "booking_cancelled",
        "booking_updated",
        "trip_created",
        "trip_updated",
        "trip_cancelled",
      ],
      chat_session_status: ["active", "paused", "completed", "archived"],
      conversation_status: [
        "active",
        "awaiting_response",
        "resolved",
        "archived",
      ],
      conversation_type: [
        "rfp_negotiation",
        "quote_discussion",
        "general_inquiry",
        "booking_confirmation",
        "support",
      ],
      execution_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "timeout",
      ],
      margin_type: ["percentage", "fixed"],
      message_content_type: [
        "text",
        "quote_shared",
        "quote_updated",
        "quote_accepted",
        "quote_rejected",
        "quote_expired",
        "rfp_created",
        "rfp_updated",
        "proposal_shared",
        "document_attached",
        "booking_confirmed",
        "payment_requested",
        "system_notification",
        "workflow_update",
        "typing_indicator",
      ],
      message_sender_type: ["iso_agent", "ai_assistant", "operator", "system"],
      message_status: ["sending", "sent", "delivered", "read", "failed"],
      participant_role: [
        "iso_agent",
        "ai_assistant",
        "operator",
        "admin",
        "observer",
      ],
      proposal_status: [
        "draft",
        "generated",
        "sent",
        "viewed",
        "accepted",
        "rejected",
        "expired",
      ],
      quote_status: [
        "pending",
        "received",
        "analyzed",
        "accepted",
        "rejected",
        "expired",
      ],
      request_status: [
        "draft",
        "pending",
        "analyzing",
        "fetching_client_data",
        "searching_flights",
        "awaiting_quotes",
        "analyzing_proposals",
        "generating_email",
        "sending_proposal",
        "completed",
        "failed",
        "cancelled",
        "trip_created",
        "awaiting_user_action",
        "avinode_session_active",
        "monitoring_for_quotes",
      ],
      session_status: ["active", "expired", "revoked"],
      user_role: ["iso_agent", "sales_rep", "admin", "customer", "operator"],
      webhook_processing_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "skipped",
        "dead_letter",
      ],
    },
  },
} as const

// Type aliases for convenience
export type UserRole = Database["public"]["Enums"]["user_role"]
export type RequestStatus = Database["public"]["Enums"]["request_status"]
export type ChatSessionStatus = Database["public"]["Enums"]["chat_session_status"]
export type User = Database["public"]["Tables"]["iso_agents"]["Row"]
export type ClientProfile = Database["public"]["Tables"]["client_profiles"]["Row"]
export type Request = Database["public"]["Tables"]["requests"]["Row"]
export type Quote = Database["public"]["Tables"]["quotes"]["Row"]
export type Proposal = Database["public"]["Tables"]["proposals"]["Row"]
export type Message = Database["public"]["Tables"]["messages"]["Row"]
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"]
export type ChatSession = Database["public"]["Tables"]["chat_sessions"]["Row"]
