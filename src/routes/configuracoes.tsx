import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Controle PP" },
      { name: "description", content: "Configurações do sistema de controle de OS e CFTV." },
      { property: "og:title", content: "Configurações — Controle PP" },
      { property: "og:description", content: "Configurações do sistema de controle de OS e CFTV." },
    ],
  }),
  component: () => <PagePlaceholder title="Configurações" icon={Settings} />,
});
