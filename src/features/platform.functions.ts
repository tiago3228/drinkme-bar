import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const publicContent = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const [courses, modules, settings, testimonials] = await Promise.all([
    client.from("courses").select("*").order("created_at"),
    client.from("modules").select("*").order("position"),
    client.from("site_settings").select("*"),
    client.from("testimonials").select("*"),
  ]);
  for (const r of [courses, modules, settings, testimonials])
    if (r.error) throw new Error(r.error.message);
  const images: Record<string, string> = {};
  const home = settings.data?.find((s) => s.key === "home")?.value as
    Record<string, unknown> | undefined;
  for (const field of ["hero_resource_id", "portrait_resource_id"]) {
    const id = home?.[field];
    if (typeof id === "string" && id) {
      const { data } = await client
        .from("resources")
        .select("path")
        .eq("id", id)
        .eq("is_public", true)
        .maybeSingle();
      if (data) {
        const signed = await client.storage.from("course-media").createSignedUrl(data.path, 3600);
        if (signed.data) images[field] = signed.data.signedUrl;
      }
    }
  }
  return {
    courses: courses.data ?? [],
    modules: modules.data ?? [],
    settings: settings.data ?? [],
    testimonials: testimonials.data ?? [],
    images,
  };
});
export const memberContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context.supabase;
    const [
      role,
      profiles,
      courses,
      modules,
      lessons,
      resources,
      enrollments,
      progress,
      settings,
      testimonials,
    ] = await Promise.all([
      c.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      c.from("profiles").select("*"),
      c.from("courses").select("*").order("created_at"),
      c.from("modules").select("*").order("position"),
      c.from("lessons").select("*").order("position"),
      c.from("resources").select("*").order("created_at", { ascending: false }),
      c.from("enrollments").select("*"),
      c.from("lesson_progress").select("*"),
      c.from("site_settings").select("*"),
      c.from("testimonials").select("*"),
    ]);
    for (const r of [
      role,
      profiles,
      courses,
      modules,
      lessons,
      resources,
      enrollments,
      progress,
      settings,
      testimonials,
    ])
      if (r.error) throw new Error(r.error.message);
    return {
      isAdmin: role.data === true,
      userId: context.userId,
      profiles: profiles.data ?? [],
      courses: courses.data ?? [],
      modules: modules.data ?? [],
      lessons: lessons.data ?? [],
      resources: resources.data ?? [],
      enrollments: enrollments.data ?? [],
      progress: progress.data ?? [],
      settings: settings.data ?? [],
      testimonials: testimonials.data ?? [],
    };
  });
const table = z.enum([
  "courses",
  "modules",
  "lessons",
  "resources",
  "enrollments",
  "testimonials",
  "site_settings",
]);
export const adminMutation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      table,
      action: z.enum(["save", "delete"]),
      id: z.string().optional(),
      values: z.record(z.string(), z.unknown()).default({}),
    }),
  )
  .handler(async ({ context, data }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !admin) throw new Error("Acesso restrito ao administrador.");
    const c = context.supabase;
    if (data.action === "delete") {
      if (!data.id) throw new Error("Selecione um registro.");
      if (data.table === "resources") {
        const r = await c.from("resources").select("path").eq("id", data.id).single();
        if (r.error) throw r.error;
        const removed = await c.storage.from("course-media").remove([r.data.path]);
        if (removed.error) throw removed.error;
      }
      const r =
        data.table === "site_settings"
          ? await c.from("site_settings").delete().eq("key", data.id)
          : await c.from(data.table).delete().eq("id", data.id);
      if (r.error) throw new Error(r.error.message);
    } else {
      const values = { ...data.values };
      delete values["created_at"];
      if (data.table === "resources" && values["path"]) {
        const path = String(values["path"]);
        if (
          !/\.(mp4|webm|mov|jpg|jpeg|png|webp|pdf|xlsx|xls|csv|txt)$/i.test(path) ||
          Number(values["size"]) > 52428800
        )
          throw new Error("Arquivo inválido ou maior que 50 MB.");
      }
      if (data.table === "site_settings") {
        const value = values["value"] as Record<string, unknown> | undefined;
        const url = value?.["checkout_url"];
        if (url) {
          try {
            if (new URL(String(url)).protocol !== "https:") throw new Error();
          } catch {
            throw new Error("O checkout precisa usar HTTPS.");
          }
        }
      }
      const r =
        data.table === "site_settings"
          ? await c.from("site_settings").upsert(values as never)
          : data.id
            ? await c
                .from(data.table)
                .update(values as never)
                .eq("id", data.id)
            : await c.from(data.table).insert(values as never);
      if (r.error) throw new Error(r.error.message);
    }
    return { success: true };
  });
export const mediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const r = await context.supabase.from("resources").select("path").eq("id", data.id).single();
    if (r.error) throw new Error("Material indisponível ou acesso não autorizado.");
    const signed = await context.supabase.storage
      .from("course-media")
      .createSignedUrl(r.data.path, 600);
    if (signed.error) throw signed.error;
    return signed.data.signedUrl;
  });
export const saveProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ lessonId: z.string().uuid(), completed: z.boolean() }))
  .handler(async ({ context, data }) => {
    const r = await context.supabase
      .from("lesson_progress")
      .upsert({
        user_id: context.userId,
        lesson_id: data.lessonId,
        completed: data.completed,
        updated_at: new Date().toISOString(),
      });
    if (r.error) throw r.error;
    return true;
  });
export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ display_name: z.string().min(1).max(100) }))
  .handler(async ({ context, data }) => {
    const r = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (r.error) throw r.error;
    return true;
  });
export const lessonVideoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ lessonId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const lesson = await context.supabase
      .from("lessons")
      .select("video_path")
      .eq("id", data.lessonId)
      .single();
    if (lesson.error || !lesson.data.video_path) throw new Error("Vídeo indisponível.");
    const signed = await context.supabase.storage
      .from("course-media")
      .createSignedUrl(lesson.data.video_path, 3600);
    if (signed.error) throw signed.error;
    return signed.data.signedUrl;
  });
