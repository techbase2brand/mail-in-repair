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
      companies: {
        Row: {
          id: string
          created_at: string
          name: string
          address: string
          phone: string
          email: string
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          address: string
          phone: string
          email: string
          user_id: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          address?: string
          phone?: string
          email?: string
          user_id?: string
        }
      }
      repair_categories: {
        Row: {
          id: string
          created_at: string
          name: string
          company_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          company_id: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          company_id?: string
        }
      }
      customers: {
        Row: {
          id: string
          created_at: string
          first_name: string
          last_name: string
          email: string
          phone: string
          address: string
          company_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          first_name: string
          last_name: string
          email: string
          phone: string
          address: string
          company_id: string
        }
        Update: {
          id?: string
          created_at?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          address?: string
          company_id?: string
        }
      }
      technicians: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string
          phone: string
          company_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email: string
          phone: string
          company_id: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string
          phone?: string
          company_id?: string
        }
      }
      repair_tickets: {
        Row: {
          id: string
          created_at: string
          customer_id: string
          technician_id: string | null
          category_id: string
          device_type: string
          device_model: string
          serial_number: string
          issue_description: string
          status: string
          company_id: string
          customer_notes: string | null
          technician_notes: string | null
          diagnosis: string | null
          actual_cost: number | null
          estimated_cost: number | null
          ticket_number: string
          is_urgent: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          customer_id: string
          technician_id?: string | null
          category_id: string
          device_type: string
          device_model?: string
          serial_number: string
          issue_description: string
          status: string
          company_id: string
          customer_notes?: string | null
          technician_notes?: string | null
          diagnosis?: string | null
          actual_cost?: number | null
          estimated_cost?: number | null
          ticket_number?: string
          is_urgent?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          customer_id?: string
          technician_id?: string | null
          category_id?: string
          device_type?: string
          device_model?: string
          serial_number?: string
          issue_description?: string
          status?: string
          company_id?: string
          customer_notes?: string | null
          technician_notes?: string | null
          diagnosis?: string | null
          actual_cost?: number | null
          estimated_cost?: number | null
          ticket_number?: string
          is_urgent?: boolean
          updated_at?: string
        }
      }
      repair_status_history: {
        Row: {
          id: string
          created_at: string
          repair_ticket_id: string
          status: string
          notes: string | null
          technician_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          repair_ticket_id: string
          status: string
          notes?: string | null
          technician_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          repair_ticket_id?: string
          status?: string
          notes?: string | null
          technician_id?: string | null
        }
      }
      repair_parts: {
        Row: {
          id: string
          created_at: string
          repair_ticket_id: string
          name: string
          cost: number
          quantity: number
        }
        Insert: {
          id?: string
          created_at?: string
          repair_ticket_id: string
          name: string
          cost: number
          quantity: number
        }
        Update: {
          id?: string
          created_at?: string
          repair_ticket_id?: string
          name?: string
          cost?: number
          quantity?: number
        }
      }
      repair_media: {
        Row: {
          id: string
          created_at: string
          repair_ticket_id: string
          file_url: string
          description: string
          is_before: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          repair_ticket_id: string
          file_url: string
          description: string
          is_before: boolean
        }
        Update: {
          id?: string
          created_at?: string
          repair_ticket_id?: string
          file_url?: string
          description?: string
          is_before?: boolean
        }
      }
      repair_conversations: {
        Row: {
          id: string
          created_at: string
          repair_ticket_id: string
          content: string
          sender_type: string
          sender_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          repair_ticket_id: string
          content: string
          sender_type: string
          sender_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          repair_ticket_id?: string
          content?: string
          sender_type?: string
          sender_id?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          created_at: string
          repair_ticket_id: string
          total_amount: number
          status: string
          due_date: string | null
          payment_date: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          repair_ticket_id: string
          total_amount: number
          status: string
          due_date?: string | null
          payment_date?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          repair_ticket_id?: string
          total_amount?: number
          status?: string
          due_date?: string | null
          payment_date?: string | null
        }
      }
      invoice_items: {
        Row: {
          id: string
          created_at: string
          invoice_id: string
          description: string
          amount: number
          quantity: number
        }
        Insert: {
          id?: string
          created_at?: string
          invoice_id: string
          description: string
          amount: number
          quantity: number
        }
        Update: {
          id?: string
          created_at?: string
          invoice_id?: string
          description?: string
          amount?: number
          quantity?: number
        }
      }
      warranties: {
        Row: {
          id: string
          created_at: string
          repair_ticket_id: string
          start_date: string
          end_date: string
          terms: string
        }
        Insert: {
          id?: string
          created_at?: string
          repair_ticket_id: string
          start_date: string
          end_date: string
          terms: string
        }
        Update: {
          id?: string
          created_at?: string
          repair_ticket_id?: string
          start_date?: string
          end_date?: string
          terms?: string
        }
      }
      buyback_tickets: {
        Row: {
          id: string
          created_at: string
          customer_id: string
          device_type: string
          device_model: string
          serial_number: string
          condition: string
          offered_amount: number
          status: string
          company_id: string
          notes: string | null
          ticket_number: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          customer_id: string
          device_type: string
          device_model?: string
          serial_number: string
          condition: string
          offered_amount: number
          status: string
          company_id: string
          notes?: string | null
          ticket_number?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          customer_id?: string
          device_type?: string
          device_model?: string
          serial_number?: string
          condition?: string
          offered_amount?: number
          status?: string
          company_id?: string
          notes?: string | null
          ticket_number?: string
          updated_at?: string
        }
      }
      buyback_media: {
        Row: {
          id: string
          created_at: string
          buyback_ticket_id: string
          file_url: string
          description: string
        }
        Insert: {
          id?: string
          created_at?: string
          buyback_ticket_id: string
          file_url: string
          description: string
        }
        Update: {
          id?: string
          created_at?: string
          buyback_ticket_id?: string
          file_url?: string
          description?: string
        }
      }
      refurbishing_tickets: {
        Row: {
          id: string
          created_at: string
          device_type: string
          device_model: string
          serial_number: string
          condition: string
          status: string
          company_id: string
          notes: string | null
          ticket_number: string
          updated_at: string
          cost: number | null
          sale_price: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          device_type: string
          device_model?: string
          serial_number: string
          condition: string
          status: string
          company_id: string
          notes?: string | null
          ticket_number?: string
          updated_at?: string
          cost?: number | null
          sale_price?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          device_type?: string
          device_model?: string
          serial_number?: string
          condition?: string
          status?: string
          company_id?: string
          notes?: string | null
          ticket_number?: string
          updated_at?: string
          cost?: number | null
          sale_price?: number | null
        }
      }
      refurbishing_media: {
        Row: {
          id: string
          created_at: string
          refurbishing_ticket_id: string
          file_url: string
          description: string
        }
        Insert: {
          id?: string
          created_at?: string
          refurbishing_ticket_id: string
          file_url: string
          description: string
        }
        Update: {
          id?: string
          created_at?: string
          refurbishing_ticket_id?: string
          file_url?: string
          description?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}