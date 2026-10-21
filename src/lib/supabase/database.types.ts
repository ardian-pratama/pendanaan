export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value?: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      donation_progress: {
        Row: {
          collected_amount: number;
          created_at: string;
          id: string;
          label: string;
          target_amount: number;
          updated_at: string;
        };
        Insert: {
          collected_amount?: number;
          created_at?: string;
          id?: string;
          label: string;
          target_amount: number;
          updated_at?: string;
        };
        Update: {
          collected_amount?: number;
          created_at?: string;
          id?: string;
          label?: string;
          target_amount?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          badge: string | null;
          badge_style: string | null;
          category: string;
          created_at: string;
          description: string;
          id: string;
          image_url: string;
          is_available: boolean;
          is_featured: boolean;
          name: string;
          pickup_time: string | null;
          price: number;
          sold_count: number;
          sort_order: number;
          updated_at: string;
          wave: number;
        };
        Insert: {
          badge?: string | null;
          badge_style?: string | null;
          category: string;
          created_at?: string;
          description: string;
          id?: string;
          image_url: string;
          is_available?: boolean;
          is_featured?: boolean;
          name: string;
          pickup_time?: string | null;
          price: number;
          sold_count?: number;
          sort_order?: number;
          updated_at?: string;
          wave?: number;
        };
        Update: {
          badge?: string | null;
          badge_style?: string | null;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string;
          is_available?: boolean;
          is_featured?: boolean;
          name?: string;
          pickup_time?: string | null;
          price?: number;
          sold_count?: number;
          sort_order?: number;
          updated_at?: string;
          wave?: number;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          menu_item_id: string;
          order_id: string;
          quantity: number;
          subtotal: number | null;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          menu_item_id: string;
          order_id: string;
          quantity?: number;
          subtotal?: number | null;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          menu_item_id?: string;
          order_id?: string;
          quantity?: number;
          subtotal?: number | null;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          customer_email: string | null;
          customer_name: string;
          customer_phone: string;
          id: string;
          notes: string | null;
          order_number: string;
          payment_method: string | null;
          payment_proof_url: string | null;
          pickup_time: string;
          status: string;
          total_amount: number;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          customer_email?: string | null;
          customer_name: string;
          customer_phone: string;
          id?: string;
          notes?: string | null;
          order_number: string;
          payment_method?: string | null;
          payment_proof_url?: string | null;
          pickup_time: string;
          status?: string;
          total_amount?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          customer_email?: string | null;
          customer_name?: string;
          customer_phone?: string;
          id?: string;
          notes?: string | null;
          order_number?: string;
          payment_method?: string | null;
          payment_proof_url?: string | null;
          pickup_time?: string;
          status?: string;
          total_amount?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          role: string;
          permissions: string[];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          role?: string;
          permissions?: string[];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          role?: string;
          permissions?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      role_definitions: {
        Row: {
          id: string;
          name: string;
          description: string;
          badge_color: string;
          default_permissions: string[];
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          badge_color: string;
          default_permissions?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          badge_color?: string;
          default_permissions?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      menu_reviews: {
        Row: {
          id: string;
          menu_id: string;
          user_id: string | null;
          reviewer_name: string;
          reviewer_role: string;
          rating: number;
          comment: string;
          tags: string[];
          is_verified_buyer: boolean;
          helpful_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          menu_id: string;
          user_id?: string | null;
          reviewer_name: string;
          reviewer_role?: string;
          rating: number;
          comment: string;
          tags?: string[];
          is_verified_buyer?: boolean;
          helpful_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          menu_id?: string;
          user_id?: string | null;
          reviewer_name?: string;
          reviewer_role?: string;
          rating?: number;
          comment?: string;
          tags?: string[];
          is_verified_buyer?: boolean;
          helpful_count?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_reviews_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
          }
        ];
      };
      review_comments: {
        Row: {
          id: string;
          review_id: string;
          user_id: string | null;
          user_name: string;
          user_role: string | null;
          is_admin: boolean;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          user_id?: string | null;
          user_name: string;
          user_role?: string | null;
          is_admin?: boolean;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          user_id?: string | null;
          user_name?: string;
          user_role?: string | null;
          is_admin?: boolean;
          comment?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          title: string;
          category: string;
          amount: number;
          expense_date: string;
          notes: string | null;
          receipt_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          category?: string;
          amount: number;
          expense_date?: string;
          notes?: string | null;
          receipt_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          category?: string;
          amount?: number;
          expense_date?: string;
          notes?: string | null;
          receipt_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type DonationProgress =
  Database["public"]["Tables"]["donation_progress"]["Row"];
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type RoleDefinition = Database["public"]["Tables"]["role_definitions"]["Row"];
export type AppSetting = Database["public"]["Tables"]["app_settings"]["Row"];
export type MenuReviewRow = Database["public"]["Tables"]["menu_reviews"]["Row"];
export type MenuCategory = "makanan" | "minuman" | "camilan";
export type OrderStatus =
  | "pending"
  | "menunggu_pembayaran"
  | "confirmed"
  | "dikerjakan"
  | "menunggu_selesai"
  | "completed"
  | "selesai"
  | "cancelled";
export type UserRole = "superadmin" | "admin" | "bendahara" | "staff" | "user";

export type PermissionKey =
  | "orders:view"
  | "orders:update"
  | "orders:delete"
  | "menu:view"
  | "menu:create"
  | "menu:update"
  | "menu:delete"
  | "users:view"
  | "users:manage"
  | "reports:view"
  | "reports:edit"
  | "settings:edit";

