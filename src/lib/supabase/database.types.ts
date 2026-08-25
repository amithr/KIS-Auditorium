export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          date: string;
          period: string;
          name: string;
          status: string;
          drama_overlap: boolean;
          created_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          period: string;
          name: string;
          status?: string;
          drama_overlap?: boolean;
          created_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          date?: string;
          period?: string;
          name?: string;
          status?: string;
          drama_overlap?: boolean;
          created_at?: string;
          confirmed_at?: string | null;
        };
        Relationships: [];
      };
      schedule_entries: {
        Row: {
          id: string;
          kind: string;
          repeat: string;
          date: string | null;
          dow: string | null;
          until: string | null;
          from_period: string;
          to_period: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          kind: string;
          repeat: string;
          date?: string | null;
          dow?: string | null;
          until?: string | null;
          from_period: string;
          to_period: string;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          kind?: string;
          repeat?: string;
          date?: string | null;
          dow?: string | null;
          until?: string | null;
          from_period?: string;
          to_period?: string;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
