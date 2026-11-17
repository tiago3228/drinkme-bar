import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  GALLERY_IMAGE_MAX_BYTES,
  GALLERY_IMAGE_TYPES,
  GALLERY_MAX_ITEMS,
  parseGallerySettings,
  type GallerySettingsItem,
} from "./gallery.shared";

const GALLERY_RESOURCE_CATEGORY = "Galeria pública";
const galleryImageMime = z.enum(GALLERY_IMAGE_TYPES);

async function requireAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Acesso restrito a administradores.");
}

async function readHome(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "home")
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar as configurações da Galeria.");
  const value = data?.value;
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function ensureGalleryResources(
  supabase: SupabaseClient<Database>,
  items: GallerySettingsItem[],
) {
  if (!items.length) return;
  const ids = items.map((item) => item.resource_id);
  const { data, error } = await supabase
    .from("resources")
    .select("id,mime_type,is_public,category")
    .in("id", ids);
  if (error) throw new Error("Não foi possível validar as fotos da Galeria.");
  const resources = new Map((data ?? []).map((resource) => [resource.id, resource]));
  for (const item of items) {
    const resource = resources.get(item.resource_id);
    if (
      !resource ||
      !resource.is_public ||
      resource.category !== GALLERY_RESOURCE_CATEGORY ||
      !(GALLERY_IMAGE_TYPES as readonly string[]).includes(resource.mime_type)
    )
      throw new Error("A Galeria só pode conter fotos públicas válidas cadastradas para ela.");
  }
}

async function writeGallery(
  supabase: SupabaseClient<Database>,
  home: Record<string, unknown>,
  items: GallerySettingsItem[],
) {
  await ensureGalleryResources(supabase, items);
  const value = {
    ...home,
    gallery_items: items,
  } as unknown as Database["public"]["Tables"]["site_settings"]["Row"]["value"];
  const { error } = await supabase.from("site_settings").upsert({ key: "home", value });
  if (error) throw new Error("Não foi possível salvar as alterações da Galeria.");
  return items;
}

const itemTextSchema = z.object({
  title: z.string().trim().min(1, "Informe um título.").max(120),
  description: z.string().trim().max(600),
});

export const createGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    itemTextSchema.extend({
      path: z.string().min(1).max(200),
      mimeType: galleryImageMime,
      size: z.number().int().positive().max(GALLERY_IMAGE_MAX_BYTES),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    const extension = data.mimeType === "image/jpeg" ? "jpe?g" : data.mimeType.slice(6);
    const pathPattern = new RegExp(
      `^${context.userId}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.${extension}$`,
      "i",
    );
    if (!pathPattern.test(data.path)) throw new Error("Caminho da foto inválido.");

    const { data: resource, error: insertError } = await context.supabase
      .from("resources")
      .insert({
        name: data.title,
        category: GALLERY_RESOURCE_CATEGORY,
        path: data.path,
        mime_type: data.mimeType,
        size: data.size,
        is_public: true,
      })
      .select("id")
      .single();
    if (insertError || !resource) {
      await context.supabase.storage.from("course-media").remove([data.path]);
      throw new Error("Não foi possível registrar a foto da Galeria.");
    }

    try {
      const home = await readHome(context.supabase);
      const currentItems = parseGallerySettings(home["gallery_items"]);
      if (currentItems.length >= GALLERY_MAX_ITEMS)
        throw new Error("A Galeria atingiu o limite de 60 fotos.");
      const item = { resource_id: resource.id, title: data.title, description: data.description };
      await writeGallery(context.supabase, home, [item, ...currentItems]);
      return item;
    } catch (error) {
      try {
        await context.supabase.from("resources").delete().eq("id", resource.id);
        await context.supabase.storage.from("course-media").remove([data.path]);
      } catch {
        // Best-effort cleanup only; preserve the original save error.
      }
      throw error;
    }
  });

export const updateGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(itemTextSchema.extend({ resourceId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    const home = await readHome(context.supabase);
    const currentItems = parseGallerySettings(home["gallery_items"]);
    if (!currentItems.some((item) => item.resource_id === data.resourceId))
      throw new Error("Foto não encontrada na Galeria.");
    const { error } = await context.supabase
      .from("resources")
      .update({ name: data.title })
      .eq("id", data.resourceId);
    if (error) throw new Error("Não foi possível atualizar os dados da foto.");
    const nextItems = currentItems.map((item) =>
      item.resource_id === data.resourceId
        ? { ...item, title: data.title, description: data.description }
        : item,
    );
    return writeGallery(context.supabase, home, nextItems);
  });

export const removeGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ resourceId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    const home = await readHome(context.supabase);
    const currentItems = parseGallerySettings(home["gallery_items"]);
    if (!currentItems.some((item) => item.resource_id === data.resourceId))
      throw new Error("Foto não encontrada na Galeria.");
    const nextItems = currentItems.filter((item) => item.resource_id !== data.resourceId);
    await writeGallery(context.supabase, home, nextItems);
    return { success: true };
  });
