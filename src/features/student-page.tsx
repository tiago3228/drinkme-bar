import { useState, type FormEvent } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Play, CheckCircle2, Download, ArrowLeft, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { memberOptions } from "./content";
import { mediaUrl, saveProfile, saveProgress, lessonVideoUrl } from "./platform.functions";
import { Workspace } from "./workspace";
function embedUrl(url: string) {
  try {
    const u = new URL(url);
    if (["www.youtube.com", "youtube.com"].includes(u.hostname)) {
      const id = u.searchParams.get("v");
      if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (u.hostname === "youtu.be" && /^[\w-]{11}$/.test(u.pathname.slice(1)))
      return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (["vimeo.com", "www.vimeo.com"].includes(u.hostname) && /^\/\d+$/.test(u.pathname))
      return `https://player.vimeo.com/video${u.pathname}`;
  } catch {}
  return "";
}
export function StudentPage() {
  const { data } = useSuspenseQuery(memberOptions);
  const [tab, setTab] = useState("Meus cursos");
  const [courseId, setCourseId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [video, setVideo] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const urlFn = useServerFn(mediaUrl);
  const videoFn = useServerFn(lessonVideoUrl);
  const progressFn = useServerFn(saveProgress);
  const profileFn = useServerFn(saveProfile);
  const courses = data.courses.filter(
    (c) =>
      data.isAdmin ||
      data.enrollments.some((e) => e.user_id === data.userId && e.course_id === c.id),
  );
  const lesson = data.lessons.find((l) => l.id === lessonId);
  const completed = data.progress.filter((p) => p.user_id === data.userId && p.completed);
  const selected = courses.find((c) => c.id === courseId);
  const modules = data.modules.filter((m) => m.course_id === courseId);
  const lessons = data.lessons.filter((l) => modules.some((m) => m.id === l.module_id));
  async function selectLesson(id: string) {
    setLessonId(id);
    setVideo("");
    const l = data.lessons.find((v) => v.id === id);
    try {
      setVideo(await videoFn({ data: { lessonId: id } }));
    } catch {
      if (l?.video_path) toast.error("Vídeo indisponível.");
    }
  }
  async function download(id: string) {
    try {
      const url = await urlFn({ data: { id } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Material indisponível.");
    }
  }
  async function updateProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const f = new FormData(e.currentTarget);
      await profileFn({ data: { display_name: String(f.get("display_name")) } });
      await qc.invalidateQueries({ queryKey: ["member-content"] });
      toast.success("Perfil atualizado.");
    } catch {
      toast.error("Não foi possível salvar.");
    }
    setBusy(false);
  }
  return (
    <Workspace
      admin={false}
      active={tab}
      onTab={(v) => {
        setTab(v);
        setCourseId("");
        setLessonId("");
      }}
    >
      <div className="workspace-title">
        <div>
          <span className="eyebrow">SUA FORMAÇÃO</span>
          <h1>
            {tab === "Meus cursos"
              ? `Olá, ${data.profiles.find((p) => p.id === data.userId)?.display_name || "profissional"}.`
              : tab}
          </h1>
        </div>
        {data.isAdmin && (
          <Button variant="outline" asChild>
            <a href="/admin">Administração</a>
          </Button>
        )}
      </div>
      {tab === "Meu perfil" ? (
        <form className="stack-form profile-form" onSubmit={updateProfile}>
          <label>
            Seu nome
            <Input
              name="display_name"
              required
              defaultValue={data.profiles.find((p) => p.id === data.userId)?.display_name}
            />
          </label>
          <Button disabled={busy}>{busy ? "Salvando…" : "Salvar perfil"}</Button>
        </form>
      ) : tab === "Histórico" ? (
        <>
          <h2>Aulas concluídas</h2>
          {completed.map((p) => (
            <div className="admin-row" key={p.lesson_id}>
              <CheckCircle2 />
              <div>
                <strong>{data.lessons.find((l) => l.id === p.lesson_id)?.title || "Aula"}</strong>
                <p>{new Date(p.updated_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))}
          {!completed.length && (
            <div className="empty-state">
              <BookOpen />
              <h3>Seu percurso começa com a primeira aula.</h3>
            </div>
          )}
        </>
      ) : selected ? (
        <>
          <Button
            variant="ghost"
            onClick={() => {
              setCourseId("");
              setLessonId("");
            }}
          >
            <ArrowLeft /> Meus cursos
          </Button>
          <h2 className="mt-6 mb-6">{selected.title}</h2>
          <div className="learning-grid">
            <div>
              {lesson ? (
                <>
                  <div className="video-frame">
                    {video ? (
                      <video src={video} controls playsInline />
                    ) : lesson.video_url && embedUrl(lesson.video_url) ? (
                      <iframe
                        title={lesson.title}
                        src={embedUrl(lesson.video_url)}
                        allow="fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="video-empty">
                        <Play />
                        <p>O vídeo desta aula ainda não foi disponibilizado.</p>
                      </div>
                    )}
                  </div>
                  <div className="lesson-heading">
                    <h2>{lesson.title}</h2>
                    <Button
                      variant={
                        completed.some((p) => p.lesson_id === lesson.id) ? "secondary" : "default"
                      }
                      onClick={async () => {
                        try {
                          await progressFn({
                            data: {
                              lessonId: lesson.id,
                              completed: !completed.some((p) => p.lesson_id === lesson.id),
                            },
                          });
                          await qc.invalidateQueries({ queryKey: ["member-content"] });
                        } catch {
                          toast.error("Não foi possível salvar seu progresso.");
                        }
                      }}
                    >
                      <CheckCircle2 />
                      {completed.some((p) => p.lesson_id === lesson.id)
                        ? "Concluída"
                        : "Concluir aula"}
                    </Button>
                  </div>
                  <p className="lesson-description">{lesson.description}</p>
                  <h3 className="mt-8">Materiais complementares</h3>
                  {data.resources
                    .filter(
                      (r) =>
                        r.lesson_id === lesson.id ||
                        r.module_id === lesson.module_id ||
                        r.course_id === courseId,
                    )
                    .map((r) => (
                      <div className="admin-row" key={r.id}>
                        <BookOpen />
                        <strong>{r.name}</strong>
                        <Button
                          className="ml-auto"
                          variant="outline"
                          size="sm"
                          onClick={() => download(r.id)}
                        >
                          <Download /> Abrir material
                        </Button>
                      </div>
                    ))}
                </>
              ) : (
                <div className="empty-state">
                  <BookOpen />
                  <h3>
                    {lessons.length
                      ? "Escolha uma aula para começar."
                      : "As aulas serão disponibilizadas em breve."}
                  </h3>
                </div>
              )}
            </div>
            <aside className="lesson-sidebar">
              <span className="eyebrow">CONTEÚDO DO CURSO</span>
              {modules.map((m) => (
                <div key={m.id}>
                  <h3>
                    {m.position.toString().padStart(2, "0")} {m.title}
                  </h3>
                  {data.lessons
                    .filter((l) => l.module_id === m.id)
                    .map((l) => (
                      <Button
                        key={l.id}
                        variant={l.id === lessonId ? "secondary" : "ghost"}
                        onClick={() => selectLesson(l.id)}
                      >
                        {completed.some((p) => p.lesson_id === l.id) ? <CheckCircle2 /> : <Play />}
                        {l.title}
                      </Button>
                    ))}
                </div>
              ))}
            </aside>
          </div>
        </>
      ) : (
        <>
          <p className="text-muted-foreground mb-8">
            Conhecimento de balcão. Mentalidade de gestão.
          </p>
          <div className="student-courses">
            {courses.map((c) => {
              const ls = data.lessons.filter((l) =>
                data.modules.some((m) => m.id === l.module_id && m.course_id === c.id),
              );
              const count = ls.filter((l) => completed.some((p) => p.lesson_id === l.id)).length;
              return (
                <article className="student-course" key={c.id}>
                  <div className="student-course-icon">
                    <BookOpen />
                  </div>
                  <span className="eyebrow">SEU TREINAMENTO</span>
                  <h2>{c.title}</h2>
                  <p>{c.description}</p>
                  <progress value={count} max={ls.length || 1} />
                  <small>
                    {count} de {ls.length} aulas concluídas
                  </small>
                  <Button onClick={() => setCourseId(c.id)}>
                    Acessar curso <Play />
                  </Button>
                </article>
              );
            })}
          </div>
          {!courses.length && (
            <div className="empty-state">
              <LockKeyhole />
              <h2>Seu próximo passo está aqui.</h2>
              <p>
                Você ainda não possui cursos autorizados. Após a inscrição, a equipe liberará o
                acesso na sua conta.
              </p>
              <Button asChild>
                <a href="/treinamento">Conhecer o treinamento</a>
              </Button>
            </div>
          )}
        </>
      )}
    </Workspace>
  );
}
