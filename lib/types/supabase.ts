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
      iso_agents: {
        Row: {
          clerk_user_id: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          margin_type: Database["public"]["Enums"]["margin_type"] | null
          margin_value: number | null
          metadata: Json | null
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
          margin_type?: Database["public"]["Enums"]["margin_type"] | null
          margin_value?: number | null
          metadata?: Json | null
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
          margin_type?: Database["public"]["Enums"]["margin_type"] | null
          margin_value?: number | null
          metadata?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
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
          budget: number | null
          client_profile_id: string | null
          created_at: string | null
          departure_airport: string
          departure_date: string
          id: string
          iso_agent_id: string
          metadata: Json | null
          passengers: number
          return_date: string | null
          special_requirements: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string | null
        }
        Insert: {
          aircraft_type?: string | null
          arrival_airport: string
          budget?: number | null
          client_profile_id?: string | null
          created_at?: string | null
          departure_airport: string
          departure_date: string
          id?: string
          iso_agent_id: string
          metadata?: Json | null
          passengers: number
          return_date?: string | null
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string | null
        }
        Update: {
          aircraft_type?: string | null
          arrival_airport?: string
          budget?: number | null
          client_profile_id?: string | null
          created_at?: string | null
          departure_airport?: string
          departure_date?: string
          id?: string
          iso_agent_id?: string
          metadata?: Json | null
          passengers?: number
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
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_chatkit_sessions: { Args: never; Returns: number }
      generate_proposal_number: { Args: never; Returns: string }
      get_current_iso_agent_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      owns_resource: { Args: { resource_agent_id: string }; Returns: boolean }
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
      user_role: "iso_agent" | "admin" | "operator"
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
      user_role: ["iso_agent", "admin", "operator"],
    },
  },
} as const

