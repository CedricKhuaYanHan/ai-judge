export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      answer_judges: {
        Row: {
          answer_id: string
          judge_id: string
        }
        Insert: {
          answer_id: string
          judge_id: string
        }
        Update: {
          answer_id?: string
          judge_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_judges_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["answer_id"]
          },
          {
            foreignKeyName: "answer_judges_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "judges"
            referencedColumns: ["judge_id"]
          },
        ]
      }
      answer_queues: {
        Row: {
          answer_id: string
          queue_id: string
        }
        Insert: {
          answer_id: string
          queue_id: string
        }
        Update: {
          answer_id?: string
          queue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_queues_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["answer_id"]
          },
        ]
      }
      answers: {
        Row: {
          answer_id: string
          answer_value: Json
          created_at: string | null
          question_revision: number
          question_template_id: string
          submission_id: string
        }
        Insert: {
          answer_id?: string
          answer_value: Json
          created_at?: string | null
          question_revision: number
          question_template_id: string
          submission_id: string
        }
        Update: {
          answer_id?: string
          answer_value?: Json
          created_at?: string | null
          question_revision?: number
          question_template_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_template_id_fkey"
            columns: ["question_template_id"]
            isOneToOne: false
            referencedRelation: "question_templates"
            referencedColumns: ["question_template_id"]
          },
          {
            foreignKeyName: "answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["submission_id"]
          },
        ]
      }
      attachments: {
        Row: {
          answer_id: string
          attachment_id: string
          created_at: string | null
          type: string | null
          url: string
        }
        Insert: {
          answer_id: string
          attachment_id: string
          created_at?: string | null
          type?: string | null
          url: string
        }
        Update: {
          answer_id?: string
          attachment_id?: string
          created_at?: string | null
          type?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["answer_id"]
          },
        ]
      }
      evaluations: {
        Row: {
          answer_id: string
          created_at: string | null
          evaluation_id: string
          judge_id: string
          reasoning: string | null
          verdict: string | null
        }
        Insert: {
          answer_id: string
          created_at?: string | null
          evaluation_id: string
          judge_id: string
          reasoning?: string | null
          verdict?: string | null
        }
        Update: {
          answer_id?: string
          created_at?: string | null
          evaluation_id?: string
          judge_id?: string
          reasoning?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["answer_id"]
          },
          {
            foreignKeyName: "evaluations_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "judges"
            referencedColumns: ["judge_id"]
          },
        ]
      }
      judges: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          judge_id: string
          model: string
          name: string
          prompt: string
          provider: string
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean | null
          judge_id: string
          model: string
          name: string
          prompt: string
          provider: string
        }
        Update: {
          created_at?: string | null
          is_active?: boolean | null
          judge_id?: string
          model?: string
          name?: string
          prompt?: string
          provider?: string
        }
        Relationships: []
      }
      question_templates: {
        Row: {
          created_at: string | null
          question_template_id: string
          question_text: string
          question_type: string | null
          revision: number
        }
        Insert: {
          created_at?: string | null
          question_template_id: string
          question_text: string
          question_type?: string | null
          revision: number
        }
        Update: {
          created_at?: string | null
          question_template_id?: string
          question_text?: string
          question_type?: string | null
          revision?: number
        }
        Relationships: []
      }
      submissions: {
        Row: {
          created_at: string | null
          labeling_task_id: string | null
          submission_id: string
        }
        Insert: {
          created_at?: string | null
          labeling_task_id?: string | null
          submission_id: string
        }
        Update: {
          created_at?: string | null
          labeling_task_id?: string | null
          submission_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_answers_by_queue: {
        Args: { queue_id_param: string }
        Returns: {
          answer_id: string
          answer_value: Json
          question_template_id: string
          question_text: string
          question_type: string
          submission_id: string
        }[]
      }
      get_evaluation_stats: {
        Args: { queue_id_param?: string }
        Returns: {
          fail_count: number
          inconclusive_count: number
          pass_count: number
          pass_rate: number
          total_evaluations: number
        }[]
      }
      get_judge_performance_stats: {
        Args: { judge_id_param: string }
        Returns: {
          avg_reasoning_length: number
          fail_count: number
          inconclusive_count: number
          judge_name: string
          pass_count: number
          pass_rate: number
          total_evaluations: number
        }[]
      }
      get_judge_question_templates: {
        Args: { judge_id_param: string }
        Returns: {
          question_template_id: string
          question_text: string
          question_type: string
          revision: number
        }[]
      }
      get_judge_questions: {
        Args: { judge_id_param: string }
        Returns: {
          labeling_task_id: string
          question_id: string
          question_text: string
          question_type: string
          revision: number
        }[]
      }
      get_question_judges: {
        Args: { question_id_param: string }
        Returns: {
          created_at: string
          is_active: boolean
          judge_id: string
          model: string
          name: string
          prompt: string
          provider: string
        }[]
      }
      get_question_template_judges: {
        Args: { question_template_id_param: string }
        Returns: {
          created_at: string
          is_active: boolean
          judge_id: string
          model: string
          name: string
          prompt: string
          provider: string
        }[]
      }
      get_submission_stats:
        | {
            Args: { queue_id_param?: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_submission_stats(queue_id_param => text), public.get_submission_stats(queue_id_param => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
        | {
            Args: { queue_id_param?: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_submission_stats(queue_id_param => text), public.get_submission_stats(queue_id_param => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
      jsonb_object_keys_count: { Args: { obj: Json }; Returns: number }
      uuid_generate_v4: { Args: never; Returns: string }
    }
    Enums: {
      llm_provider: "openai" | "anthropic" | "gemini"
      question_type:
        | "text"
        | "multiple_choice"
        | "rating"
        | "boolean"
        | "file_upload"
        | "single_choice_with_reasoning"
      verdict_type: "pass" | "fail" | "inconclusive"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      llm_provider: ["openai", "anthropic", "gemini"],
      question_type: [
        "text",
        "multiple_choice",
        "rating",
        "boolean",
        "file_upload",
        "single_choice_with_reasoning",
      ],
      verdict_type: ["pass", "fail", "inconclusive"],
    },
  },
} as const

