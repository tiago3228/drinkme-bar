import type { Database } from "@/integrations/supabase/types";

type CommunityPostTable = {
  Row: {
    body: string;
    created_at: string;
    id: string;
    image_path: string | null;
    user_id: string;
  };
  Insert: {
    body?: string;
    created_at?: string;
    id?: string;
    image_path?: string | null;
    user_id: string;
  };
  Update: {
    body?: string;
    created_at?: string;
    id?: string;
    image_path?: string | null;
    user_id?: string;
  };
  Relationships: [];
};

type CommunityCommentTable = {
  Row: {
    body: string;
    created_at: string;
    id: string;
    post_id: string;
    user_id: string;
  };
  Insert: {
    body: string;
    created_at?: string;
    id?: string;
    post_id: string;
    user_id: string;
  };
  Update: {
    body?: string;
    created_at?: string;
    id?: string;
    post_id?: string;
    user_id?: string;
  };
  Relationships: [];
};

export type CommunityDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Omit<Database["public"]["Tables"], "community_posts" | "community_comments"> & {
      community_posts: CommunityPostTable;
      community_comments: CommunityCommentTable;
    };
    Functions: Omit<Database["public"]["Functions"], "community_author_names"> & {
      community_author_names: {
        Args: { _user_ids: string[] };
        Returns: { display_name: string; id: string }[];
      };
    };
  };
};
