export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          login_type: number;
          coins: number;
          diamonds: number;
          best_score: number;
          total_play_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          login_type?: number;
          coins?: number;
          diamonds?: number;
          best_score?: number;
          total_play_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string | null;
          avatar_url?: string | null;
          login_type?: number;
          coins?: number;
          diamonds?: number;
          best_score?: number;
          total_play_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      add_coins: {
        Args: { amount: number };
        Returns: number;
      };
      add_diamonds: {
        Args: { amount: number };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
