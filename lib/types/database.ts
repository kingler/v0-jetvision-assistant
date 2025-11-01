/**
 * Database Type Definitions
 *
 * TASK-002: Supabase Database Schema
 * Generated types for the Jetvision AI Assistant database schema
 *
 * To regenerate after schema changes:
 * npx supabase gen types typescript --project-id <your-project-ref> > lib/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_user_id: string
          email: string
          full_name: string | null
          role: 'iso_agent' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_user_id: string
          email: string
          full_name?: string | null
          role?: 'iso_agent' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_user_id?: string
          email?: string
          full_name?: string | null
          role?: 'iso_agent' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          preferences: Json
          is_returning: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          preferences?: Json
          is_returning?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          preferences?: Json
          is_returning?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      flight_requests: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          departure_airport: string
          arrival_airport: string
          passengers: number
          departure_date: string
          return_date: string | null
          status:
            | 'new'
            | 'analyzing'
            | 'searching'
            | 'quotes_received'
            | 'proposal_ready'
            | 'sent'
            | 'accepted'
            | 'completed'
            | 'cancelled'
          current_step: number
          total_steps: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          departure_airport: string
          arrival_airport: string
          passengers: number
          departure_date: string
          return_date?: string | null
          status?:
            | 'new'
            | 'analyzing'
            | 'searching'
            | 'quotes_received'
            | 'proposal_ready'
            | 'sent'
            | 'accepted'
            | 'completed'
            | 'cancelled'
          current_step?: number
          total_steps?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string | null
          departure_airport?: string
          arrival_airport?: string
          passengers?: number
          departure_date?: string
          return_date?: string | null
          status?:
            | 'new'
            | 'analyzing'
            | 'searching'
            | 'quotes_received'
            | 'proposal_ready'
            | 'sent'
            | 'accepted'
            | 'completed'
            | 'cancelled'
          current_step?: number
          total_steps?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          request_id: string
          operator_name: string
          aircraft_type: string
          base_price: number
          response_time: number | null
          specifications: Json
          rating: number | null
          score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          operator_name: string
          aircraft_type: string
          base_price: number
          response_time?: number | null
          specifications?: Json
          rating?: number | null
          score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          operator_name?: string
          aircraft_type?: string
          base_price?: number
          response_time?: number | null
          specifications?: Json
          rating?: number | null
          score?: number | null
          created_at?: string
        }
      }
      proposals: {
        Row: {
          id: string
          request_id: string
          quote_id: string
          markup_type: 'fixed' | 'percentage'
          markup_value: number
          total_price: number
          status: 'draft' | 'sent' | 'accepted' | 'rejected'
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          quote_id: string
          markup_type: 'fixed' | 'percentage'
          markup_value: number
          total_price: number
          status?: 'draft' | 'sent' | 'accepted' | 'rejected'
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          quote_id?: string
          markup_type?: 'fixed' | 'percentage'
          markup_value?: number
          total_price?: number
          status?: 'draft' | 'sent' | 'accepted' | 'rejected'
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      communications: {
        Row: {
          id: string
          request_id: string
          type: 'email' | 'sms'
          recipient: string
          subject: string | null
          body: string
          attachments: Json
          status: 'queued' | 'sent' | 'delivered' | 'failed'
          error_message: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          type: 'email' | 'sms'
          recipient: string
          subject?: string | null
          body: string
          attachments?: Json
          status?: 'queued' | 'sent' | 'delivered' | 'failed'
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          type?: 'email' | 'sms'
          recipient?: string
          subject?: string | null
          body?: string
          attachments?: Json
          status?: 'queued' | 'sent' | 'delivered' | 'failed'
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
      }
      workflow_history: {
        Row: {
          id: string
          request_id: string
          from_state: string | null
          to_state: string
          triggered_by: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          from_state?: string | null
          to_state: string
          triggered_by: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          from_state?: string | null
          to_state?: string
          triggered_by?: string
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
