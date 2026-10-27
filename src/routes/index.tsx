import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, UsersRound } from "lucide-react";
import { OcorrenciasDashboard } from "@/components/ocorrencias-dashboard";
import { PerdasDashboard } from "@/components/perdas-dashboard";
import { Button } from "@/components/ui/button";
import { useCadastro } from "@/lib/cadastro-store";
import { useOS } from "@/lib/os-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Controle de OS e Reservas CFTV" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
      <Link
        to="/supervisao"
        className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/50 hover:bg-accent/30"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UsersRound className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Painel de Supervisão</h2>
            <p className="text-sm text-muted-foreground">
              Acesse a rotina de supervisores internos Nagumo e empresas externas.
            </p>
          </div>
        </div>
        <Button variant="outline" tabIndex={-1}>
          Abrir supervisão <ArrowRight />
        </Button>
      </Link>
      <PerdasDashboard perdas={perdas} lojas={lojas} />
      <OcorrenciasDashboard ordens={ordens} lojas={lojas} />
    </div>
  );
}
