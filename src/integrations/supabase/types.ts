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
      course_feedback: {
        Row: {
          answers: Json
          comment: string
          course_id: string
          created_at: string
          emailed_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json
          comment?: string
          course_id: string
          created_at?: string
          emailed_at?: string | null
          user_id?: string
        }
        Update: {
          answers?: Json
          comment?: string
          course_id?: string
          created_at?: string
          emailed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      course_notes: {
        Row: {
          body: string
          course_id: string
          course_title: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          course_id: string
          course_title?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          course_id?: string
          course_title?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_progress: {
        Row: {
          chapter_scores: Json
          course_id: string
          favorite: boolean
          notes: string
          read_sections: Json
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_scores?: Json
          course_id: string
          favorite?: boolean
          notes?: string
          read_sections?: Json
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          chapter_scores?: Json
          course_id?: string
          favorite?: boolean
          notes?: string
          read_sections?: Json
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      donation_settings: {
        Row: {
          id: number
          message: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          id?: number
          message: string
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          id?: number
          message?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          answers: Json
          course_id: string
          created_at: string
          id: string
          note: number
          passed: boolean
          score: number
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json
          course_id: string
          created_at?: string
          id?: string
          note: number
          passed?: boolean
          score: number
          total: number
          user_id?: string
        }
        Update: {
          answers?: Json
          course_id?: string
          created_at?: string
          id?: string
          note?: number
          passed?: boolean
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          id: string
          kind: string
          last_notified_on: string | null
          period: string
          remind_hour: number
          target: number
          time_zone: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          id?: string
          kind: string
          last_notified_on?: string | null
          period: string
          remind_hour?: number
          target: number
          time_zone?: string
          user_id?: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_notified_on?: string | null
          period?: string
          remind_hour?: number
          target?: number
          time_zone?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_reminders: {
        Row: {
          created_at: string
          done: boolean
          due_date: string
          id: string
          kind: string
          notified_day: boolean
          notified_eve: boolean
          pet_id: string | null
          pet_label: string
          remind_hour: number | null
          time_zone: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_date: string
          id?: string
          kind?: string
          notified_day?: boolean
          notified_eve?: boolean
          pet_id?: string | null
          pet_label?: string
          remind_hour?: number | null
          time_zone?: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_date?: string
          id?: string
          kind?: string
          notified_day?: boolean
          notified_eve?: boolean
          pet_id?: string | null
          pet_label?: string
          remind_hour?: number | null
          time_zone?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_reminders_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          birth_date: string | null
          category: string
          created_at: string
          id: string
          name: string
          notes: string
          species: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          category?: string
          created_at?: string
          id?: string
          name: string
          notes?: string
          species?: string
          user_id?: string
        }
        Update: {
          birth_date?: string | null
          category?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string
          species?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          time_zone: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          time_zone?: string
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          time_zone?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          elapsed_seconds: number
          id: string
          level: string
          level_label: string
          limit_seconds: number
          played_at: string
          questions: Json
          score: number
          species: string
          species_label: string
          timed_out: boolean
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          elapsed_seconds?: number
          id?: string
          level?: string
          level_label?: string
          limit_seconds?: number
          played_at?: string
          questions?: Json
          score?: number
          species?: string
          species_label?: string
          timed_out?: boolean
          total?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          elapsed_seconds?: number
          id?: string
          level?: string
          level_label?: string
          limit_seconds?: number
          played_at?: string
          questions?: Json
          score?: number
          species?: string
          species_label?: string
          timed_out?: boolean
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      welcome_notices: {
        Row: {
          sent_at: string
          user_id: string
        }
        Insert: {
          sent_at?: string
          user_id?: string
        }
        Update: {
          sent_at?: string
          user_id?: string
        }
        Relationships: []
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
