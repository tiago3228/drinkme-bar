import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/features/auth-page";
import { seo } from "@/features/seo";
export const Route = createFileRoute("/auth")({
  head: () =>
    seo(
      "Área do aluno — Entrar",
      "Entre na sua conta BAR PROFISSIONAL para acessar os cursos e acompanhar sua formação.",
    ),
  component: AuthPage,
});
