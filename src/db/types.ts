export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          region: string;
          slug: string;
          verified: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          region: string;
          slug: string;
          verified?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          region?: string;
          slug?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          agency_id: string | null;
          before: Json | null;
          created_at: string;
          entity: string;
          entity_id: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          agency_id?: string | null;
          before?: Json | null;
          created_at?: string;
          entity: string;
          entity_id: string;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          agency_id?: string | null;
          before?: Json | null;
          created_at?: string;
          entity?: string;
          entity_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
      citizen_reports: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          photo_path: string | null;
          project_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          photo_path?: string | null;
          project_id: string;
          status?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          photo_path?: string | null;
          project_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "citizen_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_stats";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "citizen_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          created_at: string;
          evidence_path: string | null;
          id: string;
          landmark_id: string | null;
          note: string;
          project_id: string;
          spent_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          created_at?: string;
          evidence_path?: string | null;
          id?: string;
          landmark_id?: string | null;
          note?: string;
          project_id: string;
          spent_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          evidence_path?: string | null;
          id?: string;
          landmark_id?: string | null;
          note?: string;
          project_id?: string;
          spent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_landmark_id_fkey";
            columns: ["landmark_id"];
            isOneToOne: false;
            referencedRelation: "landmarks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_stats";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "expenses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      landmark_images: {
        Row: {
          caption: string;
          created_at: string;
          id: string;
          image_path: string;
          landmark_id: string;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          caption?: string;
          created_at?: string;
          id?: string;
          image_path: string;
          landmark_id: string;
          uploaded_by?: string | null;
        };
        Update: {
          caption?: string;
          created_at?: string;
          id?: string;
          image_path?: string;
          landmark_id?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "landmark_images_landmark_id_fkey";
            columns: ["landmark_id"];
            isOneToOne: false;
            referencedRelation: "landmarks";
            referencedColumns: ["id"];
          },
        ];
      };
      landmarks: {
        Row: {
          created_at: string;
          done: boolean;
          done_at: string | null;
          evidence_path: string | null;
          id: string;
          name: string;
          position: number;
          project_id: string;
          weight: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          done?: boolean;
          done_at?: string | null;
          evidence_path?: string | null;
          id?: string;
          name: string;
          position: number;
          project_id: string;
          weight: number;
        };
        Update: {
          created_at?: string;
          done?: boolean;
          done_at?: string | null;
          evidence_path?: string | null;
          id?: string;
          name?: string;
          position?: number;
          project_id?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "landmarks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_stats";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "landmarks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          agency_id: string | null;
          created_at: string;
          id: string;
          role: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id?: string | null;
          created_at?: string;
          id: string;
          role: string;
        };
        Update: {
          agency_id?: string | null;
          created_at?: string;
          id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
      project_images: {
        Row: {
          caption: string;
          created_at: string;
          id: string;
          image_path: string;
          is_cover: boolean;
          position: number;
          project_id: string;
        };
        ComputedFields: never;
        Insert: {
          caption?: string;
          created_at?: string;
          id?: string;
          image_path: string;
          is_cover?: boolean;
          position?: number;
          project_id: string;
        };
        Update: {
          caption?: string;
          created_at?: string;
          id?: string;
          image_path?: string;
          is_cover?: boolean;
          position?: number;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_stats";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_images_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          agency_id: string;
          archived_at: string | null;
          budget_total: number;
          category: string;
          created_at: string;
          description: string;
          id: string;
          lat: number | null;
          lng: number | null;
          location_name: string;
          slug: string;
          start_date: string;
          target_end_date: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          archived_at?: string | null;
          budget_total: number;
          category: string;
          created_at?: string;
          description?: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          location_name: string;
          slug: string;
          start_date: string;
          target_end_date: string;
          title: string;
        };
        Update: {
          agency_id?: string;
          archived_at?: string | null;
          budget_total?: number;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          location_name?: string;
          slug?: string;
          start_date?: string;
          target_end_date?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      project_stats: {
        Row: {
          agency_id: string;
          archived_at: string | null;
          budget_total: number;
          progress_percent: number | null;
          project_id: string;
          slug: string;
          spent_total: number | null;
          status_waktu: string | null;
          target_end_date: string;
          title: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "projects_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      get_user_agency_id: { Args: Record<PropertyKey, never>; Returns: string };
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_verified_agency_admin: {
        Args: { target_agency_id: string };
        Returns: boolean;
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

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
