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
      academic_periods: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          is_current: boolean
          name: string
          starts_on: string | null
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_current?: boolean
          name: string
          starts_on?: string | null
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_current?: boolean
          name?: string
          starts_on?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience: string
          author_id: string
          body: string
          course_id: string | null
          created_at: string
          id: string
          title: string
        }
        Insert: {
          audience?: string
          author_id?: string
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          audience?: string
          author_id?: string
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          feedback: string | null
          id: string
          is_correct: boolean | null
          marks_awarded: number | null
          question_id: string
          response: string
          submission_id: string
        }
        Insert: {
          feedback?: string | null
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id: string
          response?: string
          submission_id: string
        }
        Update: {
          feedback?: string | null
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id?: string
          response?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          course_id: string
          created_at: string
          due_at: string | null
          id: string
          instructions: string
          kind: string
          pass_mark: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          instructions?: string
          kind?: string
          pass_mark?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          instructions?: string
          kind?: string
          pass_mark?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          course_id: string
          recorded_at: string
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          course_id: string
          recorded_at?: string
          session_id: string
          status?: string
          student_id: string
        }
        Update: {
          course_id?: string
          recorded_at?: string
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          category: string
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          category?: string
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          category?: string
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          amount_off: number | null
          code: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          max_redemptions: number | null
          percent_off: number | null
          times_redeemed: number
        }
        Insert: {
          active?: boolean
          amount_off?: number | null
          code: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          percent_off?: number | null
          times_redeemed?: number
        }
        Update: {
          active?: boolean
          amount_off?: number | null
          code?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          percent_off?: number | null
          times_redeemed?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string
          currency: string
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          description: string
          grade_level_id: string | null
          id: string
          instructor_id: string | null
          is_visible: boolean
          live_sessions_enabled: boolean
          period_id: string | null
          price: number
          published_at: string | null
          review_comment: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["course_status"]
          subject_id: string | null
          submitted_at: string | null
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          description?: string
          grade_level_id?: string | null
          id?: string
          instructor_id?: string | null
          is_visible?: boolean
          live_sessions_enabled?: boolean
          period_id?: string | null
          price?: number
          published_at?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          subject_id?: string | null
          submitted_at?: string | null
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          description?: string
          grade_level_id?: string | null
          id?: string
          instructor_id?: string | null
          is_visible?: boolean
          live_sessions_enabled?: boolean
          period_id?: string | null
          price?: number
          published_at?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          subject_id?: string | null
          submitted_at?: string | null
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_grade_level_id_fkey"
            columns: ["grade_level_id"]
            isOneToOne: false
            referencedRelation: "grade_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          payment_id: string | null
          source: string
          status: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          payment_id?: string | null
          source?: string
          status?: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          payment_id?: string | null
          source?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_levels: {
        Row: {
          created_at: string
          default_mode: Database["public"]["Enums"]["delivery_mode"]
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          default_mode?: Database["public"]["Enums"]["delivery_mode"]
          id?: string
          name: string
          sort_order: number
        }
        Update: {
          created_at?: string
          default_mode?: Database["public"]["Enums"]["delivery_mode"]
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      interventions: {
        Row: {
          action: string
          concern: string
          course_id: string | null
          created_at: string
          follow_up_on: string | null
          id: string
          instructor_id: string | null
          shared_with_parent: boolean
          status: string
          student_id: string
        }
        Insert: {
          action?: string
          concern?: string
          course_id?: string | null
          created_at?: string
          follow_up_on?: string | null
          id?: string
          instructor_id?: string | null
          shared_with_parent?: boolean
          status?: string
          student_id: string
        }
        Update: {
          action?: string
          concern?: string
          course_id?: string | null
          created_at?: string
          follow_up_on?: string | null
          id?: string
          instructor_id?: string | null
          shared_with_parent?: boolean
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string
          course_id: string
          lesson_id: string
          student_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          lesson_id: string
          student_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          lesson_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string
          course_id: string
          created_at: string
          document_url: string | null
          duration_min: number | null
          id: string
          module_id: string
          position: number
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string
          course_id: string
          created_at?: string
          document_url?: string | null
          duration_min?: number | null
          id?: string
          module_id: string
          position?: number
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          document_url?: string | null
          duration_min?: number | null
          id?: string
          module_id?: string
          position?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          duration_min: number
          id: string
          meeting_url: string | null
          notes: string | null
          starts_at: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          meeting_url?: string | null
          notes?: string | null
          starts_at: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          meeting_url?: string | null
          notes?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_links: {
        Row: {
          created_at: string
          id: string
          note: string | null
          parent_id: string
          relationship: string
          status: string
          student_email: string
          student_id: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          parent_id: string
          relationship?: string
          status?: string
          student_email: string
          student_id?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          parent_id?: string
          relationship?: string
          status?: string
          student_email?: string
          student_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          coupon_code: string | null
          course_id: string | null
          created_at: string
          currency: string
          discount: number
          id: string
          notes: string | null
          payer_id: string | null
          plan_id: string | null
          provider: string
          provider_ref: string | null
          reconciled_at: string | null
          refund_reason: string | null
          refunded_at: string | null
          settlement_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string | null
          subtotal: number
        }
        Insert: {
          amount?: number
          coupon_code?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          notes?: string | null
          payer_id?: string | null
          plan_id?: string | null
          provider?: string
          provider_ref?: string | null
          reconciled_at?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          settlement_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string | null
          subtotal?: number
        }
        Update: {
          amount?: number
          coupon_code?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          notes?: string | null
          payer_id?: string | null
          plan_id?: string | null
          provider?: string
          provider_ref?: string | null
          reconciled_at?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          settlement_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "price_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      price_plans: {
        Row: {
          active: boolean
          amount: number
          billing_interval: string | null
          course_ids: string[]
          created_at: string
          currency: string
          description: string
          id: string
          kind: string
          name: string
          period_id: string | null
        }
        Insert: {
          active?: boolean
          amount?: number
          billing_interval?: string | null
          course_ids?: string[]
          created_at?: string
          currency?: string
          description?: string
          id?: string
          kind?: string
          name: string
          period_id?: string | null
        }
        Update: {
          active?: boolean
          amount?: number
          billing_interval?: string | null
          course_ids?: string[]
          created_at?: string
          currency?: string
          description?: string
          id?: string
          kind?: string
          name?: string
          period_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_plans_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          grade_level_id: string | null
          id: string
          is_active: boolean
          notify_email: boolean
          notify_in_app: boolean
          phone: string | null
          requested_role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          grade_level_id?: string | null
          id: string
          is_active?: boolean
          notify_email?: boolean
          notify_in_app?: boolean
          phone?: string | null
          requested_role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          grade_level_id?: string | null
          id?: string
          is_active?: boolean
          notify_email?: boolean
          notify_in_app?: boolean
          phone?: string | null
          requested_role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_grade_level_id_fkey"
            columns: ["grade_level_id"]
            isOneToOne: false
            referencedRelation: "grade_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      question_keys: {
        Row: {
          correct_answer: string
          course_id: string
          question_id: string
        }
        Insert: {
          correct_answer: string
          course_id: string
          question_id: string
        }
        Update: {
          correct_answer?: string
          course_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_keys_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_keys_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          assessment_id: string
          course_id: string
          created_at: string
          id: string
          kind: string
          marks: number
          options: Json
          position: number
          prompt: string
          rubric: string | null
        }
        Insert: {
          assessment_id: string
          course_id: string
          created_at?: string
          id?: string
          kind: string
          marks?: number
          options?: Json
          position?: number
          prompt: string
          rubric?: string | null
        }
        Update: {
          assessment_id?: string
          course_id?: string
          created_at?: string
          id?: string
          kind?: string
          marks?: number
          options?: Json
          position?: number
          prompt?: string
          rubric?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          payment_id: string
          reason: string
          requested_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          payment_id: string
          reason?: string
          requested_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          payment_id?: string
          reason?: string
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          assessment_id: string
          auto_score: number | null
          course_id: string
          feedback: string | null
          flagged: boolean
          graded_at: string | null
          graded_by: string | null
          id: string
          manual_score: number | null
          max_score: number | null
          status: string
          student_id: string
          submitted_at: string
          total_score: number | null
        }
        Insert: {
          assessment_id: string
          auto_score?: number | null
          course_id: string
          feedback?: string | null
          flagged?: boolean
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          manual_score?: number | null
          max_score?: number | null
          status?: string
          student_id: string
          submitted_at?: string
          total_score?: number | null
        }
        Update: {
          assessment_id?: string
          auto_score?: number | null
          course_id?: string
          feedback?: string | null
          flagged?: boolean
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          manual_score?: number | null
          max_score?: number | null
          status?: string
          student_id?: string
          submitted_at?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_course: { Args: { _course: string }; Returns: boolean }
      can_message: { Args: { _other: string }; Returns: boolean }
      can_see_profile: { Args: { _target: string }; Returns: boolean }
      can_see_student: { Args: { _student: string }; Returns: boolean }
      can_view_course_content: { Args: { _course: string }; Returns: boolean }
      check_performance: { Args: { _sub: string }; Returns: undefined }
      choose_account_type: {
        Args: { _grade_level_id?: string; _type: string }
        Returns: undefined
      }
      decide_refund_request: {
        Args: { _approve: boolean; _note: string; _request_id: string }
        Returns: undefined
      }
      grade_submission: {
        Args: { _feedback: string; _grades: Json; _submission_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_course_owner: { Args: { _course: string }; Returns: boolean }
      is_enrolled: {
        Args: { _course: string; _student: string }
        Returns: boolean
      }
      is_finance_admin: { Args: never; Returns: boolean }
      is_parent_of: { Args: { _student: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_published_course: { Args: { _course: string }; Returns: boolean }
      preview_checkout: {
        Args: { _coupon?: string; _course_id?: string; _plan_id?: string }
        Returns: Json
      }
      refund_payment: {
        Args: { _payment_id: string; _reason: string }
        Returns: undefined
      }
      simulate_checkout: {
        Args: {
          _coupon?: string
          _course_id?: string
          _outcome?: string
          _plan_id?: string
          _student_id: string
        }
        Returns: string
      }
      students_needing_support: {
        Args: { _course_id?: string }
        Returns: {
          avg_pct: number
          course_id: string
          course_title: string
          low_count: number
          overdue_count: number
          student_id: string
          student_name: string
        }[]
      }
      submit_assessment: {
        Args: { _answers: Json; _assessment_id: string }
        Returns: string
      }
      verify_parent_link: {
        Args: { _approve: boolean; _link_id: string; _note?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "platform_admin"
        | "finance_admin"
        | "instructor"
        | "student"
        | "parent"
      course_status: "draft" | "pending" | "approved" | "rejected" | "published"
      delivery_mode: "guided" | "self_paced"
      payment_status:
        | "pending"
        | "succeeded"
        | "failed"
        | "refunded"
        | "disputed"
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
    Enums: {
      app_role: [
        "platform_admin",
        "finance_admin",
        "instructor",
        "student",
        "parent",
      ],
      course_status: ["draft", "pending", "approved", "rejected", "published"],
      delivery_mode: ["guided", "self_paced"],
      payment_status: [
        "pending",
        "succeeded",
        "failed",
        "refunded",
        "disputed",
      ],
    },
  },
} as const
