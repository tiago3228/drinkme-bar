export const COMMUNITY_POST_MAX_LENGTH = 2000;
export const COMMUNITY_COMMENT_MAX_LENGTH = 1200;
export const COMMUNITY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const COMMUNITY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const COMMUNITY_OFFENSIVE_MESSAGE =
  "A mensagem contém palavrões ou ofensas. Revise o texto antes de publicar.";

// Whole-word matching after accent/case/punctuation normalization avoids blocking harmless substrings.
const COMMUNITY_OFFENSIVE_TERMS = [
  "arrombada",
  "arrombadas",
  "arrombado",
  "arrombados",
  "babaca",
  "bosta",
  "buceta",
  "cacete",
  "caralho",
  "corna",
  "corno",
  "cu",
  "desgracada",
  "desgracadas",
  "desgracado",
  "desgracados",
  "foda",
  "foda se",
  "fode",
  "foder",
  "fodase",
  "fodida",
  "fodidas",
  "fodido",
  "fodidos",
  "filha da puta",
  "filho da puta",
  "merda",
  "otaria",
  "otarias",
  "otario",
  "otarios",
  "piranha",
  "piranhas",
  "porra",
  "puta",
  "putas",
  "putaria",
  "puto",
  "putos",
  "retardada",
  "retardado",
  "vagabunda",
  "vagabundas",
  "vagabundo",
  "vagabundos",
  "veado",
  "veados",
  "viado",
  "viados",
  "vai tomar no cu",
  "asshole",
  "bitch",
  "fuck",
  "fucked",
  "fucker",
  "fucking",
  "shit",
  "slut",
  "son of a bitch",
] as const;

function normalizeCommunityText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function validateCommunityText(value: string): string {
  const normalizedText = ` ${normalizeCommunityText(value)} `;
  return COMMUNITY_OFFENSIVE_TERMS.some((term) =>
    normalizedText.includes(` ${normalizeCommunityText(term)} `),
  )
    ? COMMUNITY_OFFENSIVE_MESSAGE
    : "";
}

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
