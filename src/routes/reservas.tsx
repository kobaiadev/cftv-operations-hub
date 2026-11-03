import { createFileRoute } from "@tanstack/react-router";
import { Cctv, Pencil, Save, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { podeEditar, useAuth } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOS, type OS } from "@/lib/os-store";

export const Route = createFileRoute("/reservas")({
  head: () => ({
    meta: [
      { title: "Reservas CFTV — Controle PP" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content: "Reservas de imagens de CFTV vinculadas às Ordens de Serviço.",
      },
      { property: "og:title", content: "Reservas CFTV — Controle PP" },
      {
        property: "og:description",
        content: "Reservas de imagens de CFTV vinculadas às Ordens de Serviço.",
      },
    ],
  }),
  component: ReservasPage,
});

function ReservasPage() {
  const { ordens, updateOS } = useOS();
  const { profile } = useAuth();
  const editar = podeEditar(profile?.role);
  const [editando, setEditando] = useState<OS | null>(null);
  const reservas = ordens.filter((ordem) => ordem.reserva?.numero.trim());
  const [busca, setBusca] = useState("");
  const termoBusca = normalizarBusca(busca);
  const reservasFiltradas = reservas.filter((ordem) =>
    normalizarBusca(
      [
        ordem.loja,
        ordem.id,
        ordem.data,
        ordem.reserva?.vinculadaEm,
        ordem.reserva?.numero,
        ordem.reserva?.imagemNome,
        ordem.bo?.numero,
        ordem.bo?.delegacia,
        ordem.bo?.data,
        ordem.ocorrencia,
        ordem.setor,
        ordem.gravidade,
        ordem.status,
        ordem.descricao,
        ordem.dadosAdicionais,
        ...(ordem.anexosNomes ?? []),
      ]
        .filter(Boolean)
        .join(" "),
    ).includes(termoBusca),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reservas CFTV</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reservas vinculadas às Ordens de Serviço registradas.
          </p>
        </div>
        <span className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          {reservasFiltradas.length} de {reservas.length}{" "}
          {reservas.length === 1 ? "reserva" : "reservas"}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <label
            htmlFor="busca-reservas"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Buscar em todos os dados das reservas e das OS
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="busca-reservas"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Loja, OS, datas, número da reserva, BO, ocorrência..."
              className="pl-9"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Loja</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Data do fato</TableHead>
              <TableHead>Data da solicitação</TableHead>
              <TableHead>Número da reserva</TableHead>
              <TableHead className="pr-5">Boletim de Ocorrência</TableHead>
              {editar && <TableHead className="w-16">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={editar ? 7 : 6} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Cctv className="size-8" />
                    <p className="font-medium">
                      {reservas.length === 0
                        ? "Nenhuma reserva de imagem vinculada."
                        : "Nenhuma reserva corresponde à busca."}
                    </p>
                    <p className="text-sm">
                      {reservas.length === 0
                        ? "As reservas cadastradas nas Ordens de Serviço aparecerão aqui."
                        : "Tente outro termo ou limpe a busca."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              reservasFiltradas.map((ordem) => (
                <TableRow key={`${ordem.id}-${ordem.reserva?.numero}`}>
                  <TableCell className="whitespace-nowrap pl-5">{ordem.loja || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{ordem.id}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {ordem.data || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {ordem.reserva?.vinculadaEm || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono font-medium text-primary">
                    {ordem.reserva?.numero}
                  </TableCell>
                  <TableCell className="pr-5 font-mono text-sm">
                    {ordem.bo?.numero?.trim() || "NÃO"}
                  </TableCell>
                  {editar && <TableCell><Button variant="ghost" size="icon" title="Editar" aria-label={`Editar reserva ${ordem.reserva?.numero}`} onClick={() => { if (editar) setEditando({ ...ordem }); }}><Pencil className="text-primary" /></Button></TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!editando && editar} onOpenChange={(open) => { if (!open) setEditando(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar reserva CFTV</DialogTitle><DialogDescription>{editando?.id}</DialogDescription></DialogHeader>
          {editando?.reserva && <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault(); if (!editar || !editando.reserva || !editando.reserva.numero.trim()) return;
            updateOS(editando.id, { reserva: { ...editando.reserva, numero: editando.reserva.numero.trim() } }); setEditando(null);
          }}>
            <label htmlFor="reserva-editar-numero" className="text-sm font-medium">Número da reserva</label>
            <Input id="reserva-editar-numero" required value={editando.reserva.numero} onChange={(e) => { if (editando.reserva) setEditando({ ...editando, reserva: { ...editando.reserva, numero: e.target.value } }); }} />
            <label htmlFor="reserva-editar-data" className="text-sm font-medium">Data da solicitação</label>
            <Input id="reserva-editar-data" value={editando.reserva.vinculadaEm} onChange={(e) => { if (editando.reserva) setEditando({ ...editando, reserva: { ...editando.reserva, vinculadaEm: e.target.value } }); }} />
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditando(null)}>Cancelar</Button><Button type="submit"><Save /> Salvar alterações</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function normalizarBusca(texto: string | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}
