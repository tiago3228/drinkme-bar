import { useState, type FormEvent } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  LockKeyhole,
  Play,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { memberOptions } from "./content";
import { mediaUrl, saveProfile, saveProgress, lessonVideoUrl } from "./platform.functions";
import { Workspace } from "./workspace";
import { useAmbientMusic } from "./ambient-music.context";
import { CommunityPage } from "./community-page";

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
  } catch {
    return "";
  }
  return "";
}

function courseCoverUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

export function StudentPage() {
  const { data } = useSuspenseQuery(memberOptions);
  const [tab, setTab] = useState("Meus cursos");
  const [courseId, setCourseId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [video, setVideo] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const urlFn = useServerFn(mediaUrl);
  const videoFn = useServerFn(lessonVideoUrl);
  const progressFn = useServerFn(saveProgress);
  const profileFn = useServerFn(saveProfile);
  const muteAmbientMusic = useAmbientMusic();
  const courses = data.courses.filter(
    (c) =>
      data.isAdmin ||
      data.enrollments.some((e) => e.user_id === data.userId && e.course_id === c.id),
  );
  const completed = data.progress.filter((p) => p.user_id === data.userId && p.completed);
  const profile = data.profiles.find((p) => p.id === data.userId);
  const userName = profile?.display_name || "profissional";
  const metricsFor = (id: string) => {
    const moduleIds = new Set(data.modules.filter((m) => m.course_id === id).map((m) => m.id));
    const courseLessons = data.lessons.filter((l) => moduleIds.has(l.module_id));
    const finished = courseLessons.filter((l) =>
      completed.some((p) => p.lesson_id === l.id),
    ).length;
    return {
      total: courseLessons.length,
      completed: finished,
      percentage: courseLessons.length ? Math.round((finished / courseLessons.length) * 100) : 0,
    };
  };
  const filteredCourses = courses.filter((c) =>
    `${c.title} ${c.description}`
      .toLocaleLowerCase("pt-BR")
      .includes(courseSearch.trim().toLocaleLowerCase("pt-BR")),
  );
  const featuredCourse = filteredCourses[0];
  const featuredMetrics = featuredCourse ? metricsFor(featuredCourse.id) : undefined;
  const lesson = data.lessons.find((l) => l.id === lessonId);
  const selected = courses.find((c) => c.id === courseId);
  const modules = data.modules.filter((m) => m.course_id === courseId);
  const lessons = data.lessons.filter((l) => modules.some((m) => m.id === l.module_id));
  const selectedMetrics = selected ? metricsFor(selected.id) : undefined;
  const nextLesson =
    lessons.find((l) => !completed.some((p) => p.lesson_id === l.id)) ?? lessons[0];

  function openCourse(id: string) {
    setCourseId(id);
    setLessonId("");
    setVideo("");
  }

  async function selectLesson(id: string) {
    muteAmbientMusic();
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
        setVideo("");
      }}
    >
      <div className="workspace-title">
        <div>
          <span className="eyebrow">SUA FORMAÇÃO</span>
          <h1>{tab === "Meus cursos" ? `Olá, ${userName}.` : tab}</h1>
        </div>
        {data.isAdmin && (
          <Button variant="outline" asChild>
            <a href="/admin">Administração</a>
          </Button>
        )}
      </div>
      {tab === "Comunidade" ? (
        <CommunityPage userId={data.userId} isAdmin={data.isAdmin} />
      ) : tab === "Meu perfil" ? (
        <form className="stack-form profile-form" onSubmit={updateProfile}>
          <label>
            Seu nome
            <Input name="display_name" required defaultValue={profile?.display_name} />
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
              setVideo("");
            }}
          >
            <ArrowLeft /> Todos os cursos
          </Button>
          <section className="student-detail-hero">
            <div className="student-detail-copy">
              <span className="eyebrow">SUA TRILHA DE APRENDIZADO</span>
              <h2>{selected.title}</h2>
              {selected.description && <p>{selected.description}</p>}
              <div className="student-progress-summary">
                <div>
                  <span>Progresso do curso</span>
                  <strong>{selectedMetrics?.percentage ?? 0}%</strong>
                </div>
                <progress
                  value={selectedMetrics?.completed ?? 0}
                  max={selectedMetrics?.total || 1}
                  aria-label="Progresso do curso"
                />
                <small>
                  {selectedMetrics?.completed ?? 0} de {selectedMetrics?.total ?? 0} aulas
                  concluídas
                </small>
              </div>
              <Button
                disabled={!nextLesson}
                onClick={() => nextLesson && selectLesson(nextLesson.id)}
              >
                <Play />
                {selectedMetrics?.completed === selectedMetrics?.total && lessons.length
                  ? "Rever curso"
                  : "Continuar curso"}
              </Button>
            </div>
            <div className="student-detail-art" aria-hidden="true">
              {courseCoverUrl(selected.cover_url) ? (
                <img src={courseCoverUrl(selected.cover_url)} alt="" />
              ) : (
                <BookOpen />
              )}
            </div>
          </section>
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
                      ? "Escolha uma aula na trilha ao lado para começar."
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
          {featuredCourse && featuredMetrics && (
            <section className="student-feature">
              <div className="student-feature-art" aria-hidden="true">
                {courseCoverUrl(featuredCourse.cover_url) ? (
                  <img src={courseCoverUrl(featuredCourse.cover_url)} alt="" />
                ) : (
                  <BookOpen />
                )}
              </div>
              <div className="student-feature-copy">
                <span className="student-feature-kicker">FORMAÇÃO EM DESTAQUE</span>
                <h2>{featuredCourse.title}</h2>
                <p>
                  {featuredCourse.description ||
                    "Acesse sua formação, acompanhe as aulas e avance no seu ritmo."}
                </p>
                <div className="student-feature-progress">
                  <div>
                    <span>
                      {featuredMetrics.completed} de {featuredMetrics.total} aulas concluídas
                    </span>
                    <strong>{featuredMetrics.percentage}%</strong>
                  </div>
                  <progress
                    value={featuredMetrics.completed}
                    max={featuredMetrics.total || 1}
                    aria-label="Progresso do curso em destaque"
                  />
                </div>
                <Button onClick={() => openCourse(featuredCourse.id)}>
                  Ver formação <ArrowRight />
                </Button>
              </div>
            </section>
          )}
          <section className="student-library" aria-label="Biblioteca de cursos">
            <div className="student-library-heading">
              <div>
                <span className="eyebrow">SUA BIBLIOTECA</span>
                <h2>Meus cursos</h2>
                <p>Retome seus estudos e acompanhe seu progresso.</p>
              </div>
              <label className="student-search">
                <Search aria-hidden="true" />
                <Input
                  type="search"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Buscar curso"
                  aria-label="Buscar em meus cursos"
                />
              </label>
            </div>
            {filteredCourses.length ? (
              <div className="student-course-shelf">
                {filteredCourses.map((c) => {
                  const metrics = metricsFor(c.id);
                  const cover = courseCoverUrl(c.cover_url);
                  return (
                    <article className="student-course-tile" key={c.id}>
                      <button
                        type="button"
                        className="student-course-cover"
                        onClick={() => openCourse(c.id)}
                        aria-label={`Abrir o curso ${c.title}`}
                      >
                        {cover ? <img src={cover} alt="" loading="lazy" /> : <BookOpen />}
                        <span className="student-course-cover-label">BAR PROFISSIONAL</span>
                      </button>
                      <div className="student-course-tile-body">
                        <span className="student-course-kicker">SEU TREINAMENTO</span>
                        <h3>{c.title}</h3>
                        <p>{c.description || "Continue sua formação profissional."}</p>
                        <div className="student-course-progress">
                          <progress
                            value={metrics.completed}
                            max={metrics.total || 1}
                            aria-label={`Progresso de ${c.title}`}
                          />
                          <small>
                            {metrics.completed} de {metrics.total} aulas concluídas
                          </small>
                        </div>
                        <Button onClick={() => openCourse(c.id)}>
                          Acessar curso <ArrowRight />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : courses.length ? (
              <div className="empty-state student-search-empty">
                <Search />
                <h3>Nenhum curso encontrado</h3>
                <p>Tente buscar por outro título ou assunto.</p>
              </div>
            ) : (
              <div className="empty-state student-empty-state">
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
          </section>
        </>
      )}
    </Workspace>
  );
}
