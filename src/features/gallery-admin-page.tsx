import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { publicOptions } from "./content";
import { createGalleryItem, removeGalleryItem, updateGalleryItem } from "./gallery.functions";
import {
  GALLERY_IMAGE_TYPES,
  galleryUploadErrorMessage,
  validateGalleryImage,
  type PublicGalleryItem,
} from "./gallery.shared";

const extensions: Record<(typeof GALLERY_IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type GalleryDraft = Pick<PublicGalleryItem, "title" | "description">;

export function GalleryAdminPage({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const galleryQuery = useQuery(publicOptions);
  const createItem = useServerFn(createGalleryItem);
  const updateItem = useServerFn(updateGalleryItem);
  const removeItem = useServerFn(removeGalleryItem);
  const items = galleryQuery.data?.gallery ?? [];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [drafts, setDrafts] = useState<Record<string, GalleryDraft>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function getDraft(item: PublicGalleryItem): GalleryDraft {
    return drafts[item.resource_id] ?? { title: item.title, description: item.description };
  }

  function setDraft(item: PublicGalleryItem, next: GalleryDraft) {
    setDrafts((current) => ({ ...current, [item.resource_id]: next }));
  }

  async function refreshGallery() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["public-content"] }),
      queryClient.invalidateQueries({ queryKey: ["member-content"] }),
    ]);
  }

  async function submitNewItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) {
      setPhotoError("Selecione uma foto para publicar.");
      return;
    }
    const validation = validateGalleryImage(photo);
    if (validation) {
      setPhotoError(validation);
      return;
    }
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast.error("Informe um título para a foto.");
      return;
    }

    const path = `${userId}/${crypto.randomUUID()}.${extensions[photo.type as keyof typeof extensions]}`;
    let uploaded = false;
    let published = false;
    setBusy(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("course-media")
        .upload(path, photo, {
          cacheControl: "3600",
          contentType: photo.type,
          upsert: false,
        });
      if (uploadError) throw new Error(galleryUploadErrorMessage(uploadError));
      uploaded = true;
      await createItem({
        data: {
          title: normalizedTitle,
          description: description.trim(),
          path,
          mimeType: photo.type as (typeof GALLERY_IMAGE_TYPES)[number],
          size: photo.size,
        },
      });
      published = true;
      await refreshGallery();
      setTitle("");
      setDescription("");
      setPhoto(null);
      setPhotoError("");
      const input = document.getElementById("gallery-photo-upload");
      if (input instanceof HTMLInputElement) input.value = "";
      toast.success("Foto publicada na Galeria.");
    } catch (error) {
      if (uploaded && !published) {
        try {
          await supabase.storage.from("course-media").remove([path]);
        } catch {
          // Server-side publishing also performs best-effort cleanup.
        }
      }
      toast.error(error instanceof Error ? error.message : "Não foi possível publicar a foto.");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(item: PublicGalleryItem) {
    const draft = getDraft(item);
    if (!draft.title.trim()) {
      toast.error("Informe um título para a foto.");
      return;
    }
    setBusy(true);
    try {
      await updateItem({
        data: {
          resourceId: item.resource_id,
          title: draft.title.trim(),
          description: draft.description.trim(),
        },
      });
      await refreshGallery();
      toast.success("Descrição atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a foto.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: PublicGalleryItem) {
    if (
      !window.confirm(
        `Retirar “${item.title}” da Galeria pública? O arquivo será mantido na biblioteca do site.`,
      )
    )
      return;
    setBusy(true);
    try {
      await removeItem({ data: { resourceId: item.resource_id } });
      await refreshGallery();
      setDrafts((current) => {
        const next = { ...current };
        delete next[item.resource_id];
        return next;
      });
      toast.success("Foto retirada da Galeria.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível retirar a foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="gallery-admin-page">
      <div className="gallery-admin-intro">
        <p>
          Publique imagens de drinks com título e descrição. As fotos usam o armazenamento privado
          já configurado no site.
        </p>
        <span>JPEG, PNG ou WebP · até 5 MB · no máximo 60 fotos</span>
      </div>

      <form
        className="gallery-admin-form stack-form"
        onSubmit={(event) => void submitNewItem(event)}
      >
        <h2>Adicionar foto à Galeria</h2>
        <label>
          Título do drink
          <Input
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label>
          Descrição
          <Textarea
            value={description}
            maxLength={600}
            rows={3}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ingredientes, técnica ou história do drink"
          />
        </label>
        <label>
          Foto
          <Input
            id="gallery-photo-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setPhoto(selected);
              setPhotoError(selected ? validateGalleryImage(selected) : "");
            }}
          />
        </label>
        {photoError && (
          <p className="form-error" role="alert">
            {photoError}
          </p>
        )}
        {previewUrl && (
          <img
            className="gallery-upload-preview"
            src={previewUrl}
            alt="Pré-visualização da foto selecionada"
          />
        )}
        <Button type="submit" disabled={busy || !photo || Boolean(photoError)}>
          <Upload /> Publicar foto
        </Button>
      </form>

      <div className="admin-section-title gallery-admin-list-heading">
        <div>
          <h2>Fotos publicadas</h2>
          <p>{items.length} de 60 fotos</p>
        </div>
      </div>
      {galleryQuery.isPending && <div className="empty-state">Carregando a Galeria…</div>}
      {galleryQuery.isError && (
        <div className="empty-state">
          <p>Não foi possível carregar as fotos publicadas.</p>
          <Button variant="outline" onClick={() => void galleryQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {!galleryQuery.isPending && !galleryQuery.isError && items.length === 0 && (
        <div className="empty-state">
          <ImagePlus />
          <h3>A Galeria ainda está vazia.</h3>
          <p>Adicione a primeira foto para exibir seus drinks na página pública.</p>
        </div>
      )}
      <div className="gallery-admin-grid">
        {items.map((item) => {
          const draft = getDraft(item);
          return (
            <article className="gallery-admin-card" key={item.resource_id}>
              <img src={item.imageUrl} alt={item.title} loading="lazy" />
              <div className="gallery-admin-card-fields">
                <label>
                  Título
                  <Input
                    value={draft.title}
                    maxLength={120}
                    onChange={(event) => setDraft(item, { ...draft, title: event.target.value })}
                  />
                </label>
                <label>
                  Descrição
                  <Textarea
                    rows={3}
                    maxLength={600}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft(item, { ...draft, description: event.target.value })
                    }
                  />
                </label>
                <div className="gallery-admin-card-actions">
                  <Button disabled={busy} onClick={() => void saveItem(item)}>
                    <Save /> Salvar
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => void remove(item)}>
                    <Trash2 /> Retirar
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
