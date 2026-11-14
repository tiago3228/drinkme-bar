import { queryOptions } from "@tanstack/react-query";
import { publicContent, memberContent } from "./platform.functions";
import type { AmbientMusicConfig } from "./ambient-music.shared";
export const publicOptions = queryOptions({
  queryKey: ["public-content"],
  queryFn: () => publicContent(),
  staleTime: 30000,
});
export const memberOptions = queryOptions({
  queryKey: ["member-content"],
  queryFn: () => memberContent(),
});
export type PublicData = Awaited<ReturnType<typeof publicContent>>;
export type MemberData = Awaited<ReturnType<typeof memberContent>>;
export type HomeSettings = {
  headline?: string;
  description?: string;
  bio?: string;
  checkout_url?: string;
  cta?: string;
  hero_resource_id?: string;
  portrait_resource_id?: string;
  faq?: { question: string; answer: string }[];
  ambient_music?: AmbientMusicConfig;
};
export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
export function safeCheckout(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}
export const mediaCategories = [
  "Retratos do Warley",
  "Fotos profissionais",
  "Drinks e coquetelaria",
  "Eventos",
  "Bastidores",
  "Vídeos institucionais",
  "Aulas",
  "Música ambiente",
  "Capas de cursos",
  "Materiais educacionais",
];
export const MAX_UPLOAD = 50 * 1024 * 1024;
export function validateUpload(file: { name: string; size: number; type: string }) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (
    !ext ||
    ![
      "mp4",
      "webm",
      "mov",
      "mp3",
      "wav",
      "ogg",
      "m4a",
      "aac",
      "flac",
      "jpg",
      "wav",
      "ogg",
      "m4a",
      "aac",
      "flac",
      "jpg",
      "jpeg",
      "png",
      "webp",
      "pdf",
      "xlsx",
      "xls",
      "csv",
      "txt",
    ].includes(ext)
  )
    return "Formato não permitido.";
  if (file.size > MAX_UPLOAD) return "O limite por arquivo é 50 MB.";
  if (!file.size) return "O arquivo está vazio.";
  return "";
}
