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
      agency_access_requests: {
        Row: {
          agency_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_access_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
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
      blog_posts: {
        Row: {
          author: string | null
          body_markdown: string
          cover_image_alt: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          excerpt: string
          id: string
          published_at: string
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          updated_by: string
          word_count: number
        }
        Insert: {
          author?: string | null
          body_markdown?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          excerpt?: string
          id?: string
          published_at?: string
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          updated_by: string
          word_count?: never
        }
        Update: {
          author?: string | null
          body_markdown?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          excerpt?: string
          id?: string
          published_at?: string
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string
          word_count?: never
        }
        Relationships: []
      }
      blog_slug_redirects: {
        Row: {
          created_at: string
          old_slug: string
          post_id: string
        }
        Insert: {
          created_at?: string
          old_slug: string
          post_id: string
        }
        Update: {
          created_at?: string
          old_slug?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_slug_redirects_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
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
      listing_requests: {
        Row: {
          agency_name: string | null
          created_at: string
          email: string
          id: string
          kind: string
          message: string | null
          name: string
          source_path: string | null
          website: string | null
        }
        Insert: {
          agency_name?: string | null
          created_at?: string
          email: string
          id?: string
          kind: string
          message?: string | null
          name: string
          source_path?: string | null
          website?: string | null
        }
        Update: {
          agency_name?: string | null
          created_at?: string
          email?: string
          id?: string
          kind?: string
          message?: string | null
          name?: string
          source_path?: string | null
          website?: string | null
        }
        Relationships: []
      }
      listing_submissions: {
        Row: {
          agency_id: string | null
          city_name: string
          country_id: number
          created_at: string
          description: string
          domain: string
          id: string
          introduction: string | null
          name: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialism_ids: number[]
          status: string
          user_id: string
          website: string
        }
        Insert: {
          agency_id?: string | null
          city_name: string
          country_id: number
          created_at?: string
          description: string
          domain: string
          id?: string
          introduction?: string | null
          name: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialism_ids: number[]
          status?: string
          user_id: string
          website: string
        }
        Update: {
          agency_id?: string | null
          city_name?: string
          country_id?: number
          created_at?: string
          description?: string
          domain?: string
          id?: string
          introduction?: string | null
          name?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialism_ids?: number[]
          status?: string
          user_id?: string
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_submissions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_submissions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_submissions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "country_stats"
            referencedColumns: ["country_id"]
          },
        ]
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
      admin_approve_submission: {
        Args: { submission_id: string }
        Returns: string
      }
      admin_check: { Args: never; Returns: string }
      admin_create_api_key: {
        Args: { key_name: string; new_key_hash: string; new_key_prefix: string }
        Returns: Json
      }
      admin_delete_blog_post: { Args: { target: string }; Returns: Json }
      admin_get_blog_post: { Args: { target: string }; Returns: Json }
      admin_link_person: {
        Args: { agency_slug: string; person_email: string }
        Returns: undefined
      }
      admin_list_api_keys: { Args: never; Returns: Json }
      admin_list_blog_posts: { Args: never; Returns: Json }
      admin_list_submissions: { Args: never; Returns: Json }
      admin_reject_submission: {
        Args: { note: string; submission_id: string }
        Returns: undefined
      }
      admin_revoke_api_key: { Args: { target: string }; Returns: undefined }
      admin_save_blog_post: {
        Args: {
          new_author: string
          new_body: string
          new_cover_alt: string
          new_cover_url: string
          new_excerpt: string
          new_published_at: string
          new_slug: string
          new_status: string
          new_tags: string[]
          new_title: string
          target: string
        }
        Returns: Json
      }
      agency_owner_emails: {
        Args: { target_agency: string }
        Returns: string[]
      }
      allow_code_attempt: { Args: { target_email: string }; Returns: boolean }
      allow_login_email: {
        Args: { target_email: string; visitor_ip: string }
        Returns: boolean
      }
      bot_check_key: {
        Args: { api_key: string; is_write: boolean }
        Returns: Json
      }
      bot_delete_blog_post: {
        Args: { api_key: string; target: string }
        Returns: Json
      }
      bot_get_blog_post: {
        Args: { api_key: string; post_slug: string }
        Returns: Json
      }
      bot_list_blog_posts: {
        Args: { api_key: string; max_rows?: number; only_status?: string }
        Returns: Json
      }
      bot_save_blog_post: {
        Args: {
          api_key: string
          new_author: string
          new_body: string
          new_cover_alt: string
          new_cover_url: string
          new_excerpt: string
          new_published_at: string
          new_slug: string
          new_status: string
          new_tags: string[]
          new_title: string
          target: string
        }
        Returns: Json
      }
      claim_listing: { Args: { target_agency: string }; Returns: string }
      claim_single_match: { Args: never; Returns: string }
      decide_access_request: {
        Args: { approve: boolean; request_id: string }
        Returns: undefined
      }
      my_account: { Args: never; Returns: Json }
      my_listing: { Args: { target_agency: string }; Returns: Json }
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
      set_agency_logo: {
        Args: { new_logo_path: string; target_agency: string }
        Returns: string
      }
      submit_new_listing: {
        Args: {
          new_city_name: string
          new_country_id: number
          new_description: string
          new_introduction: string
          new_name: string
          new_specialism_ids: number[]
          new_website: string
        }
        Returns: string
      }
      update_my_listing: {
        Args: {
          new_description: string
          new_introduction: string
          new_specialism_ids: number[]
          target_agency: string
        }
        Returns: undefined
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
