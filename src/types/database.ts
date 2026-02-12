// Placeholder types — will be replaced by `supabase gen types typescript` output
// These types match the schema defined in CLAUDE.md

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

export type UserRole = "student" | "creator";

export type Difficulty = "easy" | "medium" | "hard";

export type ProblemSetStatus = "draft" | "published";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          display_name: string | null;
          avatar_url: string | null;
          stripe_account_id: string | null;
          stripe_onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          display_name?: string | null;
          avatar_url?: string | null;
          stripe_account_id?: string | null;
          stripe_onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          display_name?: string | null;
          avatar_url?: string | null;
          stripe_account_id?: string | null;
          stripe_onboarding_complete?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      problem_sets: {
        Row: {
          id: string;
          creator_id: string;
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
          creator_id: string;
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
            foreignKeyName: "problem_sets_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      subject: Subject;
      difficulty: Difficulty;
      problem_set_status: ProblemSetStatus;
    };
  };
}
