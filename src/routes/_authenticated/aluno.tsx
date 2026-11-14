import { createFileRoute } from "@tanstack/react-router";
import { memberOptions } from "@/features/content";
import { StudentPage } from "@/features/student-page";
import { seo } from "@/features/seo";
export const Route = createFileRoute("/_authenticated/aluno")({
  head: () =>
    seo(
      "Meus cursos",
      "Continue sua formação e acompanhe aulas, materiais e progresso no BAR PROFISSIONAL.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(memberOptions),
  component: StudentPage,
});
