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
          last_roulette_date: string | null;     // 'YYYY-MM-DD'
          roulette_paid_spins_today: number;
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
          last_roulette_date?: string | null;
          roulette_paid_spins_today?: number;
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
          last_roulette_date?: string | null;
          roulette_paid_spins_today?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      player_inventory: {
        Row: {
          user_id: string;
          item_type: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          item_type: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'player_inventory_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      record_free_roulette: {
        Args: Record<string, never>;
        Returns: void;
      };
      spend_paid_roulette: {
        Args: Record<string, never>;
        Returns: number;
      };
      add_item: {
        Args: { p_item_type: string; p_amount: number };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type InventoryRow = Database['public']['Tables']['player_inventory']['Row'];
