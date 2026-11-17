import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, Menu, X, Instagram, Martini, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
export function Brand() {
  return (
    <Link to="/" className="brand">
      <Martini strokeWidth={1.2} />
      <span>
        BAR<span className="brand-second">PROFISSIONAL</span>
      </span>
    </Link>
  );
}
export function PublicLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: user } = useQuery({
    queryKey: ["identity"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className={open ? "site-nav is-open" : "site-nav"}>
            <Link to="/" activeOptions={{ exact: true }} onClick={() => setOpen(false)}>
              Início
            </Link>
            <Link to="/treinamento" onClick={() => setOpen(false)}>
              O treinamento
            </Link>
            <Link to="/galeria" onClick={() => setOpen(false)}>
              Galeria
            </Link>
            <Link to="/sobre" onClick={() => setOpen(false)}>
              Warley Jean
            </Link>
          </nav>
          <div className="header-actions">
            <Button variant="ghost" asChild>
              <Link to={user ? "/aluno" : "/auth"}>
                {user ? "Meus cursos" : "Área do aluno"}
                <ArrowUpRight />
              </Link>
            </Button>
            {user && (
              <Button
                size="icon"
                variant="ghost"
                title="Sair"
                onClick={async () => {
                  await qc.cancelQueries();
                  qc.clear();
                  await supabase.auth.signOut();
                  await nav({ to: "/auth", replace: true });
                }}
              >
                <LogOut />
              </Button>
            )}
            <Button
              className="menu-toggle"
              size="icon"
              variant="ghost"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <Brand />
          <p>DO BALCÃO À GESTÃO.</p>
        </div>
        <div>
          <Link to="/treinamento">O treinamento</Link>
          <Link to="/galeria">Galeria de drinks</Link>
          <Link to="/sobre">Sobre Warley Jean</Link>
          <Link to="/auth">Área do aluno</Link>
        </div>
        <a href="https://www.instagram.com/warley.bartender/" target="_blank" rel="noreferrer">
          <Instagram /> @warley.bartender <ArrowUpRight />
        </a>
        <p className="footer-bottom">
          © {new Date().getFullYear()} BAR PROFISSIONAL. Todos os direitos reservados.
        </p>
      </footer>
    </>
  );
}
