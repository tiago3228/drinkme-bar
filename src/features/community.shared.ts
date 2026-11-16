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

export function communityUploadErrorMessage(error: {
  message?: string | undefined;
  statusCode?: string | number | undefined;
}): string {
  const message = (error.message ?? "").toLowerCase();
  const status = String(error.statusCode ?? "");
  if (message.includes("bucket not found") || message.includes("bucket does not exist"))
    return "O armazenamento das fotos ainda não foi configurado. Peça à administração para aplicar a migração 0007 no Lovable.";
  if (status === "401" || message.includes("invalid jwt") || message.includes("token expired"))
    return "Sua sessão expirou. Saia da conta, entre novamente e tente enviar a foto.";
  if (
    status === "403" ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("not authorized")
  )
    return "O Supabase recusou o envio. Confirme que a migração 0007 foi aplicada, entre novamente na conta e verifique se o limite de 50 fotos foi atingido.";
  if (status === "413" || message.includes("file size") || message.includes("too large"))
    return "A foto ultrapassa o limite de 5 MB.";
  if (status === "415" || message.includes("mime") || message.includes("content-type"))
    return "Formato recusado. Envie uma foto JPEG, PNG ou WebP.";
  return "Não foi possível enviar a foto. Verifique sua conexão e tente novamente.";
}
