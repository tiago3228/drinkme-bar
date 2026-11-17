import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { CommunityDatabase } from "./community.database-types";
import {
  COMMUNITY_COMMENT_MAX_LENGTH,
  COMMUNITY_OFFENSIVE_MESSAGE,
  COMMUNITY_POST_MAX_LENGTH,
  validateCommunityText,
} from "./community.shared";

function communityClient(supabase: SupabaseClient<Database>) {
  return supabase as unknown as SupabaseClient<CommunityDatabase>;
}

async function hasAdminRole(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Não foi possível verificar as permissões.");
  return data === true;
}

export const communityContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const client = communityClient(context.supabase);
    const postsResult = await client
      .from("community_posts")
      .select("id,user_id,body,image_path,created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (postsResult.error) throw new Error("Não foi possível carregar a comunidade.");
    const posts = postsResult.data ?? [];
    if (!posts.length) return [];

    const postIds = posts.map((post) => post.id);
    const commentsResult = await client
      .from("community_comments")
      .select("id,post_id,user_id,body,created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (commentsResult.error) throw new Error("Não foi possível carregar os comentários.");
    const comments = commentsResult.data ?? [];
    const imagePaths = posts.flatMap((post) => (post.image_path ? [post.image_path] : []));
    const authorIds = [
      ...new Set([
        ...posts.map((post) => post.user_id),
        ...comments.map((comment) => comment.user_id),
      ]),
    ];
    const authorsResult = await client.rpc("community_author_names", {
      _user_ids: authorIds,
    });
    if (authorsResult.error) throw new Error("Não foi possível carregar os autores da comunidade.");
    const signedResult = imagePaths.length
      ? await client.storage.from("community-media").createSignedUrls(imagePaths, 3600)
      : { data: [], error: null };
    if (signedResult.error) throw new Error("Não foi possível carregar as fotos da comunidade.");
    const names = new Map(
      (authorsResult.data ?? []).map((author) => [author.id, author.display_name]),
    );
    const imageUrls = new Map(
      (signedResult.data ?? []).flatMap((signed) =>
        signed.path && signed.signedUrl ? [[signed.path, signed.signedUrl] as const] : [],
      ),
    );
    return posts.map((post) => ({
      id: post.id,
      userId: post.user_id,
      author: names.get(post.user_id)?.trim() || "Membro",
      body: post.body,
      createdAt: post.created_at,
      imageUrl: post.image_path ? (imageUrls.get(post.image_path) ?? null) : null,
      comments: comments
        .filter((comment) => comment.post_id === post.id)
        .reverse()
        .map((comment) => ({
          id: comment.id,
          userId: comment.user_id,
          author: names.get(comment.user_id)?.trim() || "Membro",
          body: comment.body,
          createdAt: comment.created_at,
        })),
    }));
  });

export const createCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      body: z.string().max(COMMUNITY_POST_MAX_LENGTH),
      imagePath: z.string().max(300).nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const client = communityClient(context.supabase);
    const body = data.body.trim();
    const moderationError = validateCommunityText(body);
    if (moderationError) throw new Error(moderationError);
    if (!body && !data.imagePath) throw new Error("Escreva uma mensagem ou anexe uma foto.");
    if (
      data.imagePath &&
      !new RegExp(`^${context.userId}/[a-f0-9-]{36}\\.(jpg|jpeg|png|webp)$`, "i").test(
        data.imagePath,
      )
    )
      throw new Error("Caminho da foto inválido.");
    const result = await client.from("community_posts").insert({
      user_id: context.userId,
      body,
      image_path: data.imagePath,
    });
    if (result.error?.message.includes("community_offensive_language"))
      throw new Error(COMMUNITY_OFFENSIVE_MESSAGE);
    if (result.error?.message.includes("community_post_daily_limit"))
      throw new Error("Você atingiu o limite de 30 publicações em 24 horas.");
    if (result.error) throw new Error("Não foi possível publicar sua mensagem.");
    return { success: true };
  });

export const createCommunityComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      postId: z.string().uuid(),
      body: z.string().trim().min(1).max(COMMUNITY_COMMENT_MAX_LENGTH),
    }),
  )
  .handler(async ({ context, data }) => {
    const client = communityClient(context.supabase);
    const moderationError = validateCommunityText(data.body);
    if (moderationError) throw new Error(moderationError);
    const result = await client.from("community_comments").insert({
      post_id: data.postId,
      user_id: context.userId,
      body: data.body,
    });
    if (result.error?.message.includes("community_offensive_language"))
      throw new Error(COMMUNITY_OFFENSIVE_MESSAGE);
    if (result.error?.message.includes("community_comment_daily_limit"))
      throw new Error("Você atingiu o limite de 100 comentários em 24 horas.");
    if (result.error) throw new Error("Não foi possível adicionar o comentário.");
    return { success: true };
  });

export const deleteCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ postId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const client = communityClient(context.supabase);
    const postResult = await client
      .from("community_posts")
      .select("id,user_id,image_path")
      .eq("id", data.postId)
      .maybeSingle();
    const post = postResult.data;
    if (postResult.error || !post) throw new Error("Publicação não encontrada.");
    const isAdmin = await hasAdminRole(context.supabase, context.userId);
    if (post.user_id !== context.userId && !isAdmin)
      throw new Error("Você só pode apagar suas próprias publicações.");
    if (post.image_path) {
      const removed = await client.storage.from("community-media").remove([post.image_path]);
      if (removed.error) throw new Error("Não foi possível remover a foto da publicação.");
    }
    const result = await client.from("community_posts").delete().eq("id", data.postId);
    if (result.error) throw new Error("Não foi possível apagar a publicação.");
    return { success: true };
  });

export const deleteCommunityComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ commentId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const client = communityClient(context.supabase);
    const commentResult = await client
      .from("community_comments")
      .select("id,user_id")
      .eq("id", data.commentId)
      .maybeSingle();
    const comment = commentResult.data;
    if (commentResult.error || !comment) throw new Error("Comentário não encontrado.");
    const isAdmin = await hasAdminRole(context.supabase, context.userId);
    if (comment.user_id !== context.userId && !isAdmin)
      throw new Error("Você só pode apagar seus próprios comentários.");
    const result = await client.from("community_comments").delete().eq("id", data.commentId);
    if (result.error) throw new Error("Não foi possível apagar o comentário.");
    return { success: true };
  });
