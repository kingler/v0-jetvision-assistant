export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      client_profiles: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          notes: string | null
          phone: string | null
          preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_iso_agent_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iso_agents"
            referencedColumns: ["id"]
          },
        ]
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
          availability_confirmed: boolean | null
          base_price: number
          created_at: string | null
          fees: number | null
          fuel_surcharge: number | null
          id: string
          metadata: Json | null
          operator_id: string
          operator_name: string
          ranking: number | null
          request_id: string
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
          availability_confirmed?: boolean | null
          base_price: number
          created_at?: string | null
          fees?: number | null
          fuel_surcharge?: number | null
          id?: string
          metadata?: Json | null
          operator_id: string
          operator_name: string
          ranking?: number | null
          request_id: string
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
          availability_confirmed?: boolean | null
          base_price?: number
          created_at?: string | null
          fees?: number | null
          fuel_surcharge?: number | null
          id?: string
          metadata?: Json | null
          operator_id?: string
          operator_name?: string
          ranking?: number | null
          request_id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          taxes?: number | null
          total_price?: number
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
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
          avinode_session_started_at: string | null
          avinode_trip_id: string | null
          budget: number | null
          client_profile_id: string | null
          created_at: string | null
          departure_airport: string
          departure_date: string
          id: string
          metadata: Json | null
          passengers: number
          return_date: string | null
          special_requirements: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aircraft_type?: string | null
          arrival_airport: string
          avinode_deep_link?: string | null
          avinode_rfp_id?: string | null
          avinode_session_started_at?: string | null
          avinode_trip_id?: string | null
          budget?: number | null
          client_profile_id?: string | null
          created_at?: string | null
          departure_airport: string
          departure_date: string
          id?: string
          metadata?: Json | null
          passengers: number
          return_date?: string | null
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aircraft_type?: string | null
          arrival_airport?: string
          avinode_deep_link?: string | null
          avinode_rfp_id?: string | null
          avinode_session_started_at?: string | null
          avinode_trip_id?: string | null
          budget?: number | null
          client_profile_id?: string | null
          created_at?: string | null
          departure_airport?: string
          departure_date?: string
          id?: string
          metadata?: Json | null
          passengers?: number
          return_date?: string | null
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string | null
          user_id?: string
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
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iso_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      iso_agents: {
        Row: {
          avatar_url: string | null
          clerk_user_id: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          margin_type: Database["public"]["Enums"]["margin_type"] | null
          margin_value: number | null
          metadata: Json | null
          phone: string | null
          preferences: Json | null
          role: Database["public"]["Enums"]["user_role"]
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          clerk_user_id: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          margin_type?: Database["public"]["Enums"]["margin_type"] | null
          margin_value?: number | null
          metadata?: Json | null
          phone?: string | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          clerk_user_id?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          margin_type?: Database["public"]["Enums"]["margin_type"] | null
          margin_value?: number | null
          metadata?: Json | null
          phone?: string | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      llm_config: {
        Row: {
          id: string
          provider: string
          provider_name: string
          api_key_encrypted: string
          default_model: string
          available_models: string[] | null
          default_temperature: number | null
          default_max_tokens: number | null
          default_top_p: number | null
          default_frequency_penalty: number | null
          default_presence_penalty: number | null
          organization_id: string | null
          is_active: boolean | null
          is_default: boolean | null
          metadata: Json | null
          created_by: string | null
          updated_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          provider?: string
          provider_name?: string
          api_key_encrypted: string
          default_model?: string
          available_models?: string[] | null
          default_temperature?: number | null
          default_max_tokens?: number | null
          default_top_p?: number | null
          default_frequency_penalty?: number | null
          default_presence_penalty?: number | null
          organization_id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          provider?: string
          provider_name?: string
          api_key_encrypted?: string
          default_model?: string
          available_models?: string[] | null
          default_temperature?: number | null
          default_max_tokens?: number | null
          default_top_p?: number | null
          default_frequency_penalty?: number | null
          default_presence_penalty?: number | null
          organization_id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_state: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          current_step: string
          data: Json
          completed_fields: string[] | null
          missing_fields: string[] | null
          history: string[] | null
          conversation_history: Json | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          thread_id: string
          user_id: string
          current_step: string
          data?: Json
          completed_fields?: string[] | null
          missing_fields?: string[] | null
          history?: string[] | null
          conversation_history?: Json | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          current_step?: string
          data?: Json
          completed_fields?: string[] | null
          missing_fields?: string[] | null
          history?: string[] | null
          conversation_history?: Json | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_proposal_number: { Args: never; Returns: string }
      get_current_user_id: { Args: never; Returns: string }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_customer: { Args: never; Returns: boolean }
      is_sales_rep: { Args: never; Returns: boolean }
      owns_resource: { Args: { resource_user_id: string }; Returns: boolean }
    }
    Enums: {
      agent_type:
        | "orchestrator"
        | "client_data"
        | "flight_search"
        | "proposal_analysis"
        | "communication"
        | "error_monitor"
      execution_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "timeout"
      margin_type: "percentage" | "fixed"
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
      session_status: "active" | "expired" | "revoked"
      user_role: "sales_rep" | "admin" | "customer" | "operator" | "iso_agent"
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
  graphql_public: {
    Enums: {},
  },
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
      execution_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "timeout",
      ],
      margin_type: ["percentage", "fixed"],
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
      ],
      session_status: ["active", "expired", "revoked"],
      user_role: ["sales_rep", "admin", "customer", "operator", "iso_agent"],
    },
  },
} as const

