import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function requireAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Acesso restrito a administradores.");
}

export const adminMemberDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const [profiles, roles] = await Promise.all([
      context.supabase.from("profiles").select("id,display_name,created_at"),
      context.supabase.from("user_roles").select("user_id,role"),
    ]);
    if (profiles.error) throw new Error(profiles.error.message);
    if (roles.error) throw new Error(roles.error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const authUsers = new Map<string, string>();
    for (let page = 1; page <= 100; page += 1) {
      const result = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error) throw new Error("Não foi possível carregar os emails dos alunos.");
      for (const user of result.data.users) authUsers.set(user.id, user.email ?? "");
      if (result.data.users.length < 1000) break;
    }
    const adminIds = new Set(
      roles.data.filter((row) => row.role === "admin").map((row) => row.user_id),
    );
    return (profiles.data ?? []).map((profile) => ({
      ...profile,
      email: authUsers.get(profile.id) ?? "",
      isAdmin: adminIds.has(profile.id),
    }));
  });

const memberActionInput = z.object({
  action: z.enum(["promote", "demote", "update", "delete"]),
  userId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(254).optional(),
});

export const manageMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(memberActionInput)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && (data.action === "demote" || data.action === "delete"))
      throw new Error("Não é possível remover ou excluir a própria conta administrativa.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "promote") {
      const result = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (result.error) throw new Error("Não foi possível promover este aluno.");
      const removedStudentRole = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "student");
      if (removedStudentRole.error) throw new Error("Não foi possível concluir a promoção.");
      return { success: true };
    }
    if (data.action === "demote") {
      const studentRole = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "student" }, { onConflict: "user_id,role" });
      if (studentRole.error) throw new Error("Não foi possível rebaixar este administrador.");
      const result = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (result.error) throw new Error("Não foi possível rebaixar este administrador.");
      return { success: true };
    }
    if (data.action === "update") {
      if (!data.displayName || !data.email) throw new Error("Informe nome e email válidos.");
      const current = await supabaseAdmin.auth.admin.getUserById(data.userId);
      if (current.error) throw new Error("Cadastro não encontrado.");
      const normalizedEmail = data.email.trim().toLowerCase();
      if ((current.data.user.email ?? "").toLowerCase() !== normalizedEmail) {
        const updateAuth = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
          email: normalizedEmail,
        });
        if (updateAuth.error) throw new Error("Não foi possível alterar o email desta conta.");
      }
      const updateProfile = await supabaseAdmin
        .from("profiles")
        .update({ display_name: data.displayName.trim() })
        .eq("id", data.userId);
      if (updateProfile.error) throw new Error("Não foi possível alterar o nome do aluno.");
      return { success: true };
    }

    const paths: string[] = [];
    for (let offset = 0; offset < 100000; offset += 1000) {
      const files = await supabaseAdmin.storage.from("community-media").list(data.userId, {
        limit: 1000,
        offset,
      });
      if (files.error) throw new Error("Não foi possível preparar a exclusão das fotos do aluno.");
      paths.push(...(files.data ?? []).map((file) => `${data.userId}/${file.name}`));
      if ((files.data ?? []).length < 1000) break;
    }
    for (let index = 0; index < paths.length; index += 1000) {
      const removed = await supabaseAdmin.storage
        .from("community-media")
        .remove(paths.slice(index, index + 1000));
      if (removed.error) throw new Error("Não foi possível remover as fotos deste aluno.");
    }
    const deletion = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (deletion.error) throw new Error("Não foi possível excluir a conta do aluno.");
    return { success: true };
  });
