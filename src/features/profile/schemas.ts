import { z } from "zod";

// Input schemas for the profile Server Actions. These run at the POST-reachable
// action boundary, so they validate untrusted client input before any DB access.
// Limits mirror the client-side limits in EditProfileDialog / the brand page;
// they stay lenient enough not to reject anything the current UI already allows.

const socialLinks = z
  .object({
    instagram: z.string(),
    linkedin: z.string(),
    twitter: z.string(),
    github: z.string(),
    email: z.string(),
    youtube: z.string(),
  })
  .partial();

export const updateProfileInfoSchema = z.object({
  displayName: z.string().max(50).nullable(),
  tagline: z.string().max(100).nullable(),
  bio: z.string().max(500).nullable(),
  websiteUrl: z.string().max(300).nullable(),
  socialLinks,
});

// Storage uploads stay client-side (browser → Supabase directly); the resulting
// public URL is what these row-write actions persist.
export const updateAvatarSchema = z.object({ avatarUrl: z.string() });

export const updateBackgroundSchema = z.object({
  backgroundUrl: z.string().nullable(),
  backgroundPosition: z.string().nullable(),
});

export const updateBackgroundPositionSchema = z.object({
  backgroundPosition: z.string(),
});

export const updateBrandSchema = z.object({
  logoUrl: z.string().nullable(),
  brandColors: z.record(z.string(), z.string()),
  brandValues: z.array(z.string()),
  brandDescription: z.string().max(500).nullable(),
});

export const followListSchema = z.object({
  profileId: z.uuid(),
  type: z.enum(["followers", "following"]),
  offset: z.number().int().min(0),
});

export const galleryPageSchema = z.object({
  profileId: z.uuid(),
  page: z.number().int().min(1),
});

// The three profile sections whose public visibility the dashboard grid toggles.
// Kept in lockstep with SectionId in @/lib/spaces/content-types.
export const setSectionVisibilitySchema = z.object({
  section: z.enum(["informative", "gallery", "links"]),
  value: z.boolean(),
});

export type UpdateProfileInfoInput = z.infer<typeof updateProfileInfoSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
