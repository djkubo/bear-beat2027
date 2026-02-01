export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          phone: string | null
          country_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          phone?: string | null
          country_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          phone?: string | null
          country_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      packs: {
        Row: {
          id: number
          slug: string
          name: string
          description: string | null
          price_mxn: number
          price_usd: number
          release_month: string
          release_date: string | null
          total_videos: number
          total_size_gb: number
          cover_image_url: string | null
          r2_folder_path: string | null
          ftp_folder_path: string | null
          status: 'draft' | 'upcoming' | 'available' | 'archived'
          featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          slug: string
          name: string
          description?: string | null
          price_mxn?: number
          price_usd?: number
          release_month: string
          release_date?: string | null
          total_videos?: number
          total_size_gb?: number
          cover_image_url?: string | null
          r2_folder_path?: string | null
          ftp_folder_path?: string | null
          status?: 'draft' | 'upcoming' | 'available' | 'archived'
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          slug?: string
          name?: string
          description?: string | null
          price_mxn?: number
          price_usd?: number
          release_month?: string
          release_date?: string | null
          total_videos?: number
          total_size_gb?: number
          cover_image_url?: string | null
          r2_folder_path?: string | null
          ftp_folder_path?: string | null
          status?: 'draft' | 'upcoming' | 'available' | 'archived'
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      purchases: {
        Row: {
          id: number
          user_id: string
          pack_id: number
          amount_paid: number
          currency: string
          payment_provider: string | null
          payment_id: string | null
          was_bundle: boolean
          bundle_id: number | null
          discount_applied: number
          ftp_username: string | null
          ftp_password: string | null
          purchased_at: string
        }
        Insert: {
          id?: number
          user_id: string
          pack_id: number
          amount_paid: number
          currency?: string
          payment_provider?: string | null
          payment_id?: string | null
          was_bundle?: boolean
          bundle_id?: number | null
          discount_applied?: number
          ftp_username?: string | null
          ftp_password?: string | null
          purchased_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          pack_id?: number
          amount_paid?: number
          currency?: string
          payment_provider?: string | null
          payment_id?: string | null
          was_bundle?: boolean
          bundle_id?: number | null
          discount_applied?: number
          ftp_username?: string | null
          ftp_password?: string | null
          purchased_at?: string
        }
      }
      genres: {
        Row: {
          id: number
          name: string
          slug: string
          video_count: number
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
          video_count?: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
          video_count?: number
          created_at?: string
        }
      }
      videos: {
        Row: {
          id: number
          pack_id: number
          genre_id: number | null
          title: string
          artist: string | null
          duration: number | null
          resolution: string
          file_size: number | null
          file_path: string
          thumbnail_url: string | null
          preview_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          pack_id: number
          genre_id?: number | null
          title: string
          artist?: string | null
          duration?: number | null
          resolution?: string
          file_size?: number | null
          file_path: string
          thumbnail_url?: string | null
          preview_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          pack_id?: number
          genre_id?: number | null
          title?: string
          artist?: string | null
          duration?: number | null
          resolution?: string
          file_size?: number | null
          file_path?: string
          thumbnail_url?: string | null
          preview_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bundles: {
        Row: {
          id: number
          name: string
          description: string | null
          regular_price: number
          bundle_price: number
          savings: number
          pack_ids: number[]
          required_packs: number
          valid_from: string | null
          valid_until: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          regular_price: number
          bundle_price: number
          savings: number
          pack_ids: number[]
          required_packs?: number
          valid_from?: string | null
          valid_until?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          regular_price?: number
          bundle_price?: number
          savings?: number
          pack_ids?: number[]
          required_packs?: number
          valid_from?: string | null
          valid_until?: string | null
          active?: boolean
          created_at?: string
        }
      }
      ftp_pool: {
        Row: {
          id: number
          username: string
          password: string
          in_use: boolean
          created_at: string
        }
        Insert: {
          id?: number
          username: string
          password: string
          in_use?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          username?: string
          password?: string
          in_use?: boolean
          created_at?: string
        }
      }
      pending_purchases: {
        Row: {
          id: number
          stripe_session_id: string | null
          stripe_payment_intent: string | null
          pack_id: number | null
          amount_paid: number | null
          currency: string | null
          payment_provider: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          status: string | null
          payment_status: string | null
          user_id: string | null
          completed_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: number
          stripe_session_id?: string | null
          stripe_payment_intent?: string | null
          pack_id?: number | null
          amount_paid?: number | null
          currency?: string | null
          payment_provider?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          status?: string | null
          payment_status?: string | null
          user_id?: string | null
          completed_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: number
          stripe_session_id?: string | null
          stripe_payment_intent?: string | null
          pack_id?: number | null
          amount_paid?: number | null
          currency?: string | null
          payment_provider?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          status?: string | null
          payment_status?: string | null
          user_id?: string | null
          completed_at?: string | null
          expires_at?: string | null
        }
      }
    }
  }
}
