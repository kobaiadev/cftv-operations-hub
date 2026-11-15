import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DatabaseBackup, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Controle PP" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Configurações do sistema de controle de OS e CFTV." },
      { property: "og:title", content: "Configurações — Controle PP" },
      { property: "og:description", content: "Configurações do sistema de controle de OS e CFTV." },
    ],
  }),
  component: Configuracoes,
});

const TABELAS = [
  "app_state",
  "app_attachments",
  "work_orders",
  "repair_requests",
  "quiz_scores",
  "quiz_user_progress",
  "user_roles",
] as const;
const VALIDADE_URL = 60 * 60 * 24 * 7;

async function lerTabela(nome: string) {
  const linhas: unknown[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(nome as never).select("*").range(de, de + 999);
    if (error) throw new Error(`${nome}: ${error.message}`);
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) return linhas;
  }
}

async function urlsAssinadas(bucket: string, paths: string[]) {
  const unicos = [...new Set(paths.filter(Boolean))];
  if (!unicos.length) return [];
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unicos, VALIDADE_URL);
  if (error) throw new Error(`${bucket}: ${error.message}`);
  return (data ?? []).map((d) => ({ bucket, path: d.path, url: d.signedUrl, erro: d.error }));
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function Configuracoes() {
  const { profile } = useAuth();
  const [exportando, setExportando] = useState(false);
  const admin = profile?.role === "00";

  async function exportar() {
    setExportando(true);
    try {
      const tabelas: Record<string, unknown[]> = {};
      for (const t of TABELAS) tabelas[t] = await lerTabela(t);
      const anexos = tabelas["app_attachments"] as { storage_path: string }[];
      const reparos = tabelas["repair_requests"] as { imagens?: { path?: string }[] }[];
      const arquivos = [
        ...(await urlsAssinadas("private-attachments", anexos.map((a) => a.storage_path))),
        ...(await urlsAssinadas(
          "repair-images",
          reparos.flatMap((r) => (Array.isArray(r.imagens) ? r.imagens.map((i) => i.path ?? "") : [])),
        )),
      ];
      const backup = {
        sistema: "Controle PP — Nagumo",
        versao: 1,
        exportado_em: new Date().toISOString(),
        validade_urls_segundos: VALIDADE_URL,
        contagem: Object.fromEntries(Object.entries(tabelas).map(([k, v]) => [k, v.length])),
        tabelas,
        arquivos,
      };
      const data = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      baixar(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }), `backup-controle-pp-${data}.json`);
      toast.success("Backup exportado com sucesso.");
    } catch (e) {
      toast.error(`Falha ao exportar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5 text-primary" /> Backup e Migração de Dados
          </CardTitle>
          <CardDescription>
            Gera um arquivo JSON com todas as tabelas e registros, além das referências e links das imagens
            armazenadas (links válidos por 7 dias).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admin ? (
            <Button onClick={exportar} disabled={exportando}>
              {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exportando ? "Exportando..." : "Exportar Banco de Dados Completo"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Disponível apenas para o Nível 00 (administrador).</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
