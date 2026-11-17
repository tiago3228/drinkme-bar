import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "./public-layout";
import { workspaceNavigationItems } from "./workspace-navigation";

export function Workspace({
  admin,
  active,
  onTab,
  children,
}: {
  admin: boolean;
  active: string;
  onTab: (v: string) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const nav = useNavigate();
  const items = workspaceNavigationItems(admin);
  return (
    <div className="workspace">
      <aside className={open ? "workspace-sidebar open" : "workspace-sidebar"}>
        <Brand />
        <span className="workspace-caption">{admin ? "ADMINISTRAÇÃO" : "ÁREA DO ALUNO"}</span>
        <nav>
          {items.map(([label, Icon]) => (
            <Button
              variant={active === label ? "secondary" : "ghost"}
              key={label}
              onClick={() => {
                onTab(label);
                setOpen(false);
              }}
            >
              <Icon />
              {label}
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Button variant="ghost" asChild>
            <Link to="/">
              Ver site <ArrowUpRight />
            </Link>
          </Button>
          {admin && (
            <Button variant="ghost" asChild>
              <Link to="/aluno">Área do aluno</Link>
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={async () => {
              await qc.cancelQueries();
              qc.clear();
              await supabase.auth.signOut();
              await nav({ to: "/auth", replace: true });
            }}
          >
            <LogOut /> Sair
          </Button>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-header">
          <Button
            className="menu-toggle"
            variant="ghost"
            size="icon"
            aria-label="Menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
          <span>
            BAR PROFISSIONAL <span className="text-muted-foreground">/ {active}</span>
          </span>
          <span className="workspace-status">
            {admin ? "Painel administrativo" : "Seu aprendizado"}
          </span>
        </header>
        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
