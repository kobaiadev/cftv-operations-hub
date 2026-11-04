export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      app_attachments: {
        Row: {
          content_type: string;
          created_at: string;
          created_by: string;
          entity_id: string;
          entity_type: string;
          file_name: string;
          id: string;
          label: string;
          storage_path: string;
        };
        Insert: {
          content_type?: string;
          created_at?: string;
          created_by?: string;
          entity_id: string;
          entity_type: string;
          file_name: string;
          id?: string;
          label?: string;
          storage_path: string;
        };
        Update: {
          content_type?: string;
          created_at?: string;
          created_by?: string;
          entity_id?: string;
          entity_type?: string;
          file_name?: string;
          id?: string;
          label?: string;
          storage_path?: string;
        };
        Relationships: [];
      };
      app_state: {
        Row: {
          data: Json;
          namespace: string;
          updated_at: string;
          updated_by: string;
          version: number;
        };
        Insert: {
          data?: Json;
          namespace: string;
          updated_at?: string;
          updated_by?: string;
          version?: number;
        };
        Update: {
          data?: Json;
          namespace?: string;
          updated_at?: string;
          updated_by?: string;
          version?: number;
        };
        Relationships: [];
      };
      quiz_scores: {
        Row: {
          best_score: number;
          display_name: string;
          tema: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          best_score: number;
          display_name: string;
          tema: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          best_score?: number;
          display_name?: string;
          tema?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      quiz_game_answers: {
        Row: {
          correta: boolean;
          created_at: string;
          opcao_correta: string;
          opcao_escolhida: string;
          pergunta_id: string;
          pontuacao: number;
          proxima_pergunta_id: string | null;
          resposta_numero: number;
          session_id: string;
          total_respostas: number;
          user_id: string;
          vidas: number;
        };
        Insert: {
          correta: boolean;
          created_at?: string;
          opcao_correta: string;
          opcao_escolhida: string;
          pergunta_id: string;
          pontuacao: number;
          proxima_pergunta_id?: string | null;
          resposta_numero: number;
          session_id: string;
          total_respostas: number;
          user_id: string;
          vidas: number;
        };
        Update: {
          correta?: boolean;
          created_at?: string;
          opcao_correta?: string;
          opcao_escolhida?: string;
          pergunta_id?: string;
          pontuacao?: number;
          proxima_pergunta_id?: string | null;
          resposta_numero?: number;
          session_id?: string;
          total_respostas?: number;
          user_id?: string;
          vidas?: number;
        };
        Relationships: [];
      };
      quiz_game_sessions: {
        Row: {
          concluida: boolean;
          created_at: string;
          dificuldade: string;
          pergunta_atual: string | null;
          perguntas_vistas: string[];
          pontuacao: number;
          respostas: number;
          session_id: string;
          tema: string;
          user_id: string;
          vidas: number;
        };
        Insert: {
          concluida?: boolean;
          created_at?: string;
          dificuldade?: string;
          pergunta_atual?: string | null;
          perguntas_vistas?: string[];
          pontuacao?: number;
          respostas?: number;
          session_id: string;
          tema: string;
          user_id: string;
          vidas?: number;
        };
        Update: {
          concluida?: boolean;
          created_at?: string;
          dificuldade?: string;
          pergunta_atual?: string | null;
          perguntas_vistas?: string[];
          pontuacao?: number;
          respostas?: number;
          session_id?: string;
          tema?: string;
          user_id?: string;
          vidas?: number;
        };
        Relationships: [];
      };
      quiz_user_progress: {
        Row: {
          display_name: string;
          nivel: number;
          total_respostas: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          display_name: string;
          nivel?: number;
          total_respostas?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          display_name?: string;
          nivel?: number;
          total_respostas?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      repair_requests: {
        Row: {
          created_at: string;
          created_by: string;
          descricao: string;
          empresa_responsavel: string;
          gerente: string;
          glpi_numero: string;
          id: string;
          imagens: Json;
          loja: string;
          solicitante: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          descricao?: string;
          empresa_responsavel?: string;
          gerente?: string;
          glpi_numero?: string;
          id: string;
          imagens?: Json;
          loja: string;
          solicitante?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          descricao?: string;
          empresa_responsavel?: string;
          gerente?: string;
          glpi_numero?: string;
          id?: string;
          imagens?: Json;
          loja?: string;
          solicitante?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          email: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      work_orders: {
        Row: {
          created_at: string;
          created_by: string;
          description: string;
          event_date: string;
          id: string;
          occurrence_type: string;
          store_name: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          description?: string;
          event_date: string;
          id?: string;
          occurrence_type?: string;
          store_name: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string;
          event_date?: string;
          id?: string;
          occurrence_type?: string;
          store_name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      quiz_ranking: {
        Row: {
          best_score: number;
          display_name: string;
          nivel: number;
          tema: string;
          total_respostas: number;
          updated_at: string;
          user_id: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_user_role: { Args: never; Returns: string };
      registrar_resposta_quiz: {
        Args: {
          p_correta: boolean;
          p_opcao_correta: string;
          p_opcao_escolhida: string;
          p_pergunta_id: string;
          p_perguntas_vistas: string[];
          p_proxima_pergunta_id: string | null;
          p_resposta_numero: number;
          p_session_id: string;
          p_tema: string;
          p_user_id: string;
        };
        Returns: {
          correta: boolean;
          nivel: number;
          opcao_correta: string;
          pontuacao: number;
          progresso_total: number;
          proxima_pergunta_id: string | null;
          total_respostas: number;
          vidas: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
