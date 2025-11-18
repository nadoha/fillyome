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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      learning_sessions: {
        Row: {
          correct_answers: number | null
          created_at: string | null
          id: string
          session_date: string
          study_duration_minutes: number | null
          total_answers: number | null
          updated_at: string | null
          user_id: string
          words_reviewed: number | null
          words_studied: number | null
        }
        Insert: {
          correct_answers?: number | null
          created_at?: string | null
          id?: string
          session_date?: string
          study_duration_minutes?: number | null
          total_answers?: number | null
          updated_at?: string | null
          user_id: string
          words_reviewed?: number | null
          words_studied?: number | null
        }
        Update: {
          correct_answers?: number | null
          created_at?: string | null
          id?: string
          session_date?: string
          study_duration_minutes?: number | null
          total_answers?: number | null
          updated_at?: string | null
          user_id?: string
          words_reviewed?: number | null
          words_studied?: number | null
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          created_at: string | null
          id: string
          quiz_type: string
          response_time_seconds: number | null
          user_id: string
          vocabulary_id: string | null
          was_correct: boolean
        }
        Insert: {
          created_at?: string | null
          id?: string
          quiz_type: string
          response_time_seconds?: number | null
          user_id: string
          vocabulary_id?: string | null
          was_correct: boolean
        }
        Update: {
          created_at?: string | null
          id?: string
          quiz_type?: string
          response_time_seconds?: number | null
          user_id?: string
          vocabulary_id?: string | null
          was_correct?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_vocabulary_id_fkey"
            columns: ["vocabulary_id"]
            isOneToOne: false
            referencedRelation: "vocabulary"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          literal_translation: string | null
          natural_translation: string
          source_text: string
          translation_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_type?: string
          id?: string
          literal_translation?: string | null
          natural_translation: string
          source_text: string
          translation_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          literal_translation?: string | null
          natural_translation?: string
          source_text?: string
          translation_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translation_feedback_translation_id_fkey"
            columns: ["translation_id"]
            isOneToOne: false
            referencedRelation: "translations"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          content_classification: string | null
          created_at: string
          id: string
          is_favorite: boolean
          literal_translation: string | null
          masked_source_text: string | null
          masked_target_text: string | null
          source_lang: string
          source_romanization: string | null
          source_text: string
          target_lang: string
          target_romanization: string | null
          target_text: string
          user_id: string
        }
        Insert: {
          content_classification?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          literal_translation?: string | null
          masked_source_text?: string | null
          masked_target_text?: string | null
          source_lang: string
          source_romanization?: string | null
          source_text: string
          target_lang: string
          target_romanization?: string | null
          target_text: string
          user_id: string
        }
        Update: {
          content_classification?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          literal_translation?: string | null
          masked_source_text?: string | null
          masked_target_text?: string | null
          source_lang?: string
          source_romanization?: string | null
          source_text?: string
          target_lang?: string
          target_romanization?: string | null
          target_text?: string
          user_id?: string
        }
        Relationships: []
      }
      vocabulary: {
        Row: {
          created_at: string
          definition: Json
          ease_factor: number | null
          id: string
          interval_days: number | null
          language: string
          last_reviewed: string | null
          next_review: string | null
          notes: string | null
          review_count: number | null
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          definition: Json
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          language: string
          last_reviewed?: string | null
          next_review?: string | null
          notes?: string | null
          review_count?: number | null
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          definition?: Json
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          language?: string
          last_reviewed?: string | null
          next_review?: string | null
          notes?: string | null
          review_count?: number | null
          user_id?: string
          word?: string
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
