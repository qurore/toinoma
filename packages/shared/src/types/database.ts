// Database types matching the Supabase schema
// Source of truth: supabase/migrations/*

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

export type AnswerType =
  | "essay"
  | "mark_sheet"
  | "fill_in_blank"
  | "multiple_choice";

export type NotificationType =
  | "purchase"
  | "grading"
  | "review"
  | "announcement"
  | "subscription"
  | "system";

export type ReportReason = "copyright" | "inappropriate" | "spam" | "other";
export type ReportStatus = "pending" | "reviewed" | "action_taken" | "dismissed";

export type CouponType = "percentage" | "fixed";

export type AdminActionType =
  | "user_banned"
  | "user_suspended"
  | "user_warned"
  | "content_removed"
  | "report_reviewed"
  | "report_dismissed"
  | "announcement_created"
  | "seller_verified";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          preferred_subjects: Subject[];
          study_goal: string | null;
          banned_at: string | null;
          suspended_until: string | null;
          ban_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          preferred_subjects?: Subject[];
          study_goal?: string | null;
          banned_at?: string | null;
          suspended_until?: string | null;
          ban_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          preferred_subjects?: Subject[];
          study_goal?: string | null;
          banned_at?: string | null;
          suspended_until?: string | null;
          ban_reason?: string | null;
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
          cover_image_url: string | null;
          time_limit_minutes: number | null;
          total_points: number;
          preview_question_ids: string[];
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
          cover_image_url?: string | null;
          time_limit_minutes?: number | null;
          total_points?: number;
          preview_question_ids?: string[];
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
          cover_image_url?: string | null;
          time_limit_minutes?: number | null;
          total_points?: number;
          preview_question_ids?: string[];
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
      questions: {
        Row: {
          id: string;
          seller_id: string;
          question_type: AnswerType;
          question_text: string;
          question_images: Json;
          rubric: Json;
          model_answer: string | null;
          model_answer_images: Json;
          subject: Subject;
          topic_tags: string[];
          difficulty: Difficulty;
          estimated_minutes: number | null;
          points: number;
          video_urls: Json;
          vertical_text: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          question_type: AnswerType;
          question_text: string;
          question_images?: Json;
          rubric?: Json;
          model_answer?: string | null;
          model_answer_images?: Json;
          subject: Subject;
          topic_tags?: string[];
          difficulty?: Difficulty;
          estimated_minutes?: number | null;
          points?: number;
          video_urls?: Json;
          vertical_text?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          question_type?: AnswerType;
          question_text?: string;
          question_images?: Json;
          rubric?: Json;
          model_answer?: string | null;
          model_answer_images?: Json;
          subject?: Subject;
          topic_tags?: string[];
          difficulty?: Difficulty;
          estimated_minutes?: number | null;
          points?: number;
          video_urls?: Json;
          vertical_text?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      problem_set_questions: {
        Row: {
          id: string;
          problem_set_id: string;
          question_id: string;
          section_number: number;
          section_title: string | null;
          position: number;
          points_override: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          problem_set_id: string;
          question_id: string;
          section_number?: number;
          section_title?: string | null;
          position?: number;
          points_override?: number | null;
          created_at?: string;
        };
        Update: {
          section_number?: number;
          section_title?: string | null;
          position?: number;
          points_override?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "problem_set_questions_problem_set_id_fkey";
            columns: ["problem_set_id"];
            isOneToOne: false;
            referencedRelation: "problem_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "problem_set_questions_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
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
          coupon_id: string | null;
          discount_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_set_id: string;
          stripe_payment_intent_id?: string | null;
          amount_paid: number;
          coupon_id?: string | null;
          discount_amount?: number;
          created_at?: string;
        };
        Update: {
          stripe_payment_intent_id?: string | null;
          coupon_id?: string | null;
          discount_amount?: number;
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
          grace_period_end: string | null;
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
          grace_period_end?: string | null;
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
          grace_period_end?: string | null;
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
      reviews: {
        Row: {
          id: string;
          user_id: string;
          problem_set_id: string;
          rating: number;
          body: string | null;
          seller_response: string | null;
          seller_responded_at: string | null;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_set_id: string;
          rating: number;
          body?: string | null;
          seller_response?: string | null;
          seller_responded_at?: string | null;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          rating?: number;
          body?: string | null;
          seller_response?: string | null;
          seller_responded_at?: string | null;
          helpful_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_problem_set_id_fkey";
            columns: ["problem_set_id"];
            isOneToOne: false;
            referencedRelation: "problem_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      review_votes: {
        Row: {
          id: string;
          review_id: string;
          user_id: string;
          helpful: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          user_id: string;
          helpful: boolean;
          created_at?: string;
        };
        Update: {
          helpful?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_purchase: boolean;
          email_grading: boolean;
          email_review: boolean;
          email_announcement: boolean;
          email_subscription: boolean;
          email_qa: boolean;
          email_marketing: boolean;
          inapp_purchase: boolean;
          inapp_grading: boolean;
          inapp_review: boolean;
          inapp_announcement: boolean;
          inapp_subscription: boolean;
          inapp_qa: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_purchase?: boolean;
          email_grading?: boolean;
          email_review?: boolean;
          email_announcement?: boolean;
          email_subscription?: boolean;
          email_qa?: boolean;
          email_marketing?: boolean;
          inapp_purchase?: boolean;
          inapp_grading?: boolean;
          inapp_review?: boolean;
          inapp_announcement?: boolean;
          inapp_subscription?: boolean;
          inapp_qa?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email_purchase?: boolean;
          email_grading?: boolean;
          email_review?: boolean;
          email_announcement?: boolean;
          email_subscription?: boolean;
          email_qa?: boolean;
          email_marketing?: boolean;
          inapp_purchase?: boolean;
          inapp_grading?: boolean;
          inapp_review?: boolean;
          inapp_announcement?: boolean;
          inapp_subscription?: boolean;
          inapp_qa?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      qa_questions: {
        Row: {
          id: string;
          problem_set_id: string;
          user_id: string;
          question_id: string | null;
          title: string;
          body: string;
          pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          problem_set_id: string;
          user_id: string;
          question_id?: string | null;
          title: string;
          body: string;
          pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          body?: string;
          pinned?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qa_questions_problem_set_id_fkey";
            columns: ["problem_set_id"];
            isOneToOne: false;
            referencedRelation: "problem_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qa_questions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      qa_answers: {
        Row: {
          id: string;
          qa_question_id: string;
          user_id: string;
          body: string;
          is_accepted: boolean;
          upvotes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          qa_question_id: string;
          user_id: string;
          body: string;
          is_accepted?: boolean;
          upvotes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          is_accepted?: boolean;
          upvotes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qa_answers_qa_question_id_fkey";
            columns: ["qa_question_id"];
            isOneToOne: false;
            referencedRelation: "qa_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reason: ReportReason;
          description: string | null;
          status: ReportStatus;
          problem_set_id: string | null;
          review_id: string | null;
          qa_question_id: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reason: ReportReason;
          description?: string | null;
          status?: ReportStatus;
          problem_set_id?: string | null;
          review_id?: string | null;
          qa_question_id?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: ReportStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          id: string;
          seller_id: string;
          code: string;
          coupon_type: CouponType;
          discount_value: number;
          min_purchase: number;
          max_uses: number | null;
          current_uses: number;
          problem_set_id: string | null;
          applies_to_all: boolean;
          starts_at: string;
          expires_at: string | null;
          active: boolean;
          stripe_coupon_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          code: string;
          coupon_type: CouponType;
          discount_value: number;
          min_purchase?: number;
          max_uses?: number | null;
          current_uses?: number;
          problem_set_id?: string | null;
          applies_to_all?: boolean;
          starts_at?: string;
          expires_at?: string | null;
          active?: boolean;
          stripe_coupon_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          coupon_type?: CouponType;
          discount_value?: number;
          min_purchase?: number;
          max_uses?: number | null;
          current_uses?: number;
          problem_set_id?: string | null;
          applies_to_all?: boolean;
          starts_at?: string;
          expires_at?: string | null;
          active?: boolean;
          stripe_coupon_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coupons_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      announcements: {
        Row: {
          id: string;
          admin_id: string;
          title: string;
          body: string;
          target: string;
          published: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          title: string;
          body: string;
          target?: string;
          published?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          body?: string;
          target?: string;
          published?: boolean;
          published_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          action: AdminActionType;
          target_type: string;
          target_id: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: AdminActionType;
          target_type: string;
          target_id: string;
          details?: Json;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      qa_upvotes: {
        Row: {
          id: string;
          qa_answer_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          qa_answer_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "qa_upvotes_qa_answer_id_fkey";
            columns: ["qa_answer_id"];
            isOneToOne: false;
            referencedRelation: "qa_answers";
            referencedColumns: ["id"];
          },
        ];
      };
      recently_viewed: {
        Row: {
          id: string;
          user_id: string;
          problem_set_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_set_id: string;
          viewed_at?: string;
        };
        Update: {
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recently_viewed_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recently_viewed_problem_set_id_fkey";
            columns: ["problem_set_id"];
            isOneToOne: false;
            referencedRelation: "problem_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      user_notes: {
        Row: {
          id: string;
          user_id: string;
          problem_set_id: string;
          question_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_set_id: string;
          question_id?: string | null;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          problem_set_id: string;
          question_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_set_id: string;
          question_id?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "bookmarks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          processed_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          event_type: string;
          processed_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      rate_limits: {
        Row: {
          id: string;
          key: string;
          count: number;
          window_start: string;
          window_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          count?: number;
          window_start?: string;
          window_ms: number;
          created_at?: string;
        };
        Update: {
          count?: number;
          window_start?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_id_by_email: {
        Args: { lookup_email: string };
        Returns: { id: string }[];
      };
      cleanup_expired_rate_limits: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      subject: Subject;
      difficulty: Difficulty;
      problem_set_status: ProblemSetStatus;
      subscription_tier: SubscriptionTier;
      subscription_interval: SubscriptionInterval;
      answer_type: AnswerType;
      notification_type: NotificationType;
      report_reason: ReportReason;
      report_status: ReportStatus;
      coupon_type: CouponType;
      admin_action_type: AdminActionType;
    };
  };
}
