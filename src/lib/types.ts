export type SocialLinks = {
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  email?: string;
  youtube?: string;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  tagline: string | null;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  social_links: SocialLinks | null;
  created_at: string;
};

export type SpaceType = "url" | "html";

export type Space = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: SpaceType;
  url: string | null;
  html_url: string | null;
  preview_image_url: string | null;
  is_public: boolean;
  likes_count: number;
  created_at: string;
};

export type SpaceLike = {
  id: string;
  user_id: string;
  space_id: string;
  created_at: string;
};

export type SpaceWithProfile = Space & {
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
};

export type Collection = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  is_default: boolean;
  created_at: string;
};

export type CollectionWithCount = Collection & {
  collection_spaces: { id: string }[];
};

export type CollectionWithSpaces = Collection & {
  collection_spaces: {
    space_id: string;
    spaces: Space;
  }[];
};

export type CollectionSpace = {
  id: string;
  collection_id: string;
  space_id: string;
  created_at: string;
};
