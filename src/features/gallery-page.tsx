import { ArrowUpRight, Martini } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { publicOptions } from "./content";
import { PublicLayout } from "./public-layout";

export function GalleryPage() {
  const { data } = useSuspenseQuery(publicOptions);
  return (
    <PublicLayout>
      <section className="gallery-hero section">
        <span className="eyebrow">
          <span className="small-line" /> COQUETELARIA EM IMAGENS
        </span>
        <h1>
          Galeria <span className="serif-line">de drinks</span>
        </h1>
        <p>Inspiração, técnica e personalidade em cada criação servida no balcão.</p>
      </section>
      {data.gallery.length ? (
        <section className="gallery-public-grid section" aria-label="Fotos de drinks">
          {data.gallery.map((item, index) => (
            <article className="gallery-public-card" key={item.resource_id}>
              <div className="gallery-public-image-wrap">
                <img src={item.imageUrl} alt={item.title} loading={index < 2 ? "eager" : "lazy"} />
                <span className="gallery-public-index">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="gallery-public-caption">
                <span className="eyebrow">DRINK BAR PROFISSIONAL</span>
                <h2>{item.title}</h2>
                {item.description && <p>{item.description}</p>}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="gallery-empty section">
          <Martini aria-hidden="true" />
          <h2>Novas criações em breve.</h2>
          <p>
            Estamos preparando uma seleção de drinks e técnicas para inspirar o seu próximo serviço.
          </p>
        </section>
      )}
      <section className="gallery-training-cta">
        <div>
          <span className="eyebrow">TRANSFORME INSPIRAÇÃO EM TÉCNICA</span>
          <h2>Domine o balcão. Profissionalize a operação.</h2>
        </div>
        <Button asChild>
          <Link to="/treinamento">
            Conheça o treinamento <ArrowUpRight />
          </Link>
        </Button>
      </section>
    </PublicLayout>
  );
}
