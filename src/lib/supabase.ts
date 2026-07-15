import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser client (uses anon key — RLS enforced).
// Returned untyped (SupabaseClient) so client pages can issue plain
// inserts/updates without fighting the strict Database generic at compile
// time; RLS + CHECK constraints still enforce validity at the DB layer.
export function createBrowserClient(): SupabaseClient {
  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Server client with service role (bypasses RLS — server-only!)
// Reserved for: auth/signup (atomic user+org RPC). Every other server
// route must use createRouteClient() from src/lib/auth.ts instead.
export function createAdminClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export interface BaseColumns {
  id: string
  created_at: string
  updated_at: string
}

// Full 14-table schema (matches migrations 001–004).
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          subscription_tier: 'starter' | 'pro' | 'agency' | 'beta'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          locale_default: string
          currency_default: string
          pipeline_stages: string[] | null
          branding: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['organizations']['Row']>
        Update: Partial<Database['public']['Tables']['organizations']['Row']>
      }
      users: {
        Row: {
          id: string
          auth_id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'owner' | 'admin' | 'agent' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'agent' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Row']>
      }
      organization_members: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: 'owner' | 'admin' | 'agent' | 'viewer'
          is_primary: boolean
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          role?: 'owner' | 'admin' | 'agent' | 'viewer'
          is_primary?: boolean
          accepted_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['organization_members']['Row']>
      }
      properties: {
        Row: BaseColumns & {
          organization_id: string
          title: string
          description: string | null
          slug: string
          reference_number: string | null
          type: string
          status: string
          price: number
          currency: string
          price_period: string | null
          address: string | null
          city: string
          state: string | null
          country: string
          postal_code: string | null
          latitude: number | null
          longitude: number | null
          area_size: number | null
          land_size: number | null
          bedrooms: number | null
          bathrooms: number | null
          floors: number | null
          year_built: number | null
          parking_spaces: number | null
          garage_spaces: number | null
          features: string[]
          cover_image_url: string | null
          images: unknown[]
          video_url: string | null
          virtual_tour_url: string | null
          energy_rating: string | null
          published_at: string | null
          expires_at: string | null
          views_count: number
          featured: boolean
        }
        Insert: Partial<Database['public']['Tables']['properties']['Row']> & {
          organization_id: string
          title: string
          slug: string
          city: string
          price: number
        }
        Update: Partial<Database['public']['Tables']['properties']['Row']>
      }
      leads: {
        Row: BaseColumns & {
          organization_id: string
          first_name: string
          last_name: string | null
          email: string | null
          phone: string | null
          company: string | null
          stage: string
          source: string
          status: string
          assigned_to: string | null
          property_id: string | null
          budget_min: number | null
          budget_max: number | null
          requirements: string | null
          rating: number | null
          tags: unknown[]
          last_contacted_at: string | null
          last_activity_at: string | null
          converted_property_id: string | null
          converted_at: string | null
          lost_reason: string | null
        }
        Insert: Partial<Database['public']['Tables']['leads']['Row']> & {
          organization_id: string
          first_name: string
        }
        Update: Partial<Database['public']['Tables']['leads']['Row']>
      }
      property_syndications: {
        Row: {
          id: string
          organization_id: string
          property_id: string
          portal_name: 'olx' | 'njuskalo' | 'nekretnine_rs'
          status: 'active' | 'paused' | 'error'
          external_id: string | null
          last_synced_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          property_id: string
          portal_name: 'olx' | 'njuskalo' | 'nekretnine_rs'
          status?: 'active' | 'paused' | 'error'
          external_id?: string | null
          last_synced_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          property_id?: string
          portal_name?: 'olx' | 'njuskalo' | 'nekretnine_rs'
          status?: 'active' | 'paused' | 'error'
          external_id?: string | null
          last_synced_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_syndications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_syndications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
      }
      lead_stages: {
        Row: {
          id: string
          organization_id: string
          name: string
          order_index: number
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          order_index?: number
          color?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['lead_stages']['Row']>
      }
      contacts: {
        Row: BaseColumns & {
          organization_id: string
          first_name: string
          last_name: string | null
          email: string | null
          phone: string | null
          company: string | null
          position: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string
          postal_code: string | null
          type: 'client' | 'owner' | 'tenant' | 'vendor' | 'other'
          notes: string | null
          tags: unknown[]
          property_id: string | null
          lead_id: string | null
        }
        Insert: Partial<Database['public']['Tables']['contacts']['Row']> & {
          organization_id: string
          first_name: string
        }
        Update: Partial<Database['public']['Tables']['contacts']['Row']>
      }
      viewings: {
        Row: BaseColumns & {
          organization_id: string
          property_id: string
          contact_id: string | null
          lead_id: string | null
          assigned_agent: string | null
          scheduled_at: string
          duration_minutes: number
          status: string
          notes: string | null
          feedback: string | null
          feedback_rating: number | null
        }
        Insert: Partial<Database['public']['Tables']['viewings']['Row']> & {
          organization_id: string
          property_id: string
          scheduled_at: string
        }
        Update: Partial<Database['public']['Tables']['viewings']['Row']>
      }
      documents: {
        Row: BaseColumns & {
          organization_id: string
          contact_id: string | null
          property_id: string | null
          type: string
          title: string
          file_url: string
          status: string
          metadata: Record<string, unknown> | null
        }
        Insert: Partial<Database['public']['Tables']['documents']['Row']> & {
          organization_id: string
          title: string
          file_url: string
        }
        Update: Partial<Database['public']['Tables']['documents']['Row']>
      }
      widget_tokens: {
        Row: BaseColumns & {
          organization_id: string
          name: string
          token: string
          property_id: string | null
          active: boolean
          metadata: Record<string, unknown> | null
        }
        Insert: Partial<Database['public']['Tables']['widget_tokens']['Row']> & {
          organization_id: string
          name: string
          token: string
        }
        Update: Partial<Database['public']['Tables']['widget_tokens']['Row']>
      }
      deals: {
        Row: BaseColumns & {
          organization_id: string
          title: string
          type: 'sale' | 'rental'
          stage: string
          property_id: string | null
          contact_id: string
          lead_id: string | null
          price: number
          currency: string
          commission_pct: number | null
          commission_amount: number | null
          commission_paid: boolean
          probability: number
          expected_close_date: string | null
          closed_at: string | null
          lost_reason: string | null
          assigned_to: string | null
          tags: unknown[]
          notes: string | null
          last_activity_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['deals']['Row']> & {
          organization_id: string
          title: string
          contact_id: string
        }
        Update: Partial<Database['public']['Tables']['deals']['Row']>
      }
      activity_log: {
        Row: {
          id: string
          organization_id: string
          type: string
          description: string
          metadata: Record<string, unknown>
          deal_id: string | null
          lead_id: string | null
          contact_id: string | null
          property_id: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          type?: string
          description: string
          metadata?: Record<string, unknown>
          deal_id?: string | null
          lead_id?: string | null
          contact_id?: string | null
          property_id?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['activity_log']['Row']>
      }
      custom_field_definitions: {
        Row: BaseColumns & {
          organization_id: string
          entity: 'lead' | 'contact' | 'property' | 'deal'
          name: string
          label: string
          field_type: string
          options: unknown[]
          required: boolean
          order_index: number
        }
        Insert: Partial<Database['public']['Tables']['custom_field_definitions']['Row']> & {
          organization_id: string
          entity: 'lead' | 'contact' | 'property' | 'deal'
          name: string
          label: string
        }
        Update: Partial<Database['public']['Tables']['custom_field_definitions']['Row']>
      }
      invitations: {
        Row: BaseColumns & {
          organization_id: string
          invited_by: string
          email: string
          role: 'owner' | 'admin' | 'agent' | 'viewer'
          status: 'pending' | 'accepted' | 'revoked' | 'expired'
          token: string
          expires_at: string
          accepted_at: string | null
          accepted_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['invitations']['Row']> & {
          organization_id: string
          invited_by: string
          email: string
        }
        Update: Partial<Database['public']['Tables']['invitations']['Row']>
      }
      lead_contacts: {
        Row: {
          id: string
          lead_id: string
          contact_id: string
          role: string | null
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          contact_id: string
          role?: string | null
          is_primary?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['lead_contacts']['Row']>
      }
    }
  }
}
