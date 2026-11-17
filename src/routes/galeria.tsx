import { createFileRoute } from "@tanstack/react-router";
import { publicOptions } from "@/features/content";
import { GalleryPage } from "@/features/gallery-page";
import { seo } from "@/features/seo";

export const Route = createFileRoute("/galeria")({
  head: () =>
    seo(
      "Galeria de drinks — BAR PROFISSIONAL",
      "Conheça drinks, técnicas e criações de coquetelaria do BAR PROFISSIONAL com Warley Jean.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicOptions),
  component: GalleryPage,
});
