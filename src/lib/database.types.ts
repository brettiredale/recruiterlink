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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          city_id: number | null
          country_id: number
          created_at: string
          description: string | null
          domain: string | null
          duplicate_of: string | null
          id: string
          introduction: string | null
          is_claimed: boolean
          is_premium: boolean | null
          legacy_slug: string | null
          logo_path: string | null
          name: string
          plan: string
          quality_score: number | null
          search_vector: unknown
          slug: string
          sort_name: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          city_id?: number | null
          country_id: number
          created_at?: string
          description?: string | null
          domain?: string | null
          duplicate_of?: string | null
          id?: string
          introduction?: string | null
          is_claimed?: boolean
          is_premium?: boolean | null
          legacy_slug?: string | null
          logo_path?: string | null
          name: string
          plan?: string
          quality_score?: number | null
          search_vector?: unknown
          slug: string
          sort_name?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          city_id?: number | null
          country_id?: number
          created_at?: string
          description?: string | null
          domain?: string | null
          duplicate_of?: string | null
          id?: string
          introduction?: string | null
          is_claimed?: boolean
          is_premium?: boolean | null
          legacy_slug?: string | null
          logo_path?: string | null
          name?: string
          plan?: string
          quality_score?: number | null
          search_vector?: unknown
          slug?: string
          sort_name?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agencies_city_id_country_id_fkey"
            columns: ["city_id", "country_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id", "country_id"]
          },
          {
            foreignKeyName: "agencies_city_id_country_id_fkey"
            columns: ["city_id", "country_id"]
            isOneToOne: false
            referencedRelation: "city_stats"
            referencedColumns: ["city_id", "country_id"]
          },
          {
            foreignKeyName: "agencies_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "country_stats"
            referencedColumns: ["country_id"]
          },
          {
            foreignKeyName: "agencies_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_specialisms: {
        Row: {
          agency_id: string
          specialism_id: number
        }
        Insert: {
          agency_id: string
          specialism_id: number
        }
        Update: {
          agency_id?: string
          specialism_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_specialisms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_specialisms_specialism_id_fkey"
            columns: ["specialism_id"]
            isOneToOne: false
            referencedRelation: "city_specialism_stats"
            referencedColumns: ["specialism_id"]
          },
          {
            foreignKeyName: "agency_specialisms_specialism_id_fkey"
            columns: ["specialism_id"]
            isOneToOne: false
            referencedRelation: "country_specialism_stats"
            referencedColumns: ["specialism_id"]
          },
          {
            foreignKeyName: "agency_specialisms_specialism_id_fkey"
            columns: ["specialism_id"]
            isOneToOne: false
            referencedRelation: "specialism_stats"
            referencedColumns: ["specialism_id"]
          },
          {
            foreignKeyName: "agency_specialisms_specialism_id_fkey"
            columns: ["specialism_id"]
            isOneToOne: false
            referencedRelation: "specialisms"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: number
          created_at: string
          id: number
          name: string
          photo_path: string | null
          slug: string
        }
        Insert: {
          country_id: number
          created_at?: string
          id?: never
          name: string
          photo_path?: string | null
          slug: string
        }
        Update: {
          country_id?: number
          created_at?: string
          id?: never
          name?: string
          photo_path?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "country_stats"
            referencedColumns: ["country_id"]
          },
        ]
      }
      countries: {
        Row: {
          created_at: string
          id: number
          iso2: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: never
          iso2?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: never
          iso2?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      slug_redirects: {
        Row: {
          agency_id: string
          created_at: string
          old_slug: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          old_slug: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          old_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "slug_redirects_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      specialisms: {
        Row: {
          id: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: never
          name: string
          slug: string
          sort_order: number
        }
        Update: {
          id?: never
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      city_specialism_stats: {
        Row: {
          agency_count: number | null
          city_id: number | null
          name: string | null
          slug: string | null
          sort_order: number | null
          specialism_id: number | null
        }
        Relationships: []
      }
      city_stats: {
        Row: {
          agency_count: number | null
          city_id: number | null
          country_id: number | null
          country_iso2: string | null
          country_name: string | null
          country_slug: string | null
          is_indexable: boolean | null
          name: string | null
          photo_path: string | null
          slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "country_stats"
            referencedColumns: ["country_id"]
          },
        ]
      }
      country_specialism_stats: {
        Row: {
          agency_count: number | null
          country_id: number | null
          name: string | null
          slug: string | null
          sort_order: number | null
          specialism_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agencies_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "country_stats"
            referencedColumns: ["country_id"]
          },
        ]
      }
      country_stats: {
        Row: {
          agency_count: number | null
          city_count: number | null
          country_id: number | null
          iso2: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          agency_count?: never
          city_count?: never
          country_id?: number | null
          iso2?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          agency_count?: never
          city_count?: never
          country_id?: number | null
          iso2?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      directory_totals: {
        Row: {
          agency_count: number | null
          city_count: number | null
          country_count: number | null
          specialism_count: number | null
        }
        Relationships: []
      }
      specialism_stats: {
        Row: {
          agency_count: number | null
          name: string | null
          slug: string | null
          sort_order: number | null
          specialism_id: number | null
        }
        Insert: {
          agency_count?: never
          name?: string | null
          slug?: string | null
          sort_order?: number | null
          specialism_id?: number | null
        }
        Update: {
          agency_count?: never
          name?: string | null
          slug?: string | null
          sort_order?: number | null
          specialism_id?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      search_agencies: {
        Args: {
          city_slug?: string
          country_slug?: string
          result_limit?: number
          result_offset?: number
          search_query: string
        }
        Returns: {
          city_id: number | null
          country_id: number
          created_at: string
          description: string | null
          domain: string | null
          duplicate_of: string | null
          id: string
          introduction: string | null
          is_claimed: boolean
          is_premium: boolean | null
          legacy_slug: string | null
          logo_path: string | null
          name: string
          plan: string
          quality_score: number | null
          search_vector: unknown
          slug: string
          sort_name: string | null
          status: string
          updated_at: string
          website: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "agencies"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
