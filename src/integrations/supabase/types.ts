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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academies: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          id: string
          is_mou: boolean | null
          name: string
          owner_id: string | null
          profile_image: string | null
          subject: string
          tags: string[] | null
          target_grade: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_mou?: boolean | null
          name: string
          owner_id?: string | null
          profile_image?: string | null
          subject: string
          tags?: string[] | null
          target_grade?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_mou?: boolean | null
          name?: string
          owner_id?: string | null
          profile_image?: string | null
          subject?: string
          tags?: string[] | null
          target_grade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          academy_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_verifications: {
        Row: {
          business_name: string | null
          business_number: string | null
          created_at: string
          document_url: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          business_number?: string | null
          created_at?: string
          document_url: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          business_number?: string | null
          created_at?: string
          document_url?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_rooms: {
        Row: {
          academy_id: string
          created_at: string
          id: string
          parent_id: string
          updated_at: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          id?: string
          parent_id: string
          updated_at?: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academy_id: string
          created_at: string
          description: string | null
          fee: number | null
          id: string
          is_recruiting: boolean | null
          name: string
          schedule: string | null
          target_grade: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          description?: string | null
          fee?: number | null
          id?: string
          is_recruiting?: boolean | null
          name: string
          schedule?: string | null
          target_grade?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          description?: string | null
          fee?: number | null
          id?: string
          is_recruiting?: boolean | null
          name?: string
          schedule?: string | null
          target_grade?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          academy_id: string
          created_at: string
          id: string
          message: string | null
          parent_id: string
          status: Database["public"]["Enums"]["consultation_status"]
          student_grade: string | null
          student_name: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          id?: string
          message?: string | null
          parent_id: string
          status?: Database["public"]["Enums"]["consultation_status"]
          student_grade?: string | null
          student_name: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          id?: string
          message?: string | null
          parent_id?: string
          status?: Database["public"]["Enums"]["consultation_status"]
          student_grade?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_room_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          chat_room_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          chat_room_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      posts: {
        Row: {
          academy_id: string
          category: string
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          academy_id: string
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          academy_id?: string
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          learning_style: string | null
          phone: string | null
          updated_at: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          learning_style?: string | null
          phone?: string | null
          updated_at?: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          learning_style?: string | null
          phone?: string | null
          updated_at?: string
          user_name?: string | null
        }
        Relationships: []
      }
      seminar_applications: {
        Row: {
          attendee_count: number | null
          created_at: string
          id: string
          message: string | null
          seminar_id: string
          student_grade: string | null
          student_name: string
          user_id: string
        }
        Insert: {
          attendee_count?: number | null
          created_at?: string
          id?: string
          message?: string | null
          seminar_id: string
          student_grade?: string | null
          student_name: string
          user_id: string
        }
        Update: {
          attendee_count?: number | null
          created_at?: string
          id?: string
          message?: string | null
          seminar_id?: string
          student_grade?: string | null
          student_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seminar_applications_seminar_id_fkey"
            columns: ["seminar_id"]
            isOneToOne: false
            referencedRelation: "seminars"
            referencedColumns: ["id"]
          },
        ]
      }
      seminars: {
        Row: {
          academy_id: string
          capacity: number | null
          created_at: string
          date: string
          description: string | null
          id: string
          image_url: string | null
          location: string | null
          status: Database["public"]["Enums"]["seminar_status"]
          subject: string | null
          target_grade: string | null
          title: string
          updated_at: string
        }
        Insert: {
          academy_id: string
          capacity?: number | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          status?: Database["public"]["Enums"]["seminar_status"]
          subject?: string | null
          target_grade?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          academy_id?: string
          capacity?: number | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          status?: Database["public"]["Enums"]["seminar_status"]
          subject?: string | null
          target_grade?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seminars_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          academy_id: string
          bio: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          academy_id: string
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          academy_id?: string
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          is_super_admin: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          is_super_admin?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          is_super_admin?: boolean | null
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "parent" | "admin"
      consultation_status: "pending" | "completed"
      seminar_status: "recruiting" | "closed"
      verification_status: "pending" | "approved" | "rejected"
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
    Enums: {
      app_role: ["parent", "admin"],
      consultation_status: ["pending", "completed"],
      seminar_status: ["recruiting", "closed"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
