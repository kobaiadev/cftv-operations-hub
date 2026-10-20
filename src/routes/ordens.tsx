import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de Serviço — Controle PP" },
      { name: "description", content: "Gestão de ordens de serviço de prevenção de perdas." },
      { property: "og:title", content: "Ordens de Serviço — Controle PP" },
      { property: "og:description", content: "Gestão de ordens de serviço de prevenção de perdas." },
    ],
  }),
  component: () => <PagePlaceholder title="Ordens de Serviço" icon={ClipboardList} />,
});
