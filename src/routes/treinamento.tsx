import { createFileRoute } from "@tanstack/react-router";
import { publicOptions } from "@/features/content";
import { TrainingPage } from "@/features/public-pages";
import { seo } from "@/features/seo";
export const Route = createFileRoute("/treinamento")({
  head: () =>
    seo(
      "Treinamento — Do balcão à gestão",
      "Conheça a formação BAR PROFISSIONAL: organização, CMV, precificação, estoque e gestão de equipes com Warley Jean.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicOptions),
  component: TrainingPage,
});
