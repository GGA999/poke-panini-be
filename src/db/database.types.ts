export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      configurator_types: {
        Row: {
          id: string;
          code: string;
          name: string;
          is_active: boolean;
          display_order: number;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          is_active?: boolean;
          display_order: number;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          is_active?: boolean;
          display_order?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
