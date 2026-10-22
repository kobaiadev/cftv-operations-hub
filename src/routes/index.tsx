import { createFileRoute } from "@tanstack/react-router";
import { OcorrenciasDashboard } from "@/components/ocorrencias-dashboard";
import { PerdasDashboard } from "@/components/perdas-dashboard";
import { useCadastro } from "@/lib/cadastro-store";
import { useOS } from "@/lib/os-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Controle de OS e Reservas CFTV" },
      {
        name: "description",
        content: "Painel de análise de ocorrências e perdas da Segurança Patrimonial.",
      },
      { property: "og:title", content: "Dashboard — Controle de OS e Reservas CFTV" },
      {
        property: "og:description",
        content: "Painel de análise de ocorrências e perdas da Segurança Patrimonial.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { ordens } = useOS();
  const { lojas, perdas } = useCadastro();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Análise consolidada das ocorrências, Ordens de Serviço e perdas da Segurança Patrimonial.
        </p>
      </div>
      <PerdasDashboard perdas={perdas} lojas={lojas} />
      <OcorrenciasDashboard ordens={ordens} lojas={lojas} />
    </div>
  );
}
