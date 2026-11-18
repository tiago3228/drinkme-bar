import { createFileRoute } from "@tanstack/react-router";
import { publicOptions } from "@/features/content";
import { HomePage } from "@/features/public-pages";
import { seo } from "@/features/seo";
import shareAsset from "@/assets/warley-compartilhamento.jpg.asset.json";

const homeUrl = "https://drinkme-bar.lovable.app/";
const shareImageUrl = new URL(shareAsset.url, homeUrl).href;
export const Route = createFileRoute("/")({
  head: () => {
    const metadata = seo(
      "BAR PROFISSIONAL — Do balcão à gestão",
      "Formação com Warley Jean em coquetelaria, gestão e operações de bar. Domine a operação e controle seus números.",
    );
    return {
      ...metadata,
      meta: [
        ...metadata.meta,
        { property: "og:url", content: homeUrl },
        { property: "og:image", content: shareImageUrl },
        { property: "og:image:secure_url", content: shareImageUrl },
        { property: "og:image:type", content: "image/jpeg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        {
          property: "og:image:alt",
          content: "Warley Jean olhando para a prateleira de bebidas no bar.",
        },
        { name: "twitter:image", content: shareImageUrl },
        {
          name: "twitter:image:alt",
          content: "Warley Jean olhando para a prateleira de bebidas no bar.",
        },
      ],
      links: [{ rel: "canonical", href: homeUrl }],
    };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(publicOptions),
  component: HomePage,
});
