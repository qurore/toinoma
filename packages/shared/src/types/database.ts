// Database types matching the Supabase schema
// Source of truth: supabase/migrations/20260213080238_remote_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Subject =
  | "math"
  | "english"
  | "japanese"
  | "physics"
  | "chemistry"
  | "biology"
  | "japanese_history"
  | "world_history"
  | "geography";

export type Difficulty = "easy" | "medium" | "hard";

export type ProblemSetStatus = "draft" | "published";

export type SubscriptionTier = "free" | "basic" | "pro";
export type SubscriptionInterval = "monthly" | "annual";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      seller_profiles: {
        Row: {
          id: string;
          seller_display_name: string;
          seller_description: string | null;
          university: string | null;
          circle_name: string | null;
          tos_accepted_at: string | null;
          stripe_account_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          seller_display_name: string;
          seller_description?: string | null;
          university?: string | null;
          circle_name?: string | null;
          tos_accepted_at?: string | null;
          stripe_account_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          seller_display_name?: string;
          seller_description?: string | null;
          university?: string | null;
          circle_name?: string | null;
          tos_accepted_at?: string | null;
          stripe_account_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      problem_sets: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          description: string | null;
          subject: Subject;
          university: string | null;
          difficulty: Difficulty;
          price: number;
          status: ProblemSetStatus;
          problem_pdf_url: string | null;
          solution_pdf_url: string | null;
          rubric: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          title: string;
          description?: string | null;
          subject: Subject;
          university?: string | null;
          difficulty: Difficulty;
          price: number;
          status?: ProblemSetStatus;
          problem_pdf_url?: string | null;
          solution_pdf_url?: string | null;
          rubric?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          subject?: Subject;
          university?: string | null;
          difficulty?: Difficulty;
          price?: number;
          status?: ProblemSetStatus;
          problem_pdf_url?: string | null;
          solution_pdf_url?: string | null;
          rubric?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "problem_sets_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          problem_set_id: string;
          stripe_payment_intent_id: string | null;
          amount_paid: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_set_id: string;
          stripe_payment_intent_id?: string | null;
          amount_paid: number;
          created_at?: string;
        };
        Update: {
          stripe_payment_intent_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_problem_set_id_fkey";
            columns: ["problem_set_id"];
            isOneToOne: false;
            referencedRelation: "problem_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          id: string;
          user_id: string;
          problem_set_id: string;
          answers: Json;
          score: number | null;
          max_score: number | null;
          feedback: Json | null;
          graded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_set_id: string;
          answers: Json;
          score?: number | null;
          max_score?: number | null;
          feedback?: Json | null;
          graded_at?: string | null;
          created_at?: string;
        };
        Update: {
          score?: number | null;
          max_score?: number | null;
          feedback?: Json | null;
          graded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_problem_set_id_fkey";
            columns: ["problem_set_id"];
            isOneToOne: false;
            referencedRelation: "problem_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          problem_set_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_set_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_problem_set_id_fkey";
            columns: ["problem_set_id"];
            isOneToOne: false;
            referencedRelation: "problem_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier: SubscriptionTier;
          interval: SubscriptionInterval | null;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tier?: SubscriptionTier;
          interval?: SubscriptionInterval | null;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tier?: SubscriptionTier;
          interval?: SubscriptionInterval | null;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      collection_items: {
        Row: {
          id: string;
          collection_id: string;
          problem_set_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          problem_set_id: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_items_problem_set_id_fkey";
            columns: ["problem_set_id"];
            isOneToOne: false;
            referencedRelation: "problem_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      token_usage: {
        Row: {
          id: string;
          user_id: string;
          submission_id: string | null;
          tokens_used: number;
          cost_usd: number;
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          submission_id?: string | null;
          tokens_used?: number;
          cost_usd?: number;
          model?: string;
          created_at?: string;
        };
        Update: {
          tokens_used?: number;
          cost_usd?: number;
        };
        Relationships: [
          {
            foreignKeyName: "token_usage_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subject: Subject;
      difficulty: Difficulty;
      problem_set_status: ProblemSetStatus;
      subscription_tier: SubscriptionTier;
      subscription_interval: SubscriptionInterval;
    };
  };
}
