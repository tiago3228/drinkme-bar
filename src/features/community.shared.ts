export const COMMUNITY_POST_MAX_LENGTH = 2000;
export const COMMUNITY_COMMENT_MAX_LENGTH = 1200;
export const COMMUNITY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const COMMUNITY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateCommunityImage(file: { type: string; size: number }): string {
  if (!(COMMUNITY_IMAGE_TYPES as readonly string[]).includes(file.type))
    return "A foto precisa estar em JPEG, PNG ou WebP.";
  if (file.size <= 0) return "O arquivo está vazio.";
  if (file.size > COMMUNITY_IMAGE_MAX_BYTES) return "A foto pode ter no máximo 5 MB.";
  return "";
}
