import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardList,
  ChartNoAxesCombined,
  Boxes,
  Users,
  BookOpen,
  FileSpreadsheet,
  Play,
  Instagram,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { PublicLayout } from "./public-layout";
import { publicOptions, money, safeCheckout, type HomeSettings } from "./content";
import barAsset from "@/assets/warley-bar.jpg.asset.json";
import cocktailAsset from "@/assets/coquetel-warley.jpg.asset.json";
const skills = [
  {
    icon: ClipboardList,
    title: "Operação organizada",
    text: "Rotinas, mise en place e processos que fazem o bar funcionar.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Números sob controle",
    text: "Fichas técnicas, CMV e precificação para decisões conscientes.",
  },
  {
    icon: Boxes,
    title: "Menos perdas. Mais resultado.",
    text: "Estoque, padronização e controle de desperdícios.",
  },
  {
    icon: Users,
    title: "Uma equipe alinhada",
    text: "Gestão de pessoas e uma operação consistente, do início ao fim.",
  },
];
function useContent() {
  const { data } = useSuspenseQuery(publicOptions);
  const settings = (data.settings.find((s) => s.key === "home")?.value ?? {}) as HomeSettings;
  return { data, settings, course: data.courses[0] };
}
function Purchase({
  checkout,
  label = "Quero profissionalizar meu bar",
}: {
  checkout?: string;
  label?: string;
}) {
  const url = safeCheckout(checkout);
  return url ? (
    <Button asChild size="lg">
      <a href={url} target="_blank" rel="noreferrer">
        {label}
        <ArrowUpRight />
      </a>
    </Button>
  ) : (
    <>
      <Button asChild size="lg">
        <a href="https://www.instagram.com/warley.bartender/" target="_blank" rel="noreferrer">
          Consultar inscrição <ArrowUpRight />
        </a>
      </Button>
      <small className="purchase-note">Inscrições e liberação de acesso com a equipe.</small>
    </>
  );
}
function FAQ() {
  const { settings } = useContent();
  return (
    <section className="section faq-section">
      <div>
        <span className="eyebrow">ANTES DE DAR O PRÓXIMO PASSO</span>
        <h2>
          Suas dúvidas.
          <br />
          Respostas diretas.
        </h2>
      </div>
      <Accordion type="single" collapsible>
        {settings.faq?.map((f, i) => (
          <AccordionItem key={i} value={String(i)}>
            <AccordionTrigger>{f.question}</AccordionTrigger>
            <AccordionContent>{f.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
function Modules() {
  const { data, course } = useContent();
  return (
    <div className="module-list">
      {data.modules
        .filter((m) => m.course_id === course?.id)
        .map((m, i) => (
          <div className="module-row" key={m.id}>
            <span className="module-number">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3>{m.title}</h3>
              <p>{m.description}</p>
            </div>
            <Plus />
          </div>
        ))}
    </div>
  );
}
function Expert() {
  const { data, settings } = useContent();
  return (
    <section className="section expert-section">
      <div className="expert-image">
        <img
          src={data.images["portrait_resource_id"] || barAsset.url}
          alt="Registro publicado no perfil oficial de Warley Jean, trabalhando no bar"
          loading="lazy"
        />
        <span className="image-caption">DO BALCÃO. DA PRÁTICA. PARA VOCÊ.</span>
      </div>
      <div>
        <span className="eyebrow">QUEM ESTÁ À FRENTE</span>
        <h2>
          Warley Jean
          <span className="serif-line">
            Conhecimento que
            <br />
            vem da operação.
          </span>
        </h2>
        <p className="expert-role">
          Especialista em Coquetelaria,
          <br />
          Gestão e Operações de Bar.
        </p>
        <p>
          {settings.bio ||
            "O BAR PROFISSIONAL nasce para conectar o conhecimento de balcão aos processos de uma gestão profissional. Organização, conhecimento técnico e uma visão completa do negócio."}
        </p>
        <Button asChild variant="outline">
          <Link to="/sobre">
            Conheça Warley Jean <ArrowUpRight />
          </Link>
        </Button>
        <a
          className="instagram-link"
          href="https://www.instagram.com/warley.bartender/"
          target="_blank"
          rel="noreferrer"
        >
          <Instagram /> @warley.bartender
        </a>
      </div>
    </section>
  );
}
export function HomePage() {
  const { data, settings, course } = useContent();
  return (
    <PublicLayout>
      <section className="hero">
        <img
          className="hero-photo"
          src={data.images["hero_resource_id"] || barAsset.url}
          alt="Bar profissional em registro do Instagram oficial de Warley Jean"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow">
            <span className="small-line" /> FORMAÇÃO EM COQUETELARIA & GESTÃO
          </span>
          <h1>
            BAR
            <br />
            PROFISSIONAL<span>DO BALCÃO À GESTÃO.</span>
          </h1>
          <h2>
            {settings.headline?.split("\n").map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </h2>
          <p>{settings.description}</p>
          <div className="hero-buttons">
            <Button asChild size="lg">
              <Link to="/treinamento">
                {settings.cta || "Quero profissionalizar meu bar"}
                <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/treinamento">
                <span className="play-circle">
                  <Play />
                </span>{" "}
                Conheça o treinamento
              </Link>
            </Button>
          </div>
          <div className="hero-detail">
            <span>COM WARLEY JEAN</span>
            <span>CONHECIMENTO PRÁTICO. VISÃO DE NEGÓCIO.</span>
          </div>
        </div>
        <div className="hero-side-label">UM NOVO NÍVEL PARA A SUA OPERAÇÃO</div>
        <a className="hero-scroll" href="#conhecimento">
          EXPLORE <ArrowRight />
        </a>
      </section>
      <div className="discipline-strip">
        <span>COQUETELARIA</span>
        <span className="strip-cross">+</span>
        <span>OPERAÇÃO</span>
        <span className="strip-cross">+</span>
        <span>GESTÃO</span>
        <span className="strip-cross">=</span>
        <span className="text-primary">BAR PROFISSIONAL</span>
      </div>
      <section className="section" id="conhecimento">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MUITO ALÉM DAS RECEITAS</span>
            <h2>
              Um bom drink é só o começo.
              <br />
              <span className="serif-line">Um bar profissional vai além.</span>
            </h2>
          </div>
          <p>
            Transforme técnica em processo.
            <br />E processo em uma operação mais
            <br />
            organizada, consistente e rentável.
          </p>
        </div>
        <div className="skills-grid">
          {skills.map((s, i) => (
            <article key={s.title} className="skill">
              <div className="skill-top">
                <s.icon />
                <span>0{i + 1}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="training-band">
        <div className="section training-grid">
          <div>
            <span className="eyebrow">O TREINAMENTO</span>
            <h2>
              Do balcão
              <br />
              <span className="serif-line">à gestão.</span>
            </h2>
            <p>
              Uma formação para quem quer dominar a operação, entender seus números e evoluir
              profissionalmente.
            </p>
            <div className="training-features">
              <span>
                <BookOpen /> Conteúdo em módulos
              </span>
              <span>
                <FileSpreadsheet /> Materiais complementares
              </span>
              <span>
                <ShieldCheck /> Área exclusiva do aluno
              </span>
            </div>
            <div className="price-line">
              <span>INVESTIMENTO</span>
              <strong>{money(Number(course?.price ?? 97))}</strong>
            </div>
            <Button asChild size="lg">
              <Link to="/treinamento">
                Conhecer o treinamento <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <Modules />
        </div>
      </section>
      <Expert />
      <section className="section tools-section">
        <div>
          <span className="eyebrow">DA AULA PARA O SEU BAR</span>
          <h2>
            Conhecimento que
            <br />
            <span className="serif-line">vira ferramenta.</span>
          </h2>
          <p>
            Fichas técnicas, planilhas e materiais de apoio para acompanhar a sua evolução e colocar
            os processos em prática.
          </p>
          <Button asChild variant="outline">
            <Link to="/treinamento">
              Ver conteúdo do treinamento <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="tools-visual">
          <img
            src={cocktailAsset.url}
            alt="Coquetel publicado no Instagram oficial de Warley Jean"
            loading="lazy"
          />
          <div className="tools-label">
            <FileSpreadsheet />
            <div>
              <strong>Técnica encontra gestão.</strong>
              <span>DO BALCÃO À GESTÃO.</span>
            </div>
          </div>
        </div>
      </section>
      {data.testimonials.length > 0 && (
        <section className="section">
          <span className="eyebrow">QUEM APRENDE, CONTA</span>
          <h2>Experiências reais.</h2>
          <div className="skills-grid">
            {data.testimonials.map((t) => (
              <article className="skill" key={t.id}>
                <p>“{t.content}”</p>
                <strong>{t.name}</strong>
              </article>
            ))}
          </div>
        </section>
      )}
      <FAQ />
      <section className="closing-band">
        <span className="eyebrow">O PRÓXIMO PASSO É SEU</span>
        <h2>Profissionalize seu bar.</h2>
        <p>Conhecimento de balcão. Mentalidade de gestão.</p>
        <Button asChild size="lg">
          <Link to="/treinamento">
            Quero dar o próximo passo <ArrowUpRight />
          </Link>
        </Button>
      </section>
    </PublicLayout>
  );
}
export function TrainingPage() {
  const { settings, course } = useContent();
  return (
    <PublicLayout>
      <section className="section training-page">
        <span className="eyebrow">FORMAÇÃO PROFISSIONAL • COM WARLEY JEAN</span>
        <h1>
          BAR PROFISSIONAL<span className="serif-line">Do balcão à gestão.</span>
        </h1>
        <p className="lead">{course?.description}</p>
        <div className="course-detail-grid">
          <div>
            <h2>O que você vai aprender</h2>
            <Modules />
            <h2 className="mt-12">Conteúdo que acompanha a prática.</h2>
            <ul className="benefit-list">
              {[
                "Organização e padronização operacional",
                "Fichas técnicas, CMV e precificação",
                "Controle de estoque e de perdas",
                "Gestão de equipe e rentabilidade",
                "Materiais complementares por aula",
              ].map((t) => (
                <li key={t}>
                  <Check />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <aside className="purchase-panel">
            <img
              src={course?.cover_url || cocktailAsset.url}
              alt="Capa do treinamento BAR PROFISSIONAL"
            />
            <div>
              <span className="eyebrow">BAR PROFISSIONAL</span>
              <h3>Do balcão à gestão.</h3>
              <strong className="purchase-price">{money(Number(course?.price ?? 97))}</strong>
              <Purchase
                checkout={settings.checkout_url ?? ""}
                label={settings.cta ?? "Quero profissionalizar meu bar"}
              />
              <ul className="benefit-list">
                <li>
                  <Check /> Aulas organizadas por módulo
                </li>
                <li>
                  <Check /> Materiais de apoio
                </li>
                <li>
                  <Check /> Seu progresso em um só lugar
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
      <Expert />
      <FAQ />
    </PublicLayout>
  );
}
export function AboutPage() {
  const { settings, data } = useContent();
  return (
    <PublicLayout>
      <section className="section about-page">
        <span className="eyebrow">DO BALCÃO À GESTÃO.</span>
        <h1>Warley Jean</h1>
        <div className="about-grid">
          <img
            src={data.images["portrait_resource_id"] || barAsset.url}
            alt="Registro do perfil oficial de Warley no bar"
          />
          <div>
            <h2>
              Coquetelaria.
              <br />
              Gestão.
              <br />
              <span className="serif-line">Operação de verdade.</span>
            </h2>
            <p className="lead">Especialista em Coquetelaria, Gestão e Operações de Bar.</p>
            {settings.bio && <p>{settings.bio}</p>}
            <p>
              O BAR PROFISSIONAL conecta o conhecimento técnico à organização, aos processos e à
              visão de negócio de uma operação profissional.
            </p>
            <Button asChild variant="outline">
              <a
                href="https://www.instagram.com/warley.bartender/"
                target="_blank"
                rel="noreferrer"
              >
                <Instagram /> Acompanhe o trabalho de Warley <ArrowUpRight />
              </a>
            </Button>
          </div>
        </div>
      </section>
      <section className="closing-band">
        <h2>Do conhecimento à prática.</h2>
        <Button asChild size="lg">
          <Link to="/treinamento">
            Conheça o treinamento <ArrowRight />
          </Link>
        </Button>
      </section>
    </PublicLayout>
  );
}
