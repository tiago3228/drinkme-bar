import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { signPublicImage } from "@/features/public-media";
import {
  BUILTIN_AMBIENT_TRACK_ID,
  BUILTIN_AMBIENT_TRACK_NAME,
  BUILTIN_AMBIENT_TRACK_URL,
  SECOND_BUILTIN_AMBIENT_TRACK_ID,
  SECOND_BUILTIN_AMBIENT_TRACK_NAME,
  SECOND_BUILTIN_AMBIENT_TRACK_URL,
  type AmbientMusicData,
} from "@/features/ambient-music.shared";

export const publicContent = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Conexão com o Lovable Cloud indisponível no servidor.");
  const client = createClient<Database>(url, key, {
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
  const ambientSettings = home?.["ambient_music"] as
    { track_ids?: unknown; order?: unknown } | undefined;
  const configuredTrackIds = Array.isArray(ambientSettings?.track_ids)
    ? ambientSettings.track_ids.filter(
        (id): id is string => typeof id === "string" && id.length <= 100,
      )
    : [BUILTIN_AMBIENT_TRACK_ID];
  const trackIds = [...new Set([...configuredTrackIds, SECOND_BUILTIN_AMBIENT_TRACK_ID])];
  const resourceIds = [...new Set(trackIds)].filter(
    (id) => id !== BUILTIN_AMBIENT_TRACK_ID && /^[0-9a-f-]{36}$/i.test(id),
  );
  let audioTracks: { id: string; name: string; url: string }[] = [];
  if (resourceIds.length) {
    const { data: audioResources, error } = await client
      .from("resources")
      .select("id,name,path,mime_type,is_public")
      .in("id", resourceIds)
      .eq("is_public", true);
    if (error) throw new Error(error.message);
    const allowedAudio = (audioResources ?? []).filter((resource) =>
      resource.mime_type.startsWith("audio/"),
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    audioTracks = (
      await Promise.all(
        allowedAudio.map(async (resource) => {
          const signed = await supabaseAdmin.storage
            .from("course-media")
            .createSignedUrl(resource.path, 14400);
          return signed.data?.signedUrl
            ? { id: resource.id, name: resource.name, url: signed.data.signedUrl }
            : null;
        }),
      )
    ).filter((track): track is { id: string; name: string; url: string } => track !== null);
  }
  const builtInTrack = [
    trackIds.includes(BUILTIN_AMBIENT_TRACK_ID)
      ? {
          id: BUILTIN_AMBIENT_TRACK_ID,
          name: BUILTIN_AMBIENT_TRACK_NAME,
          url: BUILTIN_AMBIENT_TRACK_URL,
        }
      : null,
    trackIds.includes(SECOND_BUILTIN_AMBIENT_TRACK_ID)
      ? {
          id: SECOND_BUILTIN_AMBIENT_TRACK_ID,
          name: SECOND_BUILTIN_AMBIENT_TRACK_NAME,
          url: SECOND_BUILTIN_AMBIENT_TRACK_URL,
        }
      : null,
  ].filter((track): track is { id: string; name: string; url: string } => track !== null);
  const trackMap = new Map([...builtInTrack, ...audioTracks].map((track) => [track.id, track]));
  const music: AmbientMusicData = {
    tracks: [...new Set(trackIds)].flatMap((id) => {
      const track = trackMap.get(id);
      return track ? [track] : [];
    }),
    order: ambientSettings?.order === "random" ? "random" : "sequential",
  };
  for (const field of ["hero_resource_id", "portrait_resource_id"]) {
    const id = home?.[field];
    if (typeof id === "string" && id) {
      const { data } = await client
        .from("resources")
        .select("path,mime_type,is_public")
        .eq("id", id)
        .eq("is_public", true)
        .maybeSingle();
      const url = await signPublicImage(data, async (path, expiresIn) => {
        // Public RLS read above authorizes only the image selected in home settings.
        // Use privileged storage signing, never privileged public-content reads.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const signed = await supabaseAdmin.storage
          .from("course-media")
          .createSignedUrl(path, expiresIn);
        return signed.data?.signedUrl;
      });
      if (url) images[field] = url;
    }
  }
  return {
    courses: courses.data ?? [],
    modules: modules.data ?? [],
    settings: settings.data ?? [],
    testimonials: testimonials.data ?? [],
    images,
    music,
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
          !/\.(mp4|webm|mov|mp3|wav|ogg|m4a|aac|flac|jpg|jpeg|png|webp|pdf|xlsx|xls|csv|txt)$/i.test(
            path,
          ) ||
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
export const inviteSiteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      email: z.string().trim().email().max(254),
      displayName: z.string().trim().min(1).max(100),
      role: z.enum(["admin", "student"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Acesso restrito ao administrador.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invitation, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: { display_name: data.displayName },
      });
    if (inviteError) {
      if (/already|registered|exists/i.test(inviteError.message)) {
        throw new Error("Este e-mail já possui uma conta. Use um e-mail ainda não cadastrado.");
      }
      throw new Error(`Não foi possível enviar o convite: ${inviteError.message}`);
    }
    if (!invitation.user) throw new Error("O convite não retornou uma conta válida.");

    if (data.role === "admin") {
      type RoleResult = { error: { message: string } | null };
      type RoleTable = {
        upsert: (
          values: { user_id: string; role: "admin" },
          options: { onConflict: string },
        ) => PromiseLike<RoleResult>;
      };
      // `user_roles` is omitted from the browser schema because clients must never write to it.
      const roles = (
        supabaseAdmin as unknown as {
          from: (table: "user_roles") => RoleTable;
        }
      ).from("user_roles");
      const { error: assignmentError } = await roles.upsert(
        { user_id: invitation.user.id, role: "admin" },
        { onConflict: "user_id,role" },
      );
      if (assignmentError) {
        await supabaseAdmin.auth.admin.deleteUser(invitation.user.id);
        throw new Error("O convite foi cancelado porque não foi possível atribuir o papel admin.");
      }
    }

    return { success: true, role: data.role };
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
    // RLS on lessons exposes only published lessons in courses the user can access
    // (or all lessons to an administrator). Check that before accepting progress.
    const accessibleLesson = await context.supabase
      .from("lessons")
      .select("id")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (accessibleLesson.error || !accessibleLesson.data) {
      throw new Error("Aula indisponível ou acesso não autorizado.");
    }

    const r = await context.supabase.from("lesson_progress").upsert({
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
