export const GALLERY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const GALLERY_MAX_ITEMS = 60;
export const GALLERY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type GallerySettingsItem = {
  resource_id: string;
  title: string;
  description: string;
};

export type PublicGalleryItem = GallerySettingsItem & { imageUrl: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseGallerySettings(value: unknown): GallerySettingsItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: GallerySettingsItem[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const candidate = entry as Record<string, unknown>;
    const resourceId = candidate["resource_id"];
    const title = candidate["title"];
    const description = candidate["description"];
    if (
      typeof resourceId !== "string" ||
      !uuidPattern.test(resourceId) ||
      seen.has(resourceId) ||
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 120 ||
      typeof description !== "string" ||
      description.trim().length > 600
    )
      continue;
    seen.add(resourceId);
    items.push({
      resource_id: resourceId,
      title: title.trim(),
      description: description.trim(),
    });
    if (items.length >= GALLERY_MAX_ITEMS) break;
  }
  return items;
}

export function validateGalleryImage(file: { type: string; size: number }): string {
  if (!(GALLERY_IMAGE_TYPES as readonly string[]).includes(file.type))
    return "Envie uma foto JPEG, PNG ou WebP.";
  if (file.size <= 0) return "O arquivo está vazio.";
  if (file.size > GALLERY_IMAGE_MAX_BYTES) return "A foto pode ter no máximo 5 MB.";
  return "";
}

export function galleryUploadErrorMessage(error: {
  message?: string | undefined;
  statusCode?: string | number | undefined;
}): string {
  const message = (error.message ?? "").toLowerCase();
  const status = String(error.statusCode ?? "");
  if (message.includes("bucket not found") || message.includes("bucket does not exist"))
    return "O armazenamento de mídia ainda não está disponível. Peça à administração para conferir a configuração do site.";
  if (status === "401" || message.includes("invalid jwt") || message.includes("token expired"))
    return "Sua sessão expirou. Entre novamente na conta administrativa e tente outra vez.";
  if (
    status === "403" ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("not authorized")
  )
    return "O Supabase recusou o envio. Confirme que você está usando uma conta administradora e que o bucket course-media está configurado.";
  if (status === "413" || message.includes("file size") || message.includes("too large"))
    return "A foto ultrapassa o limite de 5 MB.";
  if (status === "415" || message.includes("mime") || message.includes("content-type"))
    return "Formato recusado. Envie uma foto JPEG, PNG ou WebP.";
  return "Não foi possível enviar a foto. Verifique sua conexão e tente novamente.";
}
