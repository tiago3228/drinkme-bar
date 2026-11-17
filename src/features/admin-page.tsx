import { useEffect, useState, useRef, type FormEvent } from "react";
import { useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus,
  Upload,
  Search,
  Trash2,
  Pencil,
  File,
  Image,
  Film,
  BookOpen,
  Users,
  FolderOpen,
  ArrowUpRight,
  Check,
  Save,
  X,
  RefreshCw,
  Music2,
  ArrowUp,
  ArrowDown,
  UserPlus,
  MoreHorizontal,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  memberOptions,
  mediaCategories,
  validateUpload,
  money,
  type HomeSettings,
} from "./content";
import { adminMutation, inviteSiteUser, mediaUrl } from "./platform.functions";
import { adminMemberDirectory, manageMember } from "./member-admin.functions";
import { Workspace } from "./workspace";
import { CommunityPage } from "./community-page";
import { GalleryAdminPage } from "./gallery-admin-page";
import {
  BUILTIN_AMBIENT_TRACK_ID,
  BUILTIN_AMBIENT_TRACK_NAME,
  SECOND_BUILTIN_AMBIENT_TRACK_ID,
  SECOND_BUILTIN_AMBIENT_TRACK_NAME,
  type AmbientMusicConfig,
} from "./ambient-music.shared";

