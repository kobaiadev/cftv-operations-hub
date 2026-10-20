import { createFileRoute } from "@tanstack/react-router";
import { Cctv } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/reservas")({
  head: () => ({
    meta: [
      { title: "Reservas CFTV — Controle PP" },
      { name: "description", content: "Reservas de imagens de CFTV para análise." },
      { property: "og:title", content: "Reservas CFTV — Controle PP" },
      { property: "og:description", content: "Reservas de imagens de CFTV para análise." },
    ],
  }),
  component: () => <PagePlaceholder title="Reservas CFTV" icon={Cctv} />,
});
