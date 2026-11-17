import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, MessageCircle, Send, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  communityContent,
  createCommunityComment,
  createCommunityPost,
  deleteCommunityComment,
  deleteCommunityPost,
} from "./community.functions";
import {
  COMMUNITY_COMMENT_MAX_LENGTH,
  COMMUNITY_OFFENSIVE_MESSAGE,
  COMMUNITY_POST_MAX_LENGTH,
  communityUploadErrorMessage,
  validateCommunityImage,
  validateCommunityText,
} from "./community.shared";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase("pt-BR");
}

export function CommunityPage({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const fetchCommunity = useServerFn(communityContent);
  const createPost = useServerFn(createCommunityPost);
  const addComment = useServerFn(createCommunityComment);
  const deletePost = useServerFn(deleteCommunityPost);
  const deleteComment = useServerFn(deleteCommunityComment);
  const feed = useQuery({
    queryKey: ["community-feed"],
    queryFn: () => fetchCommunity(),
  });
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [commenting, setCommenting] = useState("");
  const [deleting, setDeleting] = useState("");
  const bodyModerationError = validateCommunityText(body);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishing) return;
    if (!body.trim() && !image) {
      toast.error("Escreva uma mensagem ou anexe uma foto.");
      return;
    }
    if (bodyModerationError) {
      toast.error(COMMUNITY_OFFENSIVE_MESSAGE);
      return;
    }
    setPublishing(true);
    let uploadedPath = "";
    try {
      if (image) {
        const invalid = validateCommunityImage(image);
        if (invalid) throw new Error(invalid);
        const extension = image.type === "image/jpeg" ? "jpg" : image.type.split("/")[1];
        uploadedPath = `${userId}/${crypto.randomUUID()}.${extension}`;
        const result = await supabase.storage.from("community-media").upload(uploadedPath, image, {
          contentType: image.type,
          cacheControl: "3600",
          upsert: false,
        });
        if (result.error) throw new Error(communityUploadErrorMessage(result.error));
      }
      await createPost({ data: { body, imagePath: uploadedPath || null } });
      setBody("");
      setImage(null);
      setPreview("");
      await queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      toast.success("Publicação compartilhada com a comunidade.");
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("community-media").remove([uploadedPath]);
      toast.error(error instanceof Error ? error.message : "Não foi possível publicar.");
    } finally {
      setPublishing(false);
    }
  }

  async function comment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    if (commenting) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const value = String(formData.get("comment") ?? "").trim();
    if (!value) return;
    if (validateCommunityText(value)) {
      toast.error(COMMUNITY_OFFENSIVE_MESSAGE);
      return;
    }
    setCommenting(postId);
    try {
      await addComment({ data: { postId, body: value } });
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível comentar.");
    } finally {
      setCommenting("");
    }
  }

  async function removePost(postId: string) {
    if (!window.confirm("Excluir esta publicação e todos os comentários?")) return;
    setDeleting(postId);
    try {
      await deletePost({ data: { postId } });
      await queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      toast.success("Publicação removida.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível remover a publicação.",
      );
    } finally {
      setDeleting("");
    }
  }

  async function removeComment(commentId: string) {
    if (!window.confirm("Excluir este comentário?")) return;
    setDeleting(commentId);
    try {
      await deleteComment({ data: { commentId } });
      await queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      toast.success("Comentário removido.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível remover o comentário.",
      );
    } finally {
      setDeleting("");
    }
  }

  return (
    <section className="community-page" aria-label="Comunidade dos alunos">
      <div className="community-intro">
        <span className="eyebrow">TROCA ENTRE PROFISSIONAIS</span>
        <h2>Aprenda junto com a comunidade.</h2>
        <p>Compartilhe dúvidas, dicas e fotos. Outros alunos podem comentar e ajudar.</p>
      </div>

      <form className="community-composer" onSubmit={publish}>
        <label htmlFor="community-post-body">O que você gostaria de compartilhar?</label>
        <Textarea
          id="community-post-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={Boolean(bodyModerationError)}
          aria-describedby={bodyModerationError ? "community-moderation-error" : undefined}
          placeholder="Faça uma pergunta, conte uma experiência ou compartilhe uma dica…"
          maxLength={COMMUNITY_POST_MAX_LENGTH}
          rows={4}
          disabled={publishing}
        />
        {bodyModerationError && (
          <p id="community-moderation-error" className="community-moderation-error" role="alert">
            {COMMUNITY_OFFENSIVE_MESSAGE}
          </p>
        )}
        <div className="community-composer-footer">
          <div className="community-photo-controls">
            <label className="community-photo-button">
              <ImagePlus aria-hidden="true" />
              <span>{image ? "Trocar foto" : "Adicionar foto"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={publishing}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  if (file) {
                    const invalid = validateCommunityImage(file);
                    if (invalid) {
                      toast.error(invalid);
                      event.currentTarget.value = "";
                      return;
                    }
                    setPreview(URL.createObjectURL(file));
                  } else {
                    setPreview("");
                  }
                  setImage(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {image && (
              <button
                className="community-remove-photo"
                type="button"
                aria-label="Remover foto selecionada"
                onClick={() => {
                  setImage(null);
                  setPreview("");
                }}
              >
                <X aria-hidden="true" />
              </button>
            )}
            <span className="community-char-count">
              {body.length}/{COMMUNITY_POST_MAX_LENGTH}
            </span>
          </div>
          <Button disabled={publishing || Boolean(bodyModerationError) || (!body.trim() && !image)}>
            <Send aria-hidden="true" /> {publishing ? "Publicando…" : "Publicar"}
          </Button>
        </div>
        {preview && <img className="community-image-preview" src={preview} alt="Prévia da foto" />}
        <p className="community-upload-note">Fotos JPEG, PNG ou WebP de até 5 MB.</p>
      </form>

      <div className="community-feed-heading">
        <h3>Conversas recentes</h3>
        {feed.data && <span>{feed.data.length} publicações recentes</span>}
      </div>
      {feed.isPending ? (
        <div className="community-loading" role="status">
          Carregando conversas…
        </div>
      ) : feed.isError ? (
        <div className="empty-state">
          <MessageCircle />
          <h3>Não foi possível carregar a comunidade.</h3>
          <Button variant="outline" onClick={() => void feed.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : feed.data?.length ? (
        <div className="community-feed">
          {feed.data.map((post) => (
            <article className="community-post" key={post.id}>
              <header className="community-post-header">
                <span className="community-avatar" aria-hidden="true">
                  {initials(post.author) || <Users />}
                </span>
                <div className="community-author">
                  <strong>{post.author}</strong>
                  <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                </div>
                {(post.userId === userId || isAdmin) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir publicação"
                    title="Excluir publicação"
                    disabled={deleting === post.id}
                    onClick={() => void removePost(post.id)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </header>
              {post.body && <p className="community-post-body">{post.body}</p>}
              {post.imageUrl && (
                <img
                  className="community-post-image"
                  src={post.imageUrl}
                  alt="Foto compartilhada na comunidade"
                />
              )}
              <div className="community-comments">
                <div className="community-comments-heading">
                  <MessageCircle aria-hidden="true" />
                  <span>{post.comments.length} comentários recentes</span>
                </div>
                {post.comments.map((item) => (
                  <div className="community-comment" key={item.id}>
                    <span className="community-comment-avatar" aria-hidden="true">
                      {initials(item.author)}
                    </span>
                    <div className="community-comment-copy">
                      <div className="community-comment-meta">
                        <strong>{item.author}</strong>
                        <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                      </div>
                      <p>{item.body}</p>
                    </div>
                    {(item.userId === userId || isAdmin) && (
                      <button
                        className="community-comment-delete"
                        type="button"
                        aria-label="Excluir comentário"
                        disabled={deleting === item.id}
                        onClick={() => void removeComment(item.id)}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                <form
                  className="community-comment-form"
                  onSubmit={(event) => void comment(event, post.id)}
                >
                  <input
                    aria-label={`Comentar na publicação de ${post.author}`}
                    name="comment"
                    placeholder="Escreva um comentário ou ajude com uma resposta…"
                    maxLength={COMMUNITY_COMMENT_MAX_LENGTH}
                    required
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Enviar comentário"
                    disabled={commenting === post.id}
                  >
                    <Send aria-hidden="true" />
                  </Button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="community-empty">
          <Users aria-hidden="true" />
          <h3>A comunidade começa com uma conversa.</h3>
          <p>Faça uma pergunta ou compartilhe uma dica para dar início à troca.</p>
        </div>
      )}
    </section>
  );
}