type Table = "courses" | "modules" | "lessons" | "resources" | "enrollments" | "testimonials";
type Edit = { table: Table; id?: string; values: Record<string, unknown> };
type ManagedMember = {
  id: string;
  display_name: string;
  created_at: string;
  email: string;
  isAdmin: boolean;
};
export function AdminPage() {
  const { data } = useSuspenseQuery(memberOptions);
  const qc = useQueryClient();
  const mutation = useServerFn(adminMutation);
  const inviteUser = useServerFn(inviteSiteUser);
  const getUrl = useServerFn(mediaUrl);
  const directoryFn = useServerFn(adminMemberDirectory);
  const memberActionFn = useServerFn(manageMember);
  const [tab, setTab] = useState("Visão geral");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [courseId, setCourseId] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Materiais educacionais");
  const [uploadLesson, setUploadLesson] = useState("");
  const [uploadPublic, setUploadPublic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [memberMenu, setMemberMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [memberEdit, setMemberEdit] = useState<ManagedMember | null>(null);
  const [replaceId, setReplaceId] = useState("");
  const replaceRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const musicUploadRef = useRef<HTMLInputElement>(null);
  const memberMenuRef = useRef<HTMLDivElement>(null);
  const memberDirectory = useQuery({
    queryKey: ["admin-members"],
    queryFn: () => directoryFn(),
    enabled: tab === "Alunos" && data.isAdmin,
  });
  const members: ManagedMember[] = memberDirectory.data ?? [];
  useEffect(() => {
    if (memberMenu)
      memberMenuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [memberMenu]);
  const home = (data.settings.find((s) => s.key === "home")?.value ?? {}) as HomeSettings;
  const [draft, setDraft] = useState<HomeSettings>(home);
  const musicConfig: AmbientMusicConfig = {
    track_ids: [
      ...new Set([
        ...(home.ambient_music?.track_ids ?? [BUILTIN_AMBIENT_TRACK_ID]),
        SECOND_BUILTIN_AMBIENT_TRACK_ID,
      ]),
    ],
    order: home.ambient_music?.order ?? "sequential",
  };
  const audioResources = data.resources.filter(
    (resource) =>
      resource.category === "Música ambiente" && resource.mime_type.startsWith("audio/"),
  );
  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["member-content"] });
    await qc.invalidateQueries({ queryKey: ["public-content"] });
  }
  async function save(
    table: Table | "site_settings",
    values: Record<string, unknown>,
    id?: string,
  ) {
    setBusy(true);
    try {
      await mutation({ data: { table, action: "save", values, id } });
      toast.success("Alterações salvas.");
      setEdit(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  function saveMusicConfig(next: AmbientMusicConfig) {
    return save("site_settings", { key: "home", value: { ...home, ambient_music: next } });
  }
  function moveMusicTrack(id: string, direction: -1 | 1) {
    const index = musicConfig.track_ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= musicConfig.track_ids.length) return;
    const trackIds = [...musicConfig.track_ids];
    const currentTrack = trackIds[index];
    const targetTrack = trackIds[target];
    if (currentTrack === undefined || targetTrack === undefined) return;
    trackIds[index] = targetTrack;
    trackIds[target] = currentTrack;
    void saveMusicConfig({ ...musicConfig, track_ids: trackIds });
  }
  async function removeMusicTrack(id: string, deleteFile = false) {
    const track = audioResources.find((resource) => resource.id === id);
    const prompt = deleteFile
      ? `Excluir permanentemente o arquivo “${track?.name ?? "música"}”?`
      : "Remover esta faixa da playlist ambiente?";
    if (!window.confirm(prompt)) return;
    setBusy(true);
    try {
      const nextConfig = {
        ...musicConfig,
        track_ids: musicConfig.track_ids.filter((trackId) => trackId !== id),
      };
      await mutation({
        data: {
          table: "site_settings",
          action: "save",
          values: { key: "home", value: { ...home, ambient_music: nextConfig } },
        },
      });
      if (deleteFile && id !== BUILTIN_AMBIENT_TRACK_ID && id !== SECOND_BUILTIN_AMBIENT_TRACK_ID) {
        await mutation({ data: { table: "resources", action: "delete", id, values: {} } });
      }
      await refresh();
      toast.success(
        deleteFile ? "Faixa removida do site e da biblioteca." : "Faixa removida da playlist.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível remover a faixa.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(table: Table, id: string) {
    if (!window.confirm("Excluir este registro? Esta ação não pode ser desfeita.")) return;
    try {
      await mutation({ data: { table, action: "delete", id } });
      await refresh();
      toast.success("Registro excluído.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
  }
  function openMemberMenu(id: string, x: number, y: number) {
    setMemberMenu({
      id,
      x: Math.max(8, Math.min(x, window.innerWidth - 240)),
      y: Math.max(8, Math.min(y, window.innerHeight - 190)),
    });
  }
  async function actOnMember(action: "promote" | "demote" | "delete", member: ManagedMember) {
    setMemberMenu(null);
    if (
      action === "delete" &&
      !window.confirm(
        `Excluir permanentemente a conta de ${member.display_name || member.email}? Matrículas, progresso e publicações também serão apagados.`,
      )
    )
      return;
    setBusy(true);
    try {
      await memberActionFn({ data: { action, userId: member.id } });
      await Promise.all([
        memberDirectory.refetch(),
        qc.invalidateQueries({ queryKey: ["member-content"] }),
      ]);
      toast.success(
        action === "promote"
          ? "Aluno promovido a administrador master."
          : action === "demote"
            ? "Administrador rebaixado a aluno."
            : "Conta e dados associados excluídos.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  }
  async function saveMemberEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberEdit) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await memberActionFn({
        data: {
          action: "update",
          userId: memberEdit.id,
          displayName: String(form.get("display_name") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
        },
      });
      setMemberEdit(null);
      await memberDirectory.refetch();
      toast.success("Cadastro do aluno atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o cadastro.");
    } finally {
      setBusy(false);
    }
  }
  async function preview(id: string) {
    try {
      const url = await getUrl({ data: { id } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Acesso indisponível.");
    }
  }
  async function upload(
    files: FileList | File[] | null,
    replacement?: string,
    overrides?: {
      category?: string;
      course_id?: string | null;
      lesson_id?: string | null;
      is_public?: boolean;
    },
  ) {
    if (!files || uploading) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const invalid = validateUpload(file);
      if (invalid) {
        toast.error(`${file.name}: ${invalid}`);
        continue;
      }
      const path = `${data.userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      setUploadStatus(`${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      setProgress(0);
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) throw new Error("Entre novamente para enviar arquivos.");
        const storageUrl = import.meta.env["VITE_SUPABASE_URL"];
        const storageKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        if (!storageUrl || !storageKey)
          throw new Error("Conexão com o armazenamento indisponível. Publique o site novamente.");
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${storageUrl}/storage/v1/object/course-media/${path}`);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.setRequestHeader("apikey", storageKey);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error("Falha no envio. Confira o formato e o tamanho do arquivo."));
          xhr.onerror = () => reject(new Error("Falha de conexão durante o envio."));
          xhr.send(file);
        });
        try {
          const old = data.resources.find((r) => r.id === replacement);
          await mutation({
            data: {
              table: "resources",
              action: "save",
              ...(replacement ? { id: replacement } : {}),
              values: {
                name: file.name,
                path,
                mime_type: file.type || "application/octet-stream",
                size: file.size,
                category: old?.category ?? overrides?.category ?? uploadCategory,
                course_id:
                  old?.course_id ??
                  (overrides && "course_id" in overrides ? overrides.course_id : courseId || null),
                lesson_id:
                  old?.lesson_id ??
                  (overrides && "lesson_id" in overrides
                    ? overrides.lesson_id
                    : uploadLesson || null),
                is_public: old?.is_public ?? overrides?.is_public ?? uploadPublic,
              },
            },
          });
          if (old) {
            for (const lesson of data.lessons.filter((l) => l.video_path === old.path))
              await mutation({
                data: {
                  table: "lessons",
                  action: "save",
                  id: lesson.id,
                  values: { video_path: path },
                },
              });
            await supabase.storage.from("course-media").remove([old.path]);
          }
        } catch (e) {
          await supabase.storage.from("course-media").remove([path]);
          throw e;
        }
        setProgress(100);
        toast.success(`${file.name} enviado.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha no envio.");
        setUploadStatus("O envio não foi concluído. Tente novamente.");
      }
    }
    setUploading(false);
    setReplaceId("");
    await refresh();
    if (fileRef.current) fileRef.current.value = "";
  }
  function editSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    const form = new FormData(e.currentTarget);
    const values: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) values[key] = value;
    for (const key of ["price", "position"]) if (key in values) values[key] = Number(values[key]);
    if (["courses", "lessons", "testimonials"].includes(edit.table))
      values["published"] = form.get("published") === "on";
    for (const key of [
      "course_id",
      "module_id",
      "lesson_id",
      "video_url",
      "video_path",
      "cover_url",
    ])
      if (values[key] === "") values[key] = null;
    void save(edit.table, values, edit.id);
  }
  const editValue = (key: string) => String(edit?.values[key] ?? "");
  const resources = data.resources.filter(
    (r) =>
      (category === "Todas" || r.category === category) &&
      r.name.toLowerCase().includes(search.toLowerCase()),
  );
  if (!data.isAdmin)
    return (
      <Workspace admin={false} active="Acesso restrito" onTab={() => {}}>
        <div className="empty-state">
          <h1>Acesso restrito.</h1>
          <p>Seu perfil não possui permissão administrativa.</p>
          <Button asChild>
            <a href="/aluno">Ir para meus cursos</a>
          </Button>
        </div>
      </Workspace>
    );
  return (
    <Workspace
      admin
      active={tab}
      onTab={(v) => {
        setTab(v);
        setSearch("");
      }}
    >
      <div className="workspace-title">
        <div>
          <span className="eyebrow">ADMINISTRAÇÃO</span>
          <h1>{tab === "Visão geral" ? "Sua escola, em um só lugar." : tab}</h1>
        </div>
        {tab === "Cursos" && (
          <Button onClick={() => setEdit({ table: "courses", values: { price: 97 } })}>
            <Plus /> Novo curso
          </Button>
        )}
        {tab === "Aulas" && (
          <Button onClick={() => setEdit({ table: "lessons", values: { position: 1 } })}>
            <Plus /> Nova aula
          </Button>
        )}
      </div>
      {tab === "Comunidade" && <CommunityPage userId={data.userId} isAdmin={data.isAdmin} />}
      {tab === "Galeria" && <GalleryAdminPage userId={data.userId} />}
      {tab === "Visão geral" && (
        <>
          <div className="metrics-grid">
            {[
              ["Cursos", data.courses.length, BookOpen],
              ["Módulos", data.modules.length, BookOpen],
              ["Aulas", data.lessons.length, Film],
              ["Materiais", data.resources.length, FolderOpen],
              ["Alunos", data.profiles.length, Users],
            ].map(([label, count, Icon]) => {
              const I = Icon as typeof BookOpen;
              return (
                <article className="metric" key={String(label)}>
                  <I />
                  <strong>{String(count)}</strong>
                  <span>{String(label)}</span>
                </article>
              );
            })}
          </div>
          <div className="admin-section-title">
            <h2>Conteúdos recentes</h2>
            <Button variant="ghost" onClick={() => setTab("Biblioteca")}>
              Ver biblioteca <ArrowUpRight />
            </Button>
          </div>
          {data.resources.slice(0, 5).map((r) => (
            <div className="admin-row" key={r.id}>
              <File />
              <div>
                <strong>{r.name}</strong>
                <p>{r.category}</p>
              </div>
              <span>{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
          ))}
          {!data.resources.length && (
            <div className="empty-state">
              <FolderOpen />
              <h3>Sua biblioteca começa aqui.</h3>
              <Button variant="outline" onClick={() => setTab("Biblioteca")}>
                <Upload /> Enviar primeiro material
              </Button>
            </div>
          )}
          <div className="admin-section-title">
            <h2>Acesso rápido</h2>
          </div>
          <div className="quick-actions">
            <Button variant="outline" onClick={() => setTab("Cursos")}>
              <BookOpen /> Gerenciar cursos
            </Button>
            <Button variant="outline" onClick={() => setTab("Conteúdo do site")}>
              <Pencil /> Editar site
            </Button>
            <Button variant="outline" onClick={() => setTab("Alunos")}>
              <Users /> Autorizar alunos
            </Button>
            <Button variant="outline" onClick={() => setTab("Configurações")}>
              <UserPlus /> Criar usuário
            </Button>
          </div>
        </>
      )}
      {tab === "Cursos" && (
        <div className="admin-course-list">
          {data.courses.map((c) => (
            <article className="admin-course" key={c.id}>
              <div className="admin-row">
                <BookOpen />
                <div>
                  <h2>{c.title}</h2>
                  <p>
                    {money(Number(c.price))} • {c.published ? "Publicado" : "Rascunho"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar curso"
                  onClick={() => setEdit({ table: "courses", id: c.id, values: c })}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Excluir curso"
                  onClick={() => remove("courses", c.id)}
                >
                  <Trash2 />
                </Button>
              </div>
              <p>{c.description}</p>
              <div className="admin-section-title">
                <h3>Módulos</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEdit({
                      table: "modules",
                      values: {
                        course_id: c.id,
                        position: data.modules.filter((m) => m.course_id === c.id).length + 1,
                      },
                    })
                  }
                >
                  <Plus /> Adicionar módulo
                </Button>
              </div>
              {data.modules
                .filter((m) => m.course_id === c.id)
                .map((m) => (
                  <div className="admin-row compact" key={m.id}>
                    <span className="text-primary">{m.position.toString().padStart(2, "0")}</span>
                    <div>
                      <strong>{m.title}</strong>
                      <p>{data.lessons.filter((l) => l.module_id === m.id).length} aulas</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar módulo"
                      onClick={() => setEdit({ table: "modules", id: m.id, values: m })}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir módulo"
                      onClick={() => remove("modules", m.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
            </article>
          ))}
        </div>
      )}
      {tab === "Aulas" && (
        <>
          <div className="filter-bar">
            <Search />
            <Input
              placeholder="Pesquisar aulas"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Filtrar por curso"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Todos os cursos</option>
              {data.courses.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          {data.lessons
            .filter(
              (l) =>
                l.title.toLowerCase().includes(search.toLowerCase()) &&
                (!courseId ||
                  data.modules.find((m) => m.id === l.module_id)?.course_id === courseId),
            )
            .map((l) => (
              <div className="admin-row" key={l.id}>
                <Film />
                <div>
                  <strong>{l.title}</strong>
                  <p>
                    {data.modules.find((m) => m.id === l.module_id)?.title} •{" "}
                    {l.published ? "Publicada" : "Rascunho"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar aula"
                  onClick={() => setEdit({ table: "lessons", id: l.id, values: l })}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Excluir aula"
                  onClick={() => remove("lessons", l.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          {!data.lessons.length && (
            <div className="empty-state">
              <Film />
              <h3>Nenhuma aula cadastrada.</h3>
              <p>Adicione suas aulas aos módulos do treinamento.</p>
            </div>
          )}
        </>
      )}
      {tab === "Biblioteca" && (
        <>
          <div className="upload-options">
            <label>
              Categoria
              <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                {mediaCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Associar ao curso
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">Sem associação</option>
                {data.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Associar à aula
              <select value={uploadLesson} onChange={(e) => setUploadLesson(e.target.value)}>
                <option value="">Sem associação</option>
                {data.lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={uploadPublic}
                onChange={(e) => setUploadPublic(e.target.checked)}
              />{" "}
              Mídia pública do site
            </label>
          </div>
          <div
            className="upload-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(e.dataTransfer.files);
            }}
          >
            <Upload />
            <h3>{uploading ? "Enviando arquivo…" : "Arraste seus arquivos para cá"}</h3>
            <p>Áudios, vídeos, imagens, PDFs e planilhas • até 50 MB por arquivo</p>
            <Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              Selecionar arquivos
            </Button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".mp4,.webm,.mov,.mp3,.wav,.ogg,.m4a,.aac,.flac,.jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => void upload(e.target.files)}
            />
            {uploadStatus && (
              <div className="upload-feedback">
                <span>{uploadStatus}</span>
                <progress value={progress} max={100} />
                <span>{progress}%</span>
              </div>
            )}
          </div>
          <div className="filter-bar">
            <Search />
            <Input
              aria-label="Pesquisar materiais"
              placeholder="Pesquisar materiais"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Filtrar categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Todas</option>
              {mediaCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <input
            ref={replaceRef}
            className="hidden"
            type="file"
            accept=".mp4,.webm,.mov,.mp3,.wav,.ogg,.m4a,.aac,.flac,.jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx,.xls,.csv,.txt"
            onChange={(e) => void upload(e.target.files, replaceId)}
          />
          <div className="resource-grid">
            {resources.map((r) => (
              <article className="resource-card" key={r.id}>
                <div className="resource-icon">
                  {r.mime_type.startsWith("image") ? (
                    <Image />
                  ) : r.mime_type.startsWith("video") ? (
                    <Film />
                  ) : (
                    <File />
                  )}
                </div>
                <h3>{r.name}</h3>
                <p>
                  {r.category} • {(r.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p>
                  {new Date(r.created_at).toLocaleDateString("pt-BR")} •{" "}
                  {r.is_public ? "Público" : "Protegido"}
                </p>
                <div className="resource-actions">
                  <Button variant="outline" size="sm" onClick={() => preview(r.id)}>
                    Visualizar <ArrowUpRight />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Substituir arquivo"
                    disabled={uploading}
                    onClick={() => {
                      setReplaceId(r.id);
                      replaceRef.current?.click();
                    }}
                  >
                    <RefreshCw />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar material"
                    onClick={() => setEdit({ table: "resources", id: r.id, values: r })}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Excluir material"
                    onClick={() => remove("resources", r.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!resources.length && <div className="empty-state">Nenhum material encontrado.</div>}
        </>
      )}
      {tab === "Música ambiente" && (
        <section className="music-admin">
          <div className="music-admin-heading">
            <div>
              <span className="eyebrow">TRILHA DO SITE</span>
              <h2>Playlist ambiente</h2>
              <p>Gerencie as faixas que podem tocar no site e na área do aluno.</p>
            </div>
            <label className="music-order-control">
              Ordem de reprodução
              <select
                value={musicConfig.order}
                disabled={busy}
                onChange={(event) =>
                  void saveMusicConfig({
                    ...musicConfig,
                    order: event.target.value === "random" ? "random" : "sequential",
                  })
                }
              >
                <option value="sequential">Em sequência</option>
                <option value="random">Aleatória</option>
              </select>
            </label>
          </div>
          <div className="music-upload-panel">
            <div>
              <h3>Adicionar músicas</h3>
              <p>Envie MP3, WAV, OGG, M4A, AAC ou FLAC. Limite de 50 MB por faixa.</p>
            </div>
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => musicUploadRef.current?.click()}
            >
              <Upload /> Selecionar arquivos
            </Button>
            <input
              ref={musicUploadRef}
              type="file"
              accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*"
              multiple
              className="hidden"
              onChange={(event) => {
                void upload(event.target.files, undefined, {
                  category: "Música ambiente",
                  course_id: null,
                  lesson_id: null,
                  is_public: true,
                });
                event.currentTarget.value = "";
              }}
            />
          </div>
          {uploading && uploadStatus && (
            <div className="upload-feedback">
              <span>{uploadStatus}</span>
              <progress value={progress} max={100} />
              <span>{progress}%</span>
            </div>
          )}
          <div className="admin-section-title">
            <h2>Na playlist ({musicConfig.track_ids.length})</h2>
          </div>
          <div className="music-track-list">
            {musicConfig.track_ids.map((id, index) => {
              const builtin =
                id === BUILTIN_AMBIENT_TRACK_ID || id === SECOND_BUILTIN_AMBIENT_TRACK_ID;
              const resource = audioResources.find((item) => item.id === id);
              return (
                <article className="music-track-row" key={id}>
                  <span className="music-track-number">{String(index + 1).padStart(2, "0")}</span>
                  <Music2 aria-hidden="true" />
                  <div>
                    <strong>
                      {id === BUILTIN_AMBIENT_TRACK_ID
                        ? BUILTIN_AMBIENT_TRACK_NAME
                        : id === SECOND_BUILTIN_AMBIENT_TRACK_ID
                          ? SECOND_BUILTIN_AMBIENT_TRACK_NAME
                          : (resource?.name ?? "Arquivo de áudio indisponível")}
                    </strong>
                    <p>{builtin ? "Faixa inicial" : "Música enviada à biblioteca"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Mover faixa para cima"
                    aria-label={`Mover ${
                      id === BUILTIN_AMBIENT_TRACK_ID
                        ? BUILTIN_AMBIENT_TRACK_NAME
                        : id === SECOND_BUILTIN_AMBIENT_TRACK_ID
                          ? SECOND_BUILTIN_AMBIENT_TRACK_NAME
                          : (resource?.name ?? "faixa")
                    } para cima`}
                    disabled={busy || index === 0}
                    onClick={() => moveMusicTrack(id, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Mover faixa para baixo"
                    aria-label={`Mover ${
                      id === BUILTIN_AMBIENT_TRACK_ID
                        ? BUILTIN_AMBIENT_TRACK_NAME
                        : id === SECOND_BUILTIN_AMBIENT_TRACK_ID
                          ? SECOND_BUILTIN_AMBIENT_TRACK_NAME
                          : (resource?.name ?? "faixa")
                    } para baixo`}
                    disabled={busy || index === musicConfig.track_ids.length - 1}
                    onClick={() => moveMusicTrack(id, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void removeMusicTrack(id)}
                  >
                    Remover da playlist
                  </Button>
                  {resource && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir arquivo de música"
                      disabled={busy}
                      onClick={() => void removeMusicTrack(id, true)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </article>
              );
            })}
            {!musicConfig.track_ids.length && (
              <div className="empty-state">
                <Music2 />
                <h3>A playlist está vazia.</h3>
                <p>Adicione uma faixa disponível abaixo para ativar o som ambiente.</p>
              </div>
            )}
          </div>
          <div className="admin-section-title">
            <h2>Faixas disponíveis</h2>
          </div>
          <div className="music-track-list">
            {audioResources
              .filter((resource) => !musicConfig.track_ids.includes(resource.id))
              .map((resource) => (
                <article className="music-track-row" key={resource.id}>
                  <Music2 aria-hidden="true" />
                  <div>
                    <strong>{resource.name}</strong>
                    <p>{(resource.size / 1024 / 1024).toFixed(2)} MB • Fora da playlist</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void saveMusicConfig({
                        ...musicConfig,
                        track_ids: [...musicConfig.track_ids, resource.id],
                      })
                    }
                  >
                    <Plus /> Adicionar à playlist
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Excluir arquivo de música"
                    disabled={busy}
                    onClick={() => void removeMusicTrack(resource.id, true)}
                  >
                    <Trash2 />
                  </Button>
                </article>
              ))}
            {!audioResources.some((resource) => !musicConfig.track_ids.includes(resource.id)) && (
              <p className="text-muted-foreground">
                Não há outras faixas. Envie uma música para adicioná-la.
              </p>
            )}
          </div>
        </section>
      )}
      {tab === "Alunos" && (
        <>
          <div className="admin-section-title">
            <h2>Autorizar acesso a um curso</h2>
          </div>
          <form
            className="enrollment-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void save("enrollments", {
                user_id: f.get("user_id"),
                course_id: f.get("course_id"),
              });
            }}
          >
            <select name="user_id" aria-label="Aluno" required>
              <option value="">Selecione o aluno</option>
              {data.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name || p.id}
                </option>
              ))}
            </select>
            <select name="course_id" aria-label="Curso" required>
              <option value="">Selecione o curso</option>
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <Button disabled={busy}>
              <Plus /> Autorizar
            </Button>
          </form>
          <div className="admin-section-title student-directory-heading">
            <h2>Alunos e administradores</h2>
            <span>Clique com o botão direito em um cadastro para ver as ações.</span>
          </div>
          <p className="member-master-warning">
            <ShieldCheck aria-hidden="true" /> Administradores são master: podem alterar contas e
            gerenciar todo o painel. Promova apenas pessoas de confiança.
          </p>
          {memberDirectory.isPending && <p role="status">Carregando cadastros…</p>}
          {memberDirectory.isError && (
            <div className="admin-row">
              <p>Não foi possível carregar os cadastros.</p>
              <Button variant="outline" onClick={() => void memberDirectory.refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}
          {members.map((member) => (
            <div
              className="student-row"
              key={member.id}
              onContextMenu={(event) => {
                event.preventDefault();
                openMemberMenu(member.id, event.clientX, event.clientY);
              }}
            >
              <div className="student-row-heading">
                <div className="student-row-identity">
                  <h3>{member.display_name || "Aluno sem nome"}</h3>
                  <p>{member.email || "Email indisponível"}</p>
                  <p className="text-muted-foreground">
                    Cadastro em {new Date(member.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Ações do cadastro"
                  aria-label={`Ações para ${member.display_name || member.email}`}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    openMemberMenu(member.id, rect.right - 220, rect.bottom + 5);
                  }}
                >
                  <MoreHorizontal />
                </Button>
              </div>
              <span className={member.isAdmin ? "member-role-pill is-admin" : "member-role-pill"}>
                {member.isAdmin && <ShieldCheck aria-hidden="true" />}
                {member.isAdmin ? "Administrador master" : "Aluno"}
              </span>
              {data.enrollments
                .filter((e) => e.user_id === member.id)
                .map((e) => (
                  <div className="admin-row compact" key={e.id}>
                    <BookOpen />
                    <strong>{data.courses.find((c) => c.id === e.course_id)?.title}</strong>
                    <Button
                      className="ml-auto"
                      variant="ghost"
                      size="icon"
                      title="Revogar acesso"
                      onClick={() => remove("enrollments", e.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
            </div>
          ))}
          {memberMenu &&
            (() => {
              const member = members.find((item) => item.id === memberMenu.id);
              if (!member) return null;
              return (
                <div className="member-context-layer">
                  <button
                    className="member-context-dismiss"
                    type="button"
                    aria-label="Fechar ações do cadastro"
                    onClick={() => setMemberMenu(null)}
                  />
                  <div
                    ref={memberMenuRef}
                    className="member-context-menu"
                    role="group"
                    aria-label={`Ações para ${member.display_name || member.email}`}
                    style={{ left: memberMenu.x, top: memberMenu.y }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setMemberMenu(null);
                    }}
                  >
                    <strong>{member.display_name || member.email}</strong>
                    {!member.isAdmin ? (
                      <button type="button" onClick={() => void actOnMember("promote", member)}>
                        <ShieldCheck aria-hidden="true" /> Promover a admin master
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={member.id === data.userId || busy}
                        onClick={() => void actOnMember("demote", member)}
                      >
                        <Users aria-hidden="true" /> Rebaixar para aluno
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMemberMenu(null);
                        setMemberEdit(member);
                      }}
                    >
                      <Pencil aria-hidden="true" /> Editar cadastro
                    </button>
                    <button
                      className="is-destructive"
                      type="button"
                      disabled={member.id === data.userId || busy}
                      onClick={() => void actOnMember("delete", member)}
                    >
                      <Trash2 aria-hidden="true" /> Excluir conta
                    </button>
                  </div>
                </div>
              );
            })()}
        </>
      )}
      {tab === "Conteúdo do site" && (
        <>
          <form
            className="site-edit-form stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save("site_settings", {
                key: "home",
                value: {
                  ...draft,
                  gallery_items: home.gallery_items ?? draft.gallery_items,
                  ...(home.ambient_music ? { ambient_music: home.ambient_music } : {}),
                },
              });
            }}
          >
            <h2>Home e especialista</h2>
            <label>
              Chamada principal
              <Textarea
                value={draft.headline ?? ""}
                onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
              />
            </label>
            <label>
              Texto complementar
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </label>
            <label>
              Texto do botão principal
              <Input
                value={draft.cta ?? ""}
                onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
              />
            </label>
            <label>
              Biografia oficial de Warley Jean
              <Textarea
                rows={5}
                value={draft.bio ?? ""}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              />
            </label>
            <label>
              Link de checkout HTTPS
              <Input
                type="url"
                value={draft.checkout_url ?? ""}
                placeholder="https://"
                onChange={(e) => setDraft({ ...draft, checkout_url: e.target.value })}
              />
            </label>
            {(["hero_resource_id", "portrait_resource_id"] as const).map((field, i) => (
              <label key={field}>
                {i === 0 ? "Imagem principal" : "Foto do especialista"}
                <select
                  value={draft[field] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                >
                  <option value="">Imagem atual do perfil oficial</option>
                  {data.resources
                    .filter((r) => r.is_public && r.mime_type.startsWith("image"))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
                {draft[field] && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => preview(String(draft[field]))}
                  >
                    Pré-visualizar imagem
                  </Button>
                )}
              </label>
            ))}
            <h2>Perguntas frequentes</h2>
            {(draft.faq ?? []).map((f, i) => (
              <div className="faq-editor" key={i}>
                <Input
                  aria-label={`Pergunta ${i + 1}`}
                  value={f.question}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      faq: (draft.faq ?? []).map((v, j) =>
                        j === i ? { ...v, question: e.target.value } : v,
                      ),
                    })
                  }
                />
                <Textarea
                  aria-label={`Resposta ${i + 1}`}
                  value={f.answer}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      faq: (draft.faq ?? []).map((v, j) =>
                        j === i ? { ...v, answer: e.target.value } : v,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Excluir pergunta"
                  onClick={() =>
                    setDraft({ ...draft, faq: (draft.faq ?? []).filter((_, j) => j !== i) })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDraft({ ...draft, faq: [...(draft.faq ?? []), { question: "", answer: "" }] })
              }
            >
              <Plus /> Adicionar pergunta
            </Button>
            <Button disabled={busy}>
              <Save /> {busy ? "Salvando…" : "Publicar alterações"}
            </Button>
          </form>
          <div className="admin-section-title">
            <h2>Depoimentos reais</h2>
            <Button
              variant="outline"
              onClick={() => setEdit({ table: "testimonials", values: {} })}
            >
              <Plus /> Adicionar depoimento
            </Button>
          </div>
          {data.testimonials.map((t) => (
            <div className="admin-row" key={t.id}>
              <div>
                <h3>{t.name}</h3>
                <p>{t.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                title="Editar depoimento"
                onClick={() => setEdit({ table: "testimonials", id: t.id, values: t })}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Excluir depoimento"
                onClick={() => remove("testimonials", t.id)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </>
      )}
      {tab === "Configurações" && (
        <section className="site-edit-form user-invite-settings">
          <div className="admin-row member-settings-shortcut">
            <div>
              <h3>Contas já cadastradas</h3>
              <p>Gerencie alunos e administradores existentes.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setTab("Alunos")}>
              <Users /> Gerenciar contas
            </Button>
          </div>
          <div className="admin-section-title">
            <h2>Criar usuário</h2>
          </div>
          <p className="text-muted-foreground">
            Envie um convite por e-mail. A pessoa criará a própria senha ao aceitar.
          </p>
          <form
            className="stack-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const values = new FormData(form);
              setBusy(true);
              try {
                const result = await inviteUser({
                  data: {
                    email: String(values.get("email") ?? ""),
                    displayName: String(values.get("display_name") ?? ""),
                    role: values.get("role") === "admin" ? "admin" : "student",
                  },
                });
                toast.success(
                  result.role === "admin"
                    ? "Convite de administrador enviado por e-mail."
                    : "Convite de aluno enviado por e-mail.",
                );
                form.reset();
                await refresh();
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Não foi possível criar o usuário.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Nome
              <Input name="display_name" required maxLength={100} autoComplete="name" />
            </label>
            <label>
              E-mail
              <Input name="email" type="email" required maxLength={254} autoComplete="email" />
            </label>
            <label>
              Tipo de usuário
              <select name="role" defaultValue="student" required>
                <option value="student">Aluno</option>
                <option value="admin">Administrador master</option>
              </select>
            </label>
            <Button disabled={busy}>
              <UserPlus /> {busy ? "Enviando convite…" : "Criar e enviar convite"}
            </Button>
          </form>
        </section>
      )}
      <Dialog
        open={!!edit}
        onOpenChange={(open) => {
          if (!open) setEdit(null);
        }}
      >
        <DialogContent className="editor-dialog">
          <DialogHeader>
            <DialogTitle>
              {edit?.id ? "Editar" : "Adicionar"}{" "}
              {edit?.table === "courses"
                ? "curso"
                : edit?.table === "modules"
                  ? "módulo"
                  : edit?.table === "lessons"
                    ? "aula"
                    : edit?.table === "resources"
                      ? "material"
                      : "depoimento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editSubmit} className="stack-form">
            <label>
              {edit?.table === "testimonials"
                ? "Nome do aluno"
                : edit?.table === "resources"
                  ? "Nome do arquivo"
                  : "Título"}
              <Input
                name={
                  edit?.table === "resources" || edit?.table === "testimonials" ? "name" : "title"
                }
                defaultValue={editValue(
                  edit?.table === "resources" || edit?.table === "testimonials" ? "name" : "title",
                )}
                required
              />
            </label>
            {edit?.table !== "resources" && (
              <label>
                {edit?.table === "testimonials" ? "Depoimento" : "Descrição"}
                <Textarea
                  name={edit?.table === "testimonials" ? "content" : "description"}
                  defaultValue={editValue(
                    edit?.table === "testimonials" ? "content" : "description",
                  )}
                />
              </label>
            )}
            {edit?.table === "courses" && (
              <>
                <label>
                  Preço (R$)
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editValue("price")}
                    required
                  />
                </label>
                <label>
                  URL da capa
                  <Input name="cover_url" type="url" defaultValue={editValue("cover_url")} />
                </label>
              </>
            )}
            {edit?.table === "modules" && (
              <label>
                Curso
                <select name="course_id" defaultValue={editValue("course_id")} required>
                  {data.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {edit?.table === "lessons" && (
              <>
                <label>
                  Módulo
                  <select name="module_id" defaultValue={editValue("module_id")} required>
                    <option value="">Selecione um módulo</option>
                    {data.modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Link externo do vídeo (YouTube / Vimeo)
                  <Input name="video_url" type="url" defaultValue={editValue("video_url")} />
                </label>
                <label>
                  Vídeo enviado à biblioteca
                  <select name="video_path" defaultValue={editValue("video_path")}>
                    <option value="">Sem vídeo da biblioteca</option>
                    {data.resources
                      .filter((r) => r.mime_type.startsWith("video"))
                      .map((r) => (
                        <option key={r.id} value={r.path}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </label>
              </>
            )}
            {["modules", "lessons"].includes(edit?.table ?? "") && (
              <label>
                Ordem de exibição
                <Input name="position" type="number" min="0" defaultValue={editValue("position")} />
              </label>
            )}
            {edit?.table === "resources" && (
              <>
                <label>
                  Categoria
                  <select name="category" defaultValue={editValue("category")}>
                    {mediaCategories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Curso
                  <select name="course_id" defaultValue={editValue("course_id")}>
                    <option value="">Sem associação</option>
                    {data.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Aula
                  <select name="lesson_id" defaultValue={editValue("lesson_id")}>
                    <option value="">Sem associação</option>
                    {data.lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {["courses", "lessons", "testimonials"].includes(edit?.table ?? "") && (
              <label className="checkbox-label">
                <input
                  name="published"
                  type="checkbox"
                  defaultChecked={edit?.values["published"] === true}
                />{" "}
                Publicar
              </label>
            )}
            <Button disabled={busy}>
              <Save /> {busy ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!memberEdit}
        onOpenChange={(open) => {
          if (!open) setMemberEdit(null);
        }}
      >
        <DialogContent className="editor-dialog">
          <DialogHeader>
            <DialogTitle>Editar cadastro do aluno</DialogTitle>
          </DialogHeader>
          {memberEdit && (
            <form className="stack-form" onSubmit={saveMemberEdit}>
              <label>
                Nome de exibição
                <Input
                  name="display_name"
                  defaultValue={memberEdit.display_name}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Email de acesso
                <Input
                  name="email"
                  type="email"
                  defaultValue={memberEdit.email}
                  maxLength={254}
                  required
                />
              </label>
              <p className="member-edit-note">
                A alteração de email pode exigir confirmação pelo novo endereço.
              </p>
              <Button disabled={busy}>
                <Save /> {busy ? "Salvando…" : "Salvar cadastro"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Workspace>
  );
}
